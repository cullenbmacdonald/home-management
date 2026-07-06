import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, meals, mealIngredients, groceryItems, type GroceryCategory } from "@/db/schema";
import { isGroceryCategory } from "@/lib/groceries";
import type { Ctx } from "@/lib/auth";

const EVENT_TYPES = ["date", "event", "chore"] as const;
type EventType = (typeof EVENT_TYPES)[number];

export interface NewEvent {
  date: string; // YYYY-MM-DD
  time?: string; // "19:30"
  title: string;
  type: string;
  assigneeId?: number | null;
}

export async function listEvents(ctx: Ctx) {
  return db.select().from(events).where(eq(events.householdId, ctx.householdId));
}

export async function addEvent(ctx: Ctx, data: NewEvent) {
  const title = data.title.trim();
  if (!title || !data.date) return null;
  const type: EventType = (EVENT_TYPES as readonly string[]).includes(data.type)
    ? (data.type as EventType)
    : "event";
  const [row] = await db
    .insert(events)
    .values({
      householdId: ctx.householdId,
      date: data.date,
      time: data.time?.trim() || null,
      title,
      type,
      assigneeId: data.assigneeId ?? null,
    })
    .returning();
  return row;
}

export interface EditEvent extends NewEvent {
  id: number;
}

export async function updateEvent(ctx: Ctx, data: EditEvent) {
  const title = data.title.trim();
  if (!title || !data.date) return null;
  const type: EventType = (EVENT_TYPES as readonly string[]).includes(data.type)
    ? (data.type as EventType)
    : "event";
  const [row] = await db
    .update(events)
    .set({
      date: data.date,
      time: data.time?.trim() || null,
      title,
      type,
      assigneeId: data.assigneeId ?? null,
    })
    .where(and(eq(events.id, data.id), eq(events.householdId, ctx.householdId)))
    .returning();
  return row ?? null;
}

export async function deleteEvent(ctx: Ctx, id: number) {
  await db
    .delete(events)
    .where(and(eq(events.id, id), eq(events.householdId, ctx.householdId)));
}

export interface NewIngredient {
  name: string;
  category: string;
  qty?: string;
}

export interface NewMeal {
  date: string;
  title: string;
  cook: boolean;
  out: boolean;
  ingredients: NewIngredient[];
}

/** All meals for the household, most useful as a plain "meal plan" view. */
export async function getMealPlan(ctx: Ctx) {
  return db.select().from(meals).where(eq(meals.householdId, ctx.householdId));
}

/** Create or replace the meal for a given date (upsert-ish "set the meal"). */
export async function setMeal(ctx: Ctx, data: NewMeal) {
  return createMeal(ctx, data);
}

export async function createMeal(ctx: Ctx, data: NewMeal) {
  const title = data.title.trim();
  if (!title || !data.date) return null;
  const out = !!data.out;
  const [meal] = await db
    .insert(meals)
    .values({
      householdId: ctx.householdId,
      date: data.date,
      title,
      cook: out ? false : !!data.cook,
      out,
    })
    .returning();
  const mealId = meal.id;
  for (const ing of data.ingredients) {
    const name = ing.name.trim();
    if (!name) continue;
    const cat: GroceryCategory = isGroceryCategory(ing.category) ? ing.category : "produce";
    await db.insert(mealIngredients).values({
      householdId: ctx.householdId,
      mealId,
      name,
      category: cat,
      qty: ing.qty?.trim() || null,
    });
  }
  return meal;
}

/**
 * Push a meal's ingredients onto the grocery list. Skips any ingredient whose
 * name (case-insensitive) already matches an UNCHECKED grocery item; stamps the
 * meal so the button flips to "Added to list ✓".
 */
export async function addMealIngredientsToList(ctx: Ctx, mealId: number) {
  const meal = (
    await db
      .select({ id: meals.id })
      .from(meals)
      .where(and(eq(meals.id, mealId), eq(meals.householdId, ctx.householdId)))
      .limit(1)
  )[0];
  if (!meal) return;
  const ings = await db.select().from(mealIngredients).where(eq(mealIngredients.mealId, mealId));
  const active = await db
    .select()
    .from(groceryItems)
    .where(and(eq(groceryItems.checked, false), eq(groceryItems.householdId, ctx.householdId)));
  const have = new Set(active.map((g) => g.name.toLowerCase()));
  for (const ing of ings) {
    const key = ing.name.toLowerCase();
    if (have.has(key)) continue;
    await db.insert(groceryItems).values({
      householdId: ctx.householdId,
      name: ing.name,
      category: ing.category,
      qty: ing.qty,
      sourceMealId: mealId,
    });
    have.add(key);
  }
  await db
    .update(meals)
    .set({ ingredientsAddedAt: new Date() })
    .where(and(eq(meals.id, mealId), eq(meals.householdId, ctx.householdId)));
}

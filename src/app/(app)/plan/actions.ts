"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  events,
  meals,
  mealIngredients,
  groceryItems,
  type GroceryCategory,
} from "@/db/schema";
import { isGroceryCategory } from "@/lib/groceries";
import { requireHousehold } from "@/lib/auth";

const EVENT_TYPES = ["date", "event", "chore"] as const;
type EventType = (typeof EVENT_TYPES)[number];

export interface NewEvent {
  date: string; // YYYY-MM-DD
  time?: string; // "19:30"
  title: string;
  type: string;
  assigneeId?: number | null;
}

export async function createEvent(data: NewEvent) {
  const { householdId } = await requireHousehold();
  const title = data.title.trim();
  if (!title || !data.date) return;
  const type: EventType = (EVENT_TYPES as readonly string[]).includes(data.type)
    ? (data.type as EventType)
    : "event";
  await db.insert(events).values({
    householdId,
    date: data.date,
    time: data.time?.trim() || null,
    title,
    type,
    assigneeId: data.assigneeId ?? null,
  });
  revalidatePath("/plan");
  revalidatePath("/");
}

export interface EditEvent extends NewEvent {
  id: number;
}

export async function updateEvent(data: EditEvent) {
  const { householdId } = await requireHousehold();
  const title = data.title.trim();
  if (!title || !data.date) return;
  const type: EventType = (EVENT_TYPES as readonly string[]).includes(data.type)
    ? (data.type as EventType)
    : "event";
  await db
    .update(events)
    .set({
      date: data.date,
      time: data.time?.trim() || null,
      title,
      type,
      assigneeId: data.assigneeId ?? null,
    })
    .where(and(eq(events.id, data.id), eq(events.householdId, householdId)));
  revalidatePath("/plan");
  revalidatePath("/");
}

export async function deleteEvent(id: number) {
  const { householdId } = await requireHousehold();
  await db
    .delete(events)
    .where(and(eq(events.id, id), eq(events.householdId, householdId)));
  revalidatePath("/plan");
  revalidatePath("/");
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

export async function createMeal(data: NewMeal) {
  const { householdId } = await requireHousehold();
  const title = data.title.trim();
  if (!title || !data.date) return;
  const out = !!data.out;
  const [meal] = await db
    .insert(meals)
    .values({ householdId, date: data.date, title, cook: out ? false : !!data.cook, out })
    .returning({ id: meals.id });
  const mealId = meal.id;
  for (const ing of data.ingredients) {
    const name = ing.name.trim();
    if (!name) continue;
    const cat: GroceryCategory = isGroceryCategory(ing.category)
      ? ing.category
      : "produce";
    await db
      .insert(mealIngredients)
      .values({ householdId, mealId, name, category: cat, qty: ing.qty?.trim() || null });
  }
  revalidatePath("/plan");
}

/**
 * Push a meal's ingredients onto the grocery list. Skips any ingredient whose
 * name (case-insensitive) already matches an UNCHECKED grocery item; stamps the
 * meal so the button flips to "Added to list ✓".
 */
export async function addMealIngredientsToList(mealId: number) {
  const { householdId } = await requireHousehold();
  // Verify the meal belongs to this household before touching its ingredients.
  const meal = (
    await db
      .select({ id: meals.id })
      .from(meals)
      .where(and(eq(meals.id, mealId), eq(meals.householdId, householdId)))
      .limit(1)
  )[0];
  if (!meal) return;
  const ings = await db
    .select()
    .from(mealIngredients)
    .where(eq(mealIngredients.mealId, mealId));
  const active = await db
    .select()
    .from(groceryItems)
    .where(
      and(eq(groceryItems.checked, false), eq(groceryItems.householdId, householdId)),
    );
  const have = new Set(active.map((g) => g.name.toLowerCase()));
  for (const ing of ings) {
    const key = ing.name.toLowerCase();
    if (have.has(key)) continue;
    await db.insert(groceryItems).values({
      householdId,
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
    .where(and(eq(meals.id, mealId), eq(meals.householdId, householdId)));
  revalidatePath("/plan");
  revalidatePath("/groceries");
}

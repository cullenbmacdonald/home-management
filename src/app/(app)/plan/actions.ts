"use server";

import { eq } from "drizzle-orm";
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
import { requireUser } from "@/lib/auth";

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
  await requireUser();
  const title = data.title.trim();
  if (!title || !data.date) return;
  const type: EventType = (EVENT_TYPES as readonly string[]).includes(data.type)
    ? (data.type as EventType)
    : "event";
  db.insert(events)
    .values({
      date: data.date,
      time: data.time?.trim() || null,
      title,
      type,
      assigneeId: data.assigneeId ?? null,
    })
    .run();
  revalidatePath("/plan");
  revalidatePath("/");
}

export async function deleteEvent(id: number) {
  await requireUser();
  db.delete(events).where(eq(events.id, id)).run();
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
  await requireUser();
  const title = data.title.trim();
  if (!title || !data.date) return;
  const out = !!data.out;
  const res = db
    .insert(meals)
    .values({ date: data.date, title, cook: out ? false : !!data.cook, out })
    .run();
  const mealId = Number(res.lastInsertRowid);
  for (const ing of data.ingredients) {
    const name = ing.name.trim();
    if (!name) continue;
    const cat: GroceryCategory = isGroceryCategory(ing.category)
      ? ing.category
      : "produce";
    db.insert(mealIngredients)
      .values({ mealId, name, category: cat, qty: ing.qty?.trim() || null })
      .run();
  }
  revalidatePath("/plan");
}

/**
 * Push a meal's ingredients onto the grocery list. Skips any ingredient whose
 * name (case-insensitive) already matches an UNCHECKED grocery item; stamps the
 * meal so the button flips to "Added to list ✓".
 */
export async function addMealIngredientsToList(mealId: number) {
  await requireUser();
  const ings = db
    .select()
    .from(mealIngredients)
    .where(eq(mealIngredients.mealId, mealId))
    .all();
  const active = db
    .select()
    .from(groceryItems)
    .where(eq(groceryItems.checked, false))
    .all();
  const have = new Set(active.map((g) => g.name.toLowerCase()));
  for (const ing of ings) {
    const key = ing.name.toLowerCase();
    if (have.has(key)) continue;
    db.insert(groceryItems)
      .values({
        name: ing.name,
        category: ing.category,
        qty: ing.qty,
        sourceMealId: mealId,
      })
      .run();
    have.add(key);
  }
  db.update(meals)
    .set({ ingredientsAddedAt: new Date() })
    .where(eq(meals.id, mealId))
    .run();
  revalidatePath("/plan");
  revalidatePath("/groceries");
}

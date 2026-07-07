"use server";

import { revalidatePath } from "next/cache";
import { requireHousehold } from "@/lib/auth";
import * as mealsLib from "@/lib/meals";
import type { NewEvent, EditEvent, NewMeal } from "@/lib/meals";

export type { NewEvent, EditEvent, NewMeal, NewIngredient } from "@/lib/meals";

export async function createEvent(data: NewEvent) {
  const ctx = await requireHousehold();
  await mealsLib.addEvent(ctx, data);
  revalidatePath("/plan");
  revalidatePath("/dashboard");
}

export async function updateEvent(data: EditEvent) {
  const ctx = await requireHousehold();
  await mealsLib.updateEvent(ctx, data);
  revalidatePath("/plan");
  revalidatePath("/dashboard");
}

export async function deleteEvent(id: number) {
  const ctx = await requireHousehold();
  await mealsLib.deleteEvent(ctx, id);
  revalidatePath("/plan");
  revalidatePath("/dashboard");
}

export async function createMeal(data: NewMeal) {
  const ctx = await requireHousehold();
  await mealsLib.createMeal(ctx, data);
  revalidatePath("/plan");
}

export async function addMealIngredientsToList(mealId: number) {
  const ctx = await requireHousehold();
  await mealsLib.addMealIngredientsToList(ctx, mealId);
  revalidatePath("/plan");
  revalidatePath("/groceries");
}

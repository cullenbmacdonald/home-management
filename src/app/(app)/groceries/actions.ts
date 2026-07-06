"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { staples, groceryItems, type GroceryCategory } from "@/db/schema";
import { isGroceryCategory } from "@/lib/groceries";
import * as groceriesLib from "@/lib/groceries-data";
import { requireHousehold } from "@/lib/auth";

function refresh() {
  revalidatePath("/groceries");
  revalidatePath("/groceries/staples");
  revalidatePath("/");
}

export async function addGroceryItem(
  name: string,
  category: string,
  qty?: string,
) {
  const ctx = await requireHousehold();
  await groceriesLib.addGroceryItem(ctx, name, category, qty);
  refresh();
}

export async function toggleGroceryItem(id: number) {
  const ctx = await requireHousehold();
  await groceriesLib.checkGroceryItem(ctx, id);
  refresh();
}

export async function deleteGroceryItem(id: number) {
  const ctx = await requireHousehold();
  await groceriesLib.removeGroceryItem(ctx, id);
  refresh();
}

/**
 * For every staple: if it's already on the list checked, uncheck it; if it's
 * absent entirely, insert it unchecked with isStaple. Leaves already-unchecked
 * matches alone. Name matching is case-insensitive.
 */
export async function restockStaples() {
  const ctx = await requireHousehold();
  await groceriesLib.restockStaples(ctx);
  refresh();
}

/** Add a staple to the pool. Duplicate names are ignored, case-insensitively. */
export async function addStaple(name: string, category: string) {
  const { householdId } = await requireHousehold();
  const trimmed = name.trim();
  if (!trimmed) return;
  const cat: GroceryCategory = isGroceryCategory(category)
    ? category
    : "produce";
  await db
    .insert(staples)
    .values({ householdId, name: trimmed, category: cat })
    .onConflictDoNothing();
  refresh();
}

/** Remove a staple from the pool. Does not touch the live shopping list. */
export async function deleteStaple(id: number) {
  const { householdId } = await requireHousehold();
  await db
    .delete(staples)
    .where(and(eq(staples.id, id), eq(staples.householdId, householdId)));
  refresh();
}

/** Change a staple's aisle category. */
export async function updateStapleCategory(id: number, category: string) {
  const { householdId } = await requireHousehold();
  if (!isGroceryCategory(category)) return;
  await db
    .update(staples)
    .set({ category })
    .where(and(eq(staples.id, id), eq(staples.householdId, householdId)));
  refresh();
}

/** Delete every checked ("in cart") item. */
export async function clearInCart() {
  const { householdId } = await requireHousehold();
  await db
    .delete(groceryItems)
    .where(
      and(eq(groceryItems.checked, true), eq(groceryItems.householdId, householdId)),
    );
  refresh();
}

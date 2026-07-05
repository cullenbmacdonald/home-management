"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { groceryItems, staples, type GroceryCategory } from "@/db/schema";
import { isGroceryCategory } from "@/lib/groceries";
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
  const { householdId } = await requireHousehold();
  const trimmed = name.trim();
  if (!trimmed) return;
  const cat: GroceryCategory = isGroceryCategory(category)
    ? category
    : "produce";
  await db
    .insert(groceryItems)
    .values({ householdId, name: trimmed, category: cat, qty: qty?.trim() || null });
  refresh();
}

export async function toggleGroceryItem(id: number) {
  const { householdId } = await requireHousehold();
  await db
    .update(groceryItems)
    .set({ checked: sql`NOT ${groceryItems.checked}` })
    .where(and(eq(groceryItems.id, id), eq(groceryItems.householdId, householdId)));
  refresh();
}

export async function deleteGroceryItem(id: number) {
  const { householdId } = await requireHousehold();
  await db
    .delete(groceryItems)
    .where(and(eq(groceryItems.id, id), eq(groceryItems.householdId, householdId)));
  refresh();
}

/**
 * For every staple: if it's already on the list checked, uncheck it; if it's
 * absent entirely, insert it unchecked with isStaple. Leaves already-unchecked
 * matches alone. Name matching is case-insensitive.
 */
export async function restockStaples() {
  const { householdId } = await requireHousehold();
  const pool = await db
    .select()
    .from(staples)
    .where(eq(staples.householdId, householdId));
  const active = await db
    .select()
    .from(groceryItems)
    .where(eq(groceryItems.householdId, householdId));
  const byName = new Map(active.map((g) => [g.name.toLowerCase(), g]));
  for (const s of pool) {
    const existing = byName.get(s.name.toLowerCase());
    if (!existing) {
      await db
        .insert(groceryItems)
        .values({ householdId, name: s.name, category: s.category, isStaple: true });
    } else if (existing.checked) {
      await db
        .update(groceryItems)
        .set({ checked: false })
        .where(eq(groceryItems.id, existing.id));
    }
  }
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

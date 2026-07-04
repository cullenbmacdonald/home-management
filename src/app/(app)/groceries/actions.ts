"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { groceryItems, staples, type GroceryCategory } from "@/db/schema";
import { isGroceryCategory } from "@/lib/groceries";
import { requireUser } from "@/lib/auth";

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
  await requireUser();
  const trimmed = name.trim();
  if (!trimmed) return;
  const cat: GroceryCategory = isGroceryCategory(category)
    ? category
    : "produce";
  await db
    .insert(groceryItems)
    .values({ name: trimmed, category: cat, qty: qty?.trim() || null });
  refresh();
}

export async function toggleGroceryItem(id: number) {
  await requireUser();
  await db
    .update(groceryItems)
    .set({ checked: sql`NOT ${groceryItems.checked}` })
    .where(eq(groceryItems.id, id));
  refresh();
}

export async function deleteGroceryItem(id: number) {
  await requireUser();
  await db.delete(groceryItems).where(eq(groceryItems.id, id));
  refresh();
}

/**
 * For every staple: if it's already on the list checked, uncheck it; if it's
 * absent entirely, insert it unchecked with isStaple. Leaves already-unchecked
 * matches alone. Name matching is case-insensitive.
 */
export async function restockStaples() {
  await requireUser();
  const pool = await db.select().from(staples);
  const active = await db.select().from(groceryItems);
  const byName = new Map(active.map((g) => [g.name.toLowerCase(), g]));
  for (const s of pool) {
    const existing = byName.get(s.name.toLowerCase());
    if (!existing) {
      await db
        .insert(groceryItems)
        .values({ name: s.name, category: s.category, isStaple: true });
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
  await requireUser();
  const trimmed = name.trim();
  if (!trimmed) return;
  const cat: GroceryCategory = isGroceryCategory(category)
    ? category
    : "produce";
  await db
    .insert(staples)
    .values({ name: trimmed, category: cat })
    .onConflictDoNothing();
  refresh();
}

/** Remove a staple from the pool. Does not touch the live shopping list. */
export async function deleteStaple(id: number) {
  await requireUser();
  await db.delete(staples).where(eq(staples.id, id));
  refresh();
}

/** Change a staple's aisle category. */
export async function updateStapleCategory(id: number, category: string) {
  await requireUser();
  if (!isGroceryCategory(category)) return;
  await db.update(staples).set({ category }).where(eq(staples.id, id));
  refresh();
}

/** Delete every checked ("in cart") item. */
export async function clearInCart() {
  await requireUser();
  await db.delete(groceryItems).where(eq(groceryItems.checked, true));
  refresh();
}

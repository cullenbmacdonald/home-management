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
  db.insert(groceryItems)
    .values({ name: trimmed, category: cat, qty: qty?.trim() || null })
    .run();
  refresh();
}

export async function toggleGroceryItem(id: number) {
  await requireUser();
  db.update(groceryItems)
    .set({ checked: sql`NOT ${groceryItems.checked}` })
    .where(eq(groceryItems.id, id))
    .run();
  refresh();
}

export async function deleteGroceryItem(id: number) {
  await requireUser();
  db.delete(groceryItems).where(eq(groceryItems.id, id)).run();
  refresh();
}

/**
 * For every staple: if it's already on the list checked, uncheck it; if it's
 * absent entirely, insert it unchecked with isStaple. Leaves already-unchecked
 * matches alone. Name matching is case-insensitive.
 */
export async function restockStaples() {
  await requireUser();
  const pool = db.select().from(staples).all();
  const active = db.select().from(groceryItems).all();
  const byName = new Map(active.map((g) => [g.name.toLowerCase(), g]));
  for (const s of pool) {
    const existing = byName.get(s.name.toLowerCase());
    if (!existing) {
      db.insert(groceryItems)
        .values({ name: s.name, category: s.category, isStaple: true })
        .run();
    } else if (existing.checked) {
      db.update(groceryItems)
        .set({ checked: false })
        .where(eq(groceryItems.id, existing.id))
        .run();
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
  db.insert(staples)
    .values({ name: trimmed, category: cat })
    .onConflictDoNothing()
    .run();
  refresh();
}

/** Remove a staple from the pool. Does not touch the live shopping list. */
export async function deleteStaple(id: number) {
  await requireUser();
  db.delete(staples).where(eq(staples.id, id)).run();
  refresh();
}

/** Change a staple's aisle category. */
export async function updateStapleCategory(id: number, category: string) {
  await requireUser();
  if (!isGroceryCategory(category)) return;
  db.update(staples)
    .set({ category })
    .where(eq(staples.id, id))
    .run();
  refresh();
}

/** Delete every checked ("in cart") item. */
export async function clearInCart() {
  await requireUser();
  db.delete(groceryItems).where(eq(groceryItems.checked, true)).run();
  refresh();
}

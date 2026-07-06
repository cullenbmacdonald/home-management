import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { groceryItems, staples, GROCERY_CATEGORIES, type GroceryCategory } from "@/db/schema";
import type { Ctx } from "@/lib/auth";

/** Human-facing aisle labels, keyed by schema enum. */
export const CATEGORY_LABEL: Record<GroceryCategory, string> = {
  produce: "Produce",
  "meat-fish": "Meat & Fish",
  "dairy-eggs": "Dairy & Eggs",
  pantry: "Pantry",
  frozen: "Frozen",
  household: "Household",
};

/** Fixed aisle order for grouping (matches GROCERY_CATEGORIES). */
export const CATEGORY_ORDER = GROCERY_CATEGORIES;

/** True when the value is a valid grocery category enum. */
export function isGroceryCategory(v: string): v is GroceryCategory {
  return (GROCERY_CATEGORIES as readonly string[]).includes(v);
}

// ---------------------------------------------------------------------------
// Ctx-scoped data functions, shared by server actions and MCP tools.
// ---------------------------------------------------------------------------

export async function listGroceries(ctx: Ctx) {
  return db
    .select()
    .from(groceryItems)
    .where(eq(groceryItems.householdId, ctx.householdId));
}

export async function listStaples(ctx: Ctx) {
  return db.select().from(staples).where(eq(staples.householdId, ctx.householdId));
}

export async function addGroceryItem(
  ctx: Ctx,
  name: string,
  category: string,
  qty?: string,
) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const cat: GroceryCategory = isGroceryCategory(category) ? category : "produce";
  const [row] = await db
    .insert(groceryItems)
    .values({
      householdId: ctx.householdId,
      name: trimmed,
      category: cat,
      qty: qty?.trim() || null,
    })
    .returning();
  return row;
}

export async function checkGroceryItem(ctx: Ctx, id: number, checked?: boolean) {
  const where = and(eq(groceryItems.id, id), eq(groceryItems.householdId, ctx.householdId));
  const [row] = await db
    .update(groceryItems)
    .set(checked === undefined ? { checked: sql`NOT ${groceryItems.checked}` } : { checked })
    .where(where)
    .returning();
  return row ?? null;
}

export async function removeGroceryItem(ctx: Ctx, id: number) {
  await db
    .delete(groceryItems)
    .where(and(eq(groceryItems.id, id), eq(groceryItems.householdId, ctx.householdId)));
}

/**
 * For every staple: if it's already on the list checked, uncheck it; if it's
 * absent entirely, insert it unchecked with isStaple. Leaves already-unchecked
 * matches alone. Name matching is case-insensitive.
 */
export async function restockStaples(ctx: Ctx) {
  const pool = await db.select().from(staples).where(eq(staples.householdId, ctx.householdId));
  const active = await db
    .select()
    .from(groceryItems)
    .where(eq(groceryItems.householdId, ctx.householdId));
  const byName = new Map(active.map((g) => [g.name.toLowerCase(), g]));
  for (const s of pool) {
    const existing = byName.get(s.name.toLowerCase());
    if (!existing) {
      await db.insert(groceryItems).values({
        householdId: ctx.householdId,
        name: s.name,
        category: s.category,
        isStaple: true,
      });
    } else if (existing.checked) {
      await db.update(groceryItems).set({ checked: false }).where(eq(groceryItems.id, existing.id));
    }
  }
}

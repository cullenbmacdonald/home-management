import { eq } from "drizzle-orm";
import { db } from "@/db";
import { inventoryItems, vendors, wishlistItems, tasks, groceryItems } from "@/db/schema";
import type { Ctx } from "@/lib/auth";
import { listMaintenanceWithDue } from "@/lib/maintenance";

export async function listInventory(ctx: Ctx) {
  return db.select().from(inventoryItems).where(eq(inventoryItems.householdId, ctx.householdId));
}

export async function listMaintenance(ctx: Ctx) {
  return listMaintenanceWithDue(ctx.householdId);
}

export async function listVendors(ctx: Ctx) {
  return db.select().from(vendors).where(eq(vendors.householdId, ctx.householdId));
}

export async function listWishlist(ctx: Ctx) {
  return db.select().from(wishlistItems).where(eq(wishlistItems.householdId, ctx.householdId));
}

/** Compact cross-entity snapshot of the household, useful as an MCP overview tool. */
export async function householdSummary(ctx: Ctx) {
  const [openTasks, groceries, maintenance, wishlist] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.householdId, ctx.householdId)),
    db.select().from(groceryItems).where(eq(groceryItems.householdId, ctx.householdId)),
    listMaintenanceWithDue(ctx.householdId),
    db.select().from(wishlistItems).where(eq(wishlistItems.householdId, ctx.householdId)),
  ]);
  const incompleteTasks = openTasks.filter((t) => !t.completedAt);
  const uncheckedGroceries = groceries.filter((g) => !g.checked);
  const overdueMaintenance = maintenance.filter((m) => m.status === "overdue");
  const dueSoonMaintenance = maintenance.filter((m) => m.status === "due-soon");
  return {
    openTaskCount: incompleteTasks.length,
    groceryListCount: uncheckedGroceries.length,
    overdueMaintenanceCount: overdueMaintenance.length,
    dueSoonMaintenanceCount: dueSoonMaintenance.length,
    wishlistOpenCount: wishlist.filter((w) => w.status !== "delivered").length,
    overdueMaintenance: overdueMaintenance.map((m) => m.name),
    dueSoonMaintenance: dueSoonMaintenance.map((m) => m.name),
  };
}

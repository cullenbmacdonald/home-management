import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { maintenanceItems, maintenanceLogs, rooms, users } from "@/db/schema";

export type MaintenanceStatus = "overdue" | "due-soon" | "ok";

export interface MaintenanceWithDue {
  id: number;
  name: string;
  notes: string | null;
  intervalDays: number;
  roomName: string | null;
  active: boolean;
  lastDone: Date | null;
  lastDoneBy: string | null;
  nextDue: Date;
  daysUntilDue: number;
  status: MaintenanceStatus;
}

export interface MaintenanceLogEntry {
  id: number;
  completedAt: Date;
  by: string | null;
  byColor: string | null;
  notes: string | null;
}

/** Full completion history for one item, newest first. */
export async function getMaintenanceHistory(
  itemId: number,
): Promise<MaintenanceLogEntry[]> {
  return db
    .select({
      id: maintenanceLogs.id,
      completedAt: maintenanceLogs.completedAt,
      by: users.displayName,
      byColor: users.accentColor,
      notes: maintenanceLogs.notes,
    })
    .from(maintenanceLogs)
    .leftJoin(users, eq(maintenanceLogs.completedById, users.id))
    .where(eq(maintenanceLogs.itemId, itemId))
    .orderBy(desc(maintenanceLogs.completedAt));
}

const DAY_MS = 86400_000;

// "Due soon" means within a week, but the window must stay strictly below the
// interval: completing an item puts its next-due ~intervalDays away, so a
// window >= interval would keep the item in "needs attention" forever. A flat
// 7 broke interval <= 7 items; capping at interval - 1 fixes that (including
// daily items, where ceil(interval/2) still landed on the boundary).
export function dueSoonWindowDays(intervalDays: number): number {
  return Math.min(7, intervalDays - 1);
}

export async function listMaintenanceWithDue(): Promise<MaintenanceWithDue[]> {
  const items = await db
    .select({
      id: maintenanceItems.id,
      name: maintenanceItems.name,
      notes: maintenanceItems.notes,
      intervalDays: maintenanceItems.intervalDays,
      startDate: maintenanceItems.startDate,
      active: maintenanceItems.active,
      roomName: rooms.name,
    })
    .from(maintenanceItems)
    .leftJoin(rooms, eq(maintenanceItems.roomId, rooms.id))
    .where(eq(maintenanceItems.active, true));

  const now = new Date();
  const result = await Promise.all(items.map(async (item) => {
    const lastLog = (
      await db
        .select({
          completedAt: maintenanceLogs.completedAt,
          by: users.displayName,
        })
        .from(maintenanceLogs)
        .leftJoin(users, eq(maintenanceLogs.completedById, users.id))
        .where(eq(maintenanceLogs.itemId, item.id))
        .orderBy(desc(maintenanceLogs.completedAt))
        .limit(1)
    )[0];

    const anchor = lastLog
      ? lastLog.completedAt
      : new Date(item.startDate + "T00:00:00");
    const nextDue = new Date(anchor.getTime() + item.intervalDays * DAY_MS);
    const daysUntilDue = Math.ceil((nextDue.getTime() - now.getTime()) / DAY_MS);
    const status: MaintenanceStatus =
      daysUntilDue < 0
        ? "overdue"
        : daysUntilDue <= dueSoonWindowDays(item.intervalDays)
          ? "due-soon"
          : "ok";

    return {
      id: item.id,
      name: item.name,
      notes: item.notes,
      intervalDays: item.intervalDays,
      roomName: item.roomName ?? null,
      active: item.active,
      lastDone: lastLog?.completedAt ?? null,
      lastDoneBy: lastLog?.by ?? null,
      nextDue,
      daysUntilDue,
      status,
    };
  }));

  return result.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

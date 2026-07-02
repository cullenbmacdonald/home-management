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
export function getMaintenanceHistory(itemId: number): MaintenanceLogEntry[] {
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
    .orderBy(desc(maintenanceLogs.completedAt))
    .all();
}

const DAY_MS = 86400_000;
const DUE_SOON_DAYS = 7;

export function listMaintenanceWithDue(): MaintenanceWithDue[] {
  const items = db
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
    .where(eq(maintenanceItems.active, true))
    .all();

  const now = new Date();
  const result = items.map((item) => {
    const lastLog = db
      .select({
        completedAt: maintenanceLogs.completedAt,
        by: users.displayName,
      })
      .from(maintenanceLogs)
      .leftJoin(users, eq(maintenanceLogs.completedById, users.id))
      .where(eq(maintenanceLogs.itemId, item.id))
      .orderBy(desc(maintenanceLogs.completedAt))
      .limit(1)
      .get();

    const anchor = lastLog
      ? lastLog.completedAt
      : new Date(item.startDate + "T00:00:00");
    const nextDue = new Date(anchor.getTime() + item.intervalDays * DAY_MS);
    const daysUntilDue = Math.ceil((nextDue.getTime() - now.getTime()) / DAY_MS);
    const status: MaintenanceStatus =
      daysUntilDue < 0 ? "overdue" : daysUntilDue <= DUE_SOON_DAYS ? "due-soon" : "ok";

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
  });

  return result.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/db";
import { notifications, settings } from "@/db/schema";
import { listMaintenanceWithDue } from "@/lib/maintenance";

export type Severity = "overdue" | "due-soon" | "info" | "success";

/** Insert a notification for a household. Callers revalidate as needed. */
export async function createNotification(
  householdId: number,
  severity: Severity,
  text: string,
) {
  await db.insert(notifications).values({ householdId, severity, text });
}

/** YYYY-MM-DD for the local day. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getSetting(householdId: number, key: string): Promise<string | null> {
  const row = (
    await db
      .select({ value: settings.value })
      .from(settings)
      .where(and(eq(settings.householdId, householdId), eq(settings.key, key)))
      .limit(1)
  )[0];
  return row?.value ?? null;
}

async function setSetting(householdId: number, key: string, value: string) {
  await db
    .insert(settings)
    .values({ householdId, key, value })
    .onConflictDoUpdate({
      target: [settings.householdId, settings.key],
      set: { value },
    });
}

/** Start of the local day, as a Date (for "created today" dedupe). */
function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Create a due notification for each active maintenance item that is overdue or
 * due within 2 days. Idempotent per day: if a notification with the exact text
 * was already created today, it is skipped, so a same-day double-run never
 * duplicates. Records the sweep date in settings ('lastDueSweep').
 */
export async function runDueSweep(householdId: number) {
  const items = await listMaintenanceWithDue(householdId);
  const dayStart = startOfToday();

  for (const item of items) {
    if (item.daysUntilDue > 2) continue;

    let severity: Severity;
    let text: string;
    if (item.daysUntilDue < 0) {
      severity = "overdue";
      const n = -item.daysUntilDue;
      text = `${item.name} is ${n} ${n === 1 ? "day" : "days"} overdue`;
    } else if (item.daysUntilDue === 0) {
      severity = "due-soon";
      text = `${item.name} due today`;
    } else {
      severity = "due-soon";
      text = `${item.name} due in ${item.daysUntilDue} ${
        item.daysUntilDue === 1 ? "day" : "days"
      }`;
    }

    const existing = (
      await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.householdId, householdId),
            eq(notifications.text, text),
            gte(notifications.createdAt, dayStart),
          ),
        )
        .limit(1)
    )[0];
    if (existing) continue;

    await createNotification(householdId, severity, text);
  }

  await setSetting(householdId, "lastDueSweep", today());
}

/** Run the sweep at most once per local day (cheap guard for the layout). */
export async function runDueSweepIfDue(householdId: number) {
  if ((await getSetting(householdId, "lastDueSweep")) === today()) return;
  await runDueSweep(householdId);
}

export interface NotificationRow {
  id: number;
  severity: Severity;
  text: string;
  read: boolean;
  createdAt: Date;
}

/** Feed, newest first. */
export async function listNotifications(
  householdId: number,
): Promise<NotificationRow[]> {
  const rows = await db
    .select({
      id: notifications.id,
      severity: notifications.severity,
      text: notifications.text,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.householdId, householdId))
    .orderBy(desc(notifications.createdAt), desc(notifications.id));
  return rows.map((r) => ({
    id: r.id,
    severity: r.severity as Severity,
    text: r.text,
    read: r.readAt !== null,
    createdAt: r.createdAt,
  }));
}

export async function unreadCount(householdId: number): Promise<number> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.householdId, householdId),
        isNull(notifications.readAt),
      ),
    );
  return rows.length;
}

export async function markAllRead(householdId: number) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.householdId, householdId),
        isNull(notifications.readAt),
      ),
    );
}

// severity → dot color, per design handoff
export const SEVERITY_COLOR: Record<Severity, string> = {
  overdue: "#dc2626",
  "due-soon": "#d97706",
  info: "#0ea5e9",
  success: "#059669",
};

/**
 * Approximate relative time: "Just now", "2h ago", "This morning",
 * weekday for the last week, else a short date.
 */
export function relativeTime(d: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);

  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    if (d.getHours() < 12) return "This morning";
    if (hours < 12) return `${hours}h ago`;
    return d.getHours() < 18 ? "This afternoon" : "This evening";
  }

  const days = Math.floor(diffMs / 86400_000);
  if (days < 7) {
    return d.toLocaleDateString("en-US", { weekday: "short" });
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

import { inArray, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, users } from "@/db/schema";
import { listMaintenanceWithDue } from "@/lib/maintenance";
import { formatTime24, toYMD } from "@/lib/week";

export type EventType = "date" | "event" | "chore" | "upkeep";

export interface DerivedEvent {
  id: number | null; // null = derived upkeep (not deletable)
  time: string | null;
  timeLabel: string;
  title: string;
  type: EventType;
  who: string | null;
}

/**
 * Build events-by-date for the given day keys: stored events joined to their
 * assignee, plus upkeep derived from computed due dates. Overdue upkeep lands
 * on `overdueKey` (typically today); on-time upkeep on its exact due day.
 * Each day is sorted timed-first (ascending), untimed (incl. upkeep) last.
 */
export function buildEventsByDate(
  keys: string[],
  overdueKey: string,
): Record<string, DerivedEvent[]> {
  const byDate: Record<string, DerivedEvent[]> = {};
  for (const key of keys) byDate[key] = [];

  const evRows = db
    .select({
      id: events.id,
      date: events.date,
      time: events.time,
      title: events.title,
      type: events.type,
      who: users.displayName,
    })
    .from(events)
    .leftJoin(users, eq(events.assigneeId, users.id))
    .where(inArray(events.date, keys))
    .all();

  for (const e of evRows) {
    byDate[e.date]?.push({
      id: e.id,
      time: e.time,
      timeLabel: formatTime24(e.time) || "—",
      title: e.title,
      type: e.type,
      who: e.who,
    });
  }

  for (const m of listMaintenanceWithDue()) {
    const key = m.daysUntilDue < 0 ? overdueKey : toYMD(m.nextDue);
    if (!byDate[key]) continue;
    byDate[key].push({
      id: null,
      time: null,
      timeLabel: "—",
      title: m.name,
      type: "upkeep",
      who: null,
    });
  }

  for (const key of keys) {
    byDate[key].sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return 0;
    });
  }

  return byDate;
}

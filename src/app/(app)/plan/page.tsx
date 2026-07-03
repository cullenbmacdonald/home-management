import { inArray, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, meals, mealIngredients, users } from "@/db/schema";
import { listMaintenanceWithDue } from "@/lib/maintenance";
import { getWeekDays, formatTime24, toYMD } from "@/lib/week";
import {
  PlanView,
  type PlanEvent,
  type MealVM,
  type UserOption,
} from "@/components/plan-view";

export const dynamic = "force-dynamic";

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab === "meals" ? "meals" : "week";

  const week = getWeekDays(new Date());
  const keys = week.map((d) => d.date);
  const todayKey = week.find((d) => d.isToday)?.date ?? keys[0];

  // Stored events for the week, with assignee display name.
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

  const eventsByDate: Record<string, PlanEvent[]> = {};
  for (const key of keys) eventsByDate[key] = [];
  for (const e of evRows) {
    eventsByDate[e.date]?.push({
      id: e.id,
      time: e.time,
      timeLabel: formatTime24(e.time) || "—",
      title: e.title,
      type: e.type,
      who: e.who,
    });
  }

  // Derived upkeep: place items on their exact due day; overdue ones on today.
  for (const m of listMaintenanceWithDue()) {
    const key = m.daysUntilDue < 0 ? todayKey : toYMD(m.nextDue);
    if (!eventsByDate[key]) continue;
    eventsByDate[key].push({
      id: null,
      time: null,
      timeLabel: "—",
      title: m.name,
      type: "upkeep",
      who: null,
    });
  }

  // Sort each day: timed events ascending, untimed (incl. upkeep) last.
  for (const key of keys) {
    eventsByDate[key].sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return 0;
    });
  }

  // Meals for the week + their ingredients.
  const mealRows = db.select().from(meals).where(inArray(meals.date, keys)).all();
  const ingRows = mealRows.length
    ? db
        .select()
        .from(mealIngredients)
        .where(
          inArray(
            mealIngredients.mealId,
            mealRows.map((m) => m.id),
          ),
        )
        .all()
    : [];
  const mealsByDate: Record<string, MealVM> = {};
  for (const m of mealRows) {
    mealsByDate[m.date] = {
      id: m.id,
      date: m.date,
      title: m.title,
      cook: m.cook,
      out: m.out,
      added: m.ingredientsAddedAt != null,
      ingredients: ingRows
        .filter((i) => i.mealId === m.id)
        .map((i) => ({ name: i.name, category: i.category, qty: i.qty })),
    };
  }

  const userOptions: UserOption[] = db
    .select({ id: users.id, displayName: users.displayName })
    .from(users)
    .all();

  return (
    <PlanView
      tab={tab}
      week={week}
      eventsByDate={eventsByDate}
      mealsByDate={mealsByDate}
      users={userOptions}
    />
  );
}

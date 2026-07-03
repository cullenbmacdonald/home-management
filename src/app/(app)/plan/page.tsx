import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { meals, mealIngredients, users } from "@/db/schema";
import {
  getWeekDays,
  getMonthGrid,
  parseMonthParam,
  toYMD,
} from "@/lib/week";
import { buildEventsByDate } from "@/lib/plan-data";
import {
  PlanView,
  type MealVM,
  type UserOption,
} from "@/components/plan-view";

export const dynamic = "force-dynamic";

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; month?: string; day?: string }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab === "meals" ? "meals" : "calendar";

  const today = new Date();
  const todayKey = toYMD(today);

  // Month calendar: which month to show, and its full grid of day keys.
  const parsed = parseMonthParam(sp.month) ?? {
    year: today.getFullYear(),
    monthIndex: today.getMonth(),
  };
  const grid = getMonthGrid(parsed.year, parsed.monthIndex, today);
  const monthKeys = grid.cells.map((c) => c.date);

  // Selected day: explicit ?day=, else today (if in view), else 1st of month.
  const firstInMonth = grid.cells.find((c) => c.inMonth)!.date;
  const selectedDay =
    sp.day && monthKeys.includes(sp.day)
      ? sp.day
      : monthKeys.includes(todayKey)
        ? todayKey
        : firstInMonth;

  // Overdue upkeep lands on today only when today is on screen.
  const overdueKey = monthKeys.includes(todayKey) ? todayKey : firstInMonth;
  const eventsByDate = buildEventsByDate(monthKeys, overdueKey);

  // Meals tab stays on the current week.
  const week = getWeekDays(today);
  const keys = week.map((d) => d.date);
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
      grid={grid}
      selectedDay={selectedDay}
      week={week}
      eventsByDate={eventsByDate}
      mealsByDate={mealsByDate}
      users={userOptions}
    />
  );
}

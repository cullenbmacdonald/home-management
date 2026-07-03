import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { meals, mealIngredients, users } from "@/db/schema";
import { getWeekDays } from "@/lib/week";
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
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const tab = sp.tab === "meals" ? "meals" : "week";

  const week = getWeekDays(new Date());
  const keys = week.map((d) => d.date);
  const todayKey = week.find((d) => d.isToday)?.date ?? keys[0];

  const eventsByDate = buildEventsByDate(keys, todayKey);

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

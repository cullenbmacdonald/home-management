// Dev-only demo data: fills groceries, meals, events, and notifications with
// data mirroring the design prototype, dated relative to the current week.
// Idempotent per run — it clears and refills those four tables each time.
// Usage: npm run seed:demo
import { eq } from "drizzle-orm";
import { db, pool } from "../src/db";
import {
  households,
  groceryItems,
  meals,
  mealIngredients,
  events,
  notifications,
  users,
} from "../src/db/schema";
import type { GroceryCategory } from "../src/db/schema";

// Prototype display labels -> schema enum.
const CAT: Record<string, GroceryCategory> = {
  Produce: "produce",
  "Meat & Fish": "meat-fish",
  "Dairy & Eggs": "dairy-eggs",
  Pantry: "pantry",
  Frozen: "frozen",
  Household: "household",
};

/** YYYY-MM-DD for the Monday of the week containing today, plus offset days. */
function weekDate(offset: number): string {
  const now = new Date();
  const dow = now.getDay(); // Sun=0..Sat=6
  const mondayDelta = (dow === 0 ? -6 : 1) - dow;
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayDelta + offset);
  return d.toISOString().slice(0, 10);
}

// --- groceries (prototype list) ---
const grocery: [string, string, string, boolean, boolean][] = [
  ["Bananas", "Produce", "", true, true],
  ["Lemons", "Produce", "3", false, false],
  ["Broccoli", "Produce", "1 head", false, false],
  ["Avocados", "Produce", "2", false, false],
  ["Baby spinach", "Produce", "", false, true],
  ["Arugula", "Produce", "1 bag", false, false],
  ["Chicken thighs", "Meat & Fish", "2 lb", false, false],
  ["Ground beef", "Meat & Fish", "1.5 lb", false, false],
  ["Whole milk", "Dairy & Eggs", "", true, true],
  ["Eggs", "Dairy & Eggs", "1 dozen", true, true],
  ["Parmesan", "Dairy & Eggs", "", false, false],
  ["Greek yogurt", "Dairy & Eggs", "", false, true],
  ["Spaghetti", "Pantry", "1 box", false, false],
  ["Olive oil", "Pantry", "", false, true],
  ["Coffee beans", "Pantry", "", true, true],
  ["Canned tomatoes", "Pantry", "2", false, false],
  ["Sparkling water", "Pantry", "1 case", false, true],
  ["Frozen berries", "Frozen", "", false, false],
  ["Paper towels", "Household", "", false, true],
  ["Trash bags", "Household", "", false, true],
];

// --- meals (Mon..Sun of this week) ---
const mealSeed: {
  offset: number;
  title: string;
  cook: boolean;
  out: boolean;
  ingredients: [string, string, string][];
}[] = [
  { offset: 0, title: "Sheet-pan chicken & veg", cook: true, out: false, ingredients: [["Chicken thighs", "Meat & Fish", "2 lb"], ["Broccoli", "Produce", "1 head"], ["Baby potatoes", "Produce", "1.5 lb"], ["Lemons", "Produce", "2"]] },
  { offset: 1, title: "Leftovers", cook: false, out: false, ingredients: [] },
  { offset: 2, title: "Pasta al limone", cook: true, out: false, ingredients: [["Spaghetti", "Pantry", "1 box"], ["Parmesan", "Dairy & Eggs", ""], ["Lemons", "Produce", "2"], ["Arugula", "Produce", "1 bag"]] },
  { offset: 3, title: "Date night — dinner out", cook: false, out: true, ingredients: [] },
  { offset: 4, title: "Taco night w/ Sarah & Mike", cook: true, out: false, ingredients: [["Ground beef", "Meat & Fish", "1.5 lb"], ["Tortillas", "Pantry", "2 packs"], ["Avocados", "Produce", "3"], ["Cilantro", "Produce", "1 bunch"], ["Limes", "Produce", "4"], ["Cotija", "Dairy & Eggs", ""]] },
  { offset: 5, title: "Farmers market veg bowls", cook: true, out: false, ingredients: [["Farro", "Pantry", "1 bag"], ["Seasonal veg", "Produce", ""], ["Feta", "Dairy & Eggs", ""]] },
  { offset: 6, title: "Batch chili (meal prep)", cook: true, out: false, ingredients: [["Ground turkey", "Meat & Fish", "2 lb"], ["Canned tomatoes", "Pantry", "3"], ["Kidney beans", "Pantry", "2 cans"], ["Onions", "Produce", "2"]] },
];

// --- events (this week; upkeep-typed rows are derived, so omitted) ---
const eventSeed: {
  offset: number;
  time: string;
  title: string;
  type: "date" | "event" | "chore";
  who: string;
}[] = [
  { offset: 0, time: "08:00", title: "Trash & recycling out", type: "chore", who: "Cullen" },
  { offset: 0, time: "18:30", title: "Gym", type: "event", who: "" },
  { offset: 1, time: "17:00", title: "Grocery pickup — Union Market", type: "event", who: "Madison" },
  { offset: 1, time: "", title: "Water the plants", type: "chore", who: "Madison" },
  { offset: 2, time: "11:00", title: "Super re: radiator knock", type: "event", who: "" },
  { offset: 3, time: "19:30", title: "Date night — dinner at Lot 2", type: "date", who: "" },
  { offset: 4, time: "", title: "Laundry", type: "chore", who: "Madison" },
  { offset: 4, time: "20:00", title: "Dinner w/ Sarah & Mike", type: "date", who: "" },
  { offset: 5, time: "10:00", title: "Farmers market — Grand Army Plaza", type: "event", who: "" },
  { offset: 5, time: "14:00", title: "Hang bedroom shelves", type: "chore", who: "Cullen" },
  { offset: 6, time: "16:00", title: "Meal prep — batch chili", type: "chore", who: "" },
  { offset: 6, time: "19:00", title: "Building board meeting", type: "event", who: "" },
];

// --- notifications ---
const notifSeed: {
  severity: "overdue" | "due-soon" | "info" | "success";
  text: string;
  read: boolean;
}[] = [
  { severity: "overdue", text: "Smoke & CO detector test is 4 days overdue", read: false },
  { severity: "overdue", text: "Descale coffee & kettle overdue by 8 days", read: false },
  { severity: "due-soon", text: "Mini-split filters due in 2 days", read: false },
  { severity: "info", text: "Grocery pickup tomorrow at 5:00 PM", read: false },
  { severity: "success", text: "Cullen completed “Flush drain traps”", read: true },
  { severity: "success", text: "Madison moved “Walnut dining chairs” to Ordered", read: true },
];

async function main() {
  // Demo data targets the first household (the one created by the first-run seed).
  const [household] = await db.select().from(households).orderBy(households.id);
  if (!household) {
    throw new Error("No household found — run the app once to seed one first.");
  }
  const householdId = household.id;

  const allUsers = await db
    .select()
    .from(users)
    .where(eq(users.householdId, householdId));
  const idByName = (name: string) =>
    allUsers.find((u) => u.displayName === name)?.id ?? null;

  // --- clear this household's demo tables (children first) ---
  await db.delete(mealIngredients).where(eq(mealIngredients.householdId, householdId));
  await db.delete(meals).where(eq(meals.householdId, householdId));
  await db.delete(groceryItems).where(eq(groceryItems.householdId, householdId));
  await db.delete(events).where(eq(events.householdId, householdId));
  await db.delete(notifications).where(eq(notifications.householdId, householdId));

  for (const [name, cat, qty, checked, isStaple] of grocery) {
    await db
      .insert(groceryItems)
      .values({ householdId, name, category: CAT[cat], qty: qty || null, checked, isStaple });
  }

  for (const m of mealSeed) {
    const [meal] = await db
      .insert(meals)
      .values({ householdId, date: weekDate(m.offset), title: m.title, cook: m.cook, out: m.out })
      .returning({ id: meals.id });
    for (const [name, cat, qty] of m.ingredients) {
      await db
        .insert(mealIngredients)
        .values({ householdId, mealId: meal.id, name, category: CAT[cat], qty: qty || null });
    }
  }

  for (const e of eventSeed) {
    await db.insert(events).values({
      householdId,
      date: weekDate(e.offset),
      time: e.time || null,
      title: e.title,
      type: e.type,
      assigneeId: e.who ? idByName(e.who) : null,
    });
  }

  for (const n of notifSeed) {
    await db
      .insert(notifications)
      .values({ householdId, severity: n.severity, text: n.text, readAt: n.read ? new Date() : null });
  }

  console.log("demo seed complete:", {
    grocery: grocery.length,
    meals: mealSeed.length,
    events: eventSeed.length,
    notifications: notifSeed.length,
  });

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

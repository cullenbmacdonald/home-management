import bcrypt from "bcryptjs";
import type { db as DB } from "./index";
import {
  households,
  users,
  rooms,
  maintenanceItems,
  staples,
} from "./schema";
import type { GroceryCategory } from "./schema";

const CULLEN_ACCENT = "#059669";
const STEPH_ACCENT = "#0e7490";

const DEFAULT_ROOMS = [
  "Living Room",
  "Kitchen",
  "Bedroom",
  "Bathroom",
  "Office",
  "Entryway",
];

const DEFAULT_STAPLES: { name: string; category: GroceryCategory }[] = [
  { name: "Bananas", category: "produce" },
  { name: "Baby spinach", category: "produce" },
  { name: "Whole milk", category: "dairy-eggs" },
  { name: "Eggs", category: "dairy-eggs" },
  { name: "Greek yogurt", category: "dairy-eggs" },
  { name: "Coffee beans", category: "pantry" },
  { name: "Olive oil", category: "pantry" },
  { name: "Sparkling water", category: "pantry" },
  { name: "Paper towels", category: "household" },
  { name: "Trash bags", category: "household" },
];

const DEFAULT_MAINTENANCE: { name: string; intervalDays: number; notes?: string }[] = [
  { name: "Clean mini-split filters", intervalDays: 42, notes: "Pop open each unit, rinse filters, let dry fully before reinstalling." },
  { name: "Test smoke & CO detectors", intervalDays: 30 },
  { name: "Replace water filter", intervalDays: 180 },
  { name: "Deep-clean range hood filter", intervalDays: 90 },
  { name: "Check/clean drain traps", intervalDays: 90 },
  { name: "Mini-split professional service", intervalDays: 365, notes: "Annual deep clean + coil check." },
  { name: "Replace smoke detector batteries", intervalDays: 365 },
  { name: "Descale dishwasher & washing machine", intervalDays: 120 },
];

/**
 * Populate a freshly created household with sensible starter data: default
 * rooms, grocery staples, and a maintenance schedule. Scoped entirely to the
 * given household id so nothing leaks across households.
 */
export async function seedHousehold(db: typeof DB, householdId: number) {
  const today = new Date().toISOString().slice(0, 10);

  for (const [i, name] of DEFAULT_ROOMS.entries()) {
    await db.insert(rooms).values({ householdId, name, sortOrder: i });
  }
  for (const s of DEFAULT_STAPLES) {
    await db.insert(staples).values({ householdId, ...s });
  }
  for (const m of DEFAULT_MAINTENANCE) {
    await db
      .insert(maintenanceItems)
      .values({ householdId, ...m, startDate: today });
  }
}

/**
 * First-run seed: if there are no households yet, create the demo household
 * with its two owners and default starter data. Idempotent.
 */
export async function seedIfEmpty(db: typeof DB) {
  if ((await db.select().from(households)).length > 0) return;

  const [household] = await db
    .insert(households)
    .values({ name: process.env.HOUSEHOLD_NAME ?? "Our Home" })
    .returning();

  const seedUsers = [
    {
      username: process.env.USER1_USERNAME ?? "cullen",
      displayName: process.env.USER1_NAME ?? "Cullen",
      password: process.env.USER1_PASSWORD ?? "changeme",
      accentColor: CULLEN_ACCENT,
      role: "owner" as const,
    },
    {
      username: process.env.USER2_USERNAME ?? "steph",
      displayName: process.env.USER2_NAME ?? "Steph",
      password: process.env.USER2_PASSWORD ?? "changeme",
      accentColor: STEPH_ACCENT,
      role: "owner" as const,
    },
  ];
  for (const u of seedUsers) {
    await db.insert(users).values({
      householdId: household.id,
      username: u.username,
      displayName: u.displayName,
      passwordHash: bcrypt.hashSync(u.password, 10),
      accentColor: u.accentColor,
      role: u.role,
    });
  }
  console.log(
    `seeded household "${household.name}" with users:`,
    seedUsers.map((u) => u.username).join(", "),
  );

  await seedHousehold(db, household.id);
}

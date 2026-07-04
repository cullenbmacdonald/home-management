import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import type { db as DB } from "./index";
import { users, rooms, maintenanceItems, staples } from "./schema";
import type { GroceryCategory } from "./schema";

const CULLEN_ACCENT = "#059669";
const STEPH_ACCENT = "#0e7490";

/** Seed users, rooms, staples, and default maintenance items if the DB is empty. */
export async function seedIfEmpty(db: typeof DB) {
  const today = new Date().toISOString().slice(0, 10);

  if ((await db.select().from(users)).length === 0) {
    const seedUsers = [
      {
        username: process.env.USER1_USERNAME ?? "cullen",
        displayName: process.env.USER1_NAME ?? "Cullen",
        password: process.env.USER1_PASSWORD ?? "changeme",
        accentColor: CULLEN_ACCENT,
      },
      {
        username: process.env.USER2_USERNAME ?? "steph",
        displayName: process.env.USER2_NAME ?? "Steph",
        password: process.env.USER2_PASSWORD ?? "changeme",
        accentColor: STEPH_ACCENT,
      },
    ];
    for (const u of seedUsers) {
      await db
        .insert(users)
        .values({
          username: u.username,
          displayName: u.displayName,
          passwordHash: bcrypt.hashSync(u.password, 10),
          accentColor: u.accentColor,
        })
        // Concurrent build workers can each seed a fresh DB at once; the unique
        // username makes duplicate inserts a no-op instead of a crash.
        .onConflictDoNothing();
    }
    console.log("seeded users:", seedUsers.map((u) => u.username).join(", "));
  }

  // Idempotent migration for DBs seeded before accent colors / the steph rename.
  await ensureUserAccents(db);

  if ((await db.select().from(rooms)).length === 0) {
    const names = ["Living Room", "Kitchen", "Bedroom", "Bathroom", "Office", "Entryway"];
    for (const [i, name] of names.entries()) {
      await db.insert(rooms).values({ name, sortOrder: i });
    }
  }

  if ((await db.select().from(staples)).length === 0) {
    const items: { name: string; category: GroceryCategory }[] = [
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
    for (const s of items) await db.insert(staples).values(s);
  }

  if ((await db.select().from(maintenanceItems)).length === 0) {
    const items: { name: string; intervalDays: number; notes?: string }[] = [
      { name: "Clean mini-split filters", intervalDays: 42, notes: "Pop open each unit, rinse filters, let dry fully before reinstalling." },
      { name: "Test smoke & CO detectors", intervalDays: 30 },
      { name: "Replace water filter", intervalDays: 180 },
      { name: "Deep-clean range hood filter", intervalDays: 90 },
      { name: "Check/clean drain traps", intervalDays: 90 },
      { name: "Mini-split professional service", intervalDays: 365, notes: "Annual deep clean + coil check." },
      { name: "Replace smoke detector batteries", intervalDays: 365 },
      { name: "Descale dishwasher & washing machine", intervalDays: 120 },
    ];
    for (const m of items) {
      await db.insert(maintenanceItems).values({ ...m, startDate: today });
    }
  }
}

/**
 * Backfill accent colors and rename the legacy 'partner' user to 'steph' for
 * DBs that were seeded before those columns/names existed. Idempotent.
 */
async function ensureUserAccents(db: typeof DB) {
  // Rename partner -> steph only when a partner exists and no steph exists yet.
  const partner = (
    await db.select().from(users).where(eq(users.username, "partner")).limit(1)
  )[0];
  const steph = (
    await db.select().from(users).where(eq(users.username, "steph")).limit(1)
  )[0];
  if (partner && !steph) {
    const updates: { username: string; displayName?: string } = { username: "steph" };
    if (partner.displayName === "Partner") updates.displayName = "Steph";
    await db.update(users).set(updates).where(eq(users.id, partner.id));
  }

  // Set accent colors for known users still on the default.
  const accents: Record<string, string> = {
    cullen: CULLEN_ACCENT,
    partner: STEPH_ACCENT,
    steph: STEPH_ACCENT,
  };
  for (const [username, accent] of Object.entries(accents)) {
    await db
      .update(users)
      .set({ accentColor: accent })
      .where(and(eq(users.username, username), eq(users.accentColor, CULLEN_ACCENT)));
  }
  // The rule above would leave cullen correct; steph/partner get their cyan.
}

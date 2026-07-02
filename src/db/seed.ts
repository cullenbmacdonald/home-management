import bcrypt from "bcryptjs";
import type { db as DB } from "./index";
import { users, rooms, maintenanceItems } from "./schema";

/** Seed users, rooms, and default maintenance items if the DB is empty. */
export function seedIfEmpty(db: typeof DB) {
  const today = new Date().toISOString().slice(0, 10);

  if (db.select().from(users).all().length === 0) {
    const seedUsers = [
      {
        username: process.env.USER1_USERNAME ?? "cullen",
        displayName: process.env.USER1_NAME ?? "Cullen",
        password: process.env.USER1_PASSWORD ?? "changeme",
      },
      {
        username: process.env.USER2_USERNAME ?? "partner",
        displayName: process.env.USER2_NAME ?? "Partner",
        password: process.env.USER2_PASSWORD ?? "changeme",
      },
    ];
    for (const u of seedUsers) {
      db.insert(users)
        .values({
          username: u.username,
          displayName: u.displayName,
          passwordHash: bcrypt.hashSync(u.password, 10),
        })
        .run();
    }
    console.log("seeded users:", seedUsers.map((u) => u.username).join(", "));
  }

  if (db.select().from(rooms).all().length === 0) {
    const names = ["Living Room", "Kitchen", "Bedroom", "Bathroom", "Office", "Entryway"];
    names.forEach((name, i) => db.insert(rooms).values({ name, sortOrder: i }).run());
  }

  if (db.select().from(maintenanceItems).all().length === 0) {
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
      db.insert(maintenanceItems).values({ ...m, startDate: today }).run();
    }
  }
}

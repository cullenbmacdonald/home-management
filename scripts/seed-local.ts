// Quick local demo: stand up a fully usable app from an EMPTY database.
//   1. apply migrations + first-run seed (household "Our Home": cullen/steph)
//   2. fill that household with realistic demo content (groceries/meals/etc.)
//   3. create a SECOND household ("The Riveras": maya/diego) with its own data,
//      so you can log in as either and see the isolation between them.
//
// Usage:  DATABASE_URL=postgres://... npm run seed:local
// Safe to re-run: it only creates the second household if it doesn't exist yet.
import bcrypt from "bcryptjs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/db";
import { runMigrations } from "../src/db/migrate";
import { seedHousehold } from "../src/db/seed";
import {
  households,
  users,
  groceryItems,
  tasks,
} from "../src/db/schema";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  // 1. migrations + first-run seed (household 1 with cullen/steph + defaults)
  await runMigrations();
  console.log("✓ migrations + first-run seed applied");

  // 2. realistic demo content for household 1 (reuses the existing demo script)
  const demo = spawnSync("npm", ["run", "seed:demo"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (demo.status !== 0) throw new Error("seed:demo failed");

  // 3. a second household so isolation is demoable
  const existing = (
    await db.select().from(households).where(eq(households.name, "The Riveras"))
  )[0];
  if (existing) {
    console.log("✓ second household already exists — skipping");
    await pool.end();
    return;
  }

  const [rivera] = await db
    .insert(households)
    .values({ name: "The Riveras" })
    .returning();

  const members = [
    { username: "maya", displayName: "Maya", accentColor: "#7c3aed", role: "owner" as const },
    { username: "diego", displayName: "Diego", accentColor: "#db2777", role: "member" as const },
  ];
  for (const m of members) {
    await db.insert(users).values({
      householdId: rivera.id,
      username: m.username,
      displayName: m.displayName,
      passwordHash: bcrypt.hashSync("changeme", 10),
      accentColor: m.accentColor,
      role: m.role,
    });
  }
  await seedHousehold(db, rivera.id);

  // a little distinctive content so it's obvious which household you're in
  const groceries: { name: string; category: "produce" | "pantry" | "household" }[] = [
    { name: "Plantains", category: "produce" },
    { name: "Black beans", category: "pantry" },
    { name: "Dish soap", category: "household" },
  ];
  for (const g of groceries) {
    await db.insert(groceryItems).values({ householdId: rivera.id, ...g });
  }
  await db.insert(tasks).values([
    { householdId: rivera.id, title: "Fix the porch light" },
    { householdId: rivera.id, title: "Book HVAC tune-up" },
  ]);

  console.log(`✓ second household "The Riveras" created (maya/diego, pw: changeme)`);
  console.log("\nDemo ready. Log in at http://localhost:3000 as:");
  console.log("  cullen / changeme   (Our Home)");
  console.log("  maya   / changeme   (The Riveras)");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

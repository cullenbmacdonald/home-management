// Manual seed entrypoint — the app also seeds itself on first boot.
// Usage: npm run seed  (override users via USER1_*/USER2_* env vars)
import { db, pool } from "../src/db";
import { seedIfEmpty } from "../src/db/seed";

async function main() {
  await seedIfEmpty(db);
  console.log("seed complete");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

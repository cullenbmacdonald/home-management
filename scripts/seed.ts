// Manual seed entrypoint — the app also seeds itself on first boot.
// Usage: npm run seed  (override users via USER1_*/USER2_* env vars)
import { db } from "../src/db";
import { seedIfEmpty } from "../src/db/seed";

seedIfEmpty(db);
console.log("seed complete");

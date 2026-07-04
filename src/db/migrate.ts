import path from "path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./index";
import { seedIfEmpty } from "./seed";

let ran: Promise<void> | null = null;

/**
 * Apply pending migrations and run the first-run seed. Idempotent and cached,
 * so calling it more than once per process is a no-op. Invoked from
 * instrumentation's register() on server startup.
 */
export function runMigrations(): Promise<void> {
  if (!ran) {
    ran = (async () => {
      await migrate(db, {
        migrationsFolder: path.join(process.cwd(), "drizzle"),
      });
      await seedIfEmpty(db);
    })();
  }
  return ran;
}

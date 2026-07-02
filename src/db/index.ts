import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "path";
import fs from "fs";
import * as schema from "./schema";

const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

const sqlite = new Database(path.join(dataDir, "homebase.db"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { dataDir };

// Apply migrations and first-run seed on startup (no-ops when already done)
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { seedIfEmpty } from "./seed";
migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
seedIfEmpty(db);

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import path from "path";
import fs from "fs";
import * as schema from "./schema";

// `dataDir` still backs on-disk uploads (documents); the database itself now
// lives in an external Postgres instance addressed by DATABASE_URL.
const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

const connectionString =
  process.env.DATABASE_URL ?? "postgres://localhost:5432/homebase";

// Reuse a single pool across hot-reloads in dev to avoid exhausting connections.
const globalForDb = globalThis as unknown as { __pgPool?: Pool };
const pool = globalForDb.__pgPool ?? new Pool({ connectionString });
if (process.env.NODE_ENV !== "production") globalForDb.__pgPool = pool;

export const db = drizzle(pool, { schema });
export { dataDir, pool };

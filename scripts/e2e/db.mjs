// Shared Postgres access for e2e specs: async get/all/run helpers over the
// same DATABASE_URL the app uses.
import pg from "pg";

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgres://localhost:5432/homebase",
});

/** All rows. Params use $1, $2, … placeholders. */
export const all = async (text, params) => (await pool.query(text, params)).rows;

/** First row (or undefined). */
export const get = async (text, params) =>
  (await pool.query(text, params)).rows[0];

/** Execute without reading rows. */
export const run = async (text, params) => {
  await pool.query(text, params);
};

/** Close the pool so the process can exit. */
export const close = () => pool.end();

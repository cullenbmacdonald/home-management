// Runs once when a Next.js server instance boots (and completes before the
// server handles requests). We use it to apply DB migrations + first-run seed
// against Postgres — doing this here rather than at module import keeps
// `next build` from needing a live database.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runMigrations } = await import("./db/migrate");
    await runMigrations();
  }
}

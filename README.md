# Homebase

Home management app for our apartment (Park Slope, two people). A mobile-first
(430px) PWA with a sticky serif header and five tabs: Home, Upkeep, Plan, Shop,
More.

Features:

- **Dashboard** — needs-attention upkeep (overdue/due-soon), today's events,
  grocery progress, and live Home Assistant tiles.
- **Upkeep** — recurring maintenance with computed due dates, one-tap Done, a
  bottom-sheet detail with completion history.
- **Plan** — a Week view (7-day strip, per-day event cards, derived upkeep
  entries) and a Meals view that pushes a dinner's ingredients to the shop list.
- **Shop** — aisle-grouped grocery list, quick-add, staples restock, clear-in-cart.
- **More** — Tasks, Wishlist (spend pipeline), Inventory (warranties),
  Documents (upload/download), Contacts (tap-to-call).
- **Home Assistant** — temperature tiles, thermostat ± , lock and switch
  toggles, all proxied server-side.
- **Notifications** — daily due sweep + completion/wishlist events, bell badge.
- **Settings** — account, password change, Home Assistant connection, connected
  MCP apps.
- **Claude (MCP)** — connect Claude over remote MCP behind an OAuth 2.1 flow to
  read the household and manage todos, groceries, meals, and events (see below).

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- PostgreSQL via Drizzle ORM (external instance, one DB/schema per app)
- Cookie-session auth (per-household signup/invite), with brute-force rate limiting
- Own OAuth 2.1 server + MCP endpoint (`mcp-handler`) for Claude connectivity
- Self-hosted via Docker

## Development

```bash
npm install
export DATABASE_URL=postgres://user:pass@localhost:5432/homebase
npm run dev        # http://localhost:3000
```

Point `DATABASE_URL` at a Postgres database. The schema is migrated and seeded
automatically on first server boot (via Next `instrumentation`). Default logins:
`cullen` / `changeme` and `madison` / `changeme` — override with `USER1_*` /
`USER2_*` env vars before first boot.

Schema changes: edit `src/db/schema.ts`, then `npm run db:generate` to create a
migration (applied automatically at startup).

Load rich demo data (groceries, meals, events, notifications) for local dev:

```bash
npm run seed:demo
```

End-to-end tests (Playwright) live in `scripts/e2e/`. Run the server on :3777
against a fresh Postgres database, then:

```bash
DATABASE_URL=postgres://user:pass@localhost:5432/homebase_test \
  PORT=3777 node .next/standalone/server.js &   # wait for boot
npm run e2e
```

Home Assistant behaviors are tested against an in-memory mock (no real HA
needed); the suite covers global chrome, every module, and the v1 regression
guarantees.

## Self-hosting

```bash
USER1_PASSWORD=... USER2_PASSWORD=... docker compose up -d --build
```

Set `DATABASE_URL` to a database on your Postgres instance (see
`docker-compose.yml`). Uploaded documents live in the `homebase-data` volume at
`/data`; the rest of the data lives in Postgres. Back up both.

For the Claude/MCP integration, also set **`MCP_BASE_URL`** to the public HTTPS
origin (`docker-compose.yml` defaults it to `https://homebase.cullenmacdonald.com`)
and, optionally, **`CRON_SECRET`** to enable the expired-token cleanup route.
`MCP_BASE_URL` is required — without it the OAuth server advertises `localhost`
and clients refuse to connect.

## Connect Claude (MCP)

Homebase runs its own OAuth 2.1 server and a remote MCP endpoint at `/api/mcp`,
so Claude can read the household and manage todos, groceries, meals, and events.

```bash
claude mcp add --transport http homebase https://homebase.cullenmacdonald.com/api/mcp
```

Then run the client's authenticate step: it registers itself (Dynamic Client
Registration), opens the browser to the Homebase login + a consent screen, and
on approval gets a scoped token. Reads need `homebase:read`, writes need
`homebase:write`. Manage or revoke connected clients under **Settings →
Connected apps**. Requires a public HTTPS origin and `MCP_BASE_URL` set to it.

## Layout

- `src/db/` — schema, connection, migrations bootstrap, seed
- `src/lib/` — auth, maintenance due-date logic, formatters
- `src/app/(app)/` — authed pages, one folder per module, `actions.ts` per module
- `src/components/` — client components (interactive rows/cards/buttons)

## Docs

- [docs/product.md](docs/product.md) — vision, UX principles, feature specs, roadmap
- [docs/architecture.md](docs/architecture.md) — stack, conventions, auth, MCP/OAuth, testing, deployment, gotchas
- [docs/mcp-oauth-plan.md](docs/mcp-oauth-plan.md) — MCP + OAuth 2.1 design record (shipped)
- [docs/instacart-integration-plan.md](docs/instacart-integration-plan.md) — Instacart integration research/plan (not yet built)

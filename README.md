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
- **Settings** — account, password change, Home Assistant connection.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- SQLite via Drizzle ORM (single file in `data/`, WAL mode)
- Simple cookie-session auth, two seeded accounts
- Self-hosted via Docker

## Development

```bash
npm install
npm run dev        # http://localhost:3000
```

The database is created, migrated, and seeded automatically on first run
(`data/homebase.db`). Default logins: `cullen` / `changeme` and
`steph` / `changeme` — override with `USER1_*` / `USER2_*` env vars before
first boot.

Schema changes: edit `src/db/schema.ts`, then `npm run db:generate` to create a
migration (applied automatically at startup).

Load rich demo data (groceries, meals, events, notifications) for local dev:

```bash
npm run seed:demo
```

End-to-end tests (Playwright) live in `scripts/e2e/`. Run the server on :3777
against a fresh DB, then:

```bash
rm -rf data && PORT=3777 npm start &   # wait for boot
npm run e2e
```

Home Assistant behaviors are tested against an in-memory mock (no real HA
needed); the suite covers global chrome, every module, and the v1 regression
guarantees.

## Self-hosting

```bash
USER1_PASSWORD=... USER2_PASSWORD=... docker compose up -d --build
```

Data (SQLite DB + uploaded documents) lives in the `homebase-data` volume,
mounted at `/data`. Back that up and you've backed up everything.

## Layout

- `src/db/` — schema, connection, migrations bootstrap, seed
- `src/lib/` — auth, maintenance due-date logic, formatters
- `src/app/(app)/` — authed pages, one folder per module, `actions.ts` per module
- `src/components/` — client components (interactive rows/cards/buttons)

## Docs

- [docs/product.md](docs/product.md) — vision, UX principles, feature specs, roadmap
- [docs/architecture.md](docs/architecture.md) — stack, conventions, auth, testing, deployment, gotchas

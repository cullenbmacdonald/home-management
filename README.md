# Homebase

Home management app for our apartment: recurring maintenance, shared tasks,
furniture wishlist, appliance inventory, documents, and contacts.

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
`partner` / `changeme` — override with `USER1_*` / `USER2_*` env vars before
first boot.

Schema changes: edit `src/db/schema.ts`, then `npm run db:generate` to create a
migration (applied automatically at startup).

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

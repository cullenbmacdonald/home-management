# Homebase — Technical Architecture

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router, TS) | One codebase; React frontend (wife's stack), server code approachable from Go/Python background |
| Database | SQLite + Drizzle ORM | Two users, self-hosted: zero ops, one file, typed schema + generated migrations |
| Styling | Tailwind v4 | Mobile-first utilities, no CSS architecture to maintain |
| Auth | bcrypt + cookie sessions (own code) | Two fixed accounts; no third-party services anywhere |
| Deploy | Docker (standalone output) | Single container + one `/data` volume |

## Layout

```
src/db/          schema.ts (all tables), index.ts (connection + auto-migrate
                 + first-boot seed), seed.ts
src/lib/         auth.ts (sessions), maintenance.ts (due-date computation),
                 format.ts (dates/money/intervals)
src/app/login/   public login page + action
src/app/(app)/   authed pages; one folder per module, each with page.tsx
                 and actions.ts ("use server" mutations)
src/app/api/     route handlers (document download)
src/components/  client components (anything interactive)
scripts/         seed.ts (manual), e2e.mjs (Playwright suite)
drizzle/         generated SQL migrations (checked in)
```

## Patterns & conventions

- **Server components read, server actions write.** Pages query Drizzle
  directly (better-sqlite3 is synchronous — no await on reads) and are
  `force-dynamic`. Mutations live in each module's `actions.ts`, start with
  `await requireUser()`, and end with `revalidatePath`.
- **Client components only where needed** — buttons/rows that mutate via
  `useTransition` + server action, or stateful inputs (interval picker).
  They live in `src/components/`.
- **Due-date logic**: next-due = last completion log's timestamp + interval
  (or item `startDate` when never done). Computed in `src/lib/maintenance.ts`,
  never stored. Overdue < 0 days; due-soon ≤ 7 days.
- **Schema changes**: edit `src/db/schema.ts` → `npm run db:generate` →
  commit the new file in `drizzle/`. Migrations apply automatically at boot
  (`src/db/index.ts`), so deploys are just "start the new image".
- **IDs in URLs** are integer PKs; sessions are 64-hex random tokens stored
  server-side (90-day expiry).

## Auth model

Two seeded accounts (`USER1_*` / `USER2_*` env vars, defaults
`cullen`/`partner` + `changeme`, only read when the users table is empty).
`requireUser()` redirects to `/login`; the `(app)` layout calls it so every
page inside is protected. Document downloads check the session in the route
handler. No CSRF token: mutations are server actions (POST + origin-checked
by Next) and the session cookie is `SameSite=Lax`.

## Storage & backups

Everything lives in `DATA_DIR` (default `./data`, `/data` in Docker):
- `homebase.db` (+ WAL files) — SQLite
- `uploads/` — documents, stored under random hex names; original filename,
  mime type, and size kept in the `documents` table

Back up the volume, you've backed up the app. WAL mode is on; copy the DB
with `sqlite3 homebase.db ".backup ..."` if backing up while running.

## Testing

`npm run e2e` (server must be running on :3777) drives a real Chromium via
Playwright through every feature: login, dashboard, add/complete task,
mark maintenance done + attribution, wishlist add + status + totals,
inventory add, vendor add, document upload/download, logout. Run it against
a **fresh** DB (`rm -rf data`, restart server) — assertions assume seed state.

## Gotchas learned the hard way

- **Don't put unlayered `body { background: … }` rules in globals.css** —
  they beat every Tailwind utility (utilities live in a cascade layer, and
  unlayered rules win). The create-next-app boilerplate did exactly this and
  its `prefers-color-scheme: dark` block turned the app black for dark-mode
  browsers. globals.css should stay nearly empty; put colors on elements via
  utilities.
- **`next start` keeps serving stale HTML after a rebuild** — always restart
  the process after `npm run build` (kill by port: `lsof -ti :3777 | xargs kill`),
  otherwise HTML references CSS chunk names that no longer exist (500s).
- **Deleting `data/` while the server runs doesn't reset anything** — the
  process holds the old inode. Stop the server first.
- **AGENTS.md warning**: this repo's Next.js version may differ from what
  LLMs assume — check `node_modules/next/dist/docs/` when APIs act surprising.

## Deployment

```bash
USER1_PASSWORD=... USER2_PASSWORD=... docker compose up -d --build
```

Multi-stage Dockerfile builds the standalone server; runtime image contains
only the standalone bundle, static assets, and `drizzle/` migrations.
Container listens on :3000 (mapped to host 3000 in compose). Put it behind
Tailscale or a reverse proxy with TLS — the session cookie is `secure` in
production, so plain-HTTP LAN access won't keep you logged in.

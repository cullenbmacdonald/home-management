# Homebase — Technical Architecture

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router, TS) | One codebase; React frontend (wife's stack), server code approachable from Go/Python background |
| Database | PostgreSQL + Drizzle ORM | Runs against a shared self-hosted Postgres (one DB/schema per app); typed schema + generated migrations |
| Styling | Tailwind v4 | Mobile-first utilities, no CSS architecture to maintain |
| Auth | bcrypt + cookie sessions (own code) | Per-household accounts via signup/invite; no third-party services anywhere |
| MCP + OAuth | Own OAuth 2.1 server + `mcp-handler` | Lets Claude connect over remote MCP; the app is both authorization server and resource server (see below) |
| Deploy | Docker (standalone output) | Single container; `DATABASE_URL` to external Postgres + a small `/data` volume for uploads |

## Layout

```
src/db/          schema.ts (all tables), index.ts (pg pool + Drizzle),
                 migrate.ts (apply migrations + first-boot seed), seed.ts
src/instrumentation.ts  runs migrate.ts once on server boot (Next
                 `register()` hook) — not at build time
src/lib/         auth.ts (sessions + `householdFromToken` for MCP),
                 maintenance.ts (due-date computation),
                 format.ts (dates/money/intervals),
                 notifications.ts (due sweep + unread count + event helpers),
                 ha.ts (Home Assistant client — states read + service calls),
                 oauth.ts (OAuth crypto/PKCE/client helpers),
                 rate-limit.ts (DB-backed sliding-window limiter),
                 mcp-tools.ts (the 19 MCP tool definitions),
                 connected-apps.ts (list/revoke MCP clients),
                 oauth-cleanup.ts (prune expired tokens + old rate-limit rows),
                 tasks.ts / groceries-data.ts / meals.ts / household.ts
                 (Ctx-scoped data fns shared by server actions AND MCP tools)
src/app/login/   public login page + action
src/app/signup/  public signup (new household or join via invite)
src/app/oauth/   OAuth 2.1 authorization server: authorize (+ consent),
                 token, register (DCR), revoke
src/app/.well-known/  OAuth metadata (protected-resource + authorization-server)
src/app/api/[transport]/  the MCP endpoint (/api/mcp) via mcp-handler
src/app/(app)/   authed pages; one folder per module, each with page.tsx
                 and actions.ts ("use server" mutations). Modules: dashboard
                 (page.tsx at root), maintenance (upkeep), plan (week+meals),
                 groceries (shop), more, tasks, wishlist, inventory,
                 documents, vendors (contacts), notifications, home (HA),
                 settings. layout.tsx wraps all in AppHeader + BottomNav +
                 PageTransition and runs the daily due sweep.
src/app/api/     route handlers (document download)
src/components/  client components (anything interactive): app-header,
                 bottom-nav, bottom-sheet, page-transition (route fade+slide),
                 plan-view, shop-list, ha tiles/controls, module rows/cards
scripts/         seed.ts (first-boot seed), seed-demo.ts (rich demo data),
                 gen-icons.mjs (PWA icons), e2e/ (Playwright suite)
drizzle/         generated SQL migrations (checked in)
```

## Patterns & conventions

- **Server components read, server actions write.** Pages query Drizzle
  directly (`await` — node-postgres is async) and are `force-dynamic`.
  Mutations live in each module's `actions.ts`, start with
  `await requireUser()`, and end with `revalidatePath`.
- **Client components only where needed** — buttons/rows that mutate via
  `useTransition` + server action, or stateful inputs (interval picker).
  They live in `src/components/`.
- **Due-date logic**: next-due = last completion log's timestamp + interval
  (or item `startDate` when never done). Computed in `src/lib/maintenance.ts`,
  never stored. Overdue < 0 days; due-soon within `min(7, interval - 1)`
  days — capped below the interval so short-interval items don't sit in
  "needs attention" permanently right after being completed.
- **Schema changes**: edit `src/db/schema.ts` → `npm run db:generate` →
  commit the new file in `drizzle/`. Migrations apply automatically on server
  boot (`src/instrumentation.ts` → `src/db/migrate.ts`), so deploys are just
  "start the new image". Running in `instrumentation` rather than at import
  keeps `next build` from needing a live database.
- **IDs in URLs** are integer PKs; sessions are 64-hex random tokens stored
  server-side (90-day expiry).
- **Notifications** are generated server-side, never by a cron. A due-check
  sweep (`runDueSweepIfDue` in `src/lib/notifications.ts`) runs on the first
  authed request of each day from the `(app)` layout, inserting overdue /
  due-soon rows at most once per item per day. On-mutation events (upkeep
  completion, wishlist stage move) insert success rows inline from the
  relevant `actions.ts`. Unread count = `readAt IS NULL`.
- **Home Assistant is reached only from the server.** `src/lib/ha.ts` reads
  base URL + long-lived token from the `settings` table and calls HA's REST
  API (`GET /api/states`, `POST /api/services/{domain}/{service}`). The token
  never leaves the server; Home/dashboard tiles degrade gracefully to a setup
  prompt (unconfigured) or a stale/error chip (unreachable).
- **Route transitions**: `PageTransition` (client) keys a wrapper on
  `usePathname` to replay a subtle fade+slide (`routeIn`, ~0.28s) on
  navigation; skipped under `prefers-reduced-motion`. Only that keyframe and
  `sheetIn` live in globals.css — everything else is Tailwind utilities.
- **PWA**: `src/app/manifest.ts` (emerald `#059669` theme, `#faf9f8`
  background) + `layout.tsx` viewport themeColor + apple-web-app metadata;
  icons in `public/icon-{192,512}.png` regenerated by `scripts/gen-icons.mjs`.

## Auth model

Accounts are per-household. The first user is seeded (`USER1_*` / `USER2_*` env
vars, defaults `cullen`/`madison` + `changeme`, only read when the users table is
empty); further users self-serve via `/signup` (create a new household, or join
one with an invite code). **Usernames are globally unique** (case-insensitive
unique index on `lower(username)`) so a username identifies exactly one user —
which is what login relies on. `requireUser()` redirects to `/login`; the
`(app)` layout calls it so every page inside is protected. `requireHousehold()`
is the single choke point for household-scoped data — every server action and
page query derives its `householdId` from it, and every query keeps an
`and(eq(id), eq(householdId))` guard so one household can never touch another's
rows. Document downloads check the session in the route handler. No CSRF token:
mutations are server actions (POST + origin-checked by Next) and the session
cookie is `SameSite=Lax`.

**Brute-force protection** (`src/lib/rate-limit.ts`): a DB-backed sliding-window
limiter (table `rate_limit_hits`, no Redis). Login locks out after 5 failed
attempts per username or 15 per IP within 15 min (reset on success, checked
before bcrypt); Dynamic Client Registration is capped at 20/hour per IP. Old
hits are pruned by the OAuth cleanup sweep.

## MCP server & OAuth

Homebase exposes a **remote MCP endpoint** (`POST /api/mcp`, Streamable HTTP via
`mcp-handler`, stateless) so Claude (Code/Desktop) can read household data and
manage todos, groceries, meals, and events. The app is **both** the OAuth 2.1
authorization server and the resource server.

- **Discovery**: `/.well-known/oauth-protected-resource` (points at the AS) and
  `/.well-known/oauth-authorization-server` (issuer, endpoints, S256). An
  unauthenticated `/api/mcp` returns `401` + `WWW-Authenticate` with the
  `resource_metadata` URL, which is how a client bootstraps the flow.
- **Authorization server** (`src/app/oauth/*`): `register` (RFC 7591 Dynamic
  Client Registration — Claude registers itself; `http://localhost` redirect
  URIs are allowed for the CLI/native callback), `authorize` (reuses the login
  session + a consent screen), `token` (authorization_code + rotating
  refresh_token), `revoke` (RFC 7009).
- **Security**: PKCE **S256 required** (plain rejected); auth codes are
  single-use (60s) claimed atomically; tokens/codes/secrets are SHA-256 hashed
  at rest; redirect URIs exact-matched; **tokens are audience-bound** to the
  canonical `MCP_BASE_URL + /api/mcp` and rejected at the resource server
  otherwise. The RFC 8707 `resource` param is accepted in any form on our own
  origin but the token is always bound to the canonical resource.
- **Token → data**: `verifyToken` (in the `[transport]` route) validates the
  bearer token via `householdFromToken()` and puts `{ householdId, userId }` on
  the request; each MCP tool builds a `Ctx` from it and calls the same
  `src/lib/*` data functions the web server actions use. Writes require the
  `homebase:write` scope.
- **Management**: Settings → Connected apps lists a household's live MCP clients
  and revokes them (`src/lib/connected-apps.ts`); expired tokens are swept by
  `/api/cron/oauth-cleanup` (gated on `CRON_SECRET`).
- **`MCP_BASE_URL` is mandatory in production** — issuer, metadata, audience,
  and redirects all derive from it. Unset, it defaults to `localhost:3000` and
  every client rejects the server.

## Storage & backups

Data lives in two places:
- **Postgres** — all application tables (addressed by `DATABASE_URL`). Back up
  with `pg_dump`.
- **`DATA_DIR`** (default `./data`, `/data` in Docker) — `uploads/`: documents
  stored under random hex names; their original filename, mime type, and size
  are kept in the `documents` table.

Back up both the Postgres database and the `/data` volume and you've backed up
the whole app.

## Testing

`npm run e2e` runs `scripts/e2e/run.mjs`, which executes every
`scripts/e2e/*.spec.mjs` in order against a real Chromium via Playwright. The
server must already be running on :3777 against a **fresh** Postgres database
(point `DATABASE_URL` at an empty DB and boot the server, which migrates +
seeds it) — assertions assume first-boot seed state. Specs read/write the DB
through `scripts/e2e/db.mjs` (a small async `pg` helper on the same
`DATABASE_URL`). Each check prints `PASS`/`FAIL`; the runner exits non-zero if
any spec fails.

Specs (one per module, ~180 checks total): `chrome.spec` (global chrome —
tabs, back chevron, avatar, fonts, tap targets, light theme), `schema.spec`
(tables, staples, accent colors, `seed:demo`), `upkeep.spec`, `shop.spec`,
`plan.spec` (week + meals), `dashboard.spec`, `more.spec`,
`notifications.spec`, `ha.spec`, `v1.spec` (v1 regression guarantees).

Home Assistant behaviors run against `scripts/e2e/mock-ha.mjs` — a tiny
in-memory HTTP server on :8123 that serves canned `/api/states`, records
service calls, and exposes `/calls` for assertions (bearer `test-token`). No
real HA is needed. `ha.spec` starts and stops it itself.

`scripts/e2e/screenshots.mjs [outDir]` captures 430px screenshots of every
screen for visual review. `scripts/seed-demo.ts` (`npm run seed:demo`) loads
rich demo data (groceries, meals, events, notifications) for local dev and is
exercised by `schema.spec`.

## Gotchas learned the hard way

- **Don't put unlayered `body { background: … }` rules in globals.css** —
  they beat every Tailwind utility (utilities live in a cascade layer, and
  unlayered rules win). The create-next-app boilerplate did exactly this and
  its `prefers-color-scheme: dark` block turned the app black for dark-mode
  browsers. globals.css should stay nearly empty; put colors on elements via
  utilities.
- **`next start` doesn't work with `output: "standalone"`** — it warns and
  serves nothing useful. Run the built app with `node .next/standalone/server.js`
  (what Docker does). Always restart the process after `npm run build`,
  otherwise HTML references CSS chunk names that no longer exist (500s).
- **To reset to first-boot state, reset the Postgres database** (drop +
  recreate the DB, or `TRUNCATE` the tables) and restart the server so
  migrations + seed re-run. Deleting `data/` only clears uploaded documents.
- **AGENTS.md warning**: this repo's Next.js version may differ from what
  LLMs assume — check `node_modules/next/dist/docs/` when APIs act surprising.

## Deployment

```bash
DATABASE_URL=postgres://homebase:...@postgres:5432/homebase \
  USER1_PASSWORD=... USER2_PASSWORD=... docker compose up -d --build
```

`DATABASE_URL` points at a database/user on your Postgres instance (in
Portainer, set it as a stack environment variable). For the MCP/OAuth server,
also set **`MCP_BASE_URL`** to the public HTTPS origin
(`https://homebase.cullenmacdonald.com` — `docker-compose.yml` defaults to this)
and optionally **`CRON_SECRET`** to enable the token-cleanup route. Multi-stage
Dockerfile
builds the standalone server; runtime image contains only the standalone
bundle, static assets, and `drizzle/` migrations, and runs migrations on boot.
Container listens on :3000 (mapped to host 3000 in compose). Put it behind
Tailscale or a reverse proxy with TLS — the session cookie is `secure` in
production, so plain-HTTP LAN access won't keep you logged in.

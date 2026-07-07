# Homebase MCP + OAuth 2.1 — Design & Build Plan

> **STATUS: ✅ SHIPPED (2026-07-06).** Live at `https://homebase.casa/api/mcp`
> and connected from Claude Code. P1–P5 complete; P6 (live handshake) done. This doc is kept
> as the design record — for how it actually works today see the "MCP server & OAuth" section
> of `docs/architecture.md`. Notable deltas from the original plan, discovered during rollout:
> - **Canonical endpoint** is `/api/mcp` (route `src/app/api/[transport]/route.ts`, `basePath:/api`).
> - **`resource` param leniency** — Claude Code sends the RFC 8707 resource indicator as the
>   bare origin, not `…/api/mcp`; `/oauth/authorize` accepts any resource on our origin but
>   always binds the token to the canonical resource (audience validation stays strict).
> - **`MCP_BASE_URL` is mandatory in prod** — everything (issuer, metadata, audience, redirects)
>   derives from it; without it the server advertises `localhost:3000` and every client rejects it.
> - **Added beyond the plan:** DB-backed rate limiting (login lockout + DCR cap), globally-unique
>   usernames (fixed a latent login-ambiguity bug), and `docker-compose` env wiring.

**Goal:** Let Claude (Claude Code + Claude Desktop) connect to Homebase over remote MCP
and do real work — create todos, edit the grocery list, read across the household — behind
a proper OAuth 2.1 authorization flow.

**Decisions locked in:**
- Reachability: public HTTPS domain already in front of the app.
- Clients: Claude Code + Claude Desktop (both use the remote OAuth flow with Dynamic Client Registration).
- v1 tool scope: **broad read, targeted writes** (read most entities; write todos, groceries, meals/events).

---

## 1. Architecture

Homebase plays **two OAuth roles at once**, both hosted in this Next.js app:

- **Authorization Server (AS)** — registers clients, logs the user in (reusing the existing
  cookie session), shows a consent screen, issues/refreshes/revokes tokens.
- **Resource Server (RS)** — the `/mcp` endpoint. Validates bearer tokens and exposes tools.

```
Claude (MCP client)                Homebase (AS + RS)
  │  POST /mcp  (no token)  ─────►  401 + WWW-Authenticate: resource_metadata=…
  │  GET /.well-known/oauth-protected-resource  ─────►  { authorization_servers:[…] }
  │  GET /.well-known/oauth-authorization-server ────►  { authorize, token, register … }
  │  POST /oauth/register (DCR)  ─────►  client_id (+secret)
  │  browser → GET /oauth/authorize  ─────►  login (if needed) → consent → code
  │  POST /oauth/token (code + PKCE verifier + resource) ─────►  access + refresh token
  │  POST /mcp  Authorization: Bearer …  ─────►  tool result (household-scoped)
```

Token model: **opaque random tokens, SHA-256 hashed at rest**, validated by DB lookup.
No JWTs — a lookup reuses the exact pattern the app already uses for `sessions`, and gives
us free revocation. Access tokens short-lived (1h); refresh tokens rotate on use.

---

## 2. The core refactor: one household-scoping choke point, two entry paths

Today every mutation is an inline `"use server"` action that calls `requireHousehold()`
(reads the cookie) and then runs a `householdId`-guarded Drizzle query. MCP tools need the
same DB logic but with the household derived from a **token** instead.

**Refactor:** extract each action's body into a pure, context-taking function in `src/lib`:

```ts
// src/lib/tasks.ts
export type Ctx = { householdId: number; userId: number };
export async function createTask(ctx: Ctx, input: { title: string; assigneeId?: number; dueDate?: string }) { … }
export async function completeTask(ctx: Ctx, id: number) { … }
export async function listTasks(ctx: Ctx) { … }
```

Then:
- Server actions become thin wrappers: `const ctx = await requireHousehold(); return createTask(ctx, …)` + `revalidatePath`.
- MCP tools call the same functions with `ctx` built from the validated token.

This **preserves the security invariant** the codebase already documents: every path derives
`householdId` from an authenticated principal, and every query keeps its
`and(eq(id), eq(householdId))` guard. Nothing bypasses it. This refactor is the bulk of the
v1 work (todos, groceries, meals/events for writes; read functions for the rest).

New helper alongside `requireHousehold()`:

```ts
// src/lib/auth.ts
export async function householdFromToken(token: string): Promise<Ctx | null>
```

---

## 3. Database (new Drizzle tables + migration)

All in `src/db/schema.ts`, migrated via the existing `drizzle-kit generate` flow.

- **`oauth_clients`** — `clientId` (pk), `clientSecretHash` (nullable → public clients),
  `clientName`, `redirectUris` (json array), `grantTypes`, `tokenEndpointAuthMethod`,
  `createdAt`. Populated by DCR.
- **`oauth_auth_codes`** — `codeHash` (pk), `clientId`, `userId`, `redirectUri`,
  `codeChallenge`, `codeChallengeMethod`, `scope`, `resource`, `expiresAt` (~60s),
  `consumedAt`. Single-use.
- **`oauth_access_tokens`** — `tokenHash` (pk), `clientId`, `userId`, `householdId`,
  `scope`, `resource` (audience), `expiresAt`.
- **`oauth_refresh_tokens`** — `tokenHash` (pk), `clientId`, `userId`, `scope`,
  `expiresAt`, `rotatedAt`.

`householdId` is denormalized onto the access token so validation is one lookup + no join.

---

## 4. Endpoints (Next 16 App Router route handlers)

None of these live under the `(app)` route group, so they skip the app's page-level
`requireUser()`. There is no global middleware, so nothing to exempt.

**Metadata (public, no auth):**
- `GET /.well-known/oauth-protected-resource` (and `/.well-known/oauth-protected-resource/mcp`)
  → `{ resource: "https://HOST/mcp", authorization_servers: ["https://HOST"] }`
- `GET /.well-known/oauth-authorization-server`
  → issuer, `authorization_endpoint`, `token_endpoint`, `registration_endpoint`,
  `revocation_endpoint`, `response_types_supported:["code"]`,
  `grant_types_supported:["authorization_code","refresh_token"]`,
  `code_challenge_methods_supported:["S256"]`, `token_endpoint_auth_methods_supported`,
  `scopes_supported`.

**Authorization Server:**
- `POST /oauth/register` — DCR (RFC 7591). Validate + store client metadata, return
  `client_id` (+ secret for confidential clients).
- `GET /oauth/authorize` — validate `client_id`, **exact-match** `redirect_uri`, `resource`,
  `scope`, `state`, and PKCE `code_challenge` (reject `plain`, require `S256`). If no session
  cookie → redirect to `/login?next=<authorize url>`. Then render the **consent screen**.
- `POST /oauth/authorize` (consent submit) — mint single-use auth code bound to
  user + PKCE challenge + resource; redirect to `redirect_uri?code=…&state=…`.
- `POST /oauth/token` — `authorization_code`: verify code (unconsumed, unexpired),
  `code_verifier` vs stored challenge, `redirect_uri` match, client auth, then issue access +
  refresh token with `audience = resource`. `refresh_token`: verify + **rotate**.
- `POST /oauth/revoke` — RFC 7009 token revocation (also driven by the settings UI below).

**Resource Server:**
- `POST /mcp` (+ `GET /mcp` for the SSE stream) — Streamable HTTP transport. Per request:
  extract `Authorization: Bearer`, validate (hash lookup, not expired, **`resource` ==
  this server's canonical URI**). Missing/invalid → `401` with
  `WWW-Authenticate: Bearer resource_metadata="https://HOST/.well-known/oauth-protected-resource"`.
  Valid → build `ctx` and dispatch to the MCP server.

Add a `MCP_BASE_URL` env var (canonical `https://HOST`) — used to build metadata, the
audience value, and to validate token audience.

---

## 5. The MCP server + tools

Use the official **`@modelcontextprotocol/sdk`** (`McpServer` + `StreamableHTTPServerTransport`
in **stateless mode** — no session store needed). Optionally `mcp-handler` (Vercel's Next
adapter) to cut transport/SSE boilerplate and auto-serve protected-resource metadata via its
`withMcpAuth` wrapper; we still hand-roll the AS either way.
**Recommendation:** start with `mcp-handler` for the RS/transport + our own AS. Falls back
cleanly to the raw SDK if we want fewer deps (the codebase keeps deps lean).

**v1 tools (each with a zod input schema):**

*Reads:* `list_tasks`, `list_groceries`, `list_staples`, `get_meal_plan` (week),
`list_events`, `list_inventory`, `list_maintenance` (with due/overdue status),
`list_vendors`, `list_wishlist`, `household_summary`.

*Writes (targeted):* `add_task`, `complete_task`, `update_task`, `add_grocery_item`,
`check_grocery_item`, `remove_grocery_item`, `restock_staples`, `set_meal`, `add_event`.

Every tool: build `ctx` from the token, call the `src/lib/*` function, return concise JSON/text.
Writes should `revalidatePath` the affected pages so the web UI reflects changes live.

---

## 6. Consent & connected-apps UI

- **Consent screen** at `/oauth/authorize`: shows the requesting client name (from DCR),
  the household, and plain-English scope ("Read your household data; manage todos, groceries,
  and meals"). Approve / Deny. Required per-DCR-client to avoid the confused-deputy problem.
- **Settings → Connected apps**: list active clients/tokens for the household, "Revoke"
  button (calls the revocation path). Lets you cut Claude off without touching the DB.

---

## 7. Security checklist (must all hold)

- All AS endpoints + redirects over HTTPS; redirect URIs HTTPS or `localhost` only.
- **Exact** redirect_uri matching (no prefix/substring).
- PKCE **S256 required**; reject `plain` and missing challenges.
- Tokens opaque + SHA-256 hashed at rest; access ≤1h; refresh rotates on every use.
- **Audience validation**: reject any token whose `resource` ≠ our canonical `/mcp` URI.
  Never accept or forward foreign tokens (no token passthrough).
- Auth codes single-use, ~60s TTL, bound to client + PKCE + resource.
- Per-client consent; revocation endpoint + UI.
- CORS headers on `/mcp` + `/.well-known/*` (native clients are lenient, but claude.ai
  web connector needs them if added later).

---

## 8. Build phases

- **P0 — Prereqs:** confirm public HTTPS + set `MCP_BASE_URL`; pick `mcp-handler` vs raw SDK; add deps.
- **P1 — Schema:** add 4 oauth tables + generate/run migration.
- **P2 — Refactor:** extract `ctx`-based lib functions for todos, groceries, meals/events (writes)
  and read functions for all listed entities; rewire existing server actions to call them.
- **P3 — AS:** metadata endpoints, DCR, authorize + `/login?next=` support, consent screen,
  token (code + refresh), revoke.
- **P4 — RS:** `/mcp` route with token validation + MCP server + tools.
- **P5 — UI:** Settings → Connected apps (list + revoke).
- **P6 — E2E:** `claude mcp add --transport http homebase https://HOST/mcp`, walk the OAuth
  flow, exercise each tool; then repeat in Claude Desktop.

---

## 9. Spike results (validated 2026-07-05)

Stood up a throwaway `/api/mcp` endpoint against the live dev server + Postgres and confirmed
every load-bearing assumption. Spike files were removed; **the deps were kept.**

- **Packages:** `mcp-handler@1.1.0` (peer-pins `@modelcontextprotocol/sdk@1.26.0` **exactly**);
  `zod@4` already present transitively. Installed and working on **Next 16.2.10 + Turbopack**.
- **Transport:** `createMcpHandler(...)` in a route handler works. Ran **stateless (no Redis)**,
  `disableSse: true`. `initialize`, `tools/list`, and `tools/call` all returned correct
  `text/event-stream` JSON-RPC responses.
- **DB through a tool:** a tool queried Postgres and returned real rows — confirms MCP tools can
  call our `src/lib/*` data layer directly.
- **Routing:** file at `src/app/api/[transport]/route.ts` with `basePath: "/api"` →
  endpoint **`/api/mcp`**. This became the decision below (§10) — cleaner than a root
  `[transport]` catch-all, and a path is a valid canonical resource URI per RFC 8707.
- **OAuth discovery crux — works:** wrapping with `withMcpAuth(handler, verifyToken, { required: true })`:
  - no token → **`401` + `WWW-Authenticate: Bearer error="invalid_token", … resource_metadata="…/.well-known/oauth-protected-resource"`** (auto).
  - `protectedResourceHandler({ authServerUrls })` served the protected-resource metadata.
  - valid token → tool executed. `verifyToken` returns an `AuthInfo` and **`extra.householdId`
    is where our token→household mapping rides** into every tool.
- **What mcp-handler does NOT give us (we hand-roll):** the entire Authorization Server —
  `/oauth/register`, `/oauth/authorize` + consent, `/oauth/token`, `/oauth/revoke`, and
  `/.well-known/oauth-authorization-server`. mcp-handler is RS-side only.
- **Refinement:** pass `resourceUrl: "<MCP_BASE_URL>/api/mcp"` to both `protectedResourceHandler`
  and `withMcpAuth` so the advertised/validated audience is the canonical MCP URL, not the bare
  origin (the spike showed it defaulting to origin).

---

## 10. Detailed implementation plan

Canonical values: `MCP_BASE_URL=https://HOST`, MCP resource = `https://HOST/api/mcp`,
issuer/AS = `https://HOST`.

### P1 — DB schema (`src/db/schema.ts` + migration)

Add the four tables from §3. Notes:
- Store `clientSecretHash` / `codeHash` / `tokenHash` as `text` (SHA-256 hex), never raw.
- `redirectUris`, `grantTypes` as `text[]` (pg `text().array()`) or `json` — match existing style.
- Index `oauth_access_tokens.tokenHash` (pk covers it) and add `expiresAt` for cleanup sweeps.
- Generate: `npm run db:generate`, then apply via the existing migrate path.
- **Acceptance:** migration applies cleanly; `\d oauth_access_tokens` shows expected columns.

### P2 — Token-scoping refactor (`src/lib/*`)

Introduce `Ctx = { householdId: number; userId: number }`. For each entity, move the action
body into a pure function that takes `ctx` first:
- `src/lib/tasks.ts` — `listTasks`, `createTask`, `completeTask`, `updateTask`, `deleteTask`.
- `src/lib/groceries.ts` (exists — extend) — `listGroceries`, `addGroceryItem`,
  `checkGroceryItem`, `removeGroceryItem`, `restockStaples`, `listStaples`.
- `src/lib/plan-data.ts` / meals — `getMealPlan`, `setMeal`, `addEvent`, `listEvents`.
- Read-only fns for `inventory`, `maintenance`, `vendors`, `wishlist`, plus `householdSummary`.
- Keep every query's `and(eq(id), eq(householdId))` guard intact.
- Rewire existing `"use server"` actions to: `const ctx = await requireHousehold(); return fn(ctx, …)` then `revalidatePath(...)`. **Behavior of the web app must be unchanged.**
- Add to `src/lib/auth.ts`: `export async function householdFromToken(token): Promise<Ctx | null>`
  (hash → `oauth_access_tokens` lookup → not expired → audience ok → `{ householdId, userId }`).
- **Acceptance:** existing pages/actions still work end-to-end (manual click-through +
  `npm run e2e` if it covers these); no query lost its household guard.

### P3 — Authorization Server (all under `src/app`, outside `(app)` group)

New shared helper `src/lib/oauth.ts`: token/code generation (`crypto.randomBytes`), hashing,
PKCE S256 verify, client auth, redirect-uri exact-match, constant-time compares.

- `src/app/.well-known/oauth-authorization-server/route.ts` — `GET` AS metadata (§4).
- `src/app/oauth/register/route.ts` — `POST` DCR (RFC 7591): validate metadata, create client,
  return `client_id` (+ `client_secret` if confidential). Rate-limit / cap.
- `src/app/oauth/authorize/route.ts`:
  - `GET`: validate `client_id`, exact `redirect_uri`, `resource`, `scope`, `state`,
    `code_challenge` (require `S256`). No session → `redirect('/login?next=' + encoded self)`.
    Else render consent (client name + household + plain-English scopes).
  - `POST` (consent approve): mint single-use code (~60s) bound to user+PKCE+resource;
    `redirect(redirect_uri?code&state)`. Deny → `?error=access_denied`.
- `src/app/oauth/token/route.ts` — `POST`: `authorization_code` (verify code unconsumed/unexpired,
  `code_verifier` vs challenge, redirect_uri, client auth → issue access[1h]+refresh, audience=resource);
  `refresh_token` (verify + **rotate**). Proper OAuth JSON errors.
- `src/app/oauth/revoke/route.ts` — `POST` RFC 7009.
- **Login change** (`src/app/login/{page,actions}.tsx`): thread a `next` param and redirect to it
  post-login (validate it's a same-origin relative path).
- **Acceptance:** `curl` the metadata; run a scripted PKCE flow (register → authorize with a seeded
  session cookie → token) and get a working access token.

### P4 — Resource Server (`src/app/api/[transport]/route.ts` + metadata)

Rebuild the (now real) endpoint:
- `src/app/.well-known/oauth-protected-resource/route.ts` — `protectedResourceHandler({ authServerUrls: [MCP_BASE_URL], resourceUrl: MCP_BASE_URL + '/api/mcp' })`.
- `src/app/api/[transport]/route.ts` — `createMcpHandler(registerTools, { serverInfo }, { basePath:'/api', disableSse:true })`
  wrapped in `withMcpAuth(handler, verifyToken, { required:true, resourceUrl: MCP_BASE_URL+'/api/mcp' })`.
- `verifyToken` → `householdFromToken`; return `AuthInfo` with `extra.householdId`, `extra.userId`, `scopes`.
- `registerTools(server)`: each tool builds `ctx` from `req.auth.extra` and calls a `src/lib/*` fn.
  Gate writes on `homebase:write` scope. Tools (§5): reads for all entities; writes for
  todos/groceries/meals/events. Writes `revalidatePath` affected pages.
- **Acceptance:** `claude mcp add --transport http homebase https://HOST/api/mcp`, complete the
  browser OAuth flow, then drive each tool from Claude Code.

### P5 — Connected-apps UI (`src/app/(app)/settings`)

- Server fn to list this household's active clients/tokens; a "Revoke" action calling the
  revocation path. Show client name + last used.
- **Acceptance:** revoking in the UI makes the next Claude tool call 401.

### P6 — End-to-end + hardening

- Verify in **Claude Code and Claude Desktop** (both DCR).
- Token cleanup sweep (cron/route) for expired codes/tokens.
- Confirm the §7 security checklist item-by-item.
- **Acceptance:** full flow in both clients; expired/foreign tokens rejected; consent + revoke work.

---

## 11. Open questions / risks

- **Login redirect:** the login form is a plain server action with no `next` param today —
  P3 adds `?next=` round-tripping so the OAuth hop resumes after sign-in.
- **Scope granularity:** v1 uses coarse `homebase:read` / `homebase:write` scopes. Fine for a
  single-owner household; revisit if you ever expose per-member tokens.
- **Multi-household:** tokens are user-bound → single household. Correct for now; no change needed.
- ~~**`@modelcontextprotocol/sdk` vs `mcp-handler`** on Next 16~~ — **RESOLVED by spike (§9):**
  `mcp-handler@1.1.0` works on Next 16 App Router, stateless, no Redis. Note the exact SDK
  pin (`1.26.0`) — bump both together if upgrading.
- **SDK version pin:** `mcp-handler` requires `@modelcontextprotocol/sdk@1.26.0` exactly, while
  latest is 1.29.0. Fine for now; watch for mcp-handler updates that relax/advance the peer.
```

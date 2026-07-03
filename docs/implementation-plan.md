# Homebase v2 — Implementation Plan

Source of truth: `docs/design_handoff_homebase/` (README + `Homebase.dc.html`
prototype markup). This plan turns the hi-fi design into the existing
Next.js/Drizzle/Tailwind codebase.

## Status — all phases complete ✅

| Phase | Scope | Status |
|---|---|---|
| 1 | Design system + chrome | ✅ done |
| 2 | Schema migration + seeds | ✅ done |
| 3 | Upkeep restyle + bottom sheet | ✅ done |
| 4 | Shop (groceries) | ✅ done |
| 5 | Plan (Week + Meals) | ✅ done |
| 6 | Dashboard (Cards) | ✅ done |
| 7 | More grid + module restyles | ✅ done |
| 8 | Notifications | ✅ done |
| 9 | Home Assistant + Settings | ✅ done |
| 10 | Polish + full regression | ✅ done |

Every `docs/ux-checklist.md` item is checked off with its phase + guarding
spec. Full Playwright suite green; `npm run build` and `tsc --noEmit` clean.

## Product decisions (assumed — flag if wrong)

Asked, no answer yet; proceeding with the handoff's recommendations:

1. **Dashboard = Cards treatment** (no segmented control in prod). Focus and
   Agenda are not built; the Cards screen structure keeps the door open.
2. **Plan module ships fully** (Week + Meals tabs), overriding the original
   "no calendars" non-goal per the handoff's rationale.
3. **Attribution = session identity.** No header user-cycler; the avatar
   shows the logged-in user (Cullen emerald `#059669`, Steph cyan `#0e7490`)
   and taps through to Settings. All "who did it" comes from the session.

## Scope delta vs v1

| Area | Change |
|---|---|
| Visual system | Full restyle: Hanken Grotesk + Instrument Serif, new tokens, sticky blurred header, new tab bar (Home · Upkeep · Plan · Shop · More), 430px column |
| Dashboard | Rebuild as Cards: needs-attention (left-border urgency), Today list, grocery progress, HA tiles |
| Upkeep | Restyle; row tap opens **bottom sheet** (details, mark-done, history) replacing the `[id]` page |
| Plan | **NEW**: Week (7-day pill strip + per-day event cards + legend) and Meals (dinner cards + "Add ingredients to list") |
| Shop | **NEW**: aisle-grouped grocery list, quick-add, staples restock, clear-in-cart |
| More | 2-col tile grid with sub-counts; Tasks/Wishlist/Inventory/Documents/Contacts move under it (restyled) |
| Home (HA) | **NEW**: temp tiles, thermostat ± card, lock + switch toggles, backed by Home Assistant REST API |
| Notifications | **NEW**: bell + unread badge in header, feed screen, mark-all-read |
| Settings | **NEW**: active user info, HA connection config, password change, backup note |

## Schema additions (`src/db/schema.ts`)

Following existing conventions (integer PKs, text enums, unixepoch defaults):

```
groceryItems   id, name, category enum(produce|meat-fish|dairy-eggs|pantry|frozen|household),
               qty text?, checked bool=false, isStaple bool=false,
               sourceMealId fk?→meals, createdAt
meals          id, date (YYYY-MM-DD), title, cook bool, out bool, notes?,
               ingredientsAddedAt timestamp?, createdAt
mealIngredients id, mealId fk cascade, name, category, qty?
events         id, date (YYYY-MM-DD), time text? ("19:30"), title,
               type enum(date|event|chore), assigneeId fk?→users, createdAt
notifications  id, severity enum(overdue|due-soon|info|success), text,
               readAt timestamp?, createdAt
settings       key text PK, value text        # haBaseUrl, haToken, haEntities (JSON)
users          + accentColor text             # '#059669' / '#0e7490'
```

Notes:
- Upkeep items on the Week view are **derived** from computed due dates
  (existing `maintenance.ts`), not stored as events.
- Staples: `isStaple` on grocery items; "Restock staples" re-inserts (or
  un-checks) any staple name not currently active on the list. A staple's
  definition survives via a `staples` seed + the flag on rows; deleting a
  checked staple row keeps it in the restock pool (pool = distinct staple
  names ever used + seed list — simplest: separate `staples(name, category)`
  table, seeded, editable later).
- Meal→grocery: insert each ingredient whose name (case-insensitive) isn't
  already unchecked on the list; set `sourceMealId`; stamp
  `ingredientsAddedAt` on the meal.
- Notifications are generated server-side: a daily due-check sweep (on first
  request of the day — no cron needed) plus on-mutation events (completion,
  wishlist stage move). Unread count = `readAt IS NULL`.

## Home Assistant integration

- Config in `settings` table via Settings screen (base URL + long-lived token;
  token stored server-side only, never sent to client).
- Server reads `GET /api/states` (filtered to configured entity ids); writes
  via `POST /api/services/{domain}/{service}` (climate.set_temperature,
  lock.lock/unlock, switch.toggle) from server actions — HA is only ever
  reached from the server, LAN-friendly.
- Dashboard tiles + Home screen degrade gracefully: unconfigured → setup
  prompt card; unreachable → stale/error chip. Entity picker = MVP text list
  of entity ids in Settings (fancier picker later).

## Visual system implementation

- Fonts via `next/font/google`: Hanken Grotesk (sans, weights 400–800),
  Instrument Serif (display). CSS vars `--font-sans` / `--font-serif`;
  globals.css stays minimal (fonts + the two Tailwind theme tokens only).
- Tokens as Tailwind theme extensions in globals `@theme`: surface `#faf9f8`,
  card `#ffffff`, borders `#efece9/#e7e5e4`, accent emerald scale, etc.
  Re-express all prototype inline styles as utilities (per handoff).
- Shared chrome components: `AppHeader` (sticky, blur, back chevron, serif
  title/subtitle, avatar, bell+badge), `BottomNav` (5 tabs, lucide-style
  inline SVG line icons ~1.8 stroke), `BottomSheet` (fixed, rounded-t-[22px],
  sheetIn animation, backdrop), `SegmentedControl`, `Badge`, `ProgressBar`.
- Max width becomes 430px (was 3xl); `100dvh` column; bottom padding 90px.

## Build phases

Each phase ends green: `npm run build` + full Playwright suite
(`docs/ux-checklist.md` maps checklist → spec files) + a Chrome visual pass
against the prototype markup for the screens it touches.

1. **Design system + chrome** — fonts, tokens, AppHeader, BottomNav (new
   tabs), BottomSheet, badges; restyle login. Old pages keep working under
   new chrome.
2. **Schema migration + seeds** — all new tables, `accentColor`, staples
   seed, prototype-inspired demo seed for dev; `npm run db:generate`.
3. **Upkeep restyle** — new rows, bottom-sheet detail (replaces `[id]` page),
   history, mark-done-as-user.
4. **Shop** — grocery CRUD, aisle grouping, check-off, quick-add, restock
   staples, clear-in-cart.
5. **Plan** — Week tab (pill strip, day cards, legend, derived upkeep
   events, event CRUD minimal: add/delete), Meals tab (meal cards,
   ingredient push with de-dupe).
6. **Dashboard (Cards)** — needs-attention, Today (events + due upkeep),
   grocery progress bar, HA tile placeholders.
7. **More grid + restyles** — Tasks, Wishlist (pipeline "Move to next →",
   spend cards), Inventory, Documents, Contacts in the new skin.
8. **Notifications** — table, generation hooks (due sweep + completions +
   wishlist moves), bell badge, feed, mark-all-read.
9. **Home Assistant + Settings** — settings storage, HA client
   (`src/lib/ha.ts`), Home screen tiles/controls, dashboard tiles go live,
   Settings screen (user, HA config, password change).
10. **Polish + full regression** — transitions (fade+slide on route change,
    optional), empty states, PWA icons vs new palette, run everything.

Rough sizing: phases 1–2 are the foundation (~a session); 3–7 are the bulk;
8–9 close the loop. Ship after any phase — the app stays usable throughout.

## Testing strategy (accountability loop)

Two layers, run continuously:

1. **Playwright functional suite** (`scripts/e2e/*.spec.mjs`, extends the v1
   suite): every behavior in `docs/ux-checklist.md` gets a numbered check.
   Run per phase and before any commit: fresh DB → `npm run e2e`.
   HA behaviors are tested against a tiny mock HA server (node http server
   serving canned `/api/states`, recording service calls) — no real HA needed.
2. **Chrome visual passes** (me, via the Chrome extension, 430px viewport):
   after each phase, screenshot each touched screen and compare against the
   prototype markup/tokens — fonts, spacing, badge colors, border-radii —
   and fix drift. Checklist items marked 👁 are visual-only and verified this
   way (Playwright asserts their functional side where possible).

`docs/ux-checklist.md` is the single accountability artifact: every item gets
checked off with the phase that delivered it and the spec that guards it.

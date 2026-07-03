# Homebase v2 — UX Acceptance Checklist

Every item must pass before v2 is "done". ☐ → ☑ with phase + guarding spec.
👁 = visual, verified in Chrome passes (functional side still spec'd where possible).
Specs live in `scripts/e2e/`; run with a fresh DB via `npm run e2e`.

## Global chrome
- [x] G1 Sticky translucent header with serif title + muted subtitle 👁 (Phase 1; visual pass Phase 10)
- [x] G2 Back chevron appears on sub-screens only, navigates back (Phase 1, chrome.spec G2)
- [x] G3 Avatar shows logged-in user's initial in their accent color (Cullen emerald, Steph cyan); taps to Settings (Phase 1, chrome.spec G3 + schema.spec Steph cyan)
- [x] G4 Bell shows red unread-count badge when notifications unread; none when zero (Phase 8, notifications.spec N4 + 9+ cap)
- [x] G5 Bottom tab bar: Home · Upkeep · Plan · Shop · More; active tab emerald, idle stone 👁 (Phase 1, chrome.spec G5; colors visual Phase 10)
- [x] G6 App column max 430px, 100dvh, content clears tab bar 👁 (Phase 1; visual pass Phase 10)
- [x] G7 Hanken Grotesk body + Instrument Serif display render (no system-font fallback) 👁 (Phase 10, chrome.spec G7 computed-font assertions)
- [x] G8 All tap targets ≥ 44px 👁 (Phase 10, chrome.spec G8 measures nav tabs=49px + upkeep Done=44px). Accepted deviation: header icon buttons (avatar/bell) are 34px by prototype spec.
- [x] G9 Light theme forced — no dark-mode inversion in a dark-mode browser (Phase 1, chrome.spec G9)

## Dashboard (Cards)
- [x] D1 Needs-attention card per upkeep item due ≤7d/overdue; left border red (overdue) or amber (due-soon) — Phase 6, dashboard.spec
- [x] D2 One-tap Done on a needs-attention card removes it and logs completion — Phase 6, dashboard.spec
- [x] D3 Today section lists today's events (time · colored bar · title) — Phase 6, dashboard.spec
- [x] D4 Grocery progress bar shows checked/total, navigates to Shop — Phase 6, dashboard.spec
- [x] D5 HA tiles show temps/lock/climate when configured; setup prompt when not — Phase 9 live tiles (temps + lock + climate summary), ha.spec H3; setup prompt when unconfigured, dashboard.spec
- [x] D6 Empty state: all caught up message when nothing needs attention — Phase 6, dashboard.spec

## Upkeep
- [x] U1 List sorted soonest-due first (Phase 3, upkeep.spec U1)
- [x] U2 Badges: "Nd overdue" red · "Due today"/"Due in Nd (≤7)" amber · "Due in Nd" stone (Phase 3, upkeep.spec U2)
- [x] U3 Row meta: "every {interval} · {room}" (Phase 3, upkeep.spec U3)
- [x] U4 One-tap Done from list row recomputes next due (now + interval) (Phase 3, upkeep.spec U4)
- [x] U5 Row tap opens bottom sheet: serif title, badge, notes card, history 👁(styling) (Phase 3, upkeep.spec U5; styling visual Phase 10)
- [x] U6 Sheet "Mark done as {logged-in user}" completes + attributes + closes (Phase 3, upkeep.spec U6)
- [x] U7 History lists completions newest-first with who + when (Phase 3, upkeep.spec U7)
- [x] U8 Add / edit / archive item still works (v1 parity) (Phase 3, upkeep.spec U8)

## Plan — Week
- [x] P1 7-day pill strip; today filled emerald; per-day dots colored by event type (Phase 5, plan.spec P1)
- [x] P2 Legend shows date/event/chore/upkeep colors 👁 (Phase 5; visual pass Phase 10)
- [x] P3 Day cards list events: time · type-colored bar · title · optional who (Phase 5, plan.spec P3)
- [x] P4 Upkeep due dates appear as derived upkeep-type entries (not stored events) (Phase 5, plan.spec P4)
- [x] P5 Empty day shows "Open evening" (Phase 5, plan.spec P5)
- [x] P6 Can add and delete an event (date, time, title, type, assignee) (Phase 5, plan.spec P6)

## Plan — Meals
- [x] M1 One card per day: day/date, dinner title, ingredient list (Phase 5, plan.spec M1)
- [x] M2 "Add ingredients to list" pushes ingredients to groceries, de-duped case-insensitively (Phase 5, plan.spec M2)
- [x] M3 Button flips to "Added to list ✓" and persists across reload (Phase 5, plan.spec M3)
- [x] M4 No-cook nights show "Using leftovers" / "Reservation — nothing to buy" (Phase 5, plan.spec M4)
- [x] M5 Can create/edit a meal for a day (title, cook/out, ingredients) (Phase 5, plan.spec M5)

## Shop
- [x] S1 Quick-add input adds item (Enter and + button) (Phase 4, shop.spec S1)
- [x] S2 Items grouped by aisle in fixed order (Produce → … → Household); group shows "N left" (Phase 4, shop.spec S2)
- [x] S3 Check toggles in-cart: emerald box + strikethrough (Phase 4, shop.spec S3)
- [x] S4 STAPLE tag renders on staples; qty shows when present (Phase 4, shop.spec S4)
- [x] S5 "Restock staples" adds/unchecks all missing staples (Phase 4, shop.spec S5)
- [x] S6 "Clear N in cart" removes checked items and updates count (Phase 4, shop.spec S6)
- [x] S7 New items land in a sensible aisle (category picker or default) and can be deleted (Phase 4, shop.spec S7)

## More + sub-modules
- [x] O1 2-col tile grid with live sub-counts (open tasks, wishlist active, unread, etc.) — Phase 7, more.spec
- [x] O2 Tasks: v1 behaviors (add/assign/due/complete/uncomplete/delete) in new skin; overdue due red — Phase 7, more.spec (+ v1.spec)
- [x] O3 Wishlist: committed vs considering spend cards correct — Phase 7, more.spec
- [x] O4 Wishlist: "Move to {next} →" advances pipeline one stage (Idea→Decided→Ordered→Got it) — Phase 7, more.spec
- [x] O5 Inventory: warranty chip green when active, muted when expired; add/delete work — Phase 7, more.spec
- [x] O6 Documents: upload, list with size/date, download, delete — Phase 7, more.spec (+ v1.spec)
- [x] O7 Contacts: role + name + tap-to-call link; add/delete — Phase 7, more.spec (+ v1.spec)

## Notifications
- [x] N1 Overdue/due-soon sweep creates notifications (once per item per day) (Phase 8, notifications.spec N1)
- [x] N2 Completions and wishlist stage moves create success notifications (Phase 8, notifications.spec N2)
- [x] N3 Feed: severity dot color, unread rows emphasized, relative time (Phase 8, notifications.spec N3)
- [x] N4 "Mark all as read" clears badge and de-emphasizes rows (Phase 8, notifications.spec N4)

## Home (HA) + Settings
- [x] H1 Unconfigured: Home screen + dashboard tiles show setup prompt — Phase 9, ha.spec
- [x] H2 Settings saves HA base URL + token (token never echoed to client) — Phase 9, ha.spec
- [x] H3 Temp tiles render live values from HA states (mock HA in e2e) — Phase 9, ha.spec
- [x] H4 Thermostat ± adjusts setpoint via HA service call — Phase 9, ha.spec
- [x] H5 Lock and switch toggles call HA and reflect new state — Phase 9, ha.spec
- [x] H6 HA unreachable → error/stale chip, page still renders — Phase 9, ha.spec
- [x] H7 Settings: password change works (login with new password) — Phase 9, ha.spec

## Regression (v1 guarantees kept)
- [x] R1 Full v1 e2e suite still passes (login, logout, auth-gating, uploads) (Phase 10, v1.spec — green in both full regression runs)
- [x] R2 `npm run build` clean; all routes render authed (Phase 10, build clean + full suite green ×2)
- [x] R3 Fresh-boot seed: users with accent colors, rooms, upkeep defaults, staples (Phase 2, schema.spec)

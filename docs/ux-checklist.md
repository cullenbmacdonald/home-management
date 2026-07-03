# Homebase v2 — UX Acceptance Checklist

Every item must pass before v2 is "done". ☐ → ☑ with phase + guarding spec.
👁 = visual, verified in Chrome passes (functional side still spec'd where possible).
Specs live in `scripts/e2e/`; run with a fresh DB via `npm run e2e`.

## Global chrome
- [ ] G1 Sticky translucent header with serif title + muted subtitle 👁
- [ ] G2 Back chevron appears on sub-screens only, navigates back
- [ ] G3 Avatar shows logged-in user's initial in their accent color (Cullen emerald, Steph cyan); taps to Settings
- [ ] G4 Bell shows red unread-count badge when notifications unread; none when zero
- [ ] G5 Bottom tab bar: Home · Upkeep · Plan · Shop · More; active tab emerald, idle stone 👁
- [ ] G6 App column max 430px, 100dvh, content clears tab bar 👁
- [ ] G7 Hanken Grotesk body + Instrument Serif display render (no system-font fallback) 👁
- [ ] G8 All tap targets ≥ 44px 👁
- [ ] G9 Light theme forced — no dark-mode inversion in a dark-mode browser

## Dashboard (Cards)
- [x] D1 Needs-attention card per upkeep item due ≤7d/overdue; left border red (overdue) or amber (due-soon) — Phase 6, dashboard.spec
- [x] D2 One-tap Done on a needs-attention card removes it and logs completion — Phase 6, dashboard.spec
- [x] D3 Today section lists today's events (time · colored bar · title) — Phase 6, dashboard.spec
- [x] D4 Grocery progress bar shows checked/total, navigates to Shop — Phase 6, dashboard.spec
- [~] D5 HA tiles show temps/lock/climate when configured; setup prompt when not — Phase 6 renders setup prompt (unconfigured, dashboard.spec); live tiles land in Phase 9
- [x] D6 Empty state: all caught up message when nothing needs attention — Phase 6, dashboard.spec

## Upkeep
- [ ] U1 List sorted soonest-due first
- [ ] U2 Badges: "Nd overdue" red · "Due today"/"Due in Nd (≤7)" amber · "Due in Nd" stone
- [ ] U3 Row meta: "every {interval} · {room}"
- [ ] U4 One-tap Done from list row recomputes next due (now + interval)
- [ ] U5 Row tap opens bottom sheet: serif title, badge, notes card, history 👁(styling)
- [ ] U6 Sheet "Mark done as {logged-in user}" completes + attributes + closes
- [ ] U7 History lists completions newest-first with who + when
- [ ] U8 Add / edit / archive item still works (v1 parity)

## Plan — Week
- [ ] P1 7-day pill strip; today filled emerald; per-day dots colored by event type
- [ ] P2 Legend shows date/event/chore/upkeep colors 👁
- [ ] P3 Day cards list events: time · type-colored bar · title · optional who
- [ ] P4 Upkeep due dates appear as derived upkeep-type entries (not stored events)
- [ ] P5 Empty day shows "Open evening"
- [ ] P6 Can add and delete an event (date, time, title, type, assignee)

## Plan — Meals
- [ ] M1 One card per day: day/date, dinner title, ingredient list
- [ ] M2 "Add ingredients to list" pushes ingredients to groceries, de-duped case-insensitively
- [ ] M3 Button flips to "Added to list ✓" and persists across reload
- [ ] M4 No-cook nights show "Using leftovers" / "Reservation — nothing to buy"
- [ ] M5 Can create/edit a meal for a day (title, cook/out, ingredients)

## Shop
- [ ] S1 Quick-add input adds item (Enter and + button)
- [ ] S2 Items grouped by aisle in fixed order (Produce → … → Household); group shows "N left"
- [ ] S3 Check toggles in-cart: emerald box + strikethrough
- [ ] S4 STAPLE tag renders on staples; qty shows when present
- [ ] S5 "Restock staples" adds/unchecks all missing staples
- [ ] S6 "Clear N in cart" removes checked items and updates count
- [ ] S7 New items land in a sensible aisle (category picker or default) and can be deleted

## More + sub-modules
- [ ] O1 2-col tile grid with live sub-counts (open tasks, wishlist active, unread, etc.)
- [ ] O2 Tasks: v1 behaviors (add/assign/due/complete/uncomplete/delete) in new skin; overdue due red
- [ ] O3 Wishlist: committed vs considering spend cards correct
- [ ] O4 Wishlist: "Move to {next} →" advances pipeline one stage (Idea→Decided→Ordered→Got it)
- [ ] O5 Inventory: warranty chip green when active, muted when expired; add/delete work
- [ ] O6 Documents: upload, list with size/date, download, delete
- [ ] O7 Contacts: role + name + tap-to-call link; add/delete

## Notifications
- [ ] N1 Overdue/due-soon sweep creates notifications (once per item per day)
- [ ] N2 Completions and wishlist stage moves create success notifications
- [ ] N3 Feed: severity dot color, unread rows emphasized, relative time
- [ ] N4 "Mark all as read" clears badge and de-emphasizes rows

## Home (HA) + Settings
- [ ] H1 Unconfigured: Home screen + dashboard tiles show setup prompt
- [ ] H2 Settings saves HA base URL + token (token never echoed to client)
- [ ] H3 Temp tiles render live values from HA states (mock HA in e2e)
- [ ] H4 Thermostat ± adjusts setpoint via HA service call
- [ ] H5 Lock and switch toggles call HA and reflect new state
- [ ] H6 HA unreachable → error/stale chip, page still renders
- [ ] H7 Settings: password change works (login with new password)

## Regression (v1 guarantees kept)
- [ ] R1 Full v1 e2e suite still passes (login, logout, auth-gating, uploads)
- [ ] R2 `npm run build` clean; all routes render authed
- [ ] R3 Fresh-boot seed: users with accent colors, rooms, upkeep defaults, staples

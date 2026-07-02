# Handoff: Homebase — Dashboard refresh + Groceries, Weekly Plan, Meals, Home tiles

## Overview

Homebase is the self-hosted household app for one apartment (Park Slope, two
users: Cullen + partner). **v1 already ships** Dashboard, Upkeep, Tasks,
Wishlist, Inventory, Documents, and Contacts. This handoff covers a
**hi-fi prototype** that (a) restyles the whole app into a consistent visual
system, and (b) adds four roadmap/hypothetical modules the current codebase
does **not** have yet:

1. **Weekly Groceries** — an aisle-organized list with staples + check-off.
2. **Weekly Plan (calendar)** — a 7-day agenda of dinner dates, chores, events, upkeep.
3. **Meal planning** — plan dinners, and push a night's ingredients onto the grocery list.
4. **Home Assistant tiles** — temps, lock, thermostat, switches (roadmap item #1).

Plus a **Dashboard** presented in three interchangeable layout treatments so
you can pick a direction, and a **Notifications** feed.

> Non-goal reminder from `product.md`: the original scope said "no calendars"
> (Google Calendar covers scheduled events). This prototype deliberately
> explores an *in-app* weekly plan anyway, because it's what makes meal→grocery
> planning cohesive. Treat the calendar module as a **product decision to
> confirm**, not a settled requirement.

## About the Design Files

The file in this bundle — **`Homebase.dc.html`** — is a **design reference
created in HTML**, not production code to copy. It's a single-file interactive
prototype (a small React-ish component runtime) demonstrating the intended
look, layout, and behavior of every screen.

**Your task is to recreate these designs in the existing Homebase codebase**
described in `reference/architecture.md`:

- **Next.js (App Router, TypeScript)** — server components read, server actions write.
- **SQLite + Drizzle ORM** — one file per table in `src/db/schema.ts`, generated migrations in `drizzle/`.
- **Tailwind v4** — mobile-first utilities. **Do not** copy the prototype's inline styles; re-express them as Tailwind classes. The prototype uses inline styles only because of its authoring environment.
- **Client components only where interactive** (`src/components/`), server actions in each module's `actions.ts`, ending in `revalidatePath`.
- Follow the gotchas in `reference/architecture.md` (esp. keep `globals.css` nearly empty; put colors on elements via utilities).

Do **not** ship the HTML. Do **not** introduce new dependencies (no component
libraries, no state managers) unless a module genuinely needs one — the app is
intentionally dependency-light.

## Fidelity

**High-fidelity.** Colors, typography, spacing, and interactions are final and
should be matched closely. The one caveat: the prototype's screen-transition
animation is transform-only (a 7px slide) because its runtime restarts CSS
animations; in the real app you can use a normal fade+slide on route change if
you want, or omit it.

---

## Design System / Tokens

Match `reference/product.md`'s stated language: **stone neutrals + emerald
accent; red only for overdue, amber for due-soon.** Concrete values used:

### Color
| Token | Hex | Use |
|---|---|---|
| Page background | `#e7e5e4` (stone-200) | Behind the phone column |
| App surface | `#faf9f8` | Main app background |
| Card surface | `#ffffff` | Cards, list rows, sheets |
| Card border | `#efece9` / `#e7e5e4` | Hairline borders |
| Row divider | `#f0ede9` / `#f5f2ef` | Between list items |
| Text primary | `#1c1917` (stone-900) | Headings, item names |
| Text secondary | `#57534e` (stone-600) | Body |
| Text muted | `#78716c` (stone-500) | Meta |
| Text faint | `#a8a29e` (stone-400) | Labels, captions |
| Text ghost | `#c7c2bc` | Placeholder, empty states |
| **Emerald (accent)** | `#059669` | Primary actions, active nav, "Done", progress |
| Emerald deep | `#065f46` / `#047857` | Focus hero gradient, committed spend |
| Emerald tint bg | `#ecfdf5` / `#f0fdf4` | Success chips, tint buttons |
| Emerald tint border | `#d1fae5` | Tint button borders |
| **Red (overdue)** | `#dc2626` | Overdue badges, overdue due dates, unread dot |
| Red tint bg | `#fef2f2` / `#fee2e2` | Overdue badge bg |
| **Amber (due-soon)** | `#b45309` text / `#d97706` accent | Due-soon badges |
| Amber tint bg | `#fffbeb` / `#fef3c7` | Due-soon badge bg |
| Calendar: date | `#059669` | "Date night" events |
| Calendar: event | `#0ea5e9` | Generic events |
| Calendar: chore | `#a8a29e` | Chores |
| Calendar: upkeep | `#d97706` | Upkeep on calendar |
| Second user accent | `#0e7490` (cyan-700) | Partner's avatar (Cullen = emerald) |

### Typography
- **UI / body:** `Hanken Grotesk` (Google Fonts), weights 400/500/600/700/800.
- **Display / greeting / sheet titles:** `Instrument Serif` (Google Fonts), regular.
- Scale used: greeting 30px serif; header title 23px serif; card title 15–16px/600; section labels 12px/700 uppercase, letter-spacing .06em, muted; meta 11–12px; big stat numbers 22–52px/800.
- Body min size 13px; never below 11px for captions.

### Radius & shadow
- Cards / sheets: 14–16px (sheet top corners 22px).
- Chips / small buttons: 6–11px. Pills / avatars: 50%.
- Toggles: 14px track, 20px knob.
- Shadows: near-flat. App column `0 0 60px rgba(0,0,0,.08)`; segmented active `0 1px 3px rgba(0,0,0,.1)`.

### Layout
- Single centered column, **max-width 430px**, full viewport height (`100dvh`).
- Sticky translucent header (blur), scrollable main, fixed 5-item bottom tab bar.
- Screen padding 16px horizontal; bottom padding ~90px to clear the tab bar.
- Tap targets ≥ 44px (per product.md "thumb-reachable").

---

## Screens / Views

Global chrome:
- **Header:** back chevron (subscreens only) · serif title + muted subtitle · round **user-switcher avatar** (tap cycles active user; drives completion attribution) · **notification bell** with red unread-count badge.
- **Bottom tab bar:** Home · Upkeep · Plan · Shop · More. Active item = emerald; idle = stone-400. Line icons, 23px.

### 1. Dashboard (`/`) — three treatments to choose from
A segmented control (Cards / Focus / Agenda) switches layout. **Pick one for
production** (default = Cards); the other two are alternatives.
- **Cards:** "Needs attention" cards (upkeep due ≤7d, left-border colored by urgency, one-tap **Done**) → "Today" event list → grocery progress bar (→ Shop) → Home tiles (temps, lock, mini-split).
- **Focus:** emerald gradient hero with a big count of items needing attention + three stats (open tasks / to buy / today), then a checklist to knock out.
- **Agenda:** vertical timeline merging today's calendar events with due upkeep (each with inline Done).

### 2. Upkeep (`/maintenance`)
List sorted soonest-due; each row: name, badge (`Nd overdue` red / `Due today`/`Due in Nd` amber / `Due in Nd` stone), "every {interval} · {room}", one-tap **Done**. Tapping a row opens a **bottom sheet**: serif title, badge, notes card, "Mark done as {user}", and full completion **history** (timestamp + who). Matches v1 spec; restyled.

### 3. Plan (`/plan`) — NEW — segmented Week / Meals
- **Week:** a 7-day pill strip (today filled emerald, per-day event dots colored by type) + a color legend, then per-day cards of events (time · colored bar · title · optional "who"). Empty days show "Open evening."
- **Meals:** one card per weekday — day/date, dinner name, ingredient list, and **"Add ingredients to list"** (turns into "Added to list ✓"). Nights with no cook show "Using leftovers" / "Reservation — nothing to buy."

### 4. Shop (`/groceries`) — NEW
Quick-add input (+ button, Enter to add) · "Restock staples" / "Clear N in cart" · items **grouped by aisle** (Produce, Meat & Fish, Dairy & Eggs, Pantry, Frozen, Household), each group showing "N left". Rows: check box (emerald when checked), name (strikethrough when checked), "STAPLE" tag, optional qty. Checking = "in cart."

### 5. More (`/more`)
2-col grid of module tiles (glyph chip + label + sub-count): Tasks, Wishlist, Notifications, Home, Inventory, Documents, Contacts, Settings.

### 6–12. Sub-screens
- **Tasks:** open list (round check, assignee, colored due — red if overdue) + collapsed "Recently done."
- **Wishlist:** committed vs considering spend cards; per item a 4-stage pipeline (Idea → Decided → Ordered → Got it) with "Move to {next} →". Matches v1 status model.
- **Home Assistant (NEW, roadmap):** temperature tiles, climate card with ± setpoint, locks & switches with toggles. Note it reads from HA once base URL + token are set.
- **Notifications (NEW):** feed with colored severity dot, unread rows bolder/surfaced, "Mark all as read."
- **Inventory / Documents / Contacts:** restyled v1 lists (warranty chips; PDF rows with download; tap-to-call vendor rows).
- **Settings:** rows for active user, HA connection, notifications, password change (roadmap), backup.

---

## Interactions & Behavior

- **One-tap complete** everywhere (upkeep Done, task check, grocery check-off). Upkeep Done recomputes next-due = now + interval, prepends a history entry attributed to the **active user**, and posts a notification. (In prod, next-due is *computed*, never stored — see `src/lib/maintenance.ts`.)
- **User switcher** in the header toggles the active user; all attribution ("Mark done as {user}", history rows, notification text) follows it.
- **Status pipeline** (wishlist): tap advances one stage; no going back in the prototype.
- **Meal → grocery**: adds each ingredient not already present; de-dupes case-insensitively by name; marks the meal "added."
- **Restock staples**: adds any staple not currently on the list. **Clear in cart**: removes checked items.
- **Thermostat ±**, **lock toggle**, **switch toggles** flip local state; in prod these call HA.
- Transitions: 0.3s ease slide-in on screen change (optional in prod). Progress bar width animates 0.3s.

## State Management

Prototype holds everything in one component's local state. In the real app,
each module is **server-rendered from Drizzle + mutated via server actions**
(`"use server"`, `requireUser()`, `revalidatePath`). State that must be real:
- active user (session already provides both accounts — a UI switcher isn't in v1; decide whether "active user" is session identity or a manual toggle),
- per-module data (below),
- computed due dates (existing `maintenance.ts` pattern).

## Proposed schema additions (Drizzle)

These modules are new — suggested tables (adapt to `src/db/schema.ts` conventions, integer PKs, generated migrations):

```ts
// Groceries
groceryItems: { id, name, category (enum: produce|meat|dairy|pantry|frozen|household),
                qty (text, nullable), checked (bool), isStaple (bool),
                sourceMealId (fk, nullable), createdAt }

// Meal plan (one row per planned dinner)
meals: { id, date (or weekStart+dayIndex), title, cook (bool), notes, createdAt }
mealIngredients: { id, mealId (fk), name, category, qty (nullable) }

// Calendar / weekly plan
events: { id, date, time (text, nullable), title,
          type (enum: date|event|chore|upkeep), assignee (nullable), createdAt }
// upkeep-type events can be derived from computed due dates instead of stored.

// Home Assistant config (roadmap #1)
settings: { key, value }   // haBaseUrl, haToken (encrypted), enabled
// entities are fetched live from HA, not stored.
```

"Staples" can be a boolean on `groceryItems` plus a "restock" action that
re-inserts any staple name not currently present.

## Assets

- **Fonts:** Hanken Grotesk + Instrument Serif (Google Fonts) — or swap to the app's chosen fonts.
- **Icons:** simple inline SVG line icons (home, clock, calendar, cart, grid, bell, phone) drawn in the prototype — replace with the app's icon set (e.g. lucide-react) matching stroke-width ~1.8.
- **Glyphs** in the More grid (✓ ✦ ◉ ⌂ ▤ ▦ ☏ ⚙) are placeholders — use real icons.
- No raster images or brand assets are used.

## Files

- `Homebase.dc.html` — the full interactive prototype (all screens, all interactions). Open in a browser to click through it.
- `reference/product.md` — original product & UX doc (v1 scope + roadmap).
- `reference/architecture.md` — original technical architecture (stack, patterns, gotchas). **Read this first** — it defines the environment you're building into.

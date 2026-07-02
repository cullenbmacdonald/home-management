# Homebase — Product & UX

## Vision

One shared place for the two of us to run our apartment: what needs doing,
what we're buying, and everything we need to know about the stuff we own.
Not a general-purpose app — it's built for exactly one household (ours,
Park Slope, first-time owners) and optimized for glanceability on a phone.

## Users

- **Cullen** — 16y software engineer (Python/Go). Wants low-friction upkeep
  tracking and owns the self-hosted deployment.
- **Wife** — 2y software engineer (React). Co-user and co-developer; the
  frontend should stay idiomatic React so she can extend it.

Both use it primarily on phones around the apartment (added to home screen
as a PWA), occasionally on laptops.

## UX principles

1. **Dashboard answers "what needs attention?" in one glance.** Overdue and
   due-soon upkeep plus open tasks, each with a one-tap Done button.
2. **Recording work must be one tap.** If marking a filter change takes more
   than a "Done ✓" press, it won't happen.
3. **Attribution, not assignment-policing.** Tasks *can* be assigned, and
   completions record who did them, but nothing nags or scores.
4. **Due dates are computed, never remembered.** Next-due always derives from
   the last completion log + interval.
5. **Mobile-first, thumb-reachable.** Bottom tab bar, large tap targets,
   forms stacked vertically. Desktop is just a centered column (max-w-3xl).
6. **Light, calm visual language.** Stone neutrals + emerald accent; red only
   for overdue, amber for due-soon.

## Modules (v1 — shipped)

### Dashboard (`/`)
Greeting, upkeep items that are overdue or due within 7 days (with Done
buttons), first 5 open tasks.

### Upkeep (`/maintenance`)
Recurring maintenance schedules. Each item: name, interval (days, entered as
days/weeks/months/years), notes, optional room. Completions are logged with
timestamp + who. List is sorted soonest-due first with overdue/due-soon
badges. Detail page shows edit form + full history + archive.
Seeded defaults on first boot: mini-split filters (6w), smoke/CO test
(monthly), water filter (6mo), range hood (3mo), drain traps (3mo),
mini-split pro service (yearly), detector batteries (yearly), descale
appliances (4mo).

### Tasks (`/tasks`)
One-off shared to-dos. Assignable to either of us or "Anyone", optional due
date (overdue turns red), one-tap complete/uncomplete, recently-completed
collapses out of the way.

### Wishlist (`/wishlist`)
Furniture/purchases per room. Fields: name, room, price, link, notes.
Status pipeline: considering → decided → ordered → delivered (tap chips to
move). Header shows committed spend (decided+ordered+delivered) vs
considering spend.

### Inventory & Docs (under `/more`)
- **Inventory** — appliances/fixtures: room, brand, model, serial, purchase
  date, warranty expiry (green while active), manual link, notes.
- **Documents** — file uploads (manuals, closing docs, receipts; ≤25MB),
  stored on the data volume, served only to logged-in users.
- **Contacts** — vendors (super, plumber, HVAC…) with tap-to-call/email.

## Roadmap (in rough priority order)

1. **Home Assistant integration** — dashboard tiles for selected entities
   (temps, locks), toggle/adjust controls, entity picker in a settings page.
   Config: HA base URL + long-lived access token. Deferred by choice.
2. **Password change in-app** — currently env-var at first boot only.
3. **Notifications** — due-soon upkeep pinged to phones (web push, or via
   Home Assistant notify once integrated).
4. **Wishlist photos** — image upload on wishlist items for comparing options.
5. **Room management UI** — rooms are seeded and only editable in the DB today.
6. **Budget view** — monthly/total spend rollups from wishlist + a place to
   track big one-off costs (closing, renovation).

Non-goals: multi-household support, public signup, native apps, calendars
(Google Calendar already covers scheduled events).

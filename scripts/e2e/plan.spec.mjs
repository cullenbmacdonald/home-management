import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { all, get, run, close } from "./db.mjs";

const base = "http://localhost:3777";

const ok = (name, cond) => {
  console.log(cond ? `PASS ${name}` : `FAIL ${name}`);
  if (!cond) process.exitCode = 1;
};

// --- week date helpers (mirror src/lib/week.ts, Monday-start) ---
const toYMD = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const now = new Date();
const dow = now.getDay();
const mondayDelta = (dow === 0 ? -6 : 1) - dow;
const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayDelta);
const weekDate = (offset) =>
  toYMD(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + offset));
const todayKey = toYMD(now);

// --- populate current-week meals/events/groceries via the demo seed ---
const seed = spawnSync(process.execPath, [
  path.join(process.cwd(), "node_modules", ".bin", "tsx"),
  path.join(process.cwd(), "scripts", "seed-demo.ts"),
]);
if (seed.status !== 0) {
  console.log("FAIL seed:demo prerequisite");
  console.log(seed.stdout?.toString(), seed.stderr?.toString());
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

// login
await page.goto(base + "/login");
await page.fill('input[name="username"]', "cullen");
await page.fill('input[name="password"]', "changeme");
await page.click('button[type="submit"]');
await page.waitForURL(base + "/dashboard");

// ===================== CALENDAR TAB (month grid) =====================
// Month helpers (mirror src/lib/week.ts).
const monthParamOf = (y, mIdx) => `${y}-${String(mIdx + 1).padStart(2, "0")}`;
const monthLabelOf = (y, mIdx) =>
  new Date(y, mIdx, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
const curY = now.getFullYear();
const curM = now.getMonth();
const nextY = curM === 11 ? curY + 1 : curY;
const nextM = (curM + 1) % 12;
const prevY = curM === 0 ? curY - 1 : curY;
const prevM = (curM + 11) % 12;

// Deterministic fixtures on TODAY: a date-night (Cullen) and an unassigned event.
await run("DELETE FROM events WHERE title LIKE 'E2E Cal%'");
await run(
  "INSERT INTO events (date, time, title, type, assignee_id) VALUES ($1,$2,$3,$4,$5)",
  [todayKey, "19:00", "E2E Cal Dinner", "date", 1],
);
await run(
  "INSERT INTO events (date, time, title, type, assignee_id) VALUES ($1,$2,$3,$4,NULL)",
  [todayKey, "21:00", "E2E Cal Party", "event"],
);

// Derived-upkeep fixture that lands exactly on TODAY (nextDue = start + interval).
const weekAgo = toYMD(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7));
await run("DELETE FROM maintenance_items WHERE name = 'E2E Filter Swap'");
await run(
  "INSERT INTO maintenance_items (name, interval_days, start_date, active) VALUES ($1,$2,$3,true)",
  ["E2E Filter Swap", 7, weekAgo],
);

await page.goto(base + "/plan");
await page.waitForTimeout(400);

// C1: month header shows the current month, exactly one emerald "today" cell, dots render.
ok("C1 month header renders", await page.getByText(monthLabelOf(curY, curM)).first().isVisible());
const cells = page.locator("button.aspect-square");
const cellCount = await cells.count();
let emeraldCells = 0;
for (let i = 0; i < cellCount; i++) {
  const bg = await cells.nth(i).evaluate((el) => getComputedStyle(el).backgroundColor);
  if (bg === "rgb(5, 150, 105)") emeraldCells++;
}
ok("C1 exactly one today cell is emerald", emeraldCells === 1);
const dotCount = await page.locator("button.aspect-square span.rounded-full").count();
ok("C1 event dots render on grid", dotCount > 0);

// C2: legend shows all four type labels.
for (const label of ["Date night", "Event", "Chore", "Upkeep"]) {
  ok(`C2 legend has ${label}`, (await page.getByText(label, { exact: true }).count()) >= 1);
}

// C3: selected-day panel (defaults to today) lists today's events with type-colored bars.
ok("C3 date-night event renders", await page.getByText("E2E Cal Dinner").first().isVisible());
ok("C3 event renders", await page.getByText("E2E Cal Party").first().isVisible());
ok("C3 assignee shows in detail", await page.getByText(/· Cullen/).first().isVisible());
const barColors = await page.evaluate(() =>
  [...document.querySelectorAll("div")]
    .filter((el) => getComputedStyle(el).width === "3px")
    .map((el) => getComputedStyle(el).backgroundColor),
);
ok("C3 date-night bar emerald", barColors.includes("rgb(5, 150, 105)"));
ok("C3 event bar sky", barColors.includes("rgb(14, 165, 233)"));

// C4: derived upkeep shows in today's panel, is not a stored event, and is not editable/deletable.
ok("C4 derived upkeep visible", await page.getByText("E2E Filter Swap").first().isVisible());
const storedUpkeep = Number(
  (await get("SELECT COUNT(*) c FROM events WHERE title = 'E2E Filter Swap'")).c,
);
ok("C4 derived upkeep is not a stored event", storedUpkeep === 0);
ok("C4 upkeep amber bar present", barColors.includes("rgb(217, 119, 6)"));
ok(
  "C4 upkeep has no delete control",
  (await page.locator('button[aria-label="Delete E2E Filter Swap"]').count()) === 0,
);

// C5: clicking a day selects it (panel heading updates to that date).
await page.getByRole("button", { name: "15", exact: true }).click();
await page.waitForTimeout(400);
const day15Label = new Date(curY, curM, 15).toLocaleDateString("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
});
ok("C5 clicking a day updates the selected-day heading", await page.getByText(day15Label).first().isVisible());

// C6: month navigation moves forward and back.
await page.goto(base + "/plan");
await page.waitForTimeout(300);
await page.getByRole("button", { name: "Next month" }).click();
await page.waitForTimeout(400);
ok("C6 next advances the month", await page.getByText(monthLabelOf(nextY, nextM)).first().isVisible());
await page.getByRole("button", { name: "Previous month" }).click();
await page.getByRole("button", { name: "Previous month" }).click();
await page.waitForTimeout(400);
ok("C6 prev goes back a month", await page.getByText(monthLabelOf(prevY, prevM)).first().isVisible());

// C7: create an event more than a month out via the UI (previously impossible).
const farDay = monthParamOf(nextY, nextM) + "-20";
await page.goto(base + `/plan?tab=calendar&month=${monthParamOf(nextY, nextM)}&day=${farDay}`);
await page.waitForTimeout(400);
await page.getByRole("button", { name: "+ Add" }).click();
await page.waitForTimeout(300);
ok(
  "C7 add sheet prefills the selected far date",
  (await page.locator('input[aria-label="Event date"]').inputValue()) === farDay,
);
await page.fill('input[aria-label="Event title"]', "E2E Far Event");
await page.selectOption('select[aria-label="Event type"]', "event");
await page.getByRole("button", { name: "Add event" }).click();
await page.waitForTimeout(600);
ok("C7 far-future event created", await page.getByText("E2E Far Event").first().isVisible());
const farStored = await get("SELECT date FROM events WHERE title = 'E2E Far Event'");
ok("C7 event stored on the far date", farStored?.date === farDay);

// C8: edit an existing event via the UI — sheet prefills, changes persist.
await page.getByRole("button", { name: "Edit E2E Far Event" }).click();
await page.waitForTimeout(300);
ok("C8 edit sheet opens", await page.getByText("Edit event").first().isVisible());
ok(
  "C8 edit sheet prefills title",
  (await page.locator('input[aria-label="Event title"]').inputValue()) === "E2E Far Event",
);
ok(
  "C8 edit sheet prefills date",
  (await page.locator('input[aria-label="Event date"]').inputValue()) === farDay,
);
await page.fill('input[aria-label="Event title"]', "E2E Far Edited");
const madisonId = (await get("SELECT id FROM users WHERE display_name = 'Madison'")).id;
await page.selectOption(
  'select[aria-label="Event assignee"]',
  String(madisonId),
);
await page.getByRole("button", { name: "Save changes" }).click();
await page.waitForTimeout(600);
ok("C8 edited title shows", await page.getByText("E2E Far Edited").first().isVisible());
ok("C8 old title gone", (await page.getByText("E2E Far Event").count()) === 0);
const edited = await get(
  "SELECT title, assignee_id FROM events WHERE date = $1 AND title LIKE 'E2E Far%'",
  [farDay],
);
ok(
  "C8 edit persisted to db",
  edited?.title === "E2E Far Edited" && edited?.assignee_id === madisonId,
);
await page.locator('button[aria-label="Delete E2E Far Edited"]').click();
await page.waitForTimeout(600);
ok("C8 event deleted via UI", (await page.getByText("E2E Far Edited").count()) === 0);

// C9: a day with nothing shows "Nothing planned" (deactivate upkeep so no dots interfere).
await run("UPDATE maintenance_items SET active = false");
await page.goto(base + `/plan?tab=calendar&month=${monthParamOf(nextY, nextM)}&day=${monthParamOf(nextY, nextM)}-15`);
await page.waitForTimeout(400);
ok("C9 empty day shows Nothing planned", (await page.getByText("Nothing planned").count()) >= 1);
await run("UPDATE maintenance_items SET active = true");

// ===================== MEALS TAB =====================
// Set up a controlled grocery list for the de-dupe check.
await run("DELETE FROM grocery_items");
// Avocados already present unchecked -> must be skipped (case-insensitive).
await run(
  "INSERT INTO grocery_items (name, category, checked) VALUES ('avocados','produce',false)",
);
// Tortillas present but CHECKED -> de-dupe is unchecked-only, so it re-adds.
await run(
  "INSERT INTO grocery_items (name, category, checked) VALUES ('Tortillas','pantry',true)",
);

await page.goto(base + "/plan?tab=meals");
await page.waitForTimeout(400);

// M1: meal cards render title + ingredients
ok("M1 meal title renders", await page.getByText("Sheet-pan chicken & veg").first().isVisible());
ok("M1 ingredient list renders", await page.getByText(/Chicken thighs/).first().isVisible());

// M4: no-cook copy
ok("M4 leftovers copy", await page.getByText("Using leftovers").first().isVisible());
ok("M4 reservation copy", await page.getByText("Reservation — nothing to buy").first().isVisible());

// M2 + M3: add Taco night ingredients to list, de-duped
const tacoCard = page
  .locator("div.rounded-\\[15px\\]")
  .filter({ hasText: "Taco night w/ Sarah & Mike" });
await tacoCard.getByRole("button", { name: "Add ingredients to list" }).click();
await page.waitForTimeout(700);

const groceryNames = (await all("SELECT LOWER(name) n FROM grocery_items")).map(
  (r) => r.n,
);
const count = (n) => groceryNames.filter((x) => x === n).length;
// Taco ingredients: ground beef, tortillas, avocados, cilantro, limes, cotija
ok("M2 skips existing unchecked (avocados not duplicated)", count("avocados") === 1);
ok("M2 re-adds when only a checked match exists (tortillas x2)", count("tortillas") === 2);
ok("M2 missing ingredients added", count("ground beef") === 1 && count("cilantro") === 1 && count("limes") === 1 && count("cotija") === 1);

// M3: button flips + persists across reload
ok("M3 button flips to Added", await tacoCard.getByRole("button", { name: "Added to list ✓" }).isVisible());
await page.reload();
await page.waitForTimeout(400);
const tacoCard2 = page
  .locator("div.rounded-\\[15px\\]")
  .filter({ hasText: "Taco night w/ Sarah & Mike" });
const addedBtn = tacoCard2.getByRole("button", { name: "Added to list ✓" });
ok("M3 Added persists after reload", await addedBtn.isVisible());
ok("M3 Added button disabled", await addedBtn.isDisabled());

// M5: create a meal via UI (2 ingredients) then push to list
// Free up a day by removing its seeded meal.
const satDate = weekDate(5);
await run(
  "DELETE FROM meal_ingredients WHERE meal_id IN (SELECT id FROM meals WHERE date = $1)",
  [satDate],
);
await run("DELETE FROM meals WHERE date = $1", [satDate]);
await page.reload();
await page.waitForTimeout(400);
await page.getByRole("button", { name: "+ Plan dinner" }).first().click();
await page.waitForTimeout(300);
await page.fill('input[aria-label="Dinner title"]', "E2E Test Dinner");
await page.fill('input[aria-label="Ingredient 1 name"]', "Zucchini");
await page.getByRole("button", { name: "+ Add ingredient" }).click();
await page.fill('input[aria-label="Ingredient 2 name"]', "Halloumi");
await page.getByRole("button", { name: "Save dinner" }).click();
await page.waitForTimeout(700);
ok("M5 meal created via UI", await page.getByText("E2E Test Dinner").first().isVisible());
ok("M5 created meal shows ingredients", await page.getByText(/Zucchini/).first().isVisible());

const newCard = page
  .locator("div.rounded-\\[15px\\]")
  .filter({ hasText: "E2E Test Dinner" });
await newCard.getByRole("button", { name: "Add ingredients to list" }).click();
await page.waitForTimeout(700);
const finalNames = (await all("SELECT LOWER(name) n FROM grocery_items")).map(
  (r) => r.n,
);
ok(
  "M5 created meal ingredients pushed to list",
  finalNames.includes("zucchini") && finalNames.includes("halloumi"),
);

// restore shared state for later specs (re-activate maintenance, drop fixtures)
await run("UPDATE maintenance_items SET active = true");
await run("DELETE FROM maintenance_items WHERE name = 'E2E Filter Swap'");
await run("DELETE FROM events WHERE title LIKE 'E2E Cal%' OR title LIKE 'E2E Far%'");

await browser.close();
await close();

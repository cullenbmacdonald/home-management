import { chromium } from "playwright";
import Database from "better-sqlite3";
import { spawnSync } from "node:child_process";
import path from "node:path";

const base = "http://localhost:3777";
const dbPath = path.join(process.cwd(), "data", "homebase.db");
const db = new Database(dbPath);

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

// --- derived-upkeep fixture: an active maintenance item due this week ---
// nextDue (no logs) = startDate + interval. Anchor on the previous Wednesday
// with a 7-day interval so it lands on this week's Wednesday.
const wed = weekDate(2);
const prevWed = toYMD(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 2 - 7));
db.prepare("DELETE FROM maintenance_items WHERE name = 'E2E Filter Swap'").run();
db.prepare(
  "INSERT INTO maintenance_items (name, interval_days, start_date, active) VALUES (?,?,?,1)",
).run("E2E Filter Swap", 7, prevWed);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

// login
await page.goto(base + "/");
await page.waitForURL("**/login");
await page.fill('input[name="username"]', "cullen");
await page.fill('input[name="password"]', "changeme");
await page.click('button[type="submit"]');
await page.waitForURL(base + "/");

// ===================== WEEK TAB =====================
await page.goto(base + "/plan");
await page.waitForTimeout(400);

// P1: pill strip — today filled emerald + dots present
const pills = page.locator("div.rounded-\\[11px\\]");
const pillCount = await pills.count();
let emeraldPills = 0;
for (let i = 0; i < pillCount; i++) {
  const bg = await pills.nth(i).evaluate((el) => getComputedStyle(el).backgroundColor);
  if (bg === "rgb(5, 150, 105)") emeraldPills++;
}
ok("P1 exactly one today pill is emerald", emeraldPills === 1);
const dotCount = await page.locator("div.rounded-\\[11px\\] span.rounded-full").count();
ok("P1 event dots render on pill strip", dotCount > 0);

// P2: legend shows all four type labels
for (const label of ["Date night", "Event", "Chore", "Upkeep"]) {
  ok(`P2 legend has ${label}`, (await page.getByText(label, { exact: true }).count()) >= 1);
}

// P3: day cards list events with who + type-colored bars
ok("P3 event title renders", await page.getByText("Trash & recycling out").first().isVisible());
ok("P3 assignee shows", await page.getByText("· Cullen").first().isVisible());
// collect 3px bar colors across the view
const barColors = await page.evaluate(() =>
  [...document.querySelectorAll("div")]
    .filter((el) => getComputedStyle(el).width === "3px")
    .map((el) => getComputedStyle(el).backgroundColor),
);
ok("P3 date-night bar emerald", barColors.includes("rgb(5, 150, 105)"));
ok("P3 event bar sky", barColors.includes("rgb(14, 165, 233)"));

// P4: derived upkeep entry appears and is NOT a stored event
ok("P4 derived upkeep visible in week", await page.getByText("E2E Filter Swap").first().isVisible());
const storedUpkeep = db
  .prepare("SELECT COUNT(*) c FROM events WHERE title = 'E2E Filter Swap'")
  .get().c;
ok("P4 derived upkeep is not a stored event", storedUpkeep === 0);
ok("P4 upkeep amber bar present", barColors.includes("rgb(217, 119, 6)"));

// P5: empty day shows "Open evening"
// Clear derived upkeep + events on one non-today day so it renders empty.
db.prepare("UPDATE maintenance_items SET active = 0").run();
let emptyDay = null;
for (let o = 0; o < 7; o++) {
  const d = weekDate(o);
  if (d !== todayKey) {
    emptyDay = d;
    break;
  }
}
db.prepare("DELETE FROM events WHERE date = ?").run(emptyDay);
await page.reload();
await page.waitForTimeout(400);
ok("P5 empty day shows Open evening", (await page.getByText("Open evening").count()) >= 1);

// P6: add + delete an event via UI (on today's card)
const todayWrap = page.locator("div.mt-\\[14px\\]").filter({ hasText: "TODAY" });
await todayWrap.getByRole("button", { name: "+ Add" }).click();
await page.waitForTimeout(300);
await page.fill('input[aria-label="Event title"]', "E2E Plan Event");
await page.selectOption('select[aria-label="Event type"]', "event");
await page.getByRole("button", { name: "Add event" }).click();
await page.waitForTimeout(600);
ok("P6 event added via UI", await page.getByText("E2E Plan Event").first().isVisible());
await page.locator('button[aria-label="Delete E2E Plan Event"]').click();
await page.waitForTimeout(600);
ok("P6 event deleted via UI", (await page.getByText("E2E Plan Event").count()) === 0);

// ===================== MEALS TAB =====================
// Set up a controlled grocery list for the de-dupe check.
db.prepare("DELETE FROM grocery_items").run();
// Avocados already present unchecked -> must be skipped (case-insensitive).
db.prepare(
  "INSERT INTO grocery_items (name, category, checked) VALUES ('avocados','produce',0)",
).run();
// Tortillas present but CHECKED -> de-dupe is unchecked-only, so it re-adds.
db.prepare(
  "INSERT INTO grocery_items (name, category, checked) VALUES ('Tortillas','pantry',1)",
).run();

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

const groceryNames = db
  .prepare("SELECT LOWER(name) n FROM grocery_items")
  .all()
  .map((r) => r.n);
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
db.prepare(
  "DELETE FROM meal_ingredients WHERE meal_id IN (SELECT id FROM meals WHERE date = ?)",
).run(satDate);
db.prepare("DELETE FROM meals WHERE date = ?").run(satDate);
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
const finalNames = db
  .prepare("SELECT LOWER(name) n FROM grocery_items")
  .all()
  .map((r) => r.n);
ok(
  "M5 created meal ingredients pushed to list",
  finalNames.includes("zucchini") && finalNames.includes("halloumi"),
);

// restore shared state for later specs (re-activate maintenance, drop fixture)
db.prepare("UPDATE maintenance_items SET active = 1").run();
db.prepare("DELETE FROM maintenance_items WHERE name = 'E2E Filter Swap'").run();

await browser.close();
db.close();

import { chromium } from "playwright";
import { get, run, close } from "./db.mjs";

const base = "http://localhost:3777";

const ok = (name, cond) => {
  console.log(cond ? `PASS ${name}` : `FAIL ${name}`);
  if (!cond) process.exitCode = 1;
};

const today = new Date();
const isoDaysAgo = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
// local YYYY-MM-DD (matches the app's toYMD, not UTC)
const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
const todayKey = ymd(today);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

// login
await page.goto(base + "/login");
await page.fill('input[name="username"]', "cullen");
await page.fill('input[name="password"]', "changeme");
await page.click('button[type="submit"]');
await page.waitForURL(base + "/dashboard");

// --- D6: all caught up (fresh DB seeds only far-future upkeep) ---
await page.waitForTimeout(300);
ok(
  "D6 all-caught-up card when nothing due",
  await page.getByText("All caught up").isVisible(),
);

// --- D5: HA setup prompt when unconfigured ---
ok(
  "D5 HA setup prompt when unconfigured",
  await page.getByText("Connect Home Assistant").isVisible(),
);

// --- Seed needs-attention items ---
const insItem = (name, notes, intervalDays, roomId, startDate) =>
  get(
    "INSERT INTO maintenance_items (name, notes, interval_days, room_id, start_date, active) VALUES ($1,$2,$3,$4,$5,true) RETURNING id",
    [name, notes, intervalDays, roomId, startDate],
  );
// overdue: due = start(45d ago) + 30d interval => 15d overdue
const overdueId = (await insItem("E2E Dash Overdue", null, 30, null, isoDaysAgo(45))).id;
// due-soon: due = start(7d ago) + 10d interval => in 3d
await insItem("E2E Dash Soon", null, 10, null, isoDaysAgo(7));

await page.reload();
await page.waitForTimeout(300);

// --- D1: needs-attention cards with urgency-colored left border ---
const overdueCard = page.locator('li[data-status="overdue"]', {
  hasText: "E2E Dash Overdue",
});
const soonCard = page.locator('li[data-status="due-soon"]', {
  hasText: "E2E Dash Soon",
});
ok("D1 overdue card renders", (await overdueCard.count()) === 1);
ok("D1 due-soon card renders", (await soonCard.count()) === 1);
const overdueBorder = await overdueCard.evaluate(
  (el) => getComputedStyle(el).borderLeftColor,
);
const soonBorder = await soonCard.evaluate(
  (el) => getComputedStyle(el).borderLeftColor,
);
ok("D1 overdue left border red", overdueBorder === "rgb(220, 38, 38)");
ok("D1 due-soon left border amber", soonBorder === "rgb(217, 119, 6)");

// --- D2: one-tap Done removes card + logs completion ---
const logCount = async () =>
  Number(
    (await get("SELECT COUNT(*) c FROM maintenance_logs WHERE item_id=$1", [overdueId])).c,
  );
const logsBefore = await logCount();
await overdueCard.getByRole("button", { name: /Done/ }).click();
await page.waitForTimeout(700);
ok(
  "D2 done removes needs-attention card",
  (await page.locator('li', { hasText: "E2E Dash Overdue" }).count()) === 0,
);
const logsAfter = await logCount();
ok("D2 done creates maintenance log", logsAfter === logsBefore + 1);

// --- D2b: short-interval (weekly) item leaves the dashboard when done ---
// Regression: a flat 7-day due-soon window kept interval<=7d items in
// "needs attention" forever, since done => next due <= 7 days away.
await run(
  "INSERT INTO maintenance_items (name, interval_days, start_date, active) VALUES ($1,$2,$3,true)",
  ["E2E Weekly Chore", 7, isoDaysAgo(8)],
);
await page.reload();
await page.waitForTimeout(400);
const weeklyCard = page.locator("li", { hasText: "E2E Weekly Chore" });
ok("D2b weekly overdue card shows", (await weeklyCard.count()) === 1);
await weeklyCard.getByRole("button", { name: /Done/ }).click();
await page.waitForTimeout(700);
ok(
  "D2b weekly card leaves after done",
  (await page.locator("li", { hasText: "E2E Weekly Chore" }).count()) === 0,
);

// --- D2c: daily (interval=1) item leaves the dashboard when done ---
// Regression: ceil(interval/2) window == 1 for daily items, so done => next
// due 1 day away stayed inside the window. Window is now interval - 1.
await run(
  "INSERT INTO maintenance_items (name, interval_days, start_date, active) VALUES ($1,$2,$3,true)",
  ["E2E Daily Chore", 1, isoDaysAgo(2)],
);
await page.reload();
await page.waitForTimeout(400);
const dailyCard = page.locator("li", { hasText: "E2E Daily Chore" });
ok("D2c daily overdue card shows", (await dailyCard.count()) === 1);
await dailyCard.getByRole("button", { name: /Done/ }).click();
await page.waitForTimeout(700);
ok(
  "D2c daily card leaves after done",
  (await page.locator("li", { hasText: "E2E Daily Chore" }).count()) === 0,
);

// --- D3: today's events render (time + title) ---
await run(
  "INSERT INTO events (date, time, title, type) VALUES ($1,$2,$3,$4)",
  [todayKey, "19:30", "E2E Dinner Party", "event"],
);
await page.reload();
await page.waitForTimeout(300);
const todaySection = page.locator("section", { hasText: "Today" });
const todayText = await todaySection.first().textContent();
ok("D3 today event title renders", todayText.includes("E2E Dinner Party"));
ok("D3 today event time renders", todayText.includes("7:30p"));

// --- D4: grocery progress bar reflects checked/total + navigates to Shop ---
await run("DELETE FROM grocery_items");
const insG = (name, category, checked) =>
  run(
    "INSERT INTO grocery_items (name, category, checked, is_staple) VALUES ($1,$2,$3,false)",
    [name, category, checked],
  );
await insG("E2E G1", "produce", true);
await insG("E2E G2", "produce", false);
await insG("E2E G3", "pantry", false);
await insG("E2E G4", "frozen", false);
await page.reload();
await page.waitForTimeout(300);
ok(
  "D4 progress text shows 1 of 4 in cart",
  await page.getByText("1 of 4 in cart").isVisible(),
);
const groceryCard = page
  .locator('a[href="/groceries"]')
  .filter({ hasText: "in cart" });
const barWidth = await groceryCard
  .locator(".bg-\\[\\#059669\\]")
  .evaluate((el) => {
    const track = el.parentElement.getBoundingClientRect().width;
    return el.getBoundingClientRect().width / track;
  });
ok("D4 bar width ~25%", Math.abs(barWidth - 0.25) < 0.03);
await groceryCard.click();
await page.waitForURL("**/groceries");
ok("D4 grocery card navigates to Shop", page.url().endsWith("/groceries"));

await browser.close();
await close();

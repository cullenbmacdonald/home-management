import { chromium } from "playwright";
import { get, run, close } from "./db.mjs";

const base = "http://localhost:3777";

const ok = (name, cond) => {
  console.log(cond ? `PASS ${name}` : `FAIL ${name}`);
  if (!cond) process.exitCode = 1;
};
const ymd = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};
const today = new Date().toISOString().slice(0, 10);

// Seeded household ("Our Home") — scope every insert/count to it so rows other
// specs create for other households don't leak in.
const hh = (await get("SELECT household_id FROM users WHERE username='cullen'"))
  .household_id;

// Force the daily due-sweep to run on the next page load.
const armSweep = () =>
  run(
    "INSERT INTO settings(household_id,key,value) VALUES($1,'lastDueSweep','2000-01-01') " +
      "ON CONFLICT (household_id,key) DO UPDATE SET value='2000-01-01'",
    [hh],
  );
const countText = async (text) =>
  Number(
    (
      await get(
        "SELECT COUNT(*) c FROM notifications WHERE household_id = $1 AND text = $2",
        [hh, text],
      )
    ).c,
  );
const severityOf = async (text) =>
  (
    await get(
      "SELECT severity FROM notifications WHERE household_id = $1 AND text = $2",
      [hh, text],
    )
  )?.severity;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

// login
await page.goto(base + "/login");
await page.fill('input[name="username"]', "cullen");
await page.fill('input[name="password"]', "changeme");
await page.click('button[type="submit"]');
await page.waitForURL(base + "/dashboard");

// ---------------------------------------------------------------------------
// N1: due sweep generates overdue + due-soon notifications, idempotent per day
// ---------------------------------------------------------------------------
// Overdue by ~4 days: interval 1, started 5 days ago (no logs).
await run(
  "INSERT INTO maintenance_items(household_id,name,interval_days,start_date,active) VALUES($1,$2,$3,$4,true)",
  [hh, "N1 overdue item", 1, ymd(-5)],
);
// Due tomorrow: interval 1, started today -> next due tomorrow.
await run(
  "INSERT INTO maintenance_items(household_id,name,interval_days,start_date,active) VALUES($1,$2,$3,$4,true)",
  [hh, "N1 duesoon item", 1, today],
);

const overdueText = "N1 overdue item is 4 days overdue";
const dueSoonText = "N1 duesoon item due in 1 day";

await armSweep();
await page.goto(base + "/notifications");
ok("N1 sweep created overdue notification", (await countText(overdueText)) === 1);
ok("N1 sweep created due-soon notification", (await countText(dueSoonText)) === 1);
ok("N1 overdue severity is 'overdue'", (await severityOf(overdueText)) === "overdue");
ok("N1 due-soon severity is 'due-soon'", (await severityOf(dueSoonText)) === "due-soon");

// Same-day re-load: guard skips the sweep, no duplicates.
await page.goto(base + "/dashboard");
await page.goto(base + "/notifications");
ok("N1 same-day reload does not duplicate overdue", (await countText(overdueText)) === 1);
ok("N1 same-day reload does not duplicate due-soon", (await countText(dueSoonText)) === 1);

// Force the sweep to actually run again (as if a new day): text dedupe holds.
await armSweep();
await page.goto(base + "/notifications");
ok("N1 forced re-sweep still no duplicate overdue", (await countText(overdueText)) === 1);
ok("N1 forced re-sweep still no duplicate due-soon", (await countText(dueSoonText)) === 1);

// ---------------------------------------------------------------------------
// N2: mutation hooks create success notifications with names/labels
// ---------------------------------------------------------------------------
// markDone -> "Cullen completed "..."
await run(
  "INSERT INTO maintenance_items(household_id,name,interval_days,start_date,active) VALUES($1,$2,$3,$4,true)",
  [hh, "N2 done item", 30, today],
);
await page.goto(base + "/maintenance");
await page.locator("button", { hasText: "N2 done item" }).first().click();
await page.getByRole("button", { name: /Mark done as Cullen/ }).click();
await page.waitForTimeout(600);
ok(
  "N2 markDone creates success notification with user name",
  (await countText('Cullen completed “N2 done item”')) === 1 &&
    (await severityOf('Cullen completed “N2 done item”')) === "success",
);

// advanceWishlistItem -> "Cullen moved "..." to Decided"
await run(
  "INSERT INTO wishlist_items(household_id,name,status) VALUES($1,'N2 wish item','considering')",
  [hh],
);
await page.goto(base + "/wishlist");
await page
  .locator('li:has-text("N2 wish item")')
  .first()
  .getByRole("button", { name: /Move to Decided/ })
  .click();
await page.waitForTimeout(600);
ok(
  "N2 advance creates success notification with stage label",
  (await countText('Cullen moved “N2 wish item” to Decided')) === 1 &&
    (await severityOf('Cullen moved “N2 wish item” to Decided')) === "success",
);

// ---------------------------------------------------------------------------
// N3: feed renders dot colors, unread emphasis, relative time
// ---------------------------------------------------------------------------
await page.goto(base + "/notifications");
const overdueRow = page.locator('[data-notification][data-severity="overdue"]').first();
const dotColor = await overdueRow
  .locator("[data-dot]")
  .evaluate((el) => getComputedStyle(el).backgroundColor);
ok("N3 overdue dot is red", dotColor === "rgb(220, 38, 38)");
const successRow = page.locator('[data-notification][data-severity="success"]').first();
const successDot = await successRow
  .locator("[data-dot]")
  .evaluate((el) => getComputedStyle(el).backgroundColor);
ok("N3 success dot is green", successDot === "rgb(5, 150, 105)");

const unreadRow = page.locator('[data-notification][data-read="false"]').first();
const unreadWeight = await unreadRow
  .locator("div > div")
  .first()
  .evaluate((el) => getComputedStyle(el).fontWeight);
ok("N3 unread text is bold (600)", unreadWeight === "600");
// A read row exists (N2 mark-done etc. still unread; seed a read one to compare)
await run(
  "INSERT INTO notifications(household_id,severity,text,read_at,created_at) VALUES($1,'info','N3 read row',now(),now())",
  [hh],
);
await page.goto(base + "/notifications");
const readRow = page.locator('[data-notification][data-read="true"]').first();
const readWeight = await readRow
  .locator("div > div")
  .first()
  .evaluate((el) => getComputedStyle(el).fontWeight);
ok("N3 read text is normal weight (400)", readWeight === "400");
ok(
  "N3 relative time text present",
  ((await unreadRow.locator("div > div").nth(1).textContent()) || "").trim().length > 0,
);

// ---------------------------------------------------------------------------
// N4: mark-all-read clears badge + de-emphasizes rows + zeroes /more tile
// ---------------------------------------------------------------------------
const badge = page.locator("header [data-unread-badge]");
ok("N4 badge visible before mark-all-read", (await badge.count()) === 1);
const unreadBefore = Number(
  (
    await get(
      "SELECT COUNT(*) c FROM notifications WHERE household_id = $1 AND read_at IS NULL",
      [hh],
    )
  ).c,
);
ok("N4 there are unread notifications before", unreadBefore > 0);

await page.getByRole("button", { name: "Mark all as read" }).click();
await page.waitForTimeout(700);
ok(
  "N4 all notifications marked read",
  Number(
    (
      await get(
        "SELECT COUNT(*) c FROM notifications WHERE household_id = $1 AND read_at IS NULL",
        [hh],
      )
    ).c,
  ) === 0,
);
await page.goto(base + "/notifications");
ok("N4 badge gone after mark-all-read", (await page.locator("header [data-unread-badge]").count()) === 0);
ok(
  "N4 rows de-emphasized (no unread rows)",
  (await page.locator('[data-notification][data-read="false"]').count()) === 0,
);
await page.goto(base + "/more");
ok(
  "N4 /more notifications tile shows 0 unread",
  (await page.locator('[data-tile="notifications"] [data-sub]').textContent())?.trim() ===
    "0 unread",
);

// ---------------------------------------------------------------------------
// Badge 9+ cap
// ---------------------------------------------------------------------------
for (let i = 0; i < 12; i++) {
  await run(
    "INSERT INTO notifications(household_id,severity,text,created_at) VALUES($1,'info',$2,now())",
    [hh, `9+ cap notif ${i}`],
  );
}
await page.goto(base + "/notifications");
const capBadge = page.locator("header [data-unread-badge]");
ok("cap badge visible with >9 unread", (await capBadge.count()) === 1);
ok("cap badge shows 9+", (await capBadge.textContent())?.trim() === "9+");

await close();
await browser.close();

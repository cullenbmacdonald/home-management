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

const cullen = (await get("SELECT id FROM users WHERE username='cullen'")).id;
const madison =
  (await get("SELECT id FROM users WHERE username IN ('madison','partner') LIMIT 1"))?.id ??
  cullen;
const kitchen = (await get("SELECT id FROM rooms WHERE name='Kitchen'")).id;

const insItem = (name, notes, intervalDays, roomId, startDate) =>
  get(
    "INSERT INTO maintenance_items (name, notes, interval_days, room_id, start_date, active) VALUES ($1,$2,$3,$4,$5,true) RETURNING id",
    [name, notes, intervalDays, roomId, startDate],
  );
const todayIso = today.toISOString().slice(0, 10);
// overdue: nextDue = startDate + interval well in the past
await insItem("E2E Overdue item", "Filter needs a rinse", 30, null, isoDaysAgo(45));
// due in ~3 days: interval 10, start 7 days ago -> due in 3d
await insItem("E2E Due soon item", null, 10, null, isoDaysAgo(7));
// ok: interval 30, start today -> due in ~30d
await insItem("E2E Ok item", null, 30, null, todayIso);
// with room
await insItem("E2E Room item", null, 42, kitchen, todayIso);
// with two-log history
const histId = (await insItem("E2E History item", null, 30, null, todayIso)).id;
const nowMs = Date.now();
await run(
  "INSERT INTO maintenance_logs (item_id, completed_at, completed_by_id) VALUES ($1,$2,$3)",
  [histId, new Date(nowMs - 2 * 86400 * 1000), madison],
);
await run(
  "INSERT INTO maintenance_logs (item_id, completed_at, completed_by_id) VALUES ($1,$2,$3)",
  [histId, new Date(nowMs), cullen],
);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

// login
await page.goto(base + "/");
await page.waitForURL("**/login");
await page.fill('input[name="username"]', "cullen");
await page.fill('input[name="password"]', "changeme");
await page.click('button[type="submit"]');
await page.waitForURL(base + "/");

const rowButton = (name) => page.locator("button", { hasText: name }).first();
const badgeOf = async (name) =>
  rowButton(name).locator("span").first();

await page.goto(base + "/maintenance");
await page.waitForTimeout(300);

// U1: sort soonest-due first — overdue item precedes ok item in DOM
const names = await page.locator("button > div.text-\\[15px\\]").allTextContents();
ok(
  "U1 rows sorted soonest-due first",
  names.indexOf("E2E Overdue item") < names.indexOf("E2E Ok item"),
);

// U2: badge text + tint colors for overdue / due-soon / ok
const overdueBadge = await badgeOf("E2E Overdue item");
const overdueText = await overdueBadge.textContent();
const overdueClass = await overdueBadge.getAttribute("class");
ok("U2 overdue badge text", /\d+d overdue/.test(overdueText));
ok("U2 overdue badge red tint", overdueClass.includes("#fef2f2") && overdueClass.includes("#dc2626"));

const soonBadge = await badgeOf("E2E Due soon item");
ok("U2 due-soon badge text", /Due in \d+d/.test(await soonBadge.textContent()));
ok("U2 due-soon amber tint", (await soonBadge.getAttribute("class")).includes("#fffbeb"));

const okBadge = await badgeOf("E2E Ok item");
ok("U2 ok stone tint", (await okBadge.getAttribute("class")).includes("#f5f5f4"));

// U3: meta shows "every … · {room}" when room set
const roomMeta = await rowButton("E2E Room item").locator("span").nth(1).textContent();
ok("U3 meta has interval + room", roomMeta.includes("every 6 weeks") && roomMeta.includes("· Kitchen"));
const noRoomMeta = await rowButton("E2E Ok item").locator("span").nth(1).textContent();
ok("U3 meta omits room when unset", !noRoomMeta.includes("·"));

// U4: list Done recomputes next due (overdue -> "Due in Nd")
await rowButton("E2E Overdue item").locator("xpath=following-sibling::button").click();
await page.waitForTimeout(800);
const overdueBadge2 = await badgeOf("E2E Overdue item").then((b) => b.textContent());
ok("U4 done recomputes next-due", /Due in \d+d/.test(overdueBadge2));

// U5: row tap opens sheet with title + notes
await rowButton("E2E Overdue item").click();
await page.waitForTimeout(300);
const dialog = page.locator('[role="dialog"]');
ok("U5 sheet opens with title", (await dialog.textContent()).includes("E2E Overdue item"));
ok("U5 sheet shows notes", (await dialog.textContent()).includes("Filter needs a rinse"));
await page.locator('[aria-label="Close"]').click();
await page.waitForTimeout(200);

// U6: sheet "Mark done as Cullen" completes + attributes + closes
await rowButton("E2E Room item").click();
await page.waitForTimeout(200);
ok("U6 mark-done button names user", (await dialog.textContent()).includes("Mark done as Cullen"));
await page.getByRole("button", { name: /Mark done as Cullen/ }).click();
await page.waitForTimeout(800);
ok("U6 sheet closes after done", (await dialog.count()) === 0);
await rowButton("E2E Room item").click();
await page.waitForTimeout(200);
ok("U6 completion attributed to Cullen", (await dialog.textContent()).includes("Cullen"));
await page.locator('[aria-label="Close"]').click();
await page.waitForTimeout(200);

// U7: history newest-first with who
await rowButton("E2E History item").click();
await page.waitForTimeout(200);
const historyText = await dialog.textContent();
// newest = Cullen (today), older = Madison (2 days ago)
ok("U7 history shows both people", historyText.includes("Cullen") && (historyText.includes("Madison") || historyText.includes("partner")));
const idxNew = historyText.indexOf("Cullen");
const idxOld = Math.max(historyText.indexOf("Madison"), historyText.indexOf("partner"));
ok("U7 history newest-first", idxNew < idxOld);
await page.locator('[aria-label="Close"]').click();
await page.waitForTimeout(200);

// U8: add + edit + archive flow
await page.goto(base + "/maintenance/new");
await page.fill('input[name="name"]', "E2E Added item");
await page.selectOption('select[name="roomId"]', { label: "Kitchen" });
await page.click('button[type="submit"]');
await page.waitForURL(base + "/maintenance");
await page.waitForTimeout(400);
ok("U8 add creates item", await page.getByText("E2E Added item").first().isVisible());

// edit via sheet -> Edit link
await rowButton("E2E Added item").click();
await page.waitForTimeout(200);
await page.getByRole("link", { name: "Edit" }).click();
await page.waitForTimeout(400);
await page.fill('input[name="name"]', "E2E Edited item");
await page.click('button[type="submit"]');
await page.waitForTimeout(600);
await page.goto(base + "/maintenance");
await page.waitForTimeout(300);
ok("U8 edit updates name", await page.getByText("E2E Edited item").first().isVisible());

// archive via sheet
await rowButton("E2E Edited item").click();
await page.waitForTimeout(200);
await page.getByRole("button", { name: "Archive" }).click();
await page.waitForTimeout(800);
ok("U8 archive removes item", (await page.getByText("E2E Edited item").count()) === 0);

await browser.close();
await close();

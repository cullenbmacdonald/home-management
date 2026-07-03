import { chromium } from "playwright";

const base = "http://localhost:3777";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const ok = (name, cond) => {
  console.log(cond ? `PASS ${name}` : `FAIL ${name}`);
  if (!cond) process.exitCode = 1;
};
const money = (s) => Number((s || "").replace(/[^0-9.]/g, "")) || 0;
const ymd = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

// login
await page.goto(base + "/");
await page.waitForURL("**/login");
await page.fill('input[name="username"]', "cullen");
await page.fill('input[name="password"]', "changeme");
await page.click('button[type="submit"]');
await page.waitForURL(base + "/");

// Collapsible add forms live in a <details>; its open state is uncontrolled DOM
// state that survives server-action re-renders, so force it open rather than
// toggling (a toggle would close an already-open form).
const openAdd = () =>
  page.locator("details").first().evaluate((el) => (el.open = true));

const subFor = async (key) =>
  (await page.locator(`[data-tile="${key}"] [data-sub]`).textContent()).trim();

// ---------- O1: grid renders 8 tiles with hrefs + live counts ----------
await page.goto(base + "/more");
const expected = {
  tasks: "/tasks",
  wishlist: "/wishlist",
  notifications: "/notifications",
  home: "/home",
  inventory: "/inventory",
  documents: "/documents",
  contacts: "/vendors",
  settings: "/settings",
};
let hrefsOk = (await page.locator("[data-tile]").count()) === 8;
for (const [key, href] of Object.entries(expected)) {
  const got = await page.locator(`[data-tile="${key}"]`).getAttribute("href");
  if (got !== href) hrefsOk = false;
}
ok("O1 grid renders 8 tiles with correct hrefs", hrefsOk);
ok("O1 home tile shows Not connected", (await subFor("home")) === "Not connected");
ok("O1 settings tile shows dash", (await subFor("settings")) === "—");
ok(
  "O1 notifications tile shows unread count",
  /^\d+ unread$/.test(await subFor("notifications")),
);

// capture baseline counts, then add one of each and assert increments
const baseTasks = Number((await subFor("tasks")).split(" ")[0]);
const baseWish = Number((await subFor("wishlist")).split(" ")[0]);
const baseInv = Number((await subFor("inventory")).split(" ")[0]);
const baseDocs = Number((await subFor("documents")).split(" ")[0]);
const baseContacts = Number((await subFor("contacts")).split(" ")[0]);

await page.goto(base + "/tasks");
await page.fill('input[name="title"]', "O1 count task");
await page.click('form button[type="submit"]');
await page.waitForTimeout(600);

await page.goto(base + "/wishlist");
await page.fill('input[name="name"]', "O1 count item");
await page.locator('form button[type="submit"]').click();
await page.waitForTimeout(600);

await page.goto(base + "/inventory");
await openAdd();
await page.fill('input[name="name"]', "O1 count appliance");
await page.locator('form button[type="submit"]').click();
await page.waitForTimeout(600);

await page.goto(base + "/documents");
await page.fill('input[name="title"]', "O1 count doc");
await page.setInputFiles('input[type="file"]', {
  name: "o1.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4 o1"),
});
await page.locator('form button[type="submit"]').click();
await page.waitForTimeout(600);

await page.goto(base + "/vendors");
await openAdd();
await page.fill('input[name="name"]', "O1 count contact");
await page.locator('form button[type="submit"]').click();
await page.waitForTimeout(600);

await page.goto(base + "/more");
ok("O1 tasks count is live", Number((await subFor("tasks")).split(" ")[0]) === baseTasks + 1);
ok("O1 wishlist active count is live", Number((await subFor("wishlist")).split(" ")[0]) === baseWish + 1);
ok("O1 inventory count is live", Number((await subFor("inventory")).split(" ")[0]) === baseInv + 1);
ok("O1 documents count is live", Number((await subFor("documents")).split(" ")[0]) === baseDocs + 1);
ok("O1 contacts count is live", Number((await subFor("contacts")).split(" ")[0]) === baseContacts + 1);

// ---------- O2: tasks add/assign/due/complete/uncomplete/delete + overdue ----------
await page.goto(base + "/tasks");
await page.fill('input[name="title"]', "O2 overdue task");
await page.selectOption('select[name="assigneeId"]', { label: "Cullen" });
await page.fill('input[name="dueDate"]', ymd(-2));
await page.click('form button[type="submit"]');
await page.waitForTimeout(600);
const o2Row = page.locator('li:has-text("O2 overdue task")').first();
ok("O2 task appears with assignee", await o2Row.getByText("Cullen").isVisible());
ok(
  "O2 overdue due date flagged red",
  (await o2Row.locator("[data-overdue]").getAttribute("data-overdue")) === "true",
);
await o2Row.getByRole("button", { name: "Mark complete" }).click();
await page.waitForTimeout(600);
await page.locator("details summary").click();
ok(
  "O2 task completes (line-through)",
  await page.locator('li:has-text("O2 overdue task") .line-through').first().isVisible(),
);
await page
  .locator('li:has-text("O2 overdue task")')
  .first()
  .getByRole("button", { name: "Mark incomplete" })
  .click();
await page.waitForTimeout(600);
const o2Back = page.locator('li:has-text("O2 overdue task")').first();
ok(
  "O2 task uncompletes",
  await o2Back.getByRole("button", { name: "Mark complete" }).isVisible(),
);
await o2Back.getByRole("button", { name: "Delete task" }).click();
await page.waitForTimeout(600);
ok(
  "O2 task deletes",
  (await page.locator('li:has-text("O2 overdue task")').count()) === 0,
);

// ---------- O3: spend cards math ----------
await page.goto(base + "/wishlist");
const beforeCommitted = money(await page.locator('[data-stat="committed"]').textContent());
const beforeConsidering = money(await page.locator('[data-stat="considering"]').textContent());
// item stays as Idea (considering)
await page.fill('input[name="name"]', "O3 considering");
await page.fill('input[name="price"]', "500");
await page.locator('form button[type="submit"]').click();
await page.waitForTimeout(600);
// item advanced to Decided (committed)
await page.fill('input[name="name"]', "O3 committed");
await page.fill('input[name="price"]', "300");
await page.locator('form button[type="submit"]').click();
await page.waitForTimeout(600);
await page
  .locator('li:has-text("O3 committed")')
  .first()
  .getByRole("button", { name: /Move to Decided/ })
  .click();
await page.waitForTimeout(600);
const afterCommitted = money(await page.locator('[data-stat="committed"]').textContent());
const afterConsidering = money(await page.locator('[data-stat="considering"]').textContent());
ok("O3 committed increased by 300", afterCommitted === beforeCommitted + 300);
ok("O3 considering increased by 500", afterConsidering === beforeConsidering + 500);

// ---------- O4: Move to → advances exactly one stage ----------
await page.goto(base + "/wishlist");
await page.fill('input[name="name"]', "O4 pipeline");
await page.fill('input[name="price"]', "10");
await page.locator('form button[type="submit"]').click();
await page.waitForTimeout(600);
const activeStage = async () =>
  (await page
    .locator('li:has-text("O4 pipeline")')
    .first()
    .locator('[data-active="true"]')
    .getAttribute("data-stage"));
const advance = async () => {
  await page
    .locator('li:has-text("O4 pipeline")')
    .first()
    .getByRole("button", { name: /Move to/ })
    .click();
  await page.waitForTimeout(600);
};
ok("O4 starts at Idea", (await activeStage()) === "considering");
await advance();
ok("O4 advances to Decided", (await activeStage()) === "decided");
await advance();
ok("O4 advances to Ordered", (await activeStage()) === "ordered");
await advance();
ok("O4 advances to Got it", (await activeStage()) === "delivered");
ok(
  "O4 move button gone at Got it",
  (await page
    .locator('li:has-text("O4 pipeline")')
    .first()
    .getByRole("button", { name: /Move to/ })
    .count()) === 0,
);

// ---------- O5: warranty chip active vs expired + add/delete ----------
await page.goto(base + "/inventory");
await openAdd();
await page.fill('input[name="name"]', "O5 active appliance");
await page.fill('input[name="warrantyUntil"]', ymd(365));
await page.locator('form button[type="submit"]').click();
await page.waitForTimeout(600);
await openAdd();
await page.fill('input[name="name"]', "O5 expired appliance");
await page.fill('input[name="warrantyUntil"]', ymd(-365));
await page.locator('form button[type="submit"]').click();
await page.waitForTimeout(600);
ok(
  "O5 active warranty chip green",
  (await page
    .locator('li:has-text("O5 active appliance") [data-warranty]')
    .getAttribute("data-warranty")) === "active",
);
ok(
  "O5 expired warranty chip muted",
  (await page
    .locator('li:has-text("O5 expired appliance") [data-warranty]')
    .getAttribute("data-warranty")) === "expired",
);
page.once("dialog", (d) => d.accept());
await page
  .locator('li:has-text("O5 expired appliance")')
  .getByRole("button", { name: "Delete item" })
  .click();
await page.waitForTimeout(600);
ok(
  "O5 inventory delete works",
  (await page.locator('li:has-text("O5 expired appliance")').count()) === 0,
);

// ---------- O6: documents upload/list meta/download/delete ----------
await page.goto(base + "/documents");
await page.fill('input[name="title"]', "O6 warranty");
await page.setInputFiles('input[type="file"]', {
  name: "o6.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4 o6 document body"),
});
await page.locator('form button[type="submit"]').click();
await page.waitForTimeout(600);
const o6Row = page.locator('li:has-text("O6 warranty")').first();
ok("O6 document listed", await o6Row.isVisible());
const o6Meta = await o6Row.textContent();
ok("O6 meta shows size + added date", /\bB\b|KB|MB/.test(o6Meta) && o6Meta.includes("added"));
const o6Href = await o6Row.locator('a[href^="/api/documents/"]').getAttribute("href");
const o6dl = await page.request.get(base + o6Href);
ok("O6 document downloads", o6dl.ok() && (await o6dl.text()).startsWith("%PDF"));
page.once("dialog", (d) => d.accept());
await o6Row.getByRole("button", { name: "Delete document" }).click();
await page.waitForTimeout(600);
ok("O6 document delete works", (await page.locator('li:has-text("O6 warranty")').count()) === 0);

// ---------- O7: contacts role + name + tel link + add/delete ----------
await page.goto(base + "/vendors");
await openAdd();
await page.fill('input[name="name"]', "O7 Plumber Pat");
await page.fill('input[name="specialty"]', "Plumber");
await page.fill('input[name="phone"]', "718-555-9999");
await page.locator('form button[type="submit"]').click();
await page.waitForTimeout(600);
const o7Row = page.locator('li:has-text("O7 Plumber Pat")').first();
ok("O7 contact name shown", await o7Row.getByText("O7 Plumber Pat").isVisible());
ok("O7 contact role shown", await o7Row.getByText("Plumber").first().isVisible());
ok(
  "O7 tap-to-call tel link",
  await o7Row.locator('a[href="tel:718-555-9999"]').first().isVisible(),
);
page.once("dialog", (d) => d.accept());
await o7Row.getByRole("button", { name: "Delete contact" }).click();
await page.waitForTimeout(600);
ok("O7 contact delete works", (await page.locator('li:has-text("O7 Plumber Pat")').count()) === 0);

await browser.close();

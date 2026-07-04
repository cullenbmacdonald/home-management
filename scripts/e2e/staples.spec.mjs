import { chromium } from "playwright";
import Database from "better-sqlite3";
import path from "node:path";

const base = "http://localhost:3777";
const dbPath = path.join(process.cwd(), "data", "homebase.db");
const db = new Database(dbPath);

const ok = (name, cond) => {
  console.log(cond ? `PASS ${name}` : `FAIL ${name}`);
  if (!cond) process.exitCode = 1;
};

const countStaple = (name) =>
  db
    .prepare("SELECT COUNT(*) c FROM staples WHERE LOWER(name)=LOWER(?)")
    .get(name).c;
const stapleRow = (name) =>
  db.prepare("SELECT * FROM staples WHERE LOWER(name)=LOWER(?)").get(name);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

// login
await page.goto(base + "/");
await page.waitForURL("**/login");
await page.fill('input[name="username"]', "cullen");
await page.fill('input[name="password"]', "changeme");
await page.click('button[type="submit"]');
await page.waitForURL(base + "/");

// clean slate for our test rows
db.prepare("DELETE FROM staples WHERE name LIKE 'E2E %'").run();

const input = () => page.locator('input[aria-label="Add a staple"]');
const addBtn = () => page.locator('button[aria-label="Add"]');
const catSelect = () => page.locator('select[aria-label="Category"]');

// --- T1: reach the page via the "Manage staples" link ---
await page.goto(base + "/groceries");
await page.waitForTimeout(300);
await page.getByRole("link", { name: /Manage staples/ }).click();
await page.waitForURL("**/groceries/staples");
ok("T1 link opens staples page", page.url().endsWith("/groceries/staples"));

// --- T2: add a staple via + button lands in chosen category ---
await catSelect().selectOption("pantry");
await input().fill("E2E Coffee");
await addBtn().click();
await page.waitForTimeout(500);
ok("T2 add via button reaches DB", countStaple("E2E Coffee") === 1);
ok("T2 add uses chosen category", stapleRow("E2E Coffee").category === "pantry");
ok(
  "T2 add renders in UI",
  await page.getByText("E2E Coffee").first().isVisible(),
);

// --- T3: add via Enter key ---
await catSelect().selectOption("produce");
await input().fill("E2E Bananas");
await input().press("Enter");
await page.waitForTimeout(500);
ok("T3 add via Enter reaches DB", countStaple("E2E Bananas") === 1);

// --- T4: case-insensitive dedupe (different case ignored) ---
await input().fill("E2E COFFEE");
await addBtn().click();
await page.waitForTimeout(500);
ok("T4 case-variant duplicate ignored", countStaple("E2E Coffee") === 1);

// --- T5: recategorize via per-row select ---
await page
  .locator('select[aria-label="Category for E2E Coffee"]')
  .selectOption("household");
await page.waitForTimeout(500);
ok(
  "T5 recategorize persists to DB",
  stapleRow("E2E Coffee").category === "household",
);

// --- T6: delete removes from pool but not the shopping list ---
// put a matching item on the live list first to prove it's untouched
db.prepare(
  "INSERT INTO grocery_items (name, category, checked, is_staple) VALUES (?,?,?,?)",
).run("E2E Bananas", "produce", 0, 1);
await page.locator('button[aria-label="Delete E2E Bananas"]').click();
await page.waitForTimeout(500);
ok("T6 delete removes staple", countStaple("E2E Bananas") === 0);
ok(
  "T6 delete leaves shopping list item",
  db
    .prepare("SELECT COUNT(*) c FROM grocery_items WHERE name='E2E Bananas'")
    .get().c === 1,
);
ok(
  "T6 deleted staple gone from UI",
  (await page.getByText("E2E Bananas").count()) === 0,
);

// --- T7: back link returns to groceries ---
await page.getByRole("link", { name: /Groceries/ }).click();
await page.waitForURL(base + "/groceries");
ok("T7 back link returns to groceries", page.url().endsWith("/groceries"));

// --- T8: DB-level NOCASE uniqueness backstops direct inserts ---
let blocked = false;
try {
  db.prepare("INSERT INTO staples (name, category) VALUES (?,?)").run(
    "E2E COFFEE",
    "pantry",
  );
} catch {
  blocked = true;
}
ok("T8 NOCASE unique index blocks case-variant insert", blocked);

// cleanup
db.prepare("DELETE FROM staples WHERE name LIKE 'E2E %'").run();
db.prepare("DELETE FROM grocery_items WHERE name LIKE 'E2E %'").run();

await browser.close();
db.close();

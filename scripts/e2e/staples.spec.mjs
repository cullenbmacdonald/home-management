import { chromium } from "playwright";
import { get, run, close } from "./db.mjs";

const base = "http://localhost:3777";

const ok = (name, cond) => {
  console.log(cond ? `PASS ${name}` : `FAIL ${name}`);
  if (!cond) process.exitCode = 1;
};

const countStaple = async (name) =>
  Number(
    (await get("SELECT COUNT(*) c FROM staples WHERE LOWER(name)=LOWER($1)", [name])).c,
  );
const stapleRow = (name) =>
  get("SELECT * FROM staples WHERE LOWER(name)=LOWER($1)", [name]);

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
await run("DELETE FROM staples WHERE name LIKE 'E2E %'");

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
ok("T2 add via button reaches DB", (await countStaple("E2E Coffee")) === 1);
ok("T2 add uses chosen category", (await stapleRow("E2E Coffee")).category === "pantry");
ok(
  "T2 add renders in UI",
  await page.getByText("E2E Coffee").first().isVisible(),
);

// --- T3: add via Enter key ---
await catSelect().selectOption("produce");
await input().fill("E2E Bananas");
await input().press("Enter");
await page.waitForTimeout(500);
ok("T3 add via Enter reaches DB", (await countStaple("E2E Bananas")) === 1);

// --- T4: case-insensitive dedupe (different case ignored) ---
await input().fill("E2E COFFEE");
await addBtn().click();
await page.waitForTimeout(500);
ok("T4 case-variant duplicate ignored", (await countStaple("E2E Coffee")) === 1);

// --- T5: recategorize via per-row select ---
await page
  .locator('select[aria-label="Category for E2E Coffee"]')
  .selectOption("household");
await page.waitForTimeout(500);
ok(
  "T5 recategorize persists to DB",
  (await stapleRow("E2E Coffee")).category === "household",
);

// --- T6: delete removes from pool but not the shopping list ---
// put a matching item on the live list first to prove it's untouched
await run(
  "INSERT INTO grocery_items (name, category, checked, is_staple) VALUES ($1,$2,false,true)",
  ["E2E Bananas", "produce"],
);
await page.locator('button[aria-label="Delete E2E Bananas"]').click();
await page.waitForTimeout(500);
ok("T6 delete removes staple", (await countStaple("E2E Bananas")) === 0);
ok(
  "T6 delete leaves shopping list item",
  Number(
    (await get("SELECT COUNT(*) c FROM grocery_items WHERE name='E2E Bananas'")).c,
  ) === 1,
);
ok(
  "T6 deleted staple gone from UI",
  (await page.getByText("E2E Bananas").count()) === 0,
);

// --- T7: back link returns to groceries ---
await page.getByRole("link", { name: /Groceries/ }).click();
await page.waitForURL(base + "/groceries");
ok("T7 back link returns to groceries", page.url().endsWith("/groceries"));

// --- T8: DB-level case-insensitive uniqueness backstops direct inserts ---
let blocked = false;
try {
  await run("INSERT INTO staples (name, category) VALUES ($1,$2)", [
    "E2E COFFEE",
    "pantry",
  ]);
} catch {
  blocked = true;
}
ok("T8 lower(name) unique index blocks case-variant insert", blocked);

// cleanup
await run("DELETE FROM staples WHERE name LIKE 'E2E %'");
await run("DELETE FROM grocery_items WHERE name LIKE 'E2E %'");

await browser.close();
await close();

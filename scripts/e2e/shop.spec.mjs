import { chromium } from "playwright";
import { all, get, run, close } from "./db.mjs";

const base = "http://localhost:3777";

const ok = (name, cond) => {
  console.log(cond ? `PASS ${name}` : `FAIL ${name}`);
  if (!cond) process.exitCode = 1;
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

// login
await page.goto(base + "/login");
await page.fill('input[name="username"]', "cullen");
await page.fill('input[name="password"]', "changeme");
await page.click('button[type="submit"]');
await page.waitForURL(base + "/dashboard");

const input = () => page.locator('input[aria-label="Add an item"]');
const addBtn = () => page.locator('button[aria-label="Add"]');
const catSelect = () => page.locator('select[aria-label="Category"]');
const rowByName = (n) =>
  page.locator("div", { hasText: n }).filter({ has: page.locator("button[aria-pressed]") });
// group headers (uppercase aisle labels)
const groupLabels = () =>
  page.locator("span.uppercase.tracking-\\[0\\.06em\\]").allTextContents();

await page.goto(base + "/groceries");
await page.waitForTimeout(300);

// --- S1: quick-add via Enter AND via + button ---
await input().fill("E2E Enter Apple");
await input().press("Enter");
await page.waitForTimeout(500);
ok("S1 add via Enter", await page.getByText("E2E Enter Apple").first().isVisible());

await catSelect().selectOption("pantry");
await input().fill("E2E Plus Bread");
await addBtn().click();
await page.waitForTimeout(500);
ok("S1 add via + button", await page.getByText("E2E Plus Bread").first().isVisible());

// --- S7: category select lands item in right aisle + delete works ---
// "E2E Plus Bread" was added under Pantry. Verify it sits under the Pantry header.
const pantryGroupText = await page
  .locator("div.mb-5")
  .filter({ hasText: "Pantry" })
  .first()
  .textContent();
ok("S7 item lands in chosen aisle", pantryGroupText.includes("E2E Plus Bread"));

// delete E2E Enter Apple
await page.locator('button[aria-label="Delete E2E Enter Apple"]').click();
await page.waitForTimeout(500);
ok("S7 delete removes row", (await page.getByText("E2E Enter Apple").count()) === 0);

// --- S2: fixed aisle order + "N left" counts ---
await catSelect().selectOption("produce");
await input().fill("E2E Kale");
await addBtn().click();
await page.waitForTimeout(400);
await catSelect().selectOption("household");
await input().fill("E2E Towels");
await addBtn().click();
await page.waitForTimeout(500);

const labels = await groupLabels();
const iP = labels.indexOf("Produce");
const iPan = labels.indexOf("Pantry");
const iH = labels.indexOf("Household");
ok("S2 aisle order Produce<Pantry<Household", iP < iPan && iPan < iH && iP >= 0);

// "N left" header matches the DB's unchecked count for that aisle.
const produceLeft = Number(
  (
    await get(
      "SELECT COUNT(*) c FROM grocery_items WHERE category='produce' AND checked=false",
    )
  ).c,
);
const produceGroup = page.locator("div.mb-5").filter({ hasText: "Produce" }).first();
ok(
  "S2 N-left count",
  (await produceGroup.textContent()).includes(`${produceLeft} left`),
);

// --- S3: check toggle (strikethrough + emerald) + persists after reload ---
const kaleToggle = page
  .locator("button[aria-pressed]")
  .filter({ hasText: "E2E Kale" });
await kaleToggle.click();
await page.waitForTimeout(500);
const kaleNameStyle = await page
  .locator("span", { hasText: "E2E Kale" })
  .last()
  .evaluate((el) => getComputedStyle(el).textDecorationLine);
ok("S3 checked row strikethrough", kaleNameStyle.includes("line-through"));
ok(
  "S3 checked box emerald",
  await kaleToggle
    .locator("span")
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor === "rgb(5, 150, 105)"),
);
await page.reload();
await page.waitForTimeout(400);
ok(
  "S3 checked persists after reload",
  (await page
    .locator("button[aria-pressed='true']")
    .filter({ hasText: "E2E Kale" })
    .count()) === 1,
);

// --- S4: STAPLE tag + qty display (insert a staple+qty item via DB) ---
await run(
  "INSERT INTO grocery_items (name, category, qty, checked, is_staple) VALUES ($1,$2,$3,false,true)",
  ["E2E StapleQty", "produce", "2 lb"],
);
await page.reload();
await page.waitForTimeout(400);
const stapleRow = page
  .locator("div", { hasText: "E2E StapleQty" })
  .filter({ has: page.locator("button[aria-pressed]") })
  .last();
const stapleRowText = await stapleRow.textContent();
ok("S4 STAPLE tag renders", /Staple/i.test(stapleRowText));
ok("S4 qty displays", stapleRowText.includes("2 lb"));

// --- S6: clear-in-cart removes checked only and updates count ---
// Currently checked: E2E Kale (from S3). Uncheck-count is via the button label.
const clearBtn = page.locator("button", { hasText: /Clear \d+ in cart/ });
ok("S6 clear button shows count", (await clearBtn.count()) === 1);
await clearBtn.click();
await page.waitForTimeout(500);
ok("S6 clear removes checked item", (await page.getByText("E2E Kale").count()) === 0);
ok(
  "S6 clear button hidden at zero",
  (await page.locator("button", { hasText: /Clear \d+ in cart/ }).count()) === 0,
);

// --- S5: restock staples (empty -> 10; check/delete -> re-add no dupes) ---
await run("DELETE FROM grocery_items");
await page.reload();
await page.waitForTimeout(400);
ok(
  "S5 list empty before restock",
  (await page.getByText("List is empty").count()) === 1,
);
await page.getByRole("button", { name: /Restock staples/ }).click();
await page.waitForTimeout(600);
const stapleCount = Number(
  (await get("SELECT COUNT(*) c FROM grocery_items WHERE is_staple=true")).c,
);
ok("S5 restock adds 10 staples", stapleCount === 10);
const checkedAfterRestock = Number(
  (await get("SELECT COUNT(*) c FROM grocery_items WHERE checked=true")).c,
);
ok("S5 restocked staples unchecked", checkedAfterRestock === 0);

// check one staple, delete another, then restock again
const firstStaple = page.locator("button[aria-pressed]").first();
await firstStaple.click();
await page.waitForTimeout(400);
// delete a (different) staple row via its ✕
const delBtns = page.locator('button[aria-label^="Delete "]');
await delBtns.nth(1).click();
await page.waitForTimeout(400);
ok(
  "S5 after check+delete count is 9",
  Number((await get("SELECT COUNT(*) c FROM grocery_items")).c) === 9,
);
await page.getByRole("button", { name: /Restock staples/ }).click();
await page.waitForTimeout(600);
const finalCount = Number((await get("SELECT COUNT(*) c FROM grocery_items")).c);
ok("S5 re-restock no duplicates (10 total)", finalCount === 10);
const dupes = await all(
  "SELECT LOWER(name) name, COUNT(*) c FROM grocery_items GROUP BY LOWER(name) HAVING COUNT(*)>1",
);
ok("S5 no duplicate staple names", dupes.length === 0);
const stillChecked = Number(
  (await get("SELECT COUNT(*) c FROM grocery_items WHERE checked=true")).c,
);
ok("S5 previously checked staple now unchecked", stillChecked === 0);

await browser.close();
await close();

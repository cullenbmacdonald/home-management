// Marketing screenshots: logs in as Riley and captures phone-size shots of
// every screen (framed + full-page) plus a few expanded interaction states.
// Usage: node scripts/marketing-shots.mjs [outDir]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = "http://localhost:3000";
const outDir = process.argv[2] ?? "marketing-screenshots";
mkdirSync(`${outDir}/framed`, { recursive: true });
mkdirSync(`${outDir}/full`, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

await page.goto(base + "/login");
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/framed/00-login.png` });

await page.fill('input[name="username"]', "riley");
await page.fill('input[name="password"]', "password");
await page.click('button[type="submit"]');
await page.waitForURL(base + "/");

const screens = [
  ["/", "01-dashboard"],
  ["/plan", "02-plan-calendar"],
  ["/plan?tab=meals", "03-plan-meals"],
  ["/groceries", "04-groceries"],
  ["/groceries/staples", "05-staples"],
  ["/tasks", "06-tasks"],
  ["/maintenance", "07-maintenance"],
  ["/wishlist", "08-wishlist"],
  ["/inventory", "09-inventory"],
  ["/vendors", "10-vendors"],
  ["/documents", "11-documents"],
  ["/notifications", "12-notifications"],
  ["/more", "13-more"],
  ["/settings", "14-settings"],
  ["/home", "15-home-assistant"],
];
for (const [path, name] of screens) {
  await page.goto(base + path);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${outDir}/framed/${name}.png` });
  await page.screenshot({ path: `${outDir}/full/${name}.png`, fullPage: true });
}

// --- expanded interaction states ---
// Maintenance history expanded
await page.goto(base + "/maintenance");
await page.waitForTimeout(400);
try {
  const hist = page.getByText("History", { exact: false }).first();
  if (await hist.isVisible()) {
    await hist.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${outDir}/full/07b-maintenance-history.png`, fullPage: true });
  }
} catch {}

// Inventory add form expanded
await page.goto(base + "/inventory");
await page.waitForTimeout(400);
try {
  const add = page.getByText("Add appliance", { exact: false }).first();
  if (await add.isVisible()) {
    await add.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${outDir}/full/09b-inventory-add.png`, fullPage: true });
  }
} catch {}

await browser.close();
console.log(`saved screenshots to ${outDir}/`);

// Capture phone-size screenshots of every screen for visual review.
// Usage: node scripts/e2e/screenshots.mjs [outDir]
import { chromium } from "playwright";

const base = "http://localhost:3777";
const outDir = process.argv[2] ?? "screenshots";
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 430, height: 880 },
  deviceScaleFactor: 2,
});

await page.goto(base + "/login");
await page.screenshot({ path: `${outDir}/login.png` });
await page.fill('input[name="username"]', "cullen");
await page.fill('input[name="password"]', "changeme");
await page.click('button[type="submit"]');
await page.waitForURL(base + "/");

const screens = [
  ["/", "dashboard"],
  ["/maintenance", "upkeep"],
  ["/plan", "plan-week"],
  ["/plan?tab=meals", "plan-meals"],
  ["/groceries", "shop"],
  ["/more", "more"],
  ["/tasks", "tasks"],
  ["/wishlist", "wishlist"],
  ["/inventory", "inventory"],
  ["/documents", "documents"],
  ["/vendors", "contacts"],
  ["/notifications", "notifications"],
  ["/home", "home"],
  ["/settings", "settings"],
];
for (const [path, name] of screens) {
  await page.goto(base + path);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/${name}.png` });
}
await browser.close();
console.log(`saved ${screens.length + 1} screenshots to ${outDir}/`);

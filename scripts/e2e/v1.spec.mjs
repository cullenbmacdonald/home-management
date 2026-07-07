import { chromium } from "playwright";

const base = "http://localhost:3777";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const ok = (name, cond) => {
  console.log(cond ? `PASS ${name}` : `FAIL ${name}`);
  if (!cond) process.exitCode = 1;
};

// login
await page.goto(base + "/login");
await page.fill('input[name="username"]', "cullen");
await page.fill('input[name="password"]', "changeme");
await page.click('button[type="submit"]');
await page.waitForURL(base + "/dashboard");
ok("login redirects to dashboard", true);
ok("greeting shows Cullen", (await page.textContent("h1")).includes("Cullen"));

// tasks: add, toggle
await page.goto(base + "/tasks");
await page.fill('input[name="title"]', "Buy furnace filter");
await page.click('form button[type="submit"]');
await page.waitForTimeout(800);
ok("task appears", await page.getByText("Buy furnace filter").isVisible());
await page.click('button[aria-label="Mark complete"]');
await page.waitForTimeout(800);
await page.locator("details summary").click(); // completed tasks live in a collapsed section
ok("task completes", await page.locator("li .line-through").first().isVisible());

// maintenance: mark done via bottom sheet + attribution shows in history
await page.goto(base + "/maintenance");
await page.locator('button:has-text("Test smoke & CO detectors")').first().click();
await page.getByRole("button", { name: /Mark done as Cullen/ }).click();
await page.waitForTimeout(800);
await page.locator('button:has-text("Test smoke & CO detectors")').first().click();
const sheet = await page.locator('[role="dialog"]').textContent();
ok("mark-done records completion attributed to Cullen", sheet.includes("Cullen") && sheet.includes("Today"));
await page.locator('[aria-label="Close"]').click();

// wishlist: add + status change
await page.goto(base + "/wishlist");
await page.fill('input[name="name"]', "Sofa");
await page.fill('input[name="price"]', "2400");
await page.selectOption('select[name="roomId"]', { label: "Living Room" });
await page.locator('form button[type="submit"]').click();
await page.waitForTimeout(800);
ok("wishlist item appears", await page.getByText("Sofa").first().isVisible());
// Advance out of "Idea" (considering) so it counts toward committed spend.
// Assert the delta (other specs may have committed items already).
const money = (s) => Number((s || "").replace(/[^0-9.]/g, "")) || 0;
const committedBefore = money(await page.locator('[data-stat="committed"]').textContent());
const sofaCard = page.locator('li:has-text("Sofa")').first();
await sofaCard.getByRole("button", { name: /Move to Decided/ }).click();
await page.waitForTimeout(800);
const committedAfter = money(await page.locator('[data-stat="committed"]').textContent());
ok("spend total updates", committedAfter === committedBefore + 2400);

// inventory add
await page.goto(base + "/inventory");
await page.click("summary");
await page.fill('input[name="name"]', "Bedroom mini-split");
await page.fill('input[name="brand"]', "Mitsubishi");
await page.locator('form button[type="submit"]').click();
await page.waitForTimeout(800);
ok("inventory item appears", await page.getByText("Bedroom mini-split").isVisible());

// vendor add
await page.goto(base + "/vendors");
await page.click("summary");
await page.fill('input[name="name"]', "Joe the Plumber");
await page.fill('input[name="phone"]', "718-555-0123");
await page.locator('form button[type="submit"]').click();
await page.waitForTimeout(800);
ok("vendor appears with tel link", await page.locator('a[href="tel:718-555-0123"]').first().isVisible());

// document upload
await page.goto(base + "/documents");
await page.fill('input[name="title"]', "Furnace manual");
await page.setInputFiles('input[type="file"]', {
  name: "manual.pdf",
  mimeType: "application/pdf",
  buffer: Buffer.from("%PDF-1.4 test"),
});
await page.locator('form button[type="submit"]').click();
await page.waitForTimeout(800);
ok("document listed", await page.getByText("Furnace manual").isVisible());
const docHref = await page
  .locator('a[href^="/api/documents/"]')
  .first()
  .getAttribute("href");
const dl = await page.request.get(base + docHref);
ok("document downloads", dl.ok() && (await dl.text()).startsWith("%PDF"));

// logout (moved fully to Settings in Phase 7)
await page.goto(base + "/settings");
await page.getByRole("button", { name: /Sign out/ }).click();
await page.waitForURL("**/login");
ok("logout returns to login", true);

await browser.close();

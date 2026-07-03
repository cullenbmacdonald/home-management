import { chromium } from "playwright";

const base = "http://localhost:3777";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const ok = (name, cond) => {
  console.log(cond ? `PASS ${name}` : `FAIL ${name}`);
  if (!cond) process.exitCode = 1;
};

// login
await page.goto(base + "/");
await page.waitForURL("**/login");
await page.fill('input[name="username"]', "cullen");
await page.fill('input[name="password"]', "changeme");
await page.click('button[type="submit"]');
await page.waitForURL(base + "/");

// G9 — light theme forced: body background is the light page surface (#e7e5e4),
// not a dark inversion.
const bg = await page.evaluate(
  () => getComputedStyle(document.body).backgroundColor,
);
ok("G9 body light background (#e7e5e4)", bg === "rgb(231, 229, 228)");

// G7 — fonts: Hanken Grotesk on body, Instrument Serif on a header serif title.
const bodyFont = await page.evaluate(
  () => getComputedStyle(document.body).fontFamily,
);
ok("G7 body uses Hanken Grotesk", /Hanken Grotesk/.test(bodyFont));
const titleFont = await page.evaluate(() => {
  const el = document.querySelector("header .font-serif");
  return el ? getComputedStyle(el).fontFamily : "";
});
ok("G7 header title uses Instrument Serif", /Instrument Serif/.test(titleFont));

// G8 — primary tap targets ≥ 44px: nav tabs, upkeep Done buttons. (Header icon
// buttons are 32–34px by design per the prototype — accepted deviation, not tested.)
const navMin = await page.evaluate(() => {
  const els = [...document.querySelectorAll("nav a")];
  return Math.min(...els.map((e) => e.getBoundingClientRect().height));
});
ok(`G8 nav tab height ≥ 44px (${navMin})`, navMin >= 44);
await page.goto(base + "/maintenance");
await page.waitForSelector("text=Done");
const doneMin = await page.evaluate(() => {
  const els = [...document.querySelectorAll("button")].filter(
    (b) => b.textContent?.trim() === "Done",
  );
  return els.length
    ? Math.min(...els.map((e) => e.getBoundingClientRect().height))
    : 0;
});
ok(`G8 upkeep Done button height ≥ 44px (${doneMin})`, doneMin >= 44);
await page.goto(base + "/");

// G5 — bottom tab bar: 5 tabs with correct hrefs, active state on current tab.
const hrefs = await page.$$eval("nav a", (els) =>
  els.map((e) => new URL(e.href).pathname),
);
ok(
  "G5 five tabs with correct hrefs",
  JSON.stringify(hrefs) ===
    JSON.stringify(["/", "/maintenance", "/plan", "/groceries", "/more"]),
);
const activeHref = await page.$eval('nav a[aria-current="page"]', (e) =>
  new URL(e.href).pathname,
);
ok("G5 active tab is Home on /", activeHref === "/");

// G3 — avatar shows logged-in user's initial and links to /settings.
const avatar = page.locator('header a[href="/settings"]');
ok("G3 avatar links to /settings", (await avatar.count()) === 1);
ok("G3 avatar shows initial", (await avatar.textContent())?.trim() === "C");

// G2 — back chevron on a sub-screen navigates back.
await page.goto(base + "/more");
await page.click('header a[href="/settings"]'); // avatar -> settings (a sub-screen)
await page.waitForURL(base + "/settings");
const back = page.getByRole("button", { name: "Back" });
ok("G2 back chevron present on sub-screen", await back.isVisible());
await back.click();
await page.waitForURL(base + "/more");
ok("G2 back chevron navigates back", page.url() === base + "/more");

// G2 (negative) — no back chevron on a primary tab.
await page.goto(base + "/");
ok(
  "G2 no back chevron on Home",
  (await page.getByRole("button", { name: "Back" }).count()) === 0,
);

await browser.close();

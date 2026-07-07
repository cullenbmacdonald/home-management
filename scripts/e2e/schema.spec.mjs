import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { all, get, close } from "./db.mjs";

const base = "http://localhost:3777";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const ok = (name, cond) => {
  console.log(cond ? `PASS ${name}` : `FAIL ${name}`);
  if (!cond) process.exitCode = 1;
};

const VALID_CATS = ["produce", "meat-fish", "dairy-eggs", "pantry", "frozen", "household"];

// --- schema: all new tables exist ---
const tables = new Set(
  (
    await all(
      "SELECT table_name AS name FROM information_schema.tables WHERE table_schema='public'",
    )
  ).map((r) => r.name),
);
for (const t of [
  "grocery_items",
  "meals",
  "meal_ingredients",
  "staples",
  "events",
  "notifications",
  "settings",
]) {
  ok(`table ${t} exists`, tables.has(t));
}

// --- staples: 10 rows, valid categories ---
const stapleRows = await all("SELECT name, category FROM staples");
ok("staples has 10 rows", stapleRows.length === 10);
ok(
  "staples categories all valid",
  stapleRows.every((s) => VALID_CATS.includes(s.category)),
);

// --- users: accent colors + madison rename ---
const userRows = await all("SELECT username, accent_color FROM users");
const byName = Object.fromEntries(userRows.map((u) => [u.username, u.accent_color]));
ok("cullen accent is #059669", byName.cullen === "#059669");
ok("madison exists (not partner)", "madison" in byName && !("partner" in byName));
ok("madison accent is #0e7490", byName.madison === "#0e7490");

// --- demo seed populates the four tables with valid data ---
const seed = spawnSync("npm", ["run", "seed:demo"], { cwd: repoRoot, encoding: "utf8" });
ok("seed:demo exits 0", seed.status === 0);

const count = async (t) => Number((await get(`SELECT COUNT(*) c FROM ${t}`)).c);
ok("grocery_items populated", (await count("grocery_items")) > 0);
ok("meals populated", (await count("meals")) > 0);
ok("events populated", (await count("events")) > 0);
ok("notifications populated", (await count("notifications")) > 0);
const gcats = await all("SELECT DISTINCT category FROM grocery_items");
ok(
  "grocery categories all valid enum values",
  gcats.every((r) => VALID_CATS.includes(r.category)),
);

await close();

// --- madison can log in; her avatar renders cyan ---
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(base + "/");
await page.waitForURL("**/login");
await page.fill('input[name="username"]', "madison");
await page.fill('input[name="password"]', "changeme");
await page.click('button[type="submit"]');
await page.waitForURL(base + "/");
ok("madison login succeeds", page.url() === base + "/");
const avatar = page.locator('header a[href="/settings"]');
ok("madison avatar initial is M", (await avatar.textContent())?.trim() === "M");
const avatarBg = await avatar.evaluate((el) => getComputedStyle(el).backgroundColor);
ok("madison avatar bg is cyan #0e7490", avatarBg === "rgb(14, 116, 144)");

await browser.close();

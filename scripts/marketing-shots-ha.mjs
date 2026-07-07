// Captures the Home Assistant screens populated with live (mock) state.
// Starts the in-memory mock HA, points household #1's settings at it, then
// screenshots /home and the dashboard.
import { chromium } from "playwright";
import { Client } from "pg";
import { startMockHa } from "./e2e/mock-ha.mjs";

const base = "http://localhost:3000";
const outDir = process.argv[2] ?? "marketing-screenshots";
const HA_PORT = 8123;
const MOCK_BASE = `http://localhost:${HA_PORT}`;

const { server } = await startMockHa(HA_PORT);

const pg = new Client({ connectionString: process.env.DATABASE_URL });
await pg.connect();
const entities = [
  "sensor.living_room_temp",
  "sensor.bedroom_temp",
  "climate.mini_split",
  "lock.front_door",
  "switch.living_room_lamp",
  "switch.entryway_light",
];
const set = async (key, value) => {
  await pg.query(
    `INSERT INTO settings (household_id, key, value) VALUES (1,$1,$2)
     ON CONFLICT (household_id, key) DO UPDATE SET value=EXCLUDED.value`,
    [key, value],
  );
};
await set("haBaseUrl", MOCK_BASE);
await set("haToken", "test-token");
await set("haEntities", JSON.stringify(entities));

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
await page.goto(base + "/login");
await page.fill('input[name="username"]', "riley");
await page.fill('input[name="password"]', "password");
await page.click('button[type="submit"]');
await page.waitForURL(base + "/");

await page.goto(base + "/home");
await page.waitForTimeout(700);
await page.screenshot({ path: `${outDir}/framed/15-home-assistant.png` });
await page.screenshot({ path: `${outDir}/full/15-home-assistant.png`, fullPage: true });

await browser.close();
await pg.end();
server.close();
console.log("captured HA screens");

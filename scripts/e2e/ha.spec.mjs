import { chromium } from "playwright";
import { startMockHa } from "./mock-ha.mjs";
import { get, run, close } from "./db.mjs";

const base = "http://localhost:3777";

const ok = (name, cond) => {
  console.log(cond ? `PASS ${name}` : `FAIL ${name}`);
  if (!cond) process.exitCode = 1;
};

const HA_PORT = 8123;
const MOCK_BASE = `http://localhost:${HA_PORT}`;
const getSetting = async (key) =>
  (await get("SELECT value FROM settings WHERE key=$1", [key]))?.value;
const getCalls = async () => (await fetch(`${MOCK_BASE}/calls`)).json();

const { server } = await startMockHa(HA_PORT);

const login = async (page, username, password) => {
  await page.goto(base + "/login");
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

await login(page, "cullen", "changeme");
await page.waitForURL(base + "/");

// ---------------------------------------------------------------------------
// H1: unconfigured -> setup prompt on /home and dashboard
// ---------------------------------------------------------------------------
await page.goto(base + "/home");
ok(
  "H1 /home shows setup prompt when unconfigured",
  (await page.getByText("Connect Home Assistant").count()) > 0,
);
await page.goto(base + "/");
ok(
  "H1 dashboard shows setup prompt when unconfigured",
  (await page.getByText("Connect Home Assistant").count()) > 0,
);

// ---------------------------------------------------------------------------
// H2: settings save persists config; token never appears in page HTML
// ---------------------------------------------------------------------------
await page.goto(base + "/settings");
await page.fill('input[name="baseUrl"]', MOCK_BASE);
await page.fill('input[name="token"]', "test-token");
await page.fill(
  'textarea[name="entities"]',
  [
    "sensor.living_room_temp",
    "sensor.bedroom_temp",
    "climate.mini_split",
    "lock.front_door",
    "switch.living_room_lamp",
    "switch.entryway_light",
  ].join("\n"),
);
await page.getByRole("button", { name: /^Save/ }).click();
await page.waitForTimeout(700);

ok("H2 haBaseUrl saved", (await getSetting("haBaseUrl")) === MOCK_BASE);
ok("H2 haToken saved", (await getSetting("haToken")) === "test-token");
ok(
  "H2 haEntities saved as JSON array",
  await (async () => {
    try {
      return JSON.parse(await getSetting("haEntities")).length === 6;
    } catch {
      return false;
    }
  })(),
);

await page.goto(base + "/settings");
ok(
  "H2 settings page shows connection OK",
  (await page.locator("[data-ha-connection]").textContent())?.includes("OK"),
);
ok(
  "H2 settings page shows token saved state",
  (await page.getByText("Token saved").count()) > 0,
);
const settingsHtml = await page.content();
ok("H2 token not rendered in settings HTML", !settingsHtml.includes("test-token"));
await page.goto(base + "/home");
ok("H2 token not rendered in /home HTML", !(await page.content()).includes("test-token"));
await page.goto(base + "/");
ok("H2 token not rendered in dashboard HTML", !(await page.content()).includes("test-token"));

// ---------------------------------------------------------------------------
// H3: temp tiles render mock values on /home and dashboard
// ---------------------------------------------------------------------------
await page.goto(base + "/home");
const homeTemps = page.locator("[data-temp-tile]");
ok("H3 /home renders 2 temp tiles", (await homeTemps.count()) === 2);
ok(
  "H3 /home temp tile shows mock value",
  (await homeTemps.first().textContent())?.includes("71°"),
);
await page.goto(base + "/");
const dashTemps = page.locator("[data-temp-tile]");
ok("H3 dashboard renders temp tiles", (await dashTemps.count()) === 2);
ok(
  "H3 dashboard temp tile shows mock value",
  (await dashTemps.first().textContent())?.includes("71°"),
);

// ---------------------------------------------------------------------------
// H4: thermostat + -> climate.set_temperature with setpoint+1; UI updates
// ---------------------------------------------------------------------------
await page.goto(base + "/home");
ok(
  "H4 initial setpoint is 71",
  (await page.locator("[data-setpoint]").first().textContent())?.includes("71"),
);
await page.getByRole("button", { name: "Raise setpoint" }).first().click();
await page.waitForTimeout(700);
const calls = await getCalls();
const setCall = calls.find((c) => c.domain === "climate" && c.service === "set_temperature");
ok("H4 climate.set_temperature was called", Boolean(setCall));
ok("H4 set_temperature carried setpoint+1 (72)", setCall?.data?.temperature === 72);
ok(
  "H4 UI reflects new setpoint 72",
  (await page.locator("[data-setpoint]").first().textContent())?.includes("72"),
);

// ---------------------------------------------------------------------------
// H5: lock toggle -> lock.unlock; switch toggle -> switch.turn_off
// ---------------------------------------------------------------------------
await page.getByRole("button", { name: "Front door" }).click();
await page.waitForTimeout(700);
let callsNow = await getCalls();
ok(
  "H5 lock.unlock recorded",
  callsNow.some((c) => c.domain === "lock" && c.service === "unlock"),
);
ok(
  "H5 lock label flipped to Unlocked in UI",
  (await page.locator("[data-lock-label]").first().textContent())?.includes("Unlocked"),
);

// Living room lamp starts on -> toggling calls switch.turn_off.
await page.getByRole("button", { name: "Living room lamp" }).click();
await page.waitForTimeout(700);
callsNow = await getCalls();
ok(
  "H5 switch.turn_off recorded for lamp (was on)",
  callsNow.some((c) => c.domain === "switch" && c.service === "turn_off"),
);
// Entryway light starts off -> toggling calls switch.turn_on.
await page.getByRole("button", { name: "Entryway light" }).click();
await page.waitForTimeout(700);
callsNow = await getCalls();
ok(
  "H5 switch.turn_on recorded for entryway (was off)",
  callsNow.some((c) => c.domain === "switch" && c.service === "turn_on"),
);

// ---------------------------------------------------------------------------
// H6: HA unreachable -> error chip, page still renders, no crash
// ---------------------------------------------------------------------------
await run("UPDATE settings SET value=$1 WHERE key='haBaseUrl'", [
  "http://localhost:59999",
]);
await page.goto(base + "/home");
ok("H6 /home renders unreachable chip", (await page.locator("[data-ha-error]").count()) > 0);
ok(
  "H6 /home still renders (heading present)",
  (await page.locator("main").count()) > 0,
);
// Restore config so nothing else is affected (not that later specs use HA).
await run("UPDATE settings SET value=$1 WHERE key='haBaseUrl'", [MOCK_BASE]);

// ---------------------------------------------------------------------------
// H7: password change; old fails, new succeeds; then restored to 'changeme'
// ---------------------------------------------------------------------------
await page.goto(base + "/settings");
await page.fill('input[name="currentPassword"]', "changeme");
await page.fill('input[name="newPassword"]', "newpass123");
await page.fill('input[name="confirmPassword"]', "newpass123");
await page.getByRole("button", { name: "Change password" }).click();
await page.waitForTimeout(700);
ok("H7 password update confirmed", (await page.getByText("Password updated").count()) > 0);

// Sign out.
await page.getByRole("button", { name: /^Sign out/ }).click();
await page.waitForURL("**/login");

// Old password fails.
await login(page, "cullen", "changeme");
await page.waitForTimeout(600);
ok("H7 old password rejected", page.url().includes("/login"));
ok(
  "H7 old password shows error",
  (await page.getByText("Wrong username or password").count()) > 0,
);

// New password succeeds.
await login(page, "cullen", "newpass123");
await page.waitForURL(base + "/");
ok("H7 new password accepted", page.url() === base + "/");

// Restore to 'changeme' via UI so later specs keep working.
await page.goto(base + "/settings");
await page.fill('input[name="currentPassword"]', "newpass123");
await page.fill('input[name="newPassword"]', "changeme");
await page.fill('input[name="confirmPassword"]', "changeme");
await page.getByRole("button", { name: "Change password" }).click();
await page.waitForTimeout(700);
ok("H7 password restored to changeme", (await page.getByText("Password updated").count()) > 0);

// Leave the DB unconfigured so later specs see the setup-prompt state.
await run(
  "DELETE FROM settings WHERE key IN ('haBaseUrl','haToken','haEntities')",
);

await close();
await browser.close();
server.close();

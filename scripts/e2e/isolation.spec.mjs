// Multi-household isolation: two households created via signup must never see
// or reach each other's data. Also exercises the invite-link join flow.
import { chromium } from "playwright";
import { all, get, close } from "./db.mjs";

const base = "http://localhost:3777";

const ok = (name, cond) => {
  console.log(cond ? `PASS ${name}` : `FAIL ${name}`);
  if (!cond) process.exitCode = 1;
};

const rand = Math.random().toString(36).slice(2, 8);
const A = { user: `alpha_${rand}`, house: `Alpha ${rand}`, pw: "secret123" };
const B = { user: `beta_${rand}`, house: `Beta ${rand}`, pw: "secret123" };

/** Create a brand-new household via the signup form; returns to the dashboard. */
async function signupHousehold(page, { user, house, pw }) {
  await page.goto(base + "/signup");
  await page.fill('input[name="householdName"]', house);
  await page.fill('input[name="displayName"]', user);
  await page.fill('input[name="username"]', user);
  await page.fill('input[name="password"]', pw);
  await page.click('button[type="submit"]');
  await page.waitForURL(base + "/");
}

const browser = await chromium.launch();

// --- Household A: sign up, add a distinctive grocery item ---
const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 } });
const pageA = await ctxA.newPage();
await signupHousehold(pageA, A);
ok("A signup lands on dashboard", pageA.url() === base + "/");

const SECRET = `SECRET_${rand}`;
await pageA.goto(base + "/groceries");
await pageA.waitForTimeout(300);
await pageA.locator('input[aria-label="Add an item"]').fill(SECRET);
await pageA.locator('input[aria-label="Add an item"]').press("Enter");
await pageA.waitForTimeout(500);
ok("A sees its own item", await pageA.getByText(SECRET).first().isVisible());

// Grab A's household id + a grocery/document id straight from the DB.
const aUser = await get("SELECT id, household_id FROM users WHERE username=$1", [A.user]);
ok("A user persisted with a household", !!aUser?.household_id);

// --- Household B: separate context, separate household ---
const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 } });
const pageB = await ctxB.newPage();
await signupHousehold(pageB, B);
const bUser = await get("SELECT id, household_id FROM users WHERE username=$1", [B.user]);
ok("A and B are in different households", aUser.household_id !== bUser.household_id);

// B must NOT see A's grocery item.
await pageB.goto(base + "/groceries");
await pageB.waitForTimeout(400);
ok("B cannot see A's grocery item", !(await pageB.getByText(SECRET).first().isVisible().catch(() => false)));

// B seeded with its own default staples (household-scoped seed ran).
const bStaples = await all("SELECT id FROM staples WHERE household_id=$1", [bUser.household_id]);
ok("B has its own seeded staples", bStaples.length === 10);

// --- Cross-household document access is blocked at the API layer ---
// Insert a document row owned by A directly, then have B try to fetch it.
await get(
  `INSERT INTO documents (household_id, title, filename, original_name, mime_type, size)
   VALUES ($1, 'A private', 'nope.pdf', 'nope.pdf', 'application/pdf', 1) RETURNING id`,
  [aUser.household_id],
).then(async (row) => {
  const res = await pageB.request.get(`${base}/api/documents/${row.id}`);
  ok("B gets 404 fetching A's document", res.status() === 404);
});

// --- Invite flow: A invites, a third signup joins A's household as member ---
await pageA.goto(base + "/settings");
await pageA.waitForTimeout(300);
await pageA.getByRole("button", { name: /create invite link/i }).click();
await pageA.waitForTimeout(500);
const inviteUrl = await pageA.locator('input[readonly]').inputValue();
ok("invite link generated", /\/signup\?invite=/.test(inviteUrl));

const ctxC = await browser.newContext({ viewport: { width: 390, height: 844 } });
const pageC = await ctxC.newPage();
const invitePath = inviteUrl.slice(inviteUrl.indexOf("/signup"));
await pageC.goto(base + invitePath);
await pageC.fill('input[name="displayName"]', `guest_${rand}`);
await pageC.fill('input[name="username"]', `guest_${rand}`);
await pageC.fill('input[name="password"]', "secret123");
await pageC.click('button[type="submit"]');
await pageC.waitForURL(base + "/");

const cUser = await get("SELECT household_id, role FROM users WHERE username=$1", [`guest_${rand}`]);
ok("invited user joins A's household", cUser?.household_id === aUser.household_id);
ok("invited user is a member (not owner)", cUser?.role === "member");

// The invited member sees A's grocery item.
await pageC.goto(base + "/groceries");
await pageC.waitForTimeout(400);
ok("invited member sees household item", await pageC.getByText(SECRET).first().isVisible());

// Invite is single-use: it is now consumed.
const usedInvite = await get(
  "SELECT used_at FROM invites WHERE household_id=$1 ORDER BY id DESC LIMIT 1",
  [aUser.household_id],
);
ok("invite marked used after signup", usedInvite?.used_at !== null);

await browser.close();
await close();

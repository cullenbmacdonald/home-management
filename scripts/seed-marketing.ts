// Marketing seed: rebuilds household #1 as a believable two-person home with a
// few months of real-world history — gender-neutral residents (Riley & Jordan),
// varied task/maintenance/meal/grocery/wishlist/inventory/vendor/event data.
// Idempotent: wipes household #1's content tables and refills them each run.
//   Usage: DATABASE_URL=... npx tsx scripts/seed-marketing.ts
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/db";
import {
  households,
  users,
  rooms,
  tasks,
  maintenanceItems,
  maintenanceLogs,
  wishlistItems,
  inventoryItems,
  vendors,
  documents,
  meals,
  mealIngredients,
  staples,
  groceryItems,
  events,
  notifications,
} from "../src/db/schema";
import type { GroceryCategory } from "../src/db/schema";

const RILEY_ACCENT = "#059669"; // emerald
const JORDAN_ACCENT = "#0e7490"; // cyan

// ---- date helpers (anchored to "today") ----
const TODAY = new Date();
function d(offsetDays: number): Date {
  const x = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + offsetDays);
  return x;
}
function ymd(offsetDays: number): string {
  return d(offsetDays).toISOString().slice(0, 10);
}
/** Monday of the current week + offset days. */
function weekDate(offset: number): string {
  const dow = TODAY.getDay(); // Sun=0..Sat=6
  const mondayDelta = (dow === 0 ? -6 : 1) - dow;
  return ymd(mondayDelta + offset);
}

const CAT: Record<string, GroceryCategory> = {
  Produce: "produce",
  "Meat & Fish": "meat-fish",
  "Dairy & Eggs": "dairy-eggs",
  Pantry: "pantry",
  Frozen: "frozen",
  Household: "household",
};

async function main() {
  const householdId = 1;
  const [hh] = await db.select().from(households).where(eq(households.id, householdId));
  if (!hh) throw new Error("Household #1 not found — boot the app once first.");

  // ---- household + residents ----
  await db.update(households).set({ name: "The Bergen St. Apartment" }).where(eq(households.id, householdId));

  const existing = await db.select().from(users).where(eq(users.householdId, householdId));
  const [u1, u2] = existing.sort((a, b) => a.id - b.id);
  const pw = bcrypt.hashSync("password", 10);
  await db.update(users).set({ username: "riley", displayName: "Riley", accentColor: RILEY_ACCENT, passwordHash: pw, role: "owner" }).where(eq(users.id, u1.id));
  await db.update(users).set({ username: "jordan", displayName: "Jordan", accentColor: JORDAN_ACCENT, passwordHash: pw, role: "owner" }).where(eq(users.id, u2.id));
  const RILEY = u1.id;
  const JORDAN = u2.id;

  // ---- wipe household content (children first) ----
  await db.delete(maintenanceLogs).where(eq(maintenanceLogs.householdId, householdId));
  await db.delete(maintenanceItems).where(eq(maintenanceItems.householdId, householdId));
  await db.delete(mealIngredients).where(eq(mealIngredients.householdId, householdId));
  await db.delete(groceryItems).where(eq(groceryItems.householdId, householdId));
  await db.delete(meals).where(eq(meals.householdId, householdId));
  await db.delete(tasks).where(eq(tasks.householdId, householdId));
  await db.delete(wishlistItems).where(eq(wishlistItems.householdId, householdId));
  await db.delete(documents).where(eq(documents.householdId, householdId));
  await db.delete(inventoryItems).where(eq(inventoryItems.householdId, householdId));
  await db.delete(vendors).where(eq(vendors.householdId, householdId));
  await db.delete(events).where(eq(events.householdId, householdId));
  await db.delete(notifications).where(eq(notifications.householdId, householdId));
  await db.delete(staples).where(eq(staples.householdId, householdId));

  // ---- rooms (reuse existing; look up by name) ----
  const roomRows = await db.select().from(rooms).where(eq(rooms.householdId, householdId));
  const room = (name: string) => roomRows.find((r) => r.name === name)?.id ?? null;

  // ---- staples ----
  const stapleSeed: [string, string][] = [
    ["Bananas", "Produce"], ["Baby spinach", "Produce"], ["Lemons", "Produce"],
    ["Whole milk", "Dairy & Eggs"], ["Eggs", "Dairy & Eggs"], ["Greek yogurt", "Dairy & Eggs"], ["Butter", "Dairy & Eggs"],
    ["Coffee beans", "Pantry"], ["Olive oil", "Pantry"], ["Sparkling water", "Pantry"], ["Pasta", "Pantry"],
    ["Paper towels", "Household"], ["Trash bags", "Household"], ["Dish soap", "Household"],
  ];
  for (const [name, cat] of stapleSeed) {
    await db.insert(staples).values({ householdId, name, category: CAT[cat] });
  }

  // ---- maintenance items + logs (varied due states) ----
  // intervalDays chosen so, with the given last-done offset, status lands where noted.
  const maint: {
    name: string; intervalDays: number; roomName?: string; notes?: string;
    // completion log offsets (days ago, positive = past); last one drives next-due
    logs: { ago: number; by: number; notes?: string }[];
    startAgo: number;
  }[] = [
    { name: "Clean mini-split filters", intervalDays: 42, roomName: "Living Room", startAgo: 130,
      notes: "Pop open each unit, rinse filters, let dry fully before reinstalling.",
      logs: [{ ago: 120, by: RILEY }, { ago: 76, by: JORDAN }, { ago: 45, by: RILEY, notes: "Living room unit fan was dusty — wiped down." }] },
    { name: "Test smoke & CO detectors", intervalDays: 30, startAgo: 120,
      logs: [{ ago: 95, by: JORDAN }, { ago: 62, by: RILEY }, { ago: 34, by: JORDAN }] },
    { name: "Replace Brita water filter", intervalDays: 60, roomName: "Kitchen", startAgo: 120,
      logs: [{ ago: 110, by: RILEY }, { ago: 52, by: JORDAN }] },
    { name: "Deep-clean range hood filter", intervalDays: 90, roomName: "Kitchen", startAgo: 120,
      logs: [{ ago: 70, by: RILEY, notes: "Soaked in hot water + degreaser." }] },
    { name: "Check & clean drain traps", intervalDays: 90, roomName: "Bathroom", startAgo: 120,
      logs: [{ ago: 40, by: JORDAN }] },
    { name: "Descale dishwasher & washer", intervalDays: 120, roomName: "Kitchen", startAgo: 130,
      logs: [{ ago: 88, by: RILEY }] },
    { name: "Replace HVAC batteries (thermostat)", intervalDays: 365, startAgo: 200,
      logs: [{ ago: 180, by: JORDAN }] },
    { name: "Rotate & flip mattress", intervalDays: 90, roomName: "Bedroom", startAgo: 120,
      logs: [{ ago: 15, by: RILEY }] },
    { name: "Water the plants deep-soak", intervalDays: 7, roomName: "Living Room", startAgo: 60,
      logs: [{ ago: 8, by: JORDAN }] },
    { name: "Clean out fridge & check dates", intervalDays: 30, roomName: "Kitchen", startAgo: 90,
      logs: [{ ago: 5, by: RILEY }] },
  ];
  for (const m of maint) {
    const [item] = await db.insert(maintenanceItems).values({
      householdId, name: m.name, notes: m.notes ?? null, intervalDays: m.intervalDays,
      roomId: m.roomName ? room(m.roomName) : null, startDate: ymd(-m.startAgo), active: true,
    }).returning({ id: maintenanceItems.id });
    for (const log of m.logs) {
      await db.insert(maintenanceLogs).values({
        householdId, itemId: item.id, completedAt: d(-log.ago), completedById: log.by, notes: log.notes ?? null,
      });
    }
  }

  // ---- tasks (open + completed history) ----
  const openTasks: { title: string; notes?: string; assignee?: number; due?: number }[] = [
    { title: "Call super about radiator knock", assignee: JORDAN, due: -3, notes: "Started last week, loudest around 6am." },
    { title: "Renew renter's insurance", assignee: RILEY, due: 4 },
    { title: "Return Amazon package (wrong lamp)", assignee: JORDAN, due: 1 },
    { title: "Book chimney sweep before fall", due: 21 },
    { title: "Deep clean oven", assignee: RILEY, due: 6 },
    { title: "Fix wobbly dining chair", assignee: JORDAN },
    { title: "Schedule dentist appointments", assignee: RILEY, due: 9 },
    { title: "Sort winter clothes into storage bins", due: 14 },
    { title: "Replace burnt-out entryway bulb", assignee: JORDAN, due: 0 },
    { title: "Water bill autopay setup" },
  ];
  for (const t of openTasks) {
    await db.insert(tasks).values({
      householdId, title: t.title, notes: t.notes ?? null,
      assigneeId: t.assignee ?? null, dueDate: t.due != null ? ymd(t.due) : null,
      createdAt: d(-(Math.floor(Math.random() * 20) + 2)),
    });
  }
  const doneTasks: { title: string; by: number; ago: number }[] = [
    { title: "Hang bedroom curtains", by: RILEY, ago: 3 },
    { title: "Assemble new bookshelf", by: JORDAN, ago: 5 },
    { title: "Drop off dry cleaning", by: RILEY, ago: 6 },
    { title: "Pick up prescription", by: JORDAN, ago: 8 },
    { title: "Deep clean bathroom grout", by: RILEY, ago: 11 },
    { title: "Set up mesh wifi in office", by: JORDAN, ago: 14 },
    { title: "Register dishwasher warranty", by: RILEY, ago: 20 },
    { title: "Replace shower head", by: JORDAN, ago: 26 },
    { title: "Patch & paint hallway scuff", by: RILEY, ago: 33 },
    { title: "Swap AC for heat (seasonal)", by: JORDAN, ago: 41 },
    { title: "Donate old couch", by: RILEY, ago: 52 },
    { title: "Reseal bathtub caulk", by: JORDAN, ago: 68 },
  ];
  for (const t of doneTasks) {
    await db.insert(tasks).values({
      householdId, title: t.title, assigneeId: t.by, dueDate: ymd(-t.ago - 1),
      completedAt: d(-t.ago), completedById: t.by, createdAt: d(-t.ago - 4),
    });
  }

  // ---- meals (current week + 2 past weeks) ----
  const mealSeed: { offset: number; title: string; cook: boolean; out: boolean; ingredients: [string, string, string][] }[] = [
    { offset: 0, title: "Sheet-pan chicken & veg", cook: true, out: false, ingredients: [["Chicken thighs", "Meat & Fish", "2 lb"], ["Broccoli", "Produce", "1 head"], ["Baby potatoes", "Produce", "1.5 lb"], ["Lemons", "Produce", "2"]] },
    { offset: 1, title: "Leftovers", cook: false, out: false, ingredients: [] },
    { offset: 2, title: "Pasta al limone", cook: true, out: false, ingredients: [["Spaghetti", "Pantry", "1 box"], ["Parmesan", "Dairy & Eggs", ""], ["Lemons", "Produce", "2"], ["Arugula", "Produce", "1 bag"]] },
    { offset: 3, title: "Date night — dinner out", cook: false, out: true, ingredients: [] },
    { offset: 4, title: "Taco night w/ Sam & Priya", cook: true, out: false, ingredients: [["Ground beef", "Meat & Fish", "1.5 lb"], ["Tortillas", "Pantry", "2 packs"], ["Avocados", "Produce", "3"], ["Cilantro", "Produce", "1 bunch"], ["Limes", "Produce", "4"]] },
    { offset: 5, title: "Farmers market veg bowls", cook: true, out: false, ingredients: [["Farro", "Pantry", "1 bag"], ["Seasonal veg", "Produce", ""], ["Feta", "Dairy & Eggs", ""]] },
    { offset: 6, title: "Batch chili (meal prep)", cook: true, out: false, ingredients: [["Ground turkey", "Meat & Fish", "2 lb"], ["Canned tomatoes", "Pantry", "3"], ["Kidney beans", "Pantry", "2 cans"], ["Onions", "Produce", "2"]] },
    // last week
    { offset: -7, title: "Salmon & asparagus", cook: true, out: false, ingredients: [] },
    { offset: -6, title: "Leftovers", cook: false, out: false, ingredients: [] },
    { offset: -5, title: "Thai green curry", cook: true, out: false, ingredients: [] },
    { offset: -4, title: "Pizza night (takeout)", cook: false, out: true, ingredients: [] },
    { offset: -3, title: "Stir-fry rice bowls", cook: true, out: false, ingredients: [] },
    { offset: -1, title: "Brunch w/ friends", cook: true, out: false, ingredients: [] },
  ];
  const mealIdByOffset = new Map<number, number>();
  for (const m of mealSeed) {
    const [meal] = await db.insert(meals).values({
      householdId, date: weekDate(m.offset), title: m.title, cook: m.cook, out: m.out,
      ingredientsAddedAt: m.ingredients.length ? d(-1) : null,
    }).returning({ id: meals.id });
    mealIdByOffset.set(m.offset, meal.id);
    for (const [name, cat, qty] of m.ingredients) {
      await db.insert(mealIngredients).values({ householdId, mealId: meal.id, name, category: CAT[cat], qty: qty || null });
    }
  }

  // ---- grocery list (active) ----
  const tacoMealId = mealIdByOffset.get(4) ?? null;
  const grocery: { name: string; cat: string; qty?: string; checked?: boolean; staple?: boolean; meal?: number | null }[] = [
    { name: "Bananas", cat: "Produce", checked: true, staple: true },
    { name: "Baby spinach", cat: "Produce", staple: true },
    { name: "Avocados", cat: "Produce", qty: "3", meal: tacoMealId },
    { name: "Limes", cat: "Produce", qty: "4", meal: tacoMealId },
    { name: "Cilantro", cat: "Produce", qty: "1 bunch", meal: tacoMealId },
    { name: "Broccoli", cat: "Produce", qty: "1 head" },
    { name: "Ground beef", cat: "Meat & Fish", qty: "1.5 lb", meal: tacoMealId },
    { name: "Chicken thighs", cat: "Meat & Fish", qty: "2 lb" },
    { name: "Whole milk", cat: "Dairy & Eggs", checked: true, staple: true },
    { name: "Eggs", cat: "Dairy & Eggs", qty: "1 dozen", staple: true },
    { name: "Greek yogurt", cat: "Dairy & Eggs", staple: true },
    { name: "Parmesan", cat: "Dairy & Eggs" },
    { name: "Coffee beans", cat: "Pantry", checked: true, staple: true },
    { name: "Tortillas", cat: "Pantry", qty: "2 packs", meal: tacoMealId },
    { name: "Canned tomatoes", cat: "Pantry", qty: "3" },
    { name: "Sparkling water", cat: "Pantry", qty: "1 case", staple: true },
    { name: "Frozen berries", cat: "Frozen" },
    { name: "Paper towels", cat: "Household", staple: true },
    { name: "Trash bags", cat: "Household", checked: true, staple: true },
  ];
  for (const g of grocery) {
    await db.insert(groceryItems).values({
      householdId, name: g.name, category: CAT[g.cat], qty: g.qty ?? null,
      checked: g.checked ?? false, isStaple: g.staple ?? false, sourceMealId: g.meal ?? null,
    });
  }

  // ---- wishlist ----
  const wish: { name: string; room?: string; url?: string; price?: number; status: "considering" | "decided" | "ordered" | "delivered"; notes?: string }[] = [
    { name: "Walnut dining chairs (set of 4)", room: "Kitchen", price: 640, status: "ordered", url: "https://www.article.com", notes: "Ordered — ETA next Thursday." },
    { name: "Standing desk for office", room: "Office", price: 495, status: "decided", url: "https://www.fully.com", notes: "Jarvis bamboo, waiting for a sale." },
    { name: "Area rug 8x10", room: "Living Room", price: 320, status: "considering", url: "https://www.rugsusa.com" },
    { name: "Air purifier", room: "Bedroom", price: 220, status: "delivered", notes: "Coway — love it, bedroom air is way better." },
    { name: "Blackout curtains", room: "Bedroom", price: 85, status: "delivered" },
    { name: "Espresso machine", room: "Kitchen", price: 700, status: "considering", url: "https://www.breville.com", notes: "Barista Express vs. Pro — still deciding." },
    { name: "Floating shelves (pair)", room: "Living Room", price: 90, status: "decided" },
    { name: "Robot vacuum", price: 380, status: "considering", url: "https://www.roborock.com" },
    { name: "Bar stools", room: "Kitchen", price: 260, status: "considering" },
    { name: "Framed print for hallway", room: "Entryway", price: 130, status: "ordered" },
  ];
  for (const w of wish) {
    await db.insert(wishlistItems).values({
      householdId, name: w.name, roomId: w.room ? room(w.room) : null, url: w.url ?? null,
      price: w.price ?? null, status: w.status, notes: w.notes ?? null,
      createdAt: d(-(Math.floor(Math.random() * 60) + 3)),
    });
  }

  // ---- inventory ----
  const inv: { name: string; room?: string; brand?: string; model?: string; serial?: string; purchase?: number; warranty?: number; manual?: string; notes?: string }[] = [
    { name: "Kitchen mini-split", room: "Kitchen", brand: "Mitsubishi", model: "MSZ-GL12NA", serial: "7A21-004512", purchase: -400, warranty: 1400, manual: "https://mitsubishicomfort.com/manuals" },
    { name: "Living room mini-split", room: "Living Room", brand: "Mitsubishi", model: "MSZ-GL15NA", serial: "7A21-004513", purchase: -400, warranty: 1400 },
    { name: "Dishwasher", room: "Kitchen", brand: "Bosch", model: "SHEM63W55N", serial: "FD9902-88213", purchase: -180, warranty: 550, notes: "Register done. Quiet 44 dBA." },
    { name: "Refrigerator", room: "Kitchen", brand: "LG", model: "LRFVS3006S", serial: "912KRAB1234", purchase: -600, warranty: -235 },
    { name: "Washer/dryer combo", room: "Bathroom", brand: "LG", model: "WM3998HBA", serial: "004KWMH991", purchase: -300, warranty: 430 },
    { name: "Range / oven", room: "Kitchen", brand: "GE", model: "JGB735SPSS", serial: "GA88213K", purchase: -700, warranty: -335 },
    { name: "Robotic thermostat", room: "Living Room", brand: "Ecobee", model: "Premium", serial: "EB-PR-77213", purchase: -250, warranty: 480 },
    { name: "Water heater", brand: "Rheem", model: "PROG40", serial: "RH40-2231", purchase: -900, notes: "Building-provided, 40 gal." },
    { name: "Vacuum", room: "Entryway", brand: "Dyson", model: "V11", serial: "DY-V11-8821", purchase: -220, warranty: 500 },
    { name: "Air purifier", room: "Bedroom", brand: "Coway", model: "AP-1512HH", serial: "CW1512-2231", purchase: -60, warranty: 605 },
    { name: "TV", room: "Living Room", brand: "LG", model: "C3 55\"", serial: "LGC3-55-9921", purchase: -290, warranty: 75 },
    { name: "Microwave", room: "Kitchen", brand: "Panasonic", model: "NN-SN686S", serial: "PN686-1120", purchase: -500 },
  ];
  for (const it of inv) {
    await db.insert(inventoryItems).values({
      householdId, name: it.name, roomId: it.room ? room(it.room) : null,
      brand: it.brand ?? null, model: it.model ?? null, serial: it.serial ?? null,
      purchaseDate: it.purchase != null ? ymd(it.purchase) : null,
      warrantyUntil: it.warranty != null ? ymd(it.warranty) : null,
      manualUrl: it.manual ?? null, notes: it.notes ?? null,
    });
  }

  // ---- vendors ----
  const vend: { name: string; specialty: string; phone?: string; email?: string; notes?: string }[] = [
    { name: "Miguel (Building Super)", specialty: "Super", phone: "(718) 555-0142", notes: "Text first. Handles heat, water, common areas. Lives in 1R." },
    { name: "Brooklyn Rapid Plumbing", specialty: "Plumber", phone: "(718) 555-0198", email: "dispatch@brooklynrapid.com", notes: "Used for the kitchen sink clog — fair, on time." },
    { name: "Volt Bros Electric", specialty: "Electrician", phone: "(347) 555-0111", email: "info@voltbros.com" },
    { name: "CoolAir HVAC", specialty: "HVAC", phone: "(718) 555-0173", notes: "Annual mini-split service. Ask for Dennis." },
    { name: "Park Slope Locksmith", specialty: "Locksmith", phone: "(718) 555-0166" },
    { name: "Handy Andy", specialty: "Handyman", phone: "(646) 555-0129", notes: "Mounted the TV + shelves. Cash only." },
  ];
  for (const v of vend) {
    await db.insert(vendors).values({ householdId, ...v, email: v.email ?? null, notes: v.notes ?? null });
  }

  // ---- documents (rows pointing at existing placeholder pdfs on disk) ----
  const invRows = await db.select().from(inventoryItems).where(eq(inventoryItems.householdId, householdId));
  const invId = (name: string) => invRows.find((i) => i.name === name)?.id ?? null;
  const docSeed: { title: string; filename: string; original: string; item?: string; ago: number }[] = [
    { title: "Lease agreement 2026", filename: "4c17229e5a748b0cb877a96f.pdf", original: "lease-2026.pdf", ago: 190 },
    { title: "Renter's insurance policy", filename: "eb7ecacc102699fdf8a6c74c.pdf", original: "insurance-policy.pdf", ago: 150 },
    { title: "Bosch dishwasher manual", filename: "4c17229e5a748b0cb877a96f.pdf", original: "bosch-shem63-manual.pdf", item: "Dishwasher", ago: 175 },
    { title: "Dishwasher receipt", filename: "eb7ecacc102699fdf8a6c74c.pdf", original: "bosch-receipt.pdf", item: "Dishwasher", ago: 178 },
    { title: "Mini-split warranty", filename: "4c17229e5a748b0cb877a96f.pdf", original: "mitsubishi-warranty.pdf", item: "Kitchen mini-split", ago: 395 },
  ];
  for (const doc of docSeed) {
    await db.insert(documents).values({
      householdId, title: doc.title, filename: doc.filename, originalName: doc.original,
      mimeType: "application/pdf", size: 148213, inventoryItemId: doc.item ? invId(doc.item) : null,
      uploadedAt: d(-doc.ago),
    });
  }

  // ---- events (this month: dates, events, chores) ----
  const eventSeed: { offset: number; time?: string; title: string; type: "date" | "event" | "chore"; who?: number }[] = [
    // past this month
    { offset: -12, time: "19:30", title: "Anniversary dinner — Lilia", type: "date" },
    { offset: -9, time: "10:00", title: "Farmers market — Grand Army Plaza", type: "event" },
    { offset: -6, time: "18:00", title: "Book club (Jordan)", type: "event", who: JORDAN },
    { offset: -4, time: "09:00", title: "CoolAir mini-split service", type: "event" },
    { offset: -2, time: "08:00", title: "Trash & recycling out", type: "chore", who: RILEY },
    // this week
    { offset: 0, time: "18:30", title: "Gym", type: "event", who: RILEY },
    { offset: 0, time: "20:00", title: "Building board meeting", type: "event" },
    { offset: 1, time: "17:00", title: "Grocery pickup — Union Market", type: "event", who: JORDAN },
    { offset: 1, title: "Water the plants", type: "chore", who: JORDAN },
    { offset: 2, time: "11:00", title: "Super re: radiator knock", type: "event" },
    { offset: 3, time: "19:30", title: "Date night — Lot 2", type: "date" },
    { offset: 4, title: "Laundry", type: "chore", who: RILEY },
    { offset: 4, time: "20:00", title: "Dinner w/ Sam & Priya", type: "date" },
    { offset: 6, time: "10:00", title: "Farmers market", type: "event" },
    { offset: 6, time: "14:00", title: "Hang bedroom shelves", type: "chore", who: JORDAN },
    // upcoming
    { offset: 9, time: "18:00", title: "Riley's parents visiting", type: "event", who: RILEY },
    { offset: 12, time: "12:00", title: "Article delivery — dining chairs", type: "event" },
    { offset: 16, time: "19:00", title: "Concert @ Prospect Park", type: "date" },
  ];
  for (const e of eventSeed) {
    await db.insert(events).values({
      householdId, date: ymd(e.offset), time: e.time ?? null, title: e.title, type: e.type, assigneeId: e.who ?? null,
    });
  }

  // ---- notifications ----
  const notif: { severity: "overdue" | "due-soon" | "info" | "success"; text: string; read: boolean; ago: number }[] = [
    { severity: "overdue", text: "“Deep-clean range hood filter” is overdue by 3 days", read: false, ago: 0 },
    { severity: "overdue", text: "“Replace Brita water filter” is overdue by 5 days", read: false, ago: 0 },
    { severity: "due-soon", text: "“Test smoke & CO detectors” is due in 2 days", read: false, ago: 1 },
    { severity: "info", text: "Grocery pickup tomorrow at 5:00 PM", read: false, ago: 1 },
    { severity: "info", text: "Article delivery scheduled for next Thursday", read: true, ago: 2 },
    { severity: "success", text: "Riley completed “Hang bedroom curtains”", read: true, ago: 3 },
    { severity: "success", text: "Jordan moved “Walnut dining chairs” to Ordered", read: true, ago: 4 },
    { severity: "success", text: "Jordan logged “Water the plants deep-soak”", read: true, ago: 8 },
  ];
  for (const n of notif) {
    await db.insert(notifications).values({
      householdId, severity: n.severity, text: n.text, readAt: n.read ? d(-n.ago) : null, createdAt: d(-n.ago),
    });
  }

  console.log("marketing seed complete for household #1 (Riley & Jordan / password: 'password')");
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

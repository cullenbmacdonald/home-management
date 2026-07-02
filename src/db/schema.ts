import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  accentColor: text("accent_color").notNull().default("#059669"),
});

/** Grocery aisle categories, shared by staples/groceryItems/mealIngredients. */
export const GROCERY_CATEGORIES = [
  "produce",
  "meat-fish",
  "dairy-eggs",
  "pantry",
  "frozen",
  "household",
] as const;
export type GroceryCategory = (typeof GROCERY_CATEGORIES)[number];

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

export const rooms = sqliteTable("rooms", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  notes: text("notes"),
  assigneeId: integer("assignee_id").references(() => users.id),
  dueDate: text("due_date"), // YYYY-MM-DD
  completedAt: integer("completed_at", { mode: "timestamp" }),
  completedById: integer("completed_by_id").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const maintenanceItems = sqliteTable("maintenance_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  notes: text("notes"),
  intervalDays: integer("interval_days").notNull(),
  roomId: integer("room_id").references(() => rooms.id),
  // anchor for first due date when there are no logs yet
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const maintenanceLogs = sqliteTable("maintenance_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id")
    .notNull()
    .references(() => maintenanceItems.id, { onDelete: "cascade" }),
  completedAt: integer("completed_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  completedById: integer("completed_by_id").references(() => users.id),
  notes: text("notes"),
});

export const wishlistItems = sqliteTable("wishlist_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  roomId: integer("room_id").references(() => rooms.id),
  url: text("url"),
  price: real("price"),
  status: text("status", {
    enum: ["considering", "decided", "ordered", "delivered"],
  })
    .notNull()
    .default("considering"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const inventoryItems = sqliteTable("inventory_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  roomId: integer("room_id").references(() => rooms.id),
  brand: text("brand"),
  model: text("model"),
  serial: text("serial"),
  purchaseDate: text("purchase_date"), // YYYY-MM-DD
  warrantyUntil: text("warranty_until"), // YYYY-MM-DD
  manualUrl: text("manual_url"),
  notes: text("notes"),
});

export const vendors = sqliteTable("vendors", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  specialty: text("specialty"), // e.g. plumber, HVAC, super
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
});

export const documents = sqliteTable("documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  filename: text("filename").notNull(), // stored filename on disk
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  inventoryItemId: integer("inventory_item_id").references(
    () => inventoryItems.id,
    { onDelete: "set null" },
  ),
  uploadedAt: integer("uploaded_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const meals = sqliteTable("meals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // YYYY-MM-DD
  title: text("title").notNull(),
  cook: integer("cook", { mode: "boolean" }).notNull().default(true),
  out: integer("out", { mode: "boolean" }).notNull().default(false),
  notes: text("notes"),
  ingredientsAddedAt: integer("ingredients_added_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const mealIngredients = sqliteTable("meal_ingredients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mealId: integer("meal_id")
    .notNull()
    .references(() => meals.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category", { enum: GROCERY_CATEGORIES }).notNull(),
  qty: text("qty"),
});

export const staples = sqliteTable("staples", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  category: text("category", { enum: GROCERY_CATEGORIES }).notNull(),
});

export const groceryItems = sqliteTable("grocery_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category", { enum: GROCERY_CATEGORIES }).notNull(),
  qty: text("qty"),
  checked: integer("checked", { mode: "boolean" }).notNull().default(false),
  isStaple: integer("is_staple", { mode: "boolean" }).notNull().default(false),
  sourceMealId: integer("source_meal_id").references(() => meals.id, {
    onDelete: "set null",
  }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // YYYY-MM-DD
  time: text("time"), // "19:30" (24h), nullable
  title: text("title").notNull(),
  type: text("type", { enum: ["date", "event", "chore"] }).notNull(),
  assigneeId: integer("assignee_id").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  severity: text("severity", {
    enum: ["overdue", "due-soon", "info", "success"],
  }).notNull(),
  text: text("text").notNull(),
  readAt: integer("read_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

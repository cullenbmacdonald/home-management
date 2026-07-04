import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  doublePrecision,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
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

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  notes: text("notes"),
  assigneeId: integer("assignee_id").references(() => users.id),
  dueDate: text("due_date"), // YYYY-MM-DD
  completedAt: timestamp("completed_at", { mode: "date" }),
  completedById: integer("completed_by_id").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const maintenanceItems = pgTable("maintenance_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  notes: text("notes"),
  intervalDays: integer("interval_days").notNull(),
  roomId: integer("room_id").references(() => rooms.id),
  // anchor for first due date when there are no logs yet
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  active: boolean("active").notNull().default(true),
});

export const maintenanceLogs = pgTable("maintenance_logs", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id")
    .notNull()
    .references(() => maintenanceItems.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at", { mode: "date" }).notNull().defaultNow(),
  completedById: integer("completed_by_id").references(() => users.id),
  notes: text("notes"),
});

export const wishlistItems = pgTable("wishlist_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  roomId: integer("room_id").references(() => rooms.id),
  url: text("url"),
  price: doublePrecision("price"),
  status: text("status", {
    enum: ["considering", "decided", "ordered", "delivered"],
  })
    .notNull()
    .default("considering"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
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

export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  specialty: text("specialty"), // e.g. plumber, HVAC, super
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  filename: text("filename").notNull(), // stored filename on disk
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  inventoryItemId: integer("inventory_item_id").references(
    () => inventoryItems.id,
    { onDelete: "set null" },
  ),
  uploadedAt: timestamp("uploaded_at", { mode: "date" }).notNull().defaultNow(),
});

export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD
  title: text("title").notNull(),
  cook: boolean("cook").notNull().default(true),
  out: boolean("out").notNull().default(false),
  notes: text("notes"),
  ingredientsAddedAt: timestamp("ingredients_added_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const mealIngredients = pgTable("meal_ingredients", {
  id: serial("id").primaryKey(),
  mealId: integer("meal_id")
    .notNull()
    .references(() => meals.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category", { enum: GROCERY_CATEGORIES }).notNull(),
  qty: text("qty"),
});

export const staples = pgTable(
  "staples",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    category: text("category", { enum: GROCERY_CATEGORIES }).notNull(),
  },
  (table) => [
    // Case-insensitive uniqueness (replaces SQLite's COLLATE NOCASE unique).
    uniqueIndex("staples_name_lower_unique").on(sql`lower(${table.name})`),
  ],
);

export const groceryItems = pgTable("grocery_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category", { enum: GROCERY_CATEGORIES }).notNull(),
  qty: text("qty"),
  checked: boolean("checked").notNull().default(false),
  isStaple: boolean("is_staple").notNull().default(false),
  sourceMealId: integer("source_meal_id").references(() => meals.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD
  time: text("time"), // "19:30" (24h), nullable
  title: text("title").notNull(),
  type: text("type", { enum: ["date", "event", "chore"] }).notNull(),
  assigneeId: integer("assignee_id").references(() => users.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  severity: text("severity", {
    enum: ["overdue", "due-soon", "info", "success"],
  }).notNull(),
  text: text("text").notNull(),
  readAt: timestamp("read_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

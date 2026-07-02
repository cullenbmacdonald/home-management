import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
});

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

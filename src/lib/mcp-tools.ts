import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { Ctx } from "@/lib/auth";
import * as tasksLib from "@/lib/tasks";
import * as groceriesLib from "@/lib/groceries-data";
import * as mealsLib from "@/lib/meals";
import * as householdLib from "@/lib/household";
import { getMealPlan } from "@/lib/meals";

function ctxFrom(authInfo: AuthInfo | undefined): Ctx {
  const extra = authInfo?.extra as { householdId?: number; userId?: number } | undefined;
  if (!extra?.householdId || !extra?.userId) {
    throw new Error("Missing household context on auth token");
  }
  return { householdId: extra.householdId, userId: extra.userId };
}

function hasScope(authInfo: AuthInfo | undefined, scope: string): boolean {
  return !!authInfo?.scopes?.includes(scope);
}

function text(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

function refresh(...paths: string[]) {
  for (const p of paths) revalidatePath(p);
}

/** Registers every v1 MCP tool. Reads require homebase:read; writes require homebase:write. */
export function registerTools(server: McpServer) {
  // ---- Reads --------------------------------------------------------------
  server.registerTool(
    "list_tasks",
    { description: "List household to-do tasks.", inputSchema: {} },
    async (_args, extra) => {
      const ctx = ctxFrom(extra.authInfo);
      return text(await tasksLib.listTasks(ctx));
    },
  );

  server.registerTool(
    "list_groceries",
    { description: "List the current grocery shopping list.", inputSchema: {} },
    async (_args, extra) => {
      const ctx = ctxFrom(extra.authInfo);
      return text(await groceriesLib.listGroceries(ctx));
    },
  );

  server.registerTool(
    "list_staples",
    { description: "List the household's staple items pool.", inputSchema: {} },
    async (_args, extra) => {
      const ctx = ctxFrom(extra.authInfo);
      return text(await groceriesLib.listStaples(ctx));
    },
  );

  server.registerTool(
    "get_meal_plan",
    { description: "Get the household's planned meals.", inputSchema: {} },
    async (_args, extra) => {
      const ctx = ctxFrom(extra.authInfo);
      return text(await getMealPlan(ctx));
    },
  );

  server.registerTool(
    "list_events",
    { description: "List calendar events (dates, events, chores).", inputSchema: {} },
    async (_args, extra) => {
      const ctx = ctxFrom(extra.authInfo);
      return text(await mealsLib.listEvents(ctx));
    },
  );

  server.registerTool(
    "list_inventory",
    { description: "List household inventory items.", inputSchema: {} },
    async (_args, extra) => {
      const ctx = ctxFrom(extra.authInfo);
      return text(await householdLib.listInventory(ctx));
    },
  );

  server.registerTool(
    "list_maintenance",
    { description: "List maintenance items with due/overdue status.", inputSchema: {} },
    async (_args, extra) => {
      const ctx = ctxFrom(extra.authInfo);
      return text(await householdLib.listMaintenance(ctx));
    },
  );

  server.registerTool(
    "list_vendors",
    { description: "List household vendors/service providers.", inputSchema: {} },
    async (_args, extra) => {
      const ctx = ctxFrom(extra.authInfo);
      return text(await householdLib.listVendors(ctx));
    },
  );

  server.registerTool(
    "list_wishlist",
    { description: "List the household wishlist.", inputSchema: {} },
    async (_args, extra) => {
      const ctx = ctxFrom(extra.authInfo);
      return text(await householdLib.listWishlist(ctx));
    },
  );

  server.registerTool(
    "household_summary",
    { description: "Compact cross-entity snapshot: open tasks, grocery count, overdue/due-soon maintenance, wishlist.", inputSchema: {} },
    async (_args, extra) => {
      const ctx = ctxFrom(extra.authInfo);
      return text(await householdLib.householdSummary(ctx));
    },
  );

  // ---- Writes (require homebase:write) ------------------------------------
  function requireWrite(authInfo: AuthInfo | undefined) {
    if (!hasScope(authInfo, "homebase:write")) {
      throw new Error("This token does not have the homebase:write scope");
    }
  }

  server.registerTool(
    "add_task",
    {
      description: "Create a new to-do task.",
      inputSchema: {
        title: z.string().min(1),
        assigneeId: z.number().int().optional(),
        dueDate: z.string().optional().describe("YYYY-MM-DD"),
      },
    },
    async (args, extra) => {
      requireWrite(extra.authInfo);
      const ctx = ctxFrom(extra.authInfo);
      const row = await tasksLib.createTask(ctx, args);
      refresh("/tasks", "/");
      return text(row);
    },
  );

  server.registerTool(
    "complete_task",
    { description: "Toggle a task's completed status.", inputSchema: { id: z.number().int() } },
    async (args, extra) => {
      requireWrite(extra.authInfo);
      const ctx = ctxFrom(extra.authInfo);
      const row = await tasksLib.completeTask(ctx, args.id);
      refresh("/tasks", "/");
      return text(row);
    },
  );

  server.registerTool(
    "update_task",
    {
      description: "Update a task's title, assignee, due date, or notes.",
      inputSchema: {
        id: z.number().int(),
        title: z.string().optional(),
        assigneeId: z.number().int().nullable().optional(),
        dueDate: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      },
    },
    async (args, extra) => {
      requireWrite(extra.authInfo);
      const ctx = ctxFrom(extra.authInfo);
      const { id, ...rest } = args;
      const row = await tasksLib.updateTask(ctx, id, rest);
      refresh("/tasks", "/");
      return text(row);
    },
  );

  server.registerTool(
    "add_grocery_item",
    {
      description: "Add an item to the grocery list.",
      inputSchema: {
        name: z.string().min(1),
        category: z.string(),
        qty: z.string().optional(),
      },
    },
    async (args, extra) => {
      requireWrite(extra.authInfo);
      const ctx = ctxFrom(extra.authInfo);
      const row = await groceriesLib.addGroceryItem(ctx, args.name, args.category, args.qty);
      refresh("/groceries", "/");
      return text(row);
    },
  );

  server.registerTool(
    "check_grocery_item",
    {
      description: "Check (or uncheck) a grocery item.",
      inputSchema: { id: z.number().int(), checked: z.boolean().optional() },
    },
    async (args, extra) => {
      requireWrite(extra.authInfo);
      const ctx = ctxFrom(extra.authInfo);
      const row = await groceriesLib.checkGroceryItem(ctx, args.id, args.checked);
      refresh("/groceries", "/");
      return text(row);
    },
  );

  server.registerTool(
    "remove_grocery_item",
    { description: "Remove an item from the grocery list.", inputSchema: { id: z.number().int() } },
    async (args, extra) => {
      requireWrite(extra.authInfo);
      const ctx = ctxFrom(extra.authInfo);
      await groceriesLib.removeGroceryItem(ctx, args.id);
      refresh("/groceries", "/");
      return text({ ok: true });
    },
  );

  server.registerTool(
    "restock_staples",
    { description: "Add any missing staples to the grocery list and uncheck any that are checked.", inputSchema: {} },
    async (_args, extra) => {
      requireWrite(extra.authInfo);
      const ctx = ctxFrom(extra.authInfo);
      await groceriesLib.restockStaples(ctx);
      refresh("/groceries", "/groceries/staples", "/");
      return text({ ok: true });
    },
  );

  server.registerTool(
    "set_meal",
    {
      description: "Plan a meal for a date, with optional ingredients to add to the meal plan.",
      inputSchema: {
        date: z.string().describe("YYYY-MM-DD"),
        title: z.string().min(1),
        cook: z.boolean().optional(),
        out: z.boolean().optional(),
        ingredients: z
          .array(z.object({ name: z.string(), category: z.string(), qty: z.string().optional() }))
          .optional(),
      },
    },
    async (args, extra) => {
      requireWrite(extra.authInfo);
      const ctx = ctxFrom(extra.authInfo);
      const row = await mealsLib.setMeal(ctx, {
        date: args.date,
        title: args.title,
        cook: args.cook ?? true,
        out: args.out ?? false,
        ingredients: args.ingredients ?? [],
      });
      refresh("/plan");
      return text(row);
    },
  );

  server.registerTool(
    "add_event",
    {
      description: "Add a calendar event (date, event, or chore).",
      inputSchema: {
        date: z.string().describe("YYYY-MM-DD"),
        time: z.string().optional().describe('24h "HH:MM"'),
        title: z.string().min(1),
        type: z.enum(["date", "event", "chore"]).optional(),
        assigneeId: z.number().int().nullable().optional(),
      },
    },
    async (args, extra) => {
      requireWrite(extra.authInfo);
      const ctx = ctxFrom(extra.authInfo);
      const row = await mealsLib.addEvent(ctx, { ...args, type: args.type ?? "event" });
      refresh("/plan", "/");
      return text(row);
    },
  );
}

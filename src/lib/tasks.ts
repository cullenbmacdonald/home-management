import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import type { Ctx } from "@/lib/auth";

export async function listTasks(ctx: Ctx) {
  return db.select().from(tasks).where(eq(tasks.householdId, ctx.householdId));
}

export async function createTask(
  ctx: Ctx,
  input: { title: string; assigneeId?: number | null; dueDate?: string | null },
) {
  const title = input.title.trim();
  if (!title) return null;
  const [row] = await db
    .insert(tasks)
    .values({
      householdId: ctx.householdId,
      title,
      assigneeId: input.assigneeId || null,
      dueDate: input.dueDate || null,
    })
    .returning();
  return row;
}

export async function updateTask(
  ctx: Ctx,
  id: number,
  input: { title?: string; assigneeId?: number | null; dueDate?: string | null; notes?: string | null },
) {
  const set: Partial<typeof tasks.$inferInsert> = {};
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) return null;
    set.title = title;
  }
  if (input.assigneeId !== undefined) set.assigneeId = input.assigneeId || null;
  if (input.dueDate !== undefined) set.dueDate = input.dueDate || null;
  if (input.notes !== undefined) set.notes = input.notes || null;
  if (Object.keys(set).length === 0) return null;
  const [row] = await db
    .update(tasks)
    .set(set)
    .where(and(eq(tasks.id, id), eq(tasks.householdId, ctx.householdId)))
    .returning();
  return row ?? null;
}

export async function completeTask(ctx: Ctx, id: number) {
  const task = (
    await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.householdId, ctx.householdId)))
      .limit(1)
  )[0];
  if (!task) return null;
  const [row] = await db
    .update(tasks)
    .set(
      task.completedAt
        ? { completedAt: null, completedById: null }
        : { completedAt: new Date(), completedById: ctx.userId },
    )
    .where(and(eq(tasks.id, id), eq(tasks.householdId, ctx.householdId)))
    .returning();
  return row ?? null;
}

export async function deleteTask(ctx: Ctx, id: number) {
  await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.householdId, ctx.householdId)));
}

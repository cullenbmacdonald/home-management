"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { requireHousehold } from "@/lib/auth";

export async function createTask(formData: FormData) {
  const { householdId } = await requireHousehold();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const assignee = Number(formData.get("assigneeId"));
  const dueDate = String(formData.get("dueDate") ?? "");
  await db.insert(tasks).values({
    householdId,
    title,
    assigneeId: assignee || null,
    dueDate: dueDate || null,
  });
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function toggleTask(id: number) {
  const { householdId, userId } = await requireHousehold();
  const task = (
    await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.householdId, householdId)))
      .limit(1)
  )[0];
  if (!task) return;
  await db
    .update(tasks)
    .set(
      task.completedAt
        ? { completedAt: null, completedById: null }
        : { completedAt: new Date(), completedById: userId },
    )
    .where(and(eq(tasks.id, id), eq(tasks.householdId, householdId)));
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function deleteTask(id: number) {
  const { householdId } = await requireHousehold();
  await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.householdId, householdId)));
  revalidatePath("/tasks");
  revalidatePath("/");
}

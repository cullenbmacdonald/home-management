"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export async function createTask(formData: FormData) {
  await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const assignee = Number(formData.get("assigneeId"));
  const dueDate = String(formData.get("dueDate") ?? "");
  await db.insert(tasks).values({
    title,
    assigneeId: assignee || null,
    dueDate: dueDate || null,
  });
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function toggleTask(id: number) {
  const user = await requireUser();
  const task = (
    await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
  )[0];
  if (!task) return;
  await db
    .update(tasks)
    .set(
      task.completedAt
        ? { completedAt: null, completedById: null }
        : { completedAt: new Date(), completedById: user.id },
    )
    .where(eq(tasks.id, id));
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function deleteTask(id: number) {
  await requireUser();
  await db.delete(tasks).where(eq(tasks.id, id));
  revalidatePath("/tasks");
  revalidatePath("/");
}

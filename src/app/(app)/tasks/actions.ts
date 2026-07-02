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
  db.insert(tasks)
    .values({
      title,
      assigneeId: assignee || null,
      dueDate: dueDate || null,
    })
    .run();
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function toggleTask(id: number) {
  const user = await requireUser();
  const task = db.select().from(tasks).where(eq(tasks.id, id)).get();
  if (!task) return;
  db.update(tasks)
    .set(
      task.completedAt
        ? { completedAt: null, completedById: null }
        : { completedAt: new Date(), completedById: user.id },
    )
    .where(eq(tasks.id, id))
    .run();
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function deleteTask(id: number) {
  await requireUser();
  db.delete(tasks).where(eq(tasks.id, id)).run();
  revalidatePath("/tasks");
  revalidatePath("/");
}

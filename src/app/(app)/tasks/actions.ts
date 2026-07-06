"use server";

import { revalidatePath } from "next/cache";
import { requireHousehold } from "@/lib/auth";
import * as tasksLib from "@/lib/tasks";

function refresh() {
  revalidatePath("/tasks");
  revalidatePath("/");
}

export async function createTask(formData: FormData) {
  const ctx = await requireHousehold();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const assignee = Number(formData.get("assigneeId"));
  const dueDate = String(formData.get("dueDate") ?? "");
  await tasksLib.createTask(ctx, {
    title,
    assigneeId: assignee || null,
    dueDate: dueDate || null,
  });
  refresh();
}

export async function toggleTask(id: number) {
  const ctx = await requireHousehold();
  await tasksLib.completeTask(ctx, id);
  refresh();
}

export async function deleteTask(id: number) {
  const ctx = await requireHousehold();
  await tasksLib.deleteTask(ctx, id);
  refresh();
}

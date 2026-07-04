"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { maintenanceItems, maintenanceLogs } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

export async function markDone(itemId: number, notes?: string) {
  const user = await requireUser();
  await db
    .insert(maintenanceLogs)
    .values({ itemId, completedById: user.id, notes: notes || null });
  const item = (
    await db
      .select({ name: maintenanceItems.name })
      .from(maintenanceItems)
      .where(eq(maintenanceItems.id, itemId))
      .limit(1)
  )[0];
  if (item) {
    await createNotification(
      "success",
      `${user.displayName} completed “${item.name}”`,
    );
  }
  revalidatePath("/maintenance");
  revalidatePath("/");
}

export async function createMaintenanceItem(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const intervalDays = Number(formData.get("intervalDays"));
  if (!name || !Number.isFinite(intervalDays) || intervalDays < 1) return;
  const roomId = Number(formData.get("roomId"));
  await db.insert(maintenanceItems).values({
    name,
    intervalDays: Math.round(intervalDays),
    roomId: Number.isFinite(roomId) && roomId > 0 ? roomId : null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    startDate:
      String(formData.get("startDate") ?? "") ||
      new Date().toISOString().slice(0, 10),
  });
  revalidatePath("/maintenance");
  redirect("/maintenance");
}

export async function updateMaintenanceItem(id: number, formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const intervalDays = Number(formData.get("intervalDays"));
  if (!name || !Number.isFinite(intervalDays) || intervalDays < 1) return;
  const roomId = Number(formData.get("roomId"));
  await db
    .update(maintenanceItems)
    .set({
      name,
      intervalDays: Math.round(intervalDays),
      roomId: Number.isFinite(roomId) && roomId > 0 ? roomId : null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .where(eq(maintenanceItems.id, id));
  revalidatePath("/maintenance");
  redirect(`/maintenance/${id}`);
}

export async function deactivateMaintenanceItem(id: number) {
  await requireUser();
  await db
    .update(maintenanceItems)
    .set({ active: false })
    .where(eq(maintenanceItems.id, id));
  revalidatePath("/maintenance");
  redirect("/maintenance");
}

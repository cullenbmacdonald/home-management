"use server";

import { revalidatePath } from "next/cache";
import { requireHousehold } from "@/lib/auth";
import { markAllRead } from "@/lib/notifications";

export async function markAllNotificationsRead() {
  const { householdId } = await requireHousehold();
  await markAllRead(householdId);
  revalidatePath("/notifications");
  revalidatePath("/more");
  revalidatePath("/dashboard", "layout");
}

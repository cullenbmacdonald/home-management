"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { markAllRead } from "@/lib/notifications";

export async function markAllNotificationsRead() {
  await requireUser();
  await markAllRead();
  revalidatePath("/notifications");
  revalidatePath("/more");
  revalidatePath("/", "layout");
}

"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";

function fields(formData: FormData) {
  const s = (k: string) => String(formData.get(k) ?? "").trim() || null;
  return {
    roomId: Number(formData.get("roomId")) || null,
    brand: s("brand"),
    model: s("model"),
    serial: s("serial"),
    purchaseDate: s("purchaseDate"),
    warrantyUntil: s("warrantyUntil"),
    manualUrl: s("manualUrl"),
    notes: s("notes"),
  };
}

export async function createInventoryItem(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db.insert(inventoryItems).values({ name, ...fields(formData) });
  revalidatePath("/inventory");
}

export async function updateInventoryItem(id: number, formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db
    .update(inventoryItems)
    .set({ name, ...fields(formData) })
    .where(eq(inventoryItems.id, id));
  revalidatePath("/inventory");
}

export async function deleteInventoryItem(id: number) {
  await requireUser();
  await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
  revalidatePath("/inventory");
}

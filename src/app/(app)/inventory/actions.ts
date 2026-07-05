"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { inventoryItems } from "@/db/schema";
import { requireHousehold } from "@/lib/auth";

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
  const { householdId } = await requireHousehold();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db.insert(inventoryItems).values({ householdId, name, ...fields(formData) });
  revalidatePath("/inventory");
}

export async function updateInventoryItem(id: number, formData: FormData) {
  const { householdId } = await requireHousehold();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db
    .update(inventoryItems)
    .set({ name, ...fields(formData) })
    .where(
      and(eq(inventoryItems.id, id), eq(inventoryItems.householdId, householdId)),
    );
  revalidatePath("/inventory");
}

export async function deleteInventoryItem(id: number) {
  const { householdId } = await requireHousehold();
  await db
    .delete(inventoryItems)
    .where(
      and(eq(inventoryItems.id, id), eq(inventoryItems.householdId, householdId)),
    );
  revalidatePath("/inventory");
}

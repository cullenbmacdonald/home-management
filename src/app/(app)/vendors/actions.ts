"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { vendors } from "@/db/schema";
import { requireHousehold } from "@/lib/auth";

export async function createVendor(formData: FormData) {
  const { householdId } = await requireHousehold();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const s = (k: string) => String(formData.get(k) ?? "").trim() || null;
  await db.insert(vendors).values({
    householdId,
    name,
    specialty: s("specialty"),
    phone: s("phone"),
    email: s("email"),
    notes: s("notes"),
  });
  revalidatePath("/vendors");
}

export async function deleteVendor(id: number) {
  const { householdId } = await requireHousehold();
  await db
    .delete(vendors)
    .where(and(eq(vendors.id, id), eq(vendors.householdId, householdId)));
  revalidatePath("/vendors");
}

"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { vendors } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export async function createVendor(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const s = (k: string) => String(formData.get(k) ?? "").trim() || null;
  await db.insert(vendors).values({
    name,
    specialty: s("specialty"),
    phone: s("phone"),
    email: s("email"),
    notes: s("notes"),
  });
  revalidatePath("/vendors");
}

export async function deleteVendor(id: number) {
  await requireUser();
  await db.delete(vendors).where(eq(vendors.id, id));
  revalidatePath("/vendors");
}

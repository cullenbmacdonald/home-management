"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { wishlistItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";

const STATUSES = ["considering", "decided", "ordered", "delivered"] as const;
type Status = (typeof STATUSES)[number];

export async function createWishlistItem(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const price = Number(formData.get("price"));
  db.insert(wishlistItems)
    .values({
      name,
      roomId: Number(formData.get("roomId")) || null,
      url: String(formData.get("url") ?? "").trim() || null,
      price: Number.isFinite(price) && price > 0 ? price : null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .run();
  revalidatePath("/wishlist");
}

export async function setWishlistStatus(id: number, status: string) {
  await requireUser();
  if (!STATUSES.includes(status as Status)) return;
  db.update(wishlistItems)
    .set({ status: status as Status })
    .where(eq(wishlistItems.id, id))
    .run();
  revalidatePath("/wishlist");
}

export async function deleteWishlistItem(id: number) {
  await requireUser();
  db.delete(wishlistItems).where(eq(wishlistItems.id, id)).run();
  revalidatePath("/wishlist");
}

"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { wishlistItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

const STATUSES = ["considering", "decided", "ordered", "delivered"] as const;
type Status = (typeof STATUSES)[number];

const STAGE_LABELS: Record<Status, string> = {
  considering: "Idea",
  decided: "Decided",
  ordered: "Ordered",
  delivered: "Got it",
};

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

export async function advanceWishlistItem(id: number) {
  const user = await requireUser();
  const item = db.select().from(wishlistItems).where(eq(wishlistItems.id, id)).get();
  if (!item) return;
  const i = STATUSES.indexOf(item.status as Status);
  if (i < 0 || i >= STATUSES.length - 1) return;
  const next = STATUSES[i + 1];
  db.update(wishlistItems)
    .set({ status: next })
    .where(eq(wishlistItems.id, id))
    .run();
  createNotification(
    "success",
    `${user.displayName} moved “${item.name}” to ${STAGE_LABELS[next]}`,
  );
  revalidatePath("/wishlist");
}

export async function deleteWishlistItem(id: number) {
  await requireUser();
  db.delete(wishlistItems).where(eq(wishlistItems.id, id)).run();
  revalidatePath("/wishlist");
}

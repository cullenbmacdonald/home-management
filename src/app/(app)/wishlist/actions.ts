"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { wishlistItems } from "@/db/schema";
import { requireHousehold } from "@/lib/auth";
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
  const { householdId } = await requireHousehold();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const price = Number(formData.get("price"));
  await db.insert(wishlistItems).values({
    householdId,
    name,
    roomId: Number(formData.get("roomId")) || null,
    url: String(formData.get("url") ?? "").trim() || null,
    price: Number.isFinite(price) && price > 0 ? price : null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  revalidatePath("/wishlist");
}

export async function advanceWishlistItem(id: number) {
  const { householdId, user } = await requireHousehold();
  const item = (
    await db
      .select()
      .from(wishlistItems)
      .where(
        and(eq(wishlistItems.id, id), eq(wishlistItems.householdId, householdId)),
      )
      .limit(1)
  )[0];
  if (!item) return;
  const i = STATUSES.indexOf(item.status as Status);
  if (i < 0 || i >= STATUSES.length - 1) return;
  const next = STATUSES[i + 1];
  await db
    .update(wishlistItems)
    .set({ status: next })
    .where(
      and(eq(wishlistItems.id, id), eq(wishlistItems.householdId, householdId)),
    );
  await createNotification(
    householdId,
    "success",
    `${user.displayName} moved “${item.name}” to ${STAGE_LABELS[next]}`,
  );
  revalidatePath("/wishlist");
}

export async function deleteWishlistItem(id: number) {
  const { householdId } = await requireHousehold();
  await db
    .delete(wishlistItems)
    .where(
      and(eq(wishlistItems.id, id), eq(wishlistItems.householdId, householdId)),
    );
  revalidatePath("/wishlist");
}

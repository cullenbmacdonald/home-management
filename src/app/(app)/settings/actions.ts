"use server";

import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { households, settings, users } from "@/db/schema";
import { requireHousehold } from "@/lib/auth";
import { createInvite } from "@/lib/invites";
import { revokeConnectedApp } from "@/lib/connected-apps";

async function setSetting(householdId: number, key: string, value: string) {
  await db
    .insert(settings)
    .values({ householdId, key, value })
    .onConflictDoUpdate({
      target: [settings.householdId, settings.key],
      set: { value },
    });
}

/**
 * Save Home Assistant connection config. The token is write-only: it is only
 * updated when a non-empty value is submitted, so the saved token never has to
 * be rendered back into the form. Scoped to the caller's household.
 */
export async function saveHaConfig(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const { householdId } = await requireHousehold();
  const baseUrl = String(formData.get("baseUrl") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();
  const entitiesRaw = String(formData.get("entities") ?? "");

  const entities = entitiesRaw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  await setSetting(householdId, "haBaseUrl", baseUrl);
  await setSetting(householdId, "haEntities", JSON.stringify(entities));
  if (token) await setSetting(householdId, "haToken", token);

  revalidatePath("/settings");
  revalidatePath("/home");
  revalidatePath("/");
  return "Saved";
}

export async function changePassword(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const { userId } = await requireHousehold();
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!current || !next) return "All fields are required";
  if (next.length < 6) return "New password must be at least 6 characters";
  if (next !== confirm) return "New passwords do not match";

  const row = (
    await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
  )[0];
  if (!row || !bcrypt.compareSync(current, row.passwordHash)) {
    return "Current password is incorrect";
  }

  const hash = bcrypt.hashSync(next, 10);
  await db.update(users).set({ passwordHash: hash }).where(eq(users.id, userId));
  // Session cookie is unaffected by the hash change, so the user stays signed in.
  return "Password updated";
}

/** Rename the caller's household. Owner only. */
export async function renameHousehold(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const { householdId, role } = await requireHousehold();
  if (role !== "owner") return "Only an owner can rename the household";
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return "Name is required";
  await db.update(households).set({ name }).where(eq(households.id, householdId));
  revalidatePath("/settings");
  return "Saved";
}

/** Generate a single-use invite link. Returns the shareable path, owner only. */
export async function generateInvite(): Promise<string | null> {
  const { householdId, userId, role } = await requireHousehold();
  if (role !== "owner") return null;
  const code = await createInvite(householdId, userId);
  revalidatePath("/settings");
  return `/signup?invite=${code}`;
}

/** Remove a resident from the household. Owner only; cannot remove yourself. */
export async function removeResident(residentId: number): Promise<void> {
  const { householdId, userId, role } = await requireHousehold();
  if (role !== "owner" || residentId === userId) return;
  await db
    .delete(users)
    .where(and(eq(users.id, residentId), eq(users.householdId, householdId)));
  revalidatePath("/settings");
}

/** Cut off an MCP client's access to this household (Settings > Connected apps). */
export async function revokeApp(clientId: string): Promise<void> {
  const ctx = await requireHousehold();
  await revokeConnectedApp(ctx, clientId);
  revalidatePath("/settings");
}

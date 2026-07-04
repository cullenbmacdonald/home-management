"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { settings, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";

async function setSetting(key: string, value: string) {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

/**
 * Save Home Assistant connection config. The token is write-only: it is only
 * updated when a non-empty value is submitted, so the saved token never has to
 * be rendered back into the form.
 */
export async function saveHaConfig(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  await requireUser();
  const baseUrl = String(formData.get("baseUrl") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();
  const entitiesRaw = String(formData.get("entities") ?? "");

  const entities = entitiesRaw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  await setSetting("haBaseUrl", baseUrl);
  await setSetting("haEntities", JSON.stringify(entities));
  if (token) await setSetting("haToken", token);

  revalidatePath("/settings");
  revalidatePath("/home");
  revalidatePath("/");
  return "Saved";
}

export async function changePassword(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  const user = await requireUser();
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
      .where(eq(users.id, user.id))
      .limit(1)
  )[0];
  if (!row || !bcrypt.compareSync(current, row.passwordHash)) {
    return "Current password is incorrect";
  }

  const hash = bcrypt.hashSync(next, 10);
  await db.update(users).set({ passwordHash: hash }).where(eq(users.id, user.id));
  // Session cookie is unaffected by the hash change, so the user stays signed in.
  return "Password updated";
}

"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";

export async function login(_prev: string | null, formData: FormData) {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = (
    await db.select().from(users).where(eq(users.username, username)).limit(1)
  )[0];
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return "Wrong username or password";
  }
  await createSession(user.id);
  redirect(safeNextPath(formData.get("next")));
}

/**
 * Only ever redirect within this origin after login — `next` rides through a
 * query param (e.g. from the OAuth /authorize hop) and must never become an
 * open redirect. Accepts a path starting with a single "/" only.
 */
function safeNextPath(value: FormDataEntryValue | null): string {
  const raw = typeof value === "string" ? value : "";
  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")) {
    return raw;
  }
  return "/";
}

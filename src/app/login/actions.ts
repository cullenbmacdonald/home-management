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
  redirect("/");
}

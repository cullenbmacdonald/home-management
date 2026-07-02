import { cookies } from "next/headers";
import { cache } from "react";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

const SESSION_COOKIE = "homebase_session";
const SESSION_DAYS = 90;

export async function createSession(userId: number) {
  const id = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  db.insert(sessions).values({ id, userId, expiresAt }).run();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const id = cookieStore.get(SESSION_COOKIE)?.value;
  if (id) db.delete(sessions).where(eq(sessions.id, id)).run();
  cookieStore.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const id = cookieStore.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const row = db
    .select({
      userId: users.id,
      username: users.username,
      displayName: users.displayName,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id))
    .get();
  if (!row || row.expiresAt < new Date()) return null;
  return {
    id: row.userId,
    username: row.username,
    displayName: row.displayName,
  };
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  return user!;
}

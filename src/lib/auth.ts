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
  await db.insert(sessions).values({ id, userId, expiresAt });
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
  if (id) await db.delete(sessions).where(eq(sessions.id, id));
  cookieStore.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const id = cookieStore.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const row = (
    await db
      .select({
        userId: users.id,
        householdId: users.householdId,
        username: users.username,
        displayName: users.displayName,
        accentColor: users.accentColor,
        role: users.role,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.id, id))
      .limit(1)
  )[0];
  if (!row || row.expiresAt < new Date()) return null;
  return {
    id: row.userId,
    householdId: row.householdId,
    username: row.username,
    displayName: row.displayName,
    accentColor: row.accentColor,
    role: row.role,
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

/**
 * The single choke point for household-scoped data access. Every server action
 * and page query must derive its household id from here so one household can
 * never read or mutate another's rows. Returns the current user plus their
 * household id and role.
 */
export async function requireHousehold() {
  const user = await requireUser();
  return {
    userId: user.id,
    householdId: user.householdId,
    role: user.role,
    user,
  };
}

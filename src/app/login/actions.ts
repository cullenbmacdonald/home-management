"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { clearHits, getClientIp, isLimited, recordHit } from "@/lib/rate-limit";

// fail2ban-style login throttle: lock out after too many *failed* attempts
// within the window, keyed on both the attempted username and the client IP.
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILS_PER_USER = 5;
const MAX_FAILS_PER_IP = 15;
const LOCKED_MESSAGE = "Too many attempts. Please wait a few minutes and try again.";

export async function login(_prev: string | null, formData: FormData) {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  const ip = await getClientIp();
  const userKey = `login:user:${username}`;
  const ipKey = `login:ip:${ip}`;

  // Block before doing any password work (also cheaper against spray attacks).
  if (
    (await isLimited(userKey, MAX_FAILS_PER_USER, LOGIN_WINDOW_MS)) ||
    (await isLimited(ipKey, MAX_FAILS_PER_IP, LOGIN_WINDOW_MS))
  ) {
    return LOCKED_MESSAGE;
  }

  const user = (
    await db.select().from(users).where(eq(users.username, username)).limit(1)
  )[0];
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    await Promise.all([recordHit(userKey), recordHit(ipKey)]);
    return "Wrong username or password";
  }

  // Success — reset this user's and this IP's failure counters.
  await Promise.all([clearHits(userKey), clearHits(ipKey)]);
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

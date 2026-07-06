import { headers } from "next/headers";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimitHits } from "@/db/schema";

/**
 * Simple DB-backed sliding-window rate limiter (fail2ban style). No Redis
 * needed. Each limited event is one row in `rate_limit_hits`; a limit is
 * "count rows for `key` newer than now - window >= max". `key` namespaces the
 * limiter so unrelated limits never collide.
 *
 * Two usage shapes:
 *  - Failure-based lockout (login): record a hit only on *failure*, clear on
 *    success, and check `isLimited` before attempting.
 *  - Cap (DCR/signup): call `hit` which checks-then-records every event.
 */

/** Count hits for `key` within the trailing `windowMs`. Does not record. */
export async function countHits(key: string, windowMs: number): Promise<number> {
  const since = new Date(Date.now() - windowMs);
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(rateLimitHits)
    .where(and(eq(rateLimitHits.key, key), gt(rateLimitHits.at, since)));
  return row?.n ?? 0;
}

/** True once `key` has reached `max` hits inside the window. */
export async function isLimited(key: string, max: number, windowMs: number): Promise<boolean> {
  return (await countHits(key, windowMs)) >= max;
}

/** Record one hit for `key`. */
export async function recordHit(key: string): Promise<void> {
  await db.insert(rateLimitHits).values({ key });
}

/** Clear all hits for `key` (e.g. on a successful login). */
export async function clearHits(key: string): Promise<void> {
  await db.delete(rateLimitHits).where(eq(rateLimitHits.key, key));
}

/**
 * Cap-style check-and-record: if already at/over `max` in the window, returns
 * `{ limited: true }` without recording; otherwise records a hit and returns
 * `{ limited: false }`. Use for endpoints where every request is a "hit"
 * (DCR, signup) rather than only failures.
 */
export async function hit(
  key: string,
  max: number,
  windowMs: number,
): Promise<{ limited: boolean }> {
  if (await isLimited(key, max, windowMs)) return { limited: true };
  await recordHit(key);
  return { limited: false };
}

/**
 * Best-effort client IP from proxy headers. The app runs behind a trusted
 * reverse proxy (see docs) that sets X-Forwarded-For, so the first entry is
 * the real client. Falls back to X-Real-IP, then "unknown" (a shared bucket,
 * which only makes the IP limit *stricter*, never bypassable).
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || "unknown";
}

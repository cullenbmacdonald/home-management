import crypto from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { invites } from "@/db/schema";

const INVITE_DAYS = 14;

/** Create a single-use invite for a household. Returns the opaque code. */
export async function createInvite(householdId: number, createdById: number) {
  const code = crypto.randomBytes(12).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 86400_000);
  await db.insert(invites).values({ householdId, code, createdById, expiresAt });
  return code;
}

/** A valid invite is one that exists, is unused, and hasn't expired. */
export async function findValidInvite(code: string) {
  if (!code) return null;
  const row = (
    await db
      .select()
      .from(invites)
      .where(
        and(
          eq(invites.code, code),
          isNull(invites.usedAt),
          gt(invites.expiresAt, new Date()),
        ),
      )
      .limit(1)
  )[0];
  return row ?? null;
}

/** Mark an invite consumed. Guarded by the unused check to avoid double-use. */
export async function consumeInvite(id: number) {
  await db
    .update(invites)
    .set({ usedAt: new Date() })
    .where(and(eq(invites.id, id), isNull(invites.usedAt)));
}

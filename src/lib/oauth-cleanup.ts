import { lt, or, and, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { oauthAuthCodes, oauthAccessTokens, oauthRefreshTokens } from "@/db/schema";

/**
 * Delete expired/consumed OAuth rows so the tables don't grow unbounded.
 * Safe to call repeatedly (e.g. from a cron-triggered route or a periodic
 * background task) — every predicate is idempotent.
 */
export async function sweepExpiredOauthRows() {
  const now = new Date();
  const [codes, access, refresh] = await Promise.all([
    db
      .delete(oauthAuthCodes)
      .where(or(lt(oauthAuthCodes.expiresAt, now), isNotNull(oauthAuthCodes.consumedAt)))
      .returning({ codeHash: oauthAuthCodes.codeHash }),
    db
      .delete(oauthAccessTokens)
      .where(lt(oauthAccessTokens.expiresAt, now))
      .returning({ tokenHash: oauthAccessTokens.tokenHash }),
    db
      .delete(oauthRefreshTokens)
      .where(
        or(
          lt(oauthRefreshTokens.expiresAt, now),
          and(isNotNull(oauthRefreshTokens.rotatedAt), lte(oauthRefreshTokens.rotatedAt, now)),
        ),
      )
      .returning({ tokenHash: oauthRefreshTokens.tokenHash }),
  ]);
  return { codesDeleted: codes.length, accessTokensDeleted: access.length, refreshTokensDeleted: refresh.length };
}

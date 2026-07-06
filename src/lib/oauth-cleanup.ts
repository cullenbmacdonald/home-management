import { lt, or, and, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  oauthAuthCodes,
  oauthAccessTokens,
  oauthRefreshTokens,
  rateLimitHits,
} from "@/db/schema";

// Rate-limit hits are only meaningful inside their window (≤1h); prune older.
const RATE_LIMIT_RETENTION_MS = 24 * 60 * 60 * 1000;

/**
 * Delete expired/consumed OAuth rows so the tables don't grow unbounded.
 * Safe to call repeatedly (e.g. from a cron-triggered route or a periodic
 * background task) — every predicate is idempotent.
 */
export async function sweepExpiredOauthRows() {
  const now = new Date();
  const rateLimitCutoff = new Date(now.getTime() - RATE_LIMIT_RETENTION_MS);
  const [codes, access, refresh, hits] = await Promise.all([
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
    db
      .delete(rateLimitHits)
      .where(lt(rateLimitHits.at, rateLimitCutoff))
      .returning({ id: rateLimitHits.id }),
  ]);
  return {
    codesDeleted: codes.length,
    accessTokensDeleted: access.length,
    refreshTokensDeleted: refresh.length,
    rateLimitHitsDeleted: hits.length,
  };
}

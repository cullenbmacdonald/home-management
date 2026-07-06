import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { oauthAccessTokens, oauthClients, oauthRefreshTokens } from "@/db/schema";
import type { Ctx } from "@/lib/auth";

export interface ConnectedApp {
  clientId: string;
  clientName: string;
  lastUsed: Date | null;
  tokenCount: number;
}

/**
 * Distinct OAuth clients with at least one still-live access token for this
 * household — i.e. apps currently able to call the MCP endpoint on our
 * behalf. "Revoke" deletes every live token for that client+household.
 */
export async function listConnectedApps(ctx: Ctx): Promise<ConnectedApp[]> {
  const rows = await db
    .select({
      clientId: oauthAccessTokens.clientId,
      clientName: oauthClients.clientName,
      createdAt: oauthAccessTokens.createdAt,
    })
    .from(oauthAccessTokens)
    .innerJoin(oauthClients, eq(oauthAccessTokens.clientId, oauthClients.clientId))
    .where(and(eq(oauthAccessTokens.householdId, ctx.householdId), gt(oauthAccessTokens.expiresAt, new Date())))
    .orderBy(desc(oauthAccessTokens.createdAt));

  const byClient = new Map<string, ConnectedApp>();
  for (const row of rows) {
    const existing = byClient.get(row.clientId);
    if (existing) {
      existing.tokenCount += 1;
      if (row.createdAt > (existing.lastUsed ?? new Date(0))) existing.lastUsed = row.createdAt;
    } else {
      byClient.set(row.clientId, {
        clientId: row.clientId,
        clientName: row.clientName,
        lastUsed: row.createdAt,
        tokenCount: 1,
      });
    }
  }
  return [...byClient.values()];
}

/**
 * Revoke every live access + refresh token this household's user granted to
 * a client — the next MCP call from that client 401s, and it can't silently
 * mint a fresh access token via refresh either.
 */
export async function revokeConnectedApp(ctx: Ctx, clientId: string) {
  await db
    .delete(oauthAccessTokens)
    .where(and(eq(oauthAccessTokens.clientId, clientId), eq(oauthAccessTokens.householdId, ctx.householdId)));
  await db
    .delete(oauthRefreshTokens)
    .where(and(eq(oauthRefreshTokens.clientId, clientId), eq(oauthRefreshTokens.userId, ctx.userId)));
}

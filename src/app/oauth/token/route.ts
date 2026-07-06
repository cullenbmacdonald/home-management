import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { oauthAuthCodes, oauthAccessTokens, oauthRefreshTokens, users } from "@/db/schema";
import { mcpResourceUrl } from "@/lib/auth";
import {
  authenticateClient,
  redirectUriAllowed,
  verifyPkce,
  randomToken,
  sha256Hex,
  oauthError,
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
} from "@/lib/oauth";

/** POST /oauth/token — authorization_code and refresh_token grants. */
export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  let form: URLSearchParams;
  if (contentType.includes("application/json")) {
    const body = await req.json();
    form = new URLSearchParams(body);
  } else {
    form = new URLSearchParams(await req.text());
  }

  const grantType = form.get("grant_type") ?? "";
  const clientId = form.get("client_id") ?? "";
  const clientSecret = form.get("client_secret") ?? undefined;

  const client = await authenticateClient(clientId, clientSecret);
  if (!client) return oauthError("invalid_client", "Unknown client or bad secret", 401);

  if (grantType === "authorization_code") {
    return handleAuthorizationCode(form, client.clientId, client.redirectUris);
  }
  if (grantType === "refresh_token") {
    return handleRefreshToken(form, client.clientId);
  }
  return oauthError("unsupported_grant_type", grantType);
}

async function handleAuthorizationCode(
  form: URLSearchParams,
  clientId: string,
  registeredRedirectUris: string[],
) {
  const code = form.get("code") ?? "";
  const redirectUri = form.get("redirect_uri") ?? "";
  const codeVerifier = form.get("code_verifier") ?? "";
  if (!code || !redirectUri || !codeVerifier) {
    return oauthError("invalid_request", "code, redirect_uri, and code_verifier are required");
  }

  const codeHash = sha256Hex(code);
  const row = (
    await db
      .select()
      .from(oauthAuthCodes)
      .where(and(eq(oauthAuthCodes.codeHash, codeHash), eq(oauthAuthCodes.clientId, clientId)))
      .limit(1)
  )[0];
  if (!row) return oauthError("invalid_grant", "Unknown code");
  if (row.consumedAt) return oauthError("invalid_grant", "Code already used");
  if (row.expiresAt < new Date()) return oauthError("invalid_grant", "Code expired");
  if (row.redirectUri !== redirectUri) return oauthError("invalid_grant", "redirect_uri mismatch");
  if (!redirectUriAllowed(registeredRedirectUris, redirectUri)) {
    return oauthError("invalid_grant", "redirect_uri not registered for this client");
  }
  if (!verifyPkce(row.codeChallengeMethod, row.codeChallenge, codeVerifier)) {
    return oauthError("invalid_grant", "PKCE verification failed");
  }
  if (row.resource !== mcpResourceUrl()) {
    return oauthError("invalid_target", "Unexpected resource/audience");
  }

  // Single-use: mark consumed before issuing tokens.
  const [claimed] = await db
    .update(oauthAuthCodes)
    .set({ consumedAt: new Date() })
    .where(and(eq(oauthAuthCodes.codeHash, codeHash), isNull(oauthAuthCodes.consumedAt)))
    .returning();
  if (!claimed) return oauthError("invalid_grant", "Code already used");

  return issueTokenSet({
    clientId,
    userId: row.userId,
    scope: row.scope,
    resource: row.resource,
  });
}

async function handleRefreshToken(form: URLSearchParams, clientId: string) {
  const refreshToken = form.get("refresh_token") ?? "";
  if (!refreshToken) return oauthError("invalid_request", "refresh_token is required");

  const tokenHash = sha256Hex(refreshToken);
  const row = (
    await db
      .select()
      .from(oauthRefreshTokens)
      .where(and(eq(oauthRefreshTokens.tokenHash, tokenHash), eq(oauthRefreshTokens.clientId, clientId)))
      .limit(1)
  )[0];
  if (!row) return oauthError("invalid_grant", "Unknown refresh token");
  if (row.rotatedAt) return oauthError("invalid_grant", "Refresh token already used");
  if (row.expiresAt < new Date()) return oauthError("invalid_grant", "Refresh token expired");

  // Rotate: mark old one used before minting the new pair.
  const [claimed] = await db
    .update(oauthRefreshTokens)
    .set({ rotatedAt: new Date() })
    .where(and(eq(oauthRefreshTokens.tokenHash, tokenHash), isNull(oauthRefreshTokens.rotatedAt)))
    .returning();
  if (!claimed) return oauthError("invalid_grant", "Refresh token already used");

  return issueTokenSet({
    clientId,
    userId: row.userId,
    scope: row.scope,
    resource: row.resource,
  });
}

async function issueTokenSet(input: { clientId: string; userId: number; scope: string; resource: string }) {
  const userRow = (
    await db.select({ householdId: users.householdId }).from(users).where(eq(users.id, input.userId)).limit(1)
  )[0];
  if (!userRow) return oauthError("invalid_grant", "User no longer exists");

  const accessToken = randomToken(32);
  const refreshToken = randomToken(32);
  const accessExpires = new Date(Date.now() + ACCESS_TOKEN_TTL_MS);
  const refreshExpires = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await db.insert(oauthAccessTokens).values({
    tokenHash: sha256Hex(accessToken),
    clientId: input.clientId,
    userId: input.userId,
    householdId: userRow.householdId,
    scope: input.scope,
    resource: input.resource,
    expiresAt: accessExpires,
  });
  await db.insert(oauthRefreshTokens).values({
    tokenHash: sha256Hex(refreshToken),
    clientId: input.clientId,
    userId: input.userId,
    scope: input.scope,
    resource: input.resource,
    expiresAt: refreshExpires,
  });

  return Response.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
    refresh_token: refreshToken,
    scope: input.scope,
  });
}

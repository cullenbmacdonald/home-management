import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { oauthClients } from "@/db/schema";
import { sha256Hex } from "@/lib/auth";

export const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30d
export const AUTH_CODE_TTL_MS = 60 * 1000; // 60s

export function issuerUrl() {
  return (process.env.MCP_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Opaque, high-entropy, URL-safe random token. */
export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export { sha256Hex };

/** Constant-time string compare, safe even when lengths differ. */
export function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) {
    // Still do a fixed-cost compare so failure timing doesn't leak length.
    crypto.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

/** Exact match only — no prefix/substring matching allowed for redirect URIs. */
export function redirectUriAllowed(registered: string[], candidate: string): boolean {
  return registered.includes(candidate);
}

/** PKCE S256 verification. `plain` is never accepted. */
export function verifyPkce(
  method: string,
  challenge: string,
  verifier: string,
): boolean {
  if (method !== "S256") return false;
  if (!verifier || !challenge) return false;
  const computed = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return constantTimeEqual(computed, challenge);
}

export type OauthClient = typeof oauthClients.$inferSelect;

export async function getClient(clientId: string): Promise<OauthClient | null> {
  if (!clientId) return null;
  const row = (
    await db.select().from(oauthClients).where(eq(oauthClients.clientId, clientId)).limit(1)
  )[0];
  return row ?? null;
}

/**
 * Authenticate a client for the token endpoint. Public clients (no secret
 * hash stored) authenticate by client_id alone (must arrive via PKCE).
 * Confidential clients must present a matching client_secret.
 */
export async function authenticateClient(
  clientId: string,
  clientSecret: string | undefined,
): Promise<OauthClient | null> {
  const client = await getClient(clientId);
  if (!client) return null;
  if (!client.clientSecretHash) return client; // public client
  if (!clientSecret) return null;
  const hash = sha256Hex(clientSecret);
  return constantTimeEqual(hash, client.clientSecretHash) ? client : null;
}

/** JSON error body per RFC 6749 §5.2 / §7591 error conventions. */
export function oauthError(error: string, description?: string, status = 400) {
  return Response.json(
    { error, ...(description ? { error_description: description } : {}) },
    { status },
  );
}

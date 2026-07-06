import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { oauthAccessTokens, oauthRefreshTokens } from "@/db/schema";
import { authenticateClient, sha256Hex } from "@/lib/oauth";

/** POST /oauth/revoke — RFC 7009. Always 200 (spec: don't leak token validity). */
export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  const form = contentType.includes("application/json")
    ? new URLSearchParams(await req.json())
    : new URLSearchParams(await req.text());

  const token = form.get("token") ?? "";
  const clientId = form.get("client_id") ?? "";
  const clientSecret = form.get("client_secret") ?? undefined;
  const tokenTypeHint = form.get("token_type_hint") ?? "";

  const client = await authenticateClient(clientId, clientSecret);
  if (!client || !token) return new Response(null, { status: 200 });

  const hash = sha256Hex(token);
  if (tokenTypeHint !== "refresh_token") {
    await db
      .delete(oauthAccessTokens)
      .where(and(eq(oauthAccessTokens.tokenHash, hash), eq(oauthAccessTokens.clientId, client.clientId)));
  }
  if (tokenTypeHint !== "access_token") {
    await db
      .delete(oauthRefreshTokens)
      .where(and(eq(oauthRefreshTokens.tokenHash, hash), eq(oauthRefreshTokens.clientId, client.clientId)));
  }
  return new Response(null, { status: 200 });
}

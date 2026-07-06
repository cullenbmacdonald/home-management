import { z } from "zod";
import { db } from "@/db";
import { oauthClients } from "@/db/schema";
import { sha256Hex, randomToken, issuerUrl, oauthError } from "@/lib/oauth";

// RFC 7591 Dynamic Client Registration — minimal subset we support.
const RegisterSchema = z.object({
  client_name: z.string().min(1).max(200).optional(),
  redirect_uris: z.array(z.string().url()).min(1),
  grant_types: z.array(z.string()).optional(),
  token_endpoint_auth_method: z.enum(["none", "client_secret_post"]).optional(),
});

function isAllowedRedirectUri(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.protocol === "https:") return true;
    if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) {
      return true;
    }
    // Native app clients (Claude Desktop) commonly use a custom scheme redirect.
    if (u.protocol && u.protocol !== "http:" && u.protocol !== "https:") return true;
    return false;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return oauthError("invalid_client_metadata", "Body must be JSON");
  }
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return oauthError("invalid_client_metadata", parsed.error.message);
  }
  const { client_name, redirect_uris, grant_types, token_endpoint_auth_method } = parsed.data;

  if (!redirect_uris.every(isAllowedRedirectUri)) {
    return oauthError(
      "invalid_redirect_uri",
      "redirect_uris must be HTTPS, localhost, or a native app scheme",
    );
  }

  const authMethod = token_endpoint_auth_method ?? "none";
  const clientId = randomToken(16);
  let clientSecret: string | undefined;
  let clientSecretHash: string | null = null;
  if (authMethod === "client_secret_post") {
    clientSecret = randomToken(32);
    clientSecretHash = sha256Hex(clientSecret);
  }

  await db.insert(oauthClients).values({
    clientId,
    clientSecretHash,
    clientName: client_name?.trim() || "Unnamed MCP client",
    redirectUris: redirect_uris,
    grantTypes: grant_types && grant_types.length > 0 ? grant_types : ["authorization_code", "refresh_token"],
    tokenEndpointAuthMethod: authMethod,
  });

  return Response.json(
    {
      client_id: clientId,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: client_name?.trim() || "Unnamed MCP client",
      redirect_uris,
      grant_types: grant_types && grant_types.length > 0 ? grant_types : ["authorization_code", "refresh_token"],
      token_endpoint_auth_method: authMethod,
      registration_client_uri: `${issuerUrl()}/oauth/register/${clientId}`,
    },
    { status: 201 },
  );
}

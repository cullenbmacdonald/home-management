import { db } from "@/db";
import { oauthAuthCodes } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getClient, redirectUriAllowed, randomToken, sha256Hex, AUTH_CODE_TTL_MS } from "@/lib/oauth";
import { mcpResourceUrl } from "@/lib/auth";
import { renderConsentPage } from "./consent-page";

function selfUrl(url: URL): string {
  return `${url.pathname}?${url.searchParams.toString()}`;
}

/**
 * GET /oauth/authorize — validate the request, then either bounce to login
 * (preserving this exact URL via `next`) or render the consent screen.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = url.searchParams;
  const clientId = params.get("client_id") ?? "";
  const redirectUri = params.get("redirect_uri") ?? "";
  const responseType = params.get("response_type") ?? "";
  const state = params.get("state") ?? "";
  const scope = params.get("scope") ?? "homebase:read homebase:write";
  const resource = params.get("resource") ?? mcpResourceUrl();
  const codeChallenge = params.get("code_challenge") ?? "";
  const codeChallengeMethod = params.get("code_challenge_method") ?? "";

  const client = await getClient(clientId);
  if (!client) {
    return htmlError("Unknown client_id. This app hasn't been registered with Homebase.");
  }
  if (!redirectUriAllowed(client.redirectUris, redirectUri)) {
    return htmlError("redirect_uri does not exactly match a registered URI for this client.");
  }
  if (responseType !== "code") {
    return redirectWithError(redirectUri, state, "unsupported_response_type");
  }
  if (codeChallengeMethod !== "S256" || !codeChallenge) {
    return redirectWithError(redirectUri, state, "invalid_request", "PKCE S256 is required");
  }
  if (resource !== mcpResourceUrl()) {
    return redirectWithError(redirectUri, state, "invalid_target", "Unknown resource");
  }

  const user = await getCurrentUser();
  if (!user) {
    const next = encodeURIComponent(selfUrl(url));
    return Response.redirect(`${url.origin}/login?next=${next}`, 302);
  }

  return new Response(
    renderConsentPage({
      clientName: client.clientName,
      username: user.displayName,
      scope,
      formAction: "/oauth/authorize",
      hidden: {
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        scope,
        resource,
        code_challenge: codeChallenge,
        code_challenge_method: codeChallengeMethod,
      },
    }),
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

/** POST /oauth/authorize — consent submit. Mints a single-use code or denies. */
export async function POST(req: Request) {
  const form = await req.formData();
  const decision = String(form.get("decision") ?? "");
  const clientId = String(form.get("client_id") ?? "");
  const redirectUri = String(form.get("redirect_uri") ?? "");
  const state = String(form.get("state") ?? "");
  const scope = String(form.get("scope") ?? "");
  const resource = String(form.get("resource") ?? "");
  const codeChallenge = String(form.get("code_challenge") ?? "");
  const codeChallengeMethod = String(form.get("code_challenge_method") ?? "");

  const client = await getClient(clientId);
  if (!client || !redirectUriAllowed(client.redirectUris, redirectUri)) {
    return htmlError("Invalid client or redirect_uri.");
  }

  if (decision !== "approve") {
    return redirectWithError(redirectUri, state, "access_denied");
  }

  const user = await getCurrentUser();
  if (!user) {
    const next = encodeURIComponent(`/oauth/authorize?${new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      state,
      scope,
      resource,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
    }).toString()}`);
    return Response.redirect(`${new URL(req.url).origin}/login?next=${next}`, 302);
  }

  const code = randomToken(32);
  await db.insert(oauthAuthCodes).values({
    codeHash: sha256Hex(code),
    clientId,
    userId: user.id,
    redirectUri,
    codeChallenge,
    codeChallengeMethod,
    scope,
    resource,
    expiresAt: new Date(Date.now() + AUTH_CODE_TTL_MS),
  });

  const to = new URL(redirectUri);
  to.searchParams.set("code", code);
  if (state) to.searchParams.set("state", state);
  return Response.redirect(to.toString(), 302);
}

function redirectWithError(redirectUri: string, state: string, error: string, description?: string) {
  try {
    const to = new URL(redirectUri);
    to.searchParams.set("error", error);
    if (description) to.searchParams.set("error_description", description);
    if (state) to.searchParams.set("state", state);
    return Response.redirect(to.toString(), 302);
  } catch {
    return htmlError(`${error}: ${description ?? ""}`);
  }
}

function htmlError(message: string) {
  return new Response(`<!doctype html><p>${escapeHtml(message)}</p>`, {
    status: 400,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

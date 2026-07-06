import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { householdFromToken, mcpResourceUrl } from "@/lib/auth";
import { issuerUrl } from "@/lib/oauth";
import { registerTools } from "@/lib/mcp-tools";

const handler = createMcpHandler(
  (server) => {
    registerTools(server);
  },
  { serverInfo: { name: "homebase", version: "1.0.0" } },
  { basePath: "/api", disableSse: true },
);

async function verifyToken(_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;
  const ctx = await householdFromToken(bearerToken);
  if (!ctx) return undefined;
  return {
    token: bearerToken,
    clientId: ctx.clientId,
    scopes: ctx.scope.split(/\s+/).filter(Boolean),
    resource: new URL(mcpResourceUrl()),
    extra: { householdId: ctx.householdId, userId: ctx.userId },
  };
}

// `resourceUrl` here is used only to build the WWW-Authenticate
// `resource_metadata` URL (origin + resourceMetadataPath) — it must be the
// bare origin, not the /api/mcp resource itself. Audience validation of the
// token's `resource` against the canonical MCP URL happens in verifyToken
// via householdFromToken().
const authedHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  resourceUrl: issuerUrl(),
});

export { authedHandler as GET, authedHandler as POST, authedHandler as DELETE };

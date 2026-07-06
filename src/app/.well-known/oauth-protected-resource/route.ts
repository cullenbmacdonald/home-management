import { protectedResourceHandler } from "mcp-handler";
import { mcpResourceUrl } from "@/lib/auth";
import { issuerUrl } from "@/lib/oauth";

export const GET = protectedResourceHandler({
  authServerUrls: [issuerUrl()],
  resourceUrl: mcpResourceUrl(),
});

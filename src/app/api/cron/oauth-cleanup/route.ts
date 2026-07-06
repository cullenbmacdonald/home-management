import { sweepExpiredOauthRows } from "@/lib/oauth-cleanup";

/**
 * Trigger with an external scheduler (cron, systemd timer, etc.):
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://HOST/api/cron/oauth-cleanup
 * Set CRON_SECRET in the environment to enable; without it the route 404s so
 * it can't be hit accidentally in a fresh deploy.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("Not configured", { status: 404 });
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const result = await sweepExpiredOauthRows();
  return Response.json(result);
}

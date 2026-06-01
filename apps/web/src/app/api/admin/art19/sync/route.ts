import { NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, verifyAdminCookie } from "@/lib/admin-auth";
import { runArt19Sync } from "@/lib/art19-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// ART19 has 2k+ episodes for some networks; give the route headroom.
export const maxDuration = 300;

/**
 * POST /api/admin/art19/sync — ART19 → Supabase sync entry point.
 *
 * Dual auth (same pattern as /api/admin/finance/sync and the alerts
 * sync): Bearer CRON_SECRET for the GitHub Actions cron, or admin
 * cookie for the in-app "Refresh now" button.
 *
 * Returns the same shape as runArt19Sync(): { ok, showCount,
 * episodeCount, durationMs, error? }.
 */
export async function POST(req: Request) {
  // Auth path 1: CRON_SECRET bearer.
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const bearerOk = cronSecret && auth === `Bearer ${cronSecret}`;

  // Auth path 2: admin cookie (for the UI button — Phase B).
  let ok = bearerOk;
  if (!ok) {
    const cookie = req.headers
      .get("cookie")
      ?.split("; ")
      .find((c) => c.startsWith(`${ADMIN_COOKIE_NAME}=`))
      ?.split("=")[1];
    ok = !!cookie && (await verifyAdminCookie(cookie));
  }
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  const result = await runArt19Sync();
  // Return 502 on upstream/auth failures so the caller (and the cron
  // workflow's `curl -f`) sees a non-2xx and treats the run as failed.
  // Config-missing returns 503 to distinguish "no setup" from "tried
  // and broke."
  if (!result.ok) {
    const status = result.error?.startsWith("ART19 is not configured")
      ? 503
      : 502;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}

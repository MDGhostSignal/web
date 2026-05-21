import { NextResponse, type NextRequest } from "next/server";

import {
  ADMIN_COOKIE_NAME,
  verifyAdminCookie,
} from "@/lib/admin-auth";
import { runMercurySync } from "@/lib/mercury-sync";

/**
 * POST /api/admin/finance/sync
 *
 * Pulls fresh data from Mercury and upserts into Supabase. Triggered
 * from two places:
 *
 *  1. Vercel Cron — fires every 15 minutes per apps/web/vercel.json.
 *     Vercel Cron requests carry `Authorization: Bearer <CRON_SECRET>`
 *     (the project-level secret), no `admin_auth` cookie. We allowlist
 *     this path in src/proxy.ts so the cron call isn't rejected as
 *     "unauthorized" by the proxy-level cookie gate, and we enforce
 *     the bearer-token check here in the route.
 *
 *  2. The "Refresh now" button on /admin/finance. The browser sends
 *     the `admin_auth` cookie, no bearer.
 *
 * Either auth path is accepted. Anything else → 401.
 */

// Use the Node runtime — the sync orchestrator can take longer than
// Edge's stricter limits and does enough I/O that the Node runtime is
// the safer default.
export const runtime = "nodejs";

// Sync can paginate through up to 5 pages per account. Give it room.
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const authResult = await authenticate(req);
  if (!authResult.ok) {
    return NextResponse.json(
      { ok: false, error: authResult.error },
      { status: 401 },
    );
  }

  const result = await runMercurySync();

  if (result.ok) {
    return NextResponse.json({
      ok: true,
      runId: result.runId,
      accountCount: result.accountCount,
      transactionCount: result.transactionCount,
      durationMs: result.durationMs,
    });
  }

  return NextResponse.json(
    {
      ok: false,
      runId: result.runId,
      error: result.message,
    },
    { status: 502 },
  );
}

/* --- Auth ------------------------------------------------------------- */

type AuthResult = { ok: true; via: "cron" | "cookie" } | { ok: false; error: string };

async function authenticate(req: NextRequest): Promise<AuthResult> {
  const cronCheck = checkCronBearer(req);
  if (cronCheck === "ok") return { ok: true, via: "cron" };
  if (cronCheck === "mismatch") {
    return { ok: false, error: "Invalid CRON_SECRET." };
  }

  // No bearer header — fall back to the admin cookie.
  const cookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const cookieOk = await verifyAdminCookie(cookie);
  if (cookieOk) return { ok: true, via: "cookie" };

  return { ok: false, error: "Unauthorized." };
}

/**
 * Returns:
 *   "absent"   — no Authorization header at all (try cookie auth)
 *   "ok"       — header present and matches CRON_SECRET
 *   "mismatch" — header present but doesn't match (reject; don't fall through)
 */
function checkCronBearer(req: NextRequest): "absent" | "ok" | "mismatch" {
  const header = req.headers.get("authorization") ?? "";
  if (!header) return "absent";

  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return "mismatch";

  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // No CRON_SECRET set: treat any bearer header as a misconfiguration
    // attempt rather than silently accepting it.
    return "mismatch";
  }

  return timingSafeEqualStr(match[1], expected) ? "ok" : "mismatch";
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

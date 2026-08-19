import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_COOKIE_NAME, verifyAdminCookie } from "@/lib/admin-auth";
import { getColdOutreachDelivery } from "@/lib/cold-outreach-send";
import { supabaseRest } from "@/lib/supabase-admin";

/**
 * POST /api/admin/outreach/reconcile — safety net for scheduled sends.
 *
 * Resend owns the actual delivery timing (native scheduled_at), so in
 * the happy path our 'scheduled' rows just need flipping to 'sent' once
 * they've gone out. This job trues our rows up against Resend's reality
 * for any 'scheduled' row whose time has passed (by a grace margin):
 * it GETs each one's delivery state and maps it onto our status. So the
 * queue never drifts even if a browser tab was closed at delivery time.
 *
 * Triggered two ways (same pattern as the other cron routes):
 *   1. GitHub Actions — periodic, `Authorization: Bearer <CRON_SECRET>`.
 *   2. Manual "Refresh statuses" from /admin/outreach — admin cookie.
 *
 * Allow-listed in proxy.ts PUBLIC_SUBPATHS; this route enforces auth.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

/** Small settle margin past the send time before we check Resend. We
 *  don't need much: the status only flips when Resend *confirms* a
 *  terminal delivery state (mapEvent), so checking early just no-ops
 *  until Resend has actually sent it. Kept short so a delivered send
 *  stops reading "sending…" within a minute rather than ten. */
const GRACE_MS = 60 * 1000;
/** Cap per run so a backlog can't blow the function timeout. */
const BATCH_LIMIT = 100;

type Row = {
  id: string;
  resend_id: string | null;
  scheduled_at: string | null;
};

function mapEvent(lastEvent: string | null): "sent" | "canceled" | "failed" | null {
  if (!lastEvent) return null;
  switch (lastEvent) {
    case "delivered":
    case "sent":
    case "opened":
    case "clicked":
      return "sent";
    case "canceled":
      return "canceled";
    case "bounced":
    case "complained":
    case "failed":
      return "failed";
    // "scheduled", "delivery_delayed", "queued", etc. → leave as-is.
    default:
      return null;
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - GRACE_MS).toISOString();
  const res = await supabaseRest<Row[]>(
    `cold_outreach?select=id,resend_id,scheduled_at&status=eq.scheduled&scheduled_at=lt.${cutoff}&resend_id=not.is.null&order=scheduled_at.asc&limit=${BATCH_LIMIT}`,
  );
  if (!res.ok) {
    if (res.detail.includes("cold_outreach")) {
      return NextResponse.json({ ok: true, checked: 0, updated: 0, note: "table missing" });
    }
    return NextResponse.json(
      { ok: false, error: "Could not load scheduled rows.", detail: res.detail },
      { status: 502 },
    );
  }

  const rows = res.data ?? [];
  let updated = 0;
  const changes: Array<{ id: string; status: string }> = [];

  for (const row of rows) {
    if (!row.resend_id) continue;
    const delivery = await getColdOutreachDelivery(row.resend_id);
    if (!delivery.ok) continue;
    const next = mapEvent(delivery.lastEvent);
    if (!next) continue;
    const patch: Record<string, unknown> = { status: next };
    if (next === "sent") patch.sent_at = new Date().toISOString();
    const upd = await supabaseRest(
      `cold_outreach?id=eq.${encodeURIComponent(row.id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(patch),
        prefer: "return=minimal",
      },
    );
    if (upd.ok) {
      updated++;
      changes.push({ id: row.id, status: next });
    }
  }

  return NextResponse.json({
    ok: true,
    checked: rows.length,
    updated,
    changes,
    via: auth.via,
  });
}

// --- auth (Bearer CRON_SECRET or admin cookie) --------------------
type AuthResult =
  | { ok: true; via: "cron" | "cookie" }
  | { ok: false; error: string };

async function authenticate(req: NextRequest): Promise<AuthResult> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (match) {
    const expected = process.env.CRON_SECRET;
    if (!expected) return { ok: false, error: "CRON_SECRET not configured." };
    if (timingSafeEqualStr(match[1], expected)) return { ok: true, via: "cron" };
    return { ok: false, error: "Invalid CRON_SECRET." };
  }
  const cookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (await verifyAdminCookie(cookie)) return { ok: true, via: "cookie" };
  return { ok: false, error: "Unauthorized." };
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

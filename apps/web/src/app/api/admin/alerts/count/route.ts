import { NextResponse } from "next/server";

import { supabaseRest } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/alerts/count — cheap count for the top-bar bell badge.
 *
 * Counts open alerts (resolved_at IS NULL) that are not currently in
 * a snooze window. PostgREST returns the count via the `Prefer:
 * count=exact` header but `supabaseRest` discards headers, so we just
 * select id and len the array. With current expected volumes (< 100
 * open alerts ever) this is fine — if it ever grows, swap for a
 * Postgres function that returns just the integer.
 */
export async function GET() {
  const nowIso = new Date().toISOString();
  const path =
    "crm_alerts?select=id&resolved_at=is.null" +
    `&or=(snoozed_until.is.null,snoozed_until.lt.${nowIso})`;
  const res = await supabaseRest<{ id: string }[]>(path);
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: res.detail, count: 0 },
      { status: res.status },
    );
  }
  return NextResponse.json({ ok: true, count: (res.data ?? []).length });
}

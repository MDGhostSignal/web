import { NextResponse } from "next/server";

import {
  detectAlertsForMember,
  type AlertKind,
  type CrmAlert,
} from "@/lib/alerts";
import { ADMIN_COOKIE_NAME, verifyAdminCookie } from "@/lib/admin-auth";
import type { Member } from "@/lib/members";
import { supabaseRest } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/alerts/sync — detection job entry point.
 *
 * Runs hourly from .github/workflows/crm-alerts-sync.yml via a Bearer
 * CRON_SECRET. Also reachable from the in-app "Refresh alerts now"
 * button (gated by the admin cookie). Idempotent — every run computes
 * the desired set of open alerts from scratch and reconciles:
 *
 *   - members that should have an alert AND don't  → insert
 *   - alerts whose member no longer qualifies      → resolve
 *   - alerts that still apply                      → leave alone
 *
 * Returns counts so the cron can log progress.
 */
export async function POST(req: Request) {
  // Two auth paths: CRON_SECRET bearer (for the GitHub Actions cron)
  // or admin cookie (for the in-app refresh button). Mirrors the
  // mercury-sync pattern.
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const bearerOk =
    cronSecret && auth === `Bearer ${cronSecret}`;

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

  // Pull the slim member columns the detector needs.
  const memberCols = [
    "id",
    "phase",
    "phase_entered_at",
    "last_contact_at",
    "created_at",
    "updated_at",
    "lifecycle_steps",
    "owner",
  ].join(",");
  const memRes = await supabaseRest<Member[]>(
    `members?select=${memberCols}`,
  );
  if (!memRes.ok) {
    return NextResponse.json(
      { ok: false, error: memRes.detail },
      { status: memRes.status },
    );
  }
  const members = memRes.data ?? [];

  // Existing open alerts, keyed by (kind, member_id).
  const openRes = await supabaseRest<CrmAlert[]>(
    "crm_alerts?select=id,kind,member_id&resolved_at=is.null",
  );
  if (!openRes.ok) {
    return NextResponse.json(
      { ok: false, error: openRes.detail },
      { status: openRes.status },
    );
  }
  const existingOpen = new Map<string, string>(); // "kind|member_id" -> id
  for (const a of openRes.data ?? []) {
    existingOpen.set(`${a.kind}|${a.member_id}`, a.id);
  }

  // Compute the desired open set.
  const desired = new Map<
    string,
    { kind: AlertKind; member_id: string; reason: object }
  >();
  for (const m of members) {
    const alerts = detectAlertsForMember(m);
    for (const a of alerts) {
      desired.set(`${a.kind}|${m.id}`, {
        kind: a.kind,
        member_id: m.id,
        reason: a.reason,
      });
    }
  }

  // Reconcile: insert new, auto-resolve gone.
  const toInsert: Array<{
    kind: AlertKind;
    member_id: string;
    reason_json: object;
  }> = [];
  for (const [key, val] of desired) {
    if (!existingOpen.has(key)) {
      toInsert.push({
        kind: val.kind,
        member_id: val.member_id,
        reason_json: val.reason,
      });
    }
  }
  const toResolveIds: string[] = [];
  for (const [key, id] of existingOpen) {
    if (!desired.has(key)) toResolveIds.push(id);
  }

  let opened = 0;
  if (toInsert.length > 0) {
    const ins = await supabaseRest("crm_alerts", {
      method: "POST",
      body: JSON.stringify(toInsert),
      prefer: "return=minimal,resolution=ignore-duplicates",
    });
    if (ins.ok) opened = toInsert.length;
  }

  let resolved = 0;
  if (toResolveIds.length > 0) {
    const nowIso = new Date().toISOString();
    const res = await supabaseRest(
      `crm_alerts?id=in.(${toResolveIds.join(",")})`,
      {
        method: "PATCH",
        body: JSON.stringify({ resolved_at: nowIso }),
      },
    );
    if (res.ok) resolved = toResolveIds.length;
  }

  return NextResponse.json({
    ok: true,
    opened,
    resolved,
    total_open: desired.size,
    scanned: members.length,
  });
}

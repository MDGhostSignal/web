import { NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, verifyAdminCookie } from "@/lib/admin-auth";
import type { CampaignAlertSnapshot, CrmAlert } from "@/lib/alerts";
import {
  type CampaignCandidate,
  detectCampaignEndingAlert,
  campaignAlertRecipients,
  sendCampaignEndingEmail,
} from "@/lib/campaign-alerts";
import { supabaseRest } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/campaign-alerts/sync — campaign-ending detection.
 *
 * Runs hourly from .github/workflows/campaign-alerts.yml (Bearer
 * CRON_SECRET); also reachable from the admin UI via cookie. For each
 * ART19 campaign ≥ 97% through its run time (and still running) with no
 * open alert, it inserts a `campaign_ending` crm_alerts row AND sends
 * the one-time email to Jack + Mike. Campaigns that have since concluded
 * get their open alert resolved. Idempotent — the open-alert set is the
 * fire-once guard, so re-runs never double-email.
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  let ok = !!cronSecret && auth === `Bearer ${cronSecret}`;
  if (!ok) {
    const cookie = req.headers
      .get("cookie")
      ?.split("; ")
      .find((c) => c.startsWith(`${ADMIN_COOKIE_NAME}=`))
      ?.split("=")[1];
    ok = !!cookie && (await verifyAdminCookie(cookie));
  }
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  // Campaign rows — only the columns the detector needs.
  const cols = [
    "id",
    "name",
    "campaign_type",
    "ad_source",
    "status",
    "default_cpm",
    "listen_count",
    "maximum_impressions",
    "fill_rate",
    "advertisements_count",
    "start_date",
    "end_date",
  ].join(",");
  const campRes = await supabaseRest<CampaignCandidate[]>(
    `art19_campaigns?select=${cols}`,
  );
  if (!campRes.ok) {
    return NextResponse.json({ ok: false, error: campRes.detail }, { status: campRes.status });
  }

  const nowMs = Date.now();
  const desired = new Map<
    string,
    { campaign_id: string; reason: { campaign: CampaignAlertSnapshot } }
  >();
  for (const c of campRes.data ?? []) {
    const hit = detectCampaignEndingAlert(c, nowMs);
    if (hit) desired.set(hit.campaign_id, hit);
  }

  // Currently-open campaign alerts.
  const openRes = await supabaseRest<Pick<CrmAlert, "id" | "campaign_id">[]>(
    "crm_alerts?select=id,campaign_id&kind=eq.campaign_ending&resolved_at=is.null",
  );
  if (!openRes.ok) {
    return NextResponse.json({ ok: false, error: openRes.detail }, { status: openRes.status });
  }
  const openByCampaign = new Map<string, string>();
  for (const a of openRes.data ?? []) {
    if (a.campaign_id) openByCampaign.set(a.campaign_id, a.id);
  }

  // Insert alerts for newly-qualifying campaigns, then email each once.
  const toInsert = [...desired.values()].filter(
    (d) => !openByCampaign.has(d.campaign_id),
  );
  let emailed = 0;
  const emailFailures: string[] = [];
  const recipients = campaignAlertRecipients();
  for (const d of toInsert) {
    const ins = await supabaseRest<CrmAlert[]>("crm_alerts", {
      method: "POST",
      body: JSON.stringify({
        kind: "campaign_ending",
        campaign_id: d.campaign_id,
        reason_json: d.reason,
      }),
      prefer: "return=representation",
    });
    if (!ins.ok) {
      // Unique-index conflict (a concurrent run beat us) or DB error —
      // skip the email so we never double-send.
      emailFailures.push(`insert ${d.campaign_id}: ${ins.detail.slice(0, 120)}`);
      continue;
    }
    const sent = await sendCampaignEndingEmail(recipients, d.reason.campaign);
    if (sent.sent) emailed += 1;
    else emailFailures.push(`email ${d.campaign_id}: ${sent.reason ?? "unknown"}`);
  }

  // Resolve alerts whose campaign no longer qualifies (concluded).
  const toResolve = [...openByCampaign.entries()]
    .filter(([campaignId]) => !desired.has(campaignId))
    .map(([, alertId]) => alertId);
  let resolved = 0;
  if (toResolve.length > 0) {
    const res = await supabaseRest(
      `crm_alerts?id=in.(${toResolve.join(",")})`,
      {
        method: "PATCH",
        body: JSON.stringify({ resolved_at: new Date().toISOString() }),
      },
    );
    if (res.ok) resolved = toResolve.length;
  }

  return NextResponse.json({
    ok: true,
    scanned: campRes.data?.length ?? 0,
    qualifying: desired.size,
    opened: toInsert.length,
    emailed,
    resolved,
    recipients,
    emailFailures: emailFailures.length ? emailFailures : undefined,
  });
}

import { NextResponse } from "next/server";

import type { CampaignAlertSnapshot, CrmAlert } from "@/lib/alerts";
import { buildCampaignEmail } from "@/lib/campaign-alerts";
import { supabaseRest } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stable id so the fire-once index keeps a single demo row. */
export const DEMO_CAMPAIGN_ID = "demo-campaign-completion";

function demoSnapshot(): CampaignAlertSnapshot {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 30);
  return {
    name: "Demo · Campaign completion",
    campaign_type: "Campaigns::Billable",
    ad_source: "internal",
    run_pct: 100,
    days_remaining: 0,
    start_date: start.toISOString(),
    end_date: end.toISOString(),
    impressions: 100_000,
    goal: 100_000,
    pct_of_goal: 100,
    fill_rate: 100,
    cpm: 25,
    est_value: 2500,
    ads_count: 1,
  };
}

/**
 * POST /api/admin/campaign-alerts/demo
 *
 * Opens (or reopens) one in-app "Campaign complete" alert for a fake
 * campaign, and returns the email HTML so the campaigns page can show
 * it. Does not send mail.
 */
export async function POST() {
  const snapshot = demoSnapshot();
  const reason = { campaign: snapshot };
  const { subject, html } = buildCampaignEmail(snapshot);

  // crm_alerts.campaign_id references art19_campaigns. The stub is
  // archived_draft and excluded from the campaigns list and the cron
  // query, so it never counts as a live ad and never sends mail.
  const stub = await supabaseRest("art19_campaigns?on_conflict=id", {
    method: "POST",
    prefer: "resolution=merge-duplicates",
    body: JSON.stringify({
      id: DEMO_CAMPAIGN_ID,
      name: snapshot.name,
      campaign_type: snapshot.campaign_type,
      ad_source: "internal",
      status: "archived_draft",
      default_cpm: snapshot.cpm,
      current_spend: snapshot.est_value,
      listen_count: snapshot.impressions,
      maximum_impressions: snapshot.goal,
      fill_rate: snapshot.fill_rate,
      advertisements_count: snapshot.ads_count,
      start_date: snapshot.start_date,
      end_date: snapshot.end_date,
      raw: { demo: true },
    }),
  });
  if (!stub.ok) {
    return NextResponse.json(
      { ok: false, error: stub.detail },
      { status: stub.status },
    );
  }

  const existing = await supabaseRest<Pick<CrmAlert, "id">[]>(
    `crm_alerts?select=id&kind=eq.campaign_ending&campaign_id=eq.${DEMO_CAMPAIGN_ID}&limit=1`,
  );
  if (!existing.ok) {
    return NextResponse.json(
      { ok: false, error: existing.detail },
      { status: existing.status },
    );
  }

  const row = existing.data?.[0];
  if (row) {
    const patched = await supabaseRest(`crm_alerts?id=eq.${row.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        resolved_at: null,
        snoozed_until: null,
        reason_json: reason,
        triggered_at: new Date().toISOString(),
      }),
    });
    if (!patched.ok) {
      return NextResponse.json(
        { ok: false, error: patched.detail },
        { status: patched.status },
      );
    }
  } else {
    const inserted = await supabaseRest("crm_alerts", {
      method: "POST",
      body: JSON.stringify({
        kind: "campaign_ending",
        campaign_id: DEMO_CAMPAIGN_ID,
        reason_json: reason,
      }),
    });
    if (!inserted.ok) {
      return NextResponse.json(
        { ok: false, error: inserted.detail },
        { status: inserted.status },
      );
    }
  }

  return NextResponse.json({ ok: true, subject, html });
}

import { NextResponse } from "next/server";

import { supabaseRest } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CampaignRow = {
  id: string;
  name: string | null;
  campaign_type: string | null;
  ad_source: string | null;
  status: string | null;
  default_cpm: number | null;
  current_spend: number | null;
  listen_count: number | null;
  maximum_impressions: number | null;
  fill_rate: number | null;
  advertisements_count: number | null;
  start_date: string | null;
  end_date: string | null;
  art19_updated_at: string | null;
};

type CampaignSeriesRow = {
  id: string;
  campaign_id: string;
  show_id: string;
  cpm: number | null;
  current_spend: number | null;
  listen_count: number | null;
  maximum_impressions: number | null;
  status: string | null;
  brand_approval_status: string | null;
  live_reads_enabled: boolean | null;
  spots_enabled: boolean | null;
  rss_enabled: boolean | null;
};

type ShowLite = { id: string; title: string };

type CampaignWithShows = CampaignRow & {
  shows: Array<
    CampaignSeriesRow & {
      show_title: string;
    }
  >;
  ourSpend: number;
  ourImpressions: number;
};

/**
 * GET /api/admin/art19/campaigns — Ads dashboard payload.
 *
 * Joins art19_campaigns to art19_campaign_series (already pre-filtered
 * during sync to records that touch our shows). Each campaign comes
 * back with its per-show breakdown and a network-scoped rollup
 * (ourSpend / ourImpressions) that ignores anything not running on our
 * series. Network-level KPIs are computed off the same scoped numbers.
 *
 * Why scoped spend matters: a campaign's top-level `current_spend` is
 * the *total* across every show on ART19's platform — it's wildly
 * inflated for programmatic floor campaigns. The dashboard should
 * always show what's attributable to us.
 */
export async function GET() {
  const [campaignsRes, csRes, showsRes] = await Promise.all([
    supabaseRest<CampaignRow[]>(
      "art19_campaigns?select=id,name,campaign_type,ad_source,status,default_cpm,current_spend,listen_count,maximum_impressions,fill_rate,advertisements_count,start_date,end_date,art19_updated_at",
    ),
    supabaseRest<CampaignSeriesRow[]>(
      "art19_campaign_series?select=id,campaign_id,show_id,cpm,current_spend,listen_count,maximum_impressions,status,brand_approval_status,live_reads_enabled,spots_enabled,rss_enabled",
    ),
    supabaseRest<ShowLite[]>("art19_shows?select=id,title"),
  ]);

  if (!campaignsRes.ok) {
    return NextResponse.json(
      { ok: false, error: campaignsRes.detail },
      { status: campaignsRes.status },
    );
  }
  if (!csRes.ok) {
    return NextResponse.json(
      { ok: false, error: csRes.detail },
      { status: csRes.status },
    );
  }

  const campaigns = campaignsRes.data ?? [];
  const campaignSeries = csRes.data ?? [];
  const showTitle = new Map(
    (showsRes.ok ? (showsRes.data ?? []) : []).map((s) => [s.id, s.title]),
  );

  // Group campaign_series by campaign_id and compute scoped totals.
  const csByCampaign = new Map<string, CampaignSeriesRow[]>();
  for (const cs of campaignSeries) {
    const arr = csByCampaign.get(cs.campaign_id) ?? [];
    arr.push(cs);
    csByCampaign.set(cs.campaign_id, arr);
  }

  const withShows: CampaignWithShows[] = campaigns.map((c) => {
    const rows = csByCampaign.get(c.id) ?? [];
    const ourSpend = rows.reduce((a, r) => a + (r.current_spend ?? 0), 0);
    const ourImpressions = rows.reduce(
      (a, r) => a + (r.listen_count ?? 0),
      0,
    );
    return {
      ...c,
      shows: rows
        .map((r) => ({ ...r, show_title: showTitle.get(r.show_id) ?? "(unknown show)" }))
        .sort((a, b) => (b.current_spend ?? 0) - (a.current_spend ?? 0)),
      ourSpend,
      ourImpressions,
    };
  });

  // Sort: active first, then by our-scoped spend desc, then listens desc.
  withShows.sort((a, b) => {
    const aActive = a.status === "active" ? 1 : 0;
    const bActive = b.status === "active" ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    if ((b.ourSpend || 0) !== (a.ourSpend || 0))
      return (b.ourSpend || 0) - (a.ourSpend || 0);
    return (b.ourImpressions || 0) - (a.ourImpressions || 0);
  });

  // Network-level KPIs — only sum what's on our shows.
  const active = withShows.filter((c) => c.status === "active");
  const concluded = withShows.filter((c) => c.status === "concluded");
  const totalSpendActive = active.reduce((a, c) => a + (c.ourSpend ?? 0), 0);
  const totalImpressionsActive = active.reduce(
    (a, c) => a + (c.ourImpressions ?? 0),
    0,
  );
  const blendedCpmActive =
    totalImpressionsActive > 0
      ? (totalSpendActive / totalImpressionsActive) * 1000
      : null;

  const directSpend = active
    .filter((c) => c.ad_source === "internal")
    .reduce((a, c) => a + (c.ourSpend ?? 0), 0);
  const directSoldShare =
    totalSpendActive > 0 ? directSpend / totalSpendActive : null;

  return NextResponse.json({
    ok: true,
    kpis: {
      activeCampaigns: active.length,
      concludedCampaigns: concluded.length,
      totalCampaigns: withShows.length,
      totalSpendActive,
      totalImpressionsActive,
      blendedCpmActive,
      directSoldShare,
    },
    campaigns: withShows,
  });
}

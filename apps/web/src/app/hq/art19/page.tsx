"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { Badge, PageHeader } from "@/components/admin";

import styles from "./page.module.css";

type SyncRun = {
  status: "ok" | "error" | "running";
  started_at: string;
  finished_at: string | null;
  show_count: number | null;
  episode_count: number | null;
  error_message: string | null;
};

type Summary = {
  showCount: number;
  episodeCount: number;
  totalListens: number;
  lastSync: SyncRun | null;
  networks: {
    id: string;
    name: string | null;
    listen_count: number | null;
    series_count: number | null;
  }[];
};

type Show = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  image_url: string | null;
  episode_count: number | null;
  listen_count: number | null;
  art19_updated_at: string | null;
  latest_episode_at: string | null;
};

type Listens = {
  total: number;
  hasData: boolean;
  range: string;
};

type CampaignShow = {
  id: string;
  show_id: string;
  show_title: string;
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

type Campaign = {
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
  shows: CampaignShow[];
  ourSpend: number;
  ourImpressions: number;
};

type CampaignsPayload = {
  kpis: {
    activeCampaigns: number;
    concludedCampaigns: number;
    totalCampaigns: number;
    totalSpendActive: number;
    totalImpressionsActive: number;
    blendedCpmActive: number | null;
    directSoldShare: number | null;
  };
  campaigns: Campaign[];
};

type StatusFilter = "all" | "active" | "concluded";
type SourceFilter = "all" | "internal" | "external";

function formatMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n === 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatCpm(n: number | null | undefined): string {
  if (n == null) return "—";
  return `$${n.toFixed(2)}`;
}

function formatPercent(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${(n * 100).toFixed(0)}%`;
}

function formatBigNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "—";
  const m = Math.round(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * /admin/art19 — ART19 dashboard.
 *
 * Reads exclusively from the cached Supabase tables (art19_shows,
 * art19_episodes, art19_sync_runs) populated by the daily sync at
 * /api/admin/art19/sync. The UI never calls ART19 directly — same
 * pattern as /admin/finance.
 *
 * Phase B scope: KPI hero (show / episode counts + freshness),
 * sortable shows table, "Refresh now" button, sync-status banner.
 * The "Total listens last month" KPI is shown as a placeholder until
 * ART19 Support confirms which API surface exposes listen metrics
 * (see docs/ART19_INTEGRATION.md — Known gaps).
 */
export default function Art19Page() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [shows, setShows] = useState<Show[] | null>(null);
  const [listens, setListens] = useState<Listens | null>(null);
  const [ads, setAds] = useState<CampaignsPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [s, sh, l, c] = await Promise.all([
        fetch("/api/admin/art19/summary").then((r) => r.json()),
        fetch("/api/admin/art19/shows").then((r) => r.json()),
        fetch("/api/admin/art19/listens?range=30d").then((r) => r.json()),
        fetch("/api/admin/art19/campaigns").then((r) => r.json()),
      ]);
      if (s.ok) setSummary(s);
      if (sh.ok) setShows(sh.shows ?? []);
      if (l.ok)
        setListens({ total: l.total, hasData: l.hasData, range: l.range });
      if (c.ok) setAds({ kpis: c.kpis, campaigns: c.campaigns });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/art19/sync", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const detail =
          (j.error as string) ??
          (r.status === 503 ? "ART19 not configured yet." : `HTTP ${r.status}`);
        setError(detail);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const filtered = useMemo(() => {
    if (!shows) return [];
    if (!search.trim()) return shows;
    const q = search.toLowerCase();
    return shows.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.slug ?? "").toLowerCase().includes(q),
    );
  }, [shows, search]);

  const filteredCampaigns = useMemo(() => {
    if (!ads) return [];
    return ads.campaigns.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (sourceFilter !== "all" && c.ad_source !== sourceFilter) return false;
      return true;
    });
  }, [ads, statusFilter, sourceFilter]);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const lastSync = summary?.lastSync ?? null;
  const isStale =
    lastSync &&
    lastSync.started_at &&
    Date.now() - new Date(lastSync.started_at).getTime() > 36 * 60 * 60 * 1000;
  const hasError = lastSync?.status === "error";
  const notConfigured =
    !lastSync || (summary?.showCount === 0 && summary?.episodeCount === 0);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Campaigns"
        subtitle="Podcast ad campaigns. Shows + episodes pulled daily from the ART19 REST API into Supabase; the dashboard always reads from cache."
        count={
          summary && (
            <Badge variant={hasError ? "danger" : isStale ? "warn" : "neutral"}>
              Synced {relativeTime(lastSync?.started_at)}
            </Badge>
          )
        }
      />

      <Link href="/hq/art19/cpm" className={styles.toolLink}>
        <span className={styles.toolLinkIcon}>◐</span>
        <span>
          <strong>Signal Fidelity CPM Calculator</strong>
          <span className={styles.toolLinkSub}>Ballpark a CPM from match, position, type & length</span>
        </span>
        <span className={styles.toolLinkArrow}>→</span>
      </Link>

      {/* Sync status banner — surfaces errors + the not-yet-configured state */}
      {error && (
        <div className={`${styles.banner} ${styles.bannerError}`}>
          <span className={styles.bannerStatus}>Refresh failed:</span>
          <span>{error}</span>
        </div>
      )}
      {!error && hasError && lastSync?.error_message && (
        <div className={`${styles.banner} ${styles.bannerError}`}>
          <span className={styles.bannerStatus}>Last sync errored:</span>
          <span>{lastSync.error_message.slice(0, 220)}</span>
        </div>
      )}
      {!error && !hasError && notConfigured && (
        <div className={`${styles.banner} ${styles.bannerWarn}`}>
          <span className={styles.bannerStatus}>Not yet configured.</span>
          <span>
            Set <code>ART19_API_TOKEN</code>,{" "}
            <code>ART19_API_CREDENTIAL_ID</code>, and{" "}
            <code>ART19_NETWORK_ID</code> in Vercel, then click Refresh.
          </span>
        </div>
      )}

      <div className={styles.kpiRow}>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Shows</span>
          <span className={styles.kpiValue}>{summary?.showCount ?? "—"}</span>
          <span className={styles.kpiHint}>cached from ART19</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Episodes</span>
          <span className={styles.kpiValue}>
            {summary?.episodeCount ?? "—"}
          </span>
          <span className={styles.kpiHint}>across all shows</span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Network</span>
          <span className={styles.kpiValue}>
            {summary?.networks?.[0]?.name ?? "—"}
          </span>
          <span className={styles.kpiHint}>
            {summary?.networks && summary.networks.length > 1
              ? `${summary.networks.length} networks linked`
              : "primary network"}
          </span>
        </div>
        <div className={styles.kpi}>
          <span className={styles.kpiLabel}>Lifetime listens</span>
          <span className={styles.kpiValue}>
            {summary?.totalListens != null
              ? formatBigNumber(summary.totalListens)
              : "—"}
          </span>
          <span className={styles.kpiHint}>
            {summary?.totalListens != null
              ? `${summary.totalListens.toLocaleString()} IABv2.2 downloads — all-time`
              : "loading…"}
          </span>
        </div>
        <div
          className={`${styles.kpi} ${listens?.hasData ? "" : styles.placeholder}`}
        >
          <span className={styles.kpiLabel}>Listens · last 30d</span>
          <span className={styles.kpiValue}>
            {listens?.hasData ? formatBigNumber(listens.total) : "—"}
          </span>
          <span className={styles.kpiHint}>
            {listens?.hasData
              ? `${listens.total.toLocaleString()} downloads`
              : "pending S3 daily-export setup"}
          </span>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <div className={styles.tableHeader}>
          <h2 className={styles.tableTitle}>
            Shows {summary && `(${summary.showCount})`}
          </h2>
          <div className={styles.bannerActions}>
            <input
              type="search"
              placeholder="Search shows…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.search}
            />
            <button
              type="button"
              className={`${styles.button} ${styles.primary}`}
              onClick={() => void refresh()}
              disabled={refreshing || busy}
            >
              {refreshing ? "Syncing…" : "Refresh now"}
            </button>
          </div>
        </div>

        {shows === null ? (
          <div className={styles.loading}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <h3 className={styles.emptyTitle}>
              {shows.length === 0 ? "No shows yet" : "No matches"}
            </h3>
            <p>
              {shows.length === 0
                ? "Run the first sync once ART19 credentials are set."
                : "Try a different search term."}
            </p>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Show</th>
                <th className={styles.right}>Episodes</th>
                <th className={styles.right}>Lifetime listens</th>
                <th>Latest published</th>
                <th>ART19 updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className={styles.showTitle}>{s.title}</div>
                    {s.slug && <div className={styles.showSlug}>{s.slug}</div>}
                  </td>
                  <td className={styles.right}>{s.episode_count ?? "—"}</td>
                  <td className={styles.right}>
                    {s.listen_count != null
                      ? s.listen_count.toLocaleString()
                      : "—"}
                  </td>
                  <td>
                    {s.latest_episode_at ? (
                      <span title={s.latest_episode_at}>
                        {formatDate(s.latest_episode_at)}
                      </span>
                    ) : (
                      <span className={styles.muted}>—</span>
                    )}
                  </td>
                  <td className={styles.muted}>
                    {relativeTime(s.art19_updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* --- Ads & Revenue ------------------------------------------ */}
      {ads && ads.campaigns.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>Ads & Revenue</h2>
          <div className={styles.kpiRow}>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Active campaigns</span>
              <span className={styles.kpiValue}>{ads.kpis.activeCampaigns}</span>
              <span className={styles.kpiHint}>
                {ads.kpis.concludedCampaigns} concluded · {ads.kpis.totalCampaigns} total
              </span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Active spend (network)</span>
              <span className={styles.kpiValue}>
                {formatMoney(ads.kpis.totalSpendActive)}
              </span>
              <span className={styles.kpiHint}>
                {ads.kpis.totalImpressionsActive.toLocaleString()} impressions delivered
              </span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Blended eCPM (active)</span>
              <span className={styles.kpiValue}>
                {formatCpm(ads.kpis.blendedCpmActive)}
              </span>
              <span className={styles.kpiHint}>
                spend ÷ impressions × 1000
              </span>
            </div>
            <div className={styles.kpi}>
              <span className={styles.kpiLabel}>Direct-sold share</span>
              <span className={styles.kpiValue}>
                {formatPercent(ads.kpis.directSoldShare)}
              </span>
              <span className={styles.kpiHint}>of active spend</span>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <div className={styles.tableHeader}>
              <h2 className={styles.tableTitle}>Campaigns</h2>
              <div className={styles.bannerActions}>
                <div className={styles.filterChips}>
                  {(["active", "concluded", "all"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={`${styles.chip} ${statusFilter === f ? styles.active : ""}`}
                      onClick={() => setStatusFilter(f)}
                    >
                      {f === "all" ? "All status" : f[0].toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
                <div className={styles.filterChips}>
                  {(
                    [
                      ["all", "All sources"],
                      ["internal", "Direct"],
                      ["external", "Programmatic"],
                    ] as const
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      className={`${styles.chip} ${sourceFilter === v ? styles.active : ""}`}
                      onClick={() => setSourceFilter(v)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredCampaigns.length === 0 ? (
              <div className={styles.empty}>
                <h3 className={styles.emptyTitle}>No campaigns match</h3>
                <p>Try a different filter.</p>
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: 30 }} />
                    <th>Campaign</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th className={styles.right}>Default CPM</th>
                    <th className={styles.right}>Spend (network)</th>
                    <th className={styles.right}>Impressions</th>
                    <th>Pacing</th>
                    <th>Dates</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.map((c) => {
                    const booked =
                      c.maximum_impressions ?? c.shows.reduce((a, s) => a + (s.maximum_impressions ?? 0), 0);
                    const pct =
                      booked > 0
                        ? Math.min(100, Math.round((c.ourImpressions / booked) * 100))
                        : null;
                    const isOpen = expanded.has(c.id);
                    return (
                      <React.Fragment key={c.id}>
                        <tr>
                          <td>
                            <button
                              type="button"
                              className={styles.toggleButton}
                              onClick={() => toggleExpand(c.id)}
                              aria-expanded={isOpen}
                            >
                              {isOpen ? "▾" : "▸"}
                            </button>
                          </td>
                          <td>
                            <div className={styles.campaignName}>
                              {c.name ?? "(unnamed)"}
                            </div>
                            <div className={styles.campaignSub}>
                              {c.shows.length} show{c.shows.length === 1 ? "" : "s"}
                              {c.advertisements_count != null
                                ? ` · ${c.advertisements_count} creative${c.advertisements_count === 1 ? "" : "s"}`
                                : ""}
                            </div>
                          </td>
                          <td>
                            <span
                              className={`${styles.badge} ${
                                c.ad_source === "internal"
                                  ? styles.badgeDirect
                                  : c.ad_source === "external"
                                    ? styles.badgeProgrammatic
                                    : ""
                              }`}
                            >
                              {c.ad_source === "internal"
                                ? "Direct"
                                : c.ad_source === "external"
                                  ? "Programmatic"
                                  : c.ad_source ?? "—"}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`${styles.badge} ${
                                c.status === "active"
                                  ? styles.badgeActive
                                  : c.status === "concluded"
                                    ? styles.badgeConcluded
                                    : ""
                              }`}
                            >
                              {c.status ?? "—"}
                            </span>
                          </td>
                          <td className={styles.right}>
                            {formatCpm(c.default_cpm)}
                          </td>
                          <td className={styles.right}>
                            {formatMoney(c.ourSpend)}
                          </td>
                          <td className={styles.right}>
                            {c.ourImpressions.toLocaleString()}
                          </td>
                          <td>
                            {pct != null ? (
                              <>
                                <div className={styles.pacingBar}>
                                  <div
                                    className={styles.pacingFill}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <div className={styles.pacingText}>
                                  {pct}% of {booked.toLocaleString()}
                                </div>
                              </>
                            ) : (
                              <span className={styles.muted}>no goal</span>
                            )}
                          </td>
                          <td className={styles.muted}>
                            {c.start_date ? formatDate(c.start_date) : "—"}
                            {c.end_date ? ` → ${formatDate(c.end_date)}` : ""}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className={styles.expandRow}>
                            <td colSpan={9}>
                              <table className={styles.subTable}>
                                <thead>
                                  <tr>
                                    <th>Show</th>
                                    <th className={styles.right}>CPM</th>
                                    <th className={styles.right}>Spend</th>
                                    <th className={styles.right}>Impressions</th>
                                    <th>Brand approval</th>
                                    <th>Live reads</th>
                                    <th>Spots</th>
                                    <th>RSS</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {c.shows.map((s) => (
                                    <tr key={s.id}>
                                      <td>{s.show_title}</td>
                                      <td className={styles.right}>
                                        {formatCpm(s.cpm)}
                                      </td>
                                      <td className={styles.right}>
                                        {formatMoney(s.current_spend ?? 0)}
                                      </td>
                                      <td className={styles.right}>
                                        {(s.listen_count ?? 0).toLocaleString()}
                                      </td>
                                      <td className={styles.muted}>
                                        {s.brand_approval_status ?? "—"}
                                      </td>
                                      <td className={styles.muted}>
                                        {s.live_reads_enabled ? "✓" : "—"}
                                      </td>
                                      <td className={styles.muted}>
                                        {s.spots_enabled ? "✓" : "—"}
                                      </td>
                                      <td className={styles.muted}>
                                        {s.rss_enabled ? "✓" : "—"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

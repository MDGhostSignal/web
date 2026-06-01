"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [s, sh, l] = await Promise.all([
        fetch("/api/admin/art19/summary").then((r) => r.json()),
        fetch("/api/admin/art19/shows").then((r) => r.json()),
        fetch("/api/admin/art19/listens?range=30d").then((r) => r.json()),
      ]);
      if (s.ok) setSummary(s);
      if (sh.ok) setShows(sh.shows ?? []);
      if (l.ok)
        setListens({ total: l.total, hasData: l.hasData, range: l.range });
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
        title="ART19"
        subtitle="Amazon-owned podcast hosting + ad platform. Shows + episodes pulled daily from the ART19 REST API into Supabase; the dashboard always reads from cache."
        count={
          summary && (
            <Badge variant={hasError ? "danger" : isStale ? "warn" : "neutral"}>
              Synced {relativeTime(lastSync?.started_at)}
            </Badge>
          )
        }
      />

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
    </div>
  );
}

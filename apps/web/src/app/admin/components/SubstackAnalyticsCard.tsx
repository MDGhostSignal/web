"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  SubstackMetric,
  SubstackMetricsRow,
  SubstackRange,
} from "@/app/api/admin/substack-metrics/route";

import { SubstackMetricsModal } from "./SubstackMetricsModal";
import styles from "./SubstackAnalyticsCard.module.css";

type SeriesPoint = { day: string; value: number };

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      tableMissing: boolean;
      summary: number;
      delta: number;
      deltaPercent: number | null;
      series: SeriesPoint[];
      latest: {
        day: string;
        subscriber_count: number;
        views: number;
      } | null;
      lifetimeViews: number | null;
    };

const RANGES: { id: SubstackRange; label: string }[] = [
  { id: "30d", label: "30d" },
  { id: "90d", label: "90d" },
  { id: "all", label: "All time" },
];

function formatCompactCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDelta(n: number): string {
  if (n > 0) return `+${n.toLocaleString()}`;
  if (n < 0) return n.toLocaleString();
  return "0";
}

function formatPercent(n: number): string {
  const rounded = Number.isInteger(n) ? String(n) : n.toFixed(1);
  if (n > 0) return `+${rounded}%`;
  if (n < 0) return `${rounded}%`;
  return "0%";
}

function SimpleLineChart({ series }: { series: SeriesPoint[] }) {
  // Full-bleed plot: x-axis spans the entire SVG / container width.
  const width = 1000;
  const height = 148;
  const padL = 0;
  const padR = 0;
  const padT = 10;
  const padB = 22;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const values = series.map((p) => p.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);

  const points = series.map((p, i) => {
    const x =
      series.length === 1
        ? padL + plotW / 2
        : padL + (i / (series.length - 1)) * plotW;
    const y = padT + plotH - ((p.value - min) / span) * plotH;
    return { x, y };
  });

  const line = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area =
    points.length > 0
      ? `${padL},${padT + plotH} ${line} ${padL + plotW},${padT + plotH}`
      : "";

  const first = series[0]?.day;
  const last = series[series.length - 1]?.day;

  return (
    <div className={styles.chartInner}>
      <svg
        className={styles.chart}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Substack metric over time"
      >
        <line
          className={styles.axisLine}
          x1={padL}
          y1={padT + plotH}
          x2={padL + plotW}
          y2={padT + plotH}
        />
        {area && <polygon className={styles.plotArea} points={area} />}
        <polyline className={styles.plotLine} points={line} />
      </svg>
      <div className={styles.chartLabels}>
        <span>{first}</span>
        {last && last !== first ? <span>{last}</span> : <span />}
      </div>
    </div>
  );
}

export function SubstackAnalyticsCard() {
  const [metric, setMetric] = useState<SubstackMetric>("subscribers");
  const [range, setRange] = useState<SubstackRange>("30d");
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [modalOpen, setModalOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/substack-metrics?metric=${metric}&range=${range}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as {
          ok: boolean;
          tableMissing?: boolean;
          summary: number;
          delta: number;
          deltaPercent: number | null;
          series: SeriesPoint[];
          latest: {
            day: string;
            subscriber_count: number;
            views: number;
          } | null;
          lifetimeViews: number | null;
          error?: string;
        };
        if (!json.ok) throw new Error(json.error || "Failed to load");
        if (!cancelled) {
          setState({
            kind: "ready",
            tableMissing: Boolean(json.tableMissing),
            summary: json.summary,
            delta: json.delta,
            deltaPercent: json.deltaPercent,
            series: json.series ?? [],
            latest: json.latest,
            lifetimeViews: json.lifetimeViews,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            kind: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [metric, range, refresh]);

  const modalInitial: SubstackMetricsRow | null = useMemo(() => {
    if (state.kind !== "ready" || !state.latest) return null;
    return {
      id: state.latest.day,
      subscriber_count: state.latest.subscriber_count,
      total_views: state.lifetimeViews ?? state.latest.views,
      note: null,
      recorded_at: state.latest.day,
    };
  }, [state]);

  const summaryLabel =
    metric === "subscribers"
      ? "subscribers"
      : range === "all"
        ? "total views"
        : "views in period";

  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <div className={styles.brand}>
          <div className={styles.label}>Substack</div>
          <div className={styles.metricTabs} role="tablist" aria-label="Metric">
            <button
              type="button"
              role="tab"
              aria-selected={metric === "subscribers"}
              className={`${styles.metricTab} ${
                metric === "subscribers" ? styles.metricTabActive : ""
              }`}
              onClick={() => setMetric("subscribers")}
            >
              Subscribers
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={metric === "views"}
              className={`${styles.metricTab} ${
                metric === "views" ? styles.metricTabActive : ""
              }`}
              onClick={() => setMetric("views")}
            >
              Views
            </button>
          </div>
        </div>

        <div className={styles.rangeTabs} role="tablist" aria-label="Date range">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={range === r.id}
              className={`${styles.rangeTab} ${
                range === r.id ? styles.rangeTabActive : ""
              }`}
              onClick={() => setRange(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {state.kind === "loading" && (
        <div className={styles.skeleton} aria-hidden="true" />
      )}

      {state.kind === "error" && (
        <div className={styles.error}>{state.message}</div>
      )}

      {state.kind === "ready" && state.tableMissing && (
        <div className={styles.setupHint}>
          Run <code>docs/SUBSTACK_DAILY_SEED.sql</code> in Supabase to load the
          CSV history, then refresh.
        </div>
      )}

      {state.kind === "ready" && !state.tableMissing && (
        <>
          <div className={styles.summaryBlock}>
            <div className={styles.summaryRow}>
              <div className={styles.summaryValue}>
                {formatCompactCount(state.summary)}
              </div>
              {metric === "subscribers" ? (
                <div
                  className={`${styles.summaryDelta} ${
                    state.delta > 0
                      ? styles.deltaPositive
                      : styles.deltaNeutral
                  }`}
                >
                  <span>{formatDelta(state.delta)}</span>
                  {state.deltaPercent != null ? (
                    <span className={styles.summaryPercent}>
                      {formatPercent(state.deltaPercent)}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className={styles.summaryMeta}>{summaryLabel}</div>
          </div>

          {state.series.length > 0 ? (
            <div className={styles.chartWrap}>
              <SimpleLineChart series={state.series} />
            </div>
          ) : (
            <div className={styles.chartEmpty}>No points in this range yet.</div>
          )}
        </>
      )}

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={() => setModalOpen(true)}
          disabled={
            state.kind === "loading" ||
            (state.kind === "ready" && state.tableMissing)
          }
        >
          Update →
        </button>
        <a
          className={styles.actionLink}
          href="https://snowdriftghostsignal.substack.com"
          target="_blank"
          rel="noreferrer"
        >
          Open Substack
        </a>
      </div>

      {modalOpen && (
        <SubstackMetricsModal
          open={modalOpen}
          initial={modalInitial}
          viewsToday={
            state.kind === "ready" ? state.latest?.views ?? 0 : null
          }
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setRefresh((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}

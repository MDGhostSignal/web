"use client";

import { useEffect, useState } from "react";

import styles from "./XQSummaryCard.module.css";

type Props = {
  /** The Member's xq_submission_id. When null, the component renders
   *  nothing so the parent doesn't reserve empty space. */
  submissionId: string | null | undefined;
};

type XQSummary = {
  id: string;
  xq_code: string | null;
  xq_archetype_name: string | null;
  xq_archetype_tagline: string | null;
  axis_continuity_change: string | null;
  axis_person_system: string | null;
  axis_craft_leverage: string | null;
  non_negotiables_json: string[] | null;
  core_values_json: string[] | null;
  aspirational_values_json: string[] | null;
  background_values_json: string[] | null;
  submitted_at: string;
};

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; data: XQSummary }
  | { kind: "error"; message: string };

const AXIS_LABEL: Record<string, string> = {
  C: "Continuity / Craft",
  X: "Change",
  P: "Person",
  S: "System",
  L: "Leverage",
};

/**
 * Compact XQ summary card surfaced on the marketplace pool member
 * detail + the contacts expanded view. Fetches the linked submission
 * lazily when mounted (via the new GET /api/xq-submissions/:id
 * handler). Renders nothing when no linked submission exists.
 *
 * Self-contained: no callbacks, no shared state. Parent passes the
 * `xq_submission_id` from the Member row; component handles the rest.
 */
export function XQSummaryCard({ submissionId }: Props) {
  // Render-phase compare-and-set keeps state in lockstep with the
  // incoming `submissionId` prop without an effect+setState cascade
  // (which lint forbids). Same pattern useDraftSync uses elsewhere.
  const [state, setState] = useState<LoadState>(() =>
    submissionId ? { kind: "loading" } : { kind: "idle" },
  );
  const [lastSeenId, setLastSeenId] = useState<string | null | undefined>(
    submissionId,
  );
  if (submissionId !== lastSeenId) {
    setLastSeenId(submissionId);
    setState(submissionId ? { kind: "loading" } : { kind: "idle" });
  }

  useEffect(() => {
    if (!submissionId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/xq-submissions/${encodeURIComponent(submissionId)}`,
          { cache: "no-store" },
        );
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setState({
            kind: "error",
            message: data.error || `HTTP ${res.status}`,
          });
          return;
        }
        setState({ kind: "ready", data: data.submission as XQSummary });
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
  }, [submissionId]);

  if (!submissionId) return null;

  if (state.kind === "loading" || state.kind === "idle") {
    return (
      <section className={styles.card} aria-label="XQ summary">
        <div className={styles.tag}>XQ — Conviction Index</div>
        <div className={styles.skeleton}>Loading dossier…</div>
      </section>
    );
  }

  if (state.kind === "error") {
    return (
      <section className={styles.card} aria-label="XQ summary">
        <div className={styles.tag}>XQ — Conviction Index</div>
        <div className={styles.error}>Couldn&apos;t load XQ: {state.message}</div>
      </section>
    );
  }

  const d = state.data;
  const axes = [
    { label: "Continuity ↔ Change", letter: d.axis_continuity_change },
    { label: "Person ↔ System", letter: d.axis_person_system },
    { label: "Craft ↔ Leverage", letter: d.axis_craft_leverage },
  ];
  const nn = d.non_negotiables_json ?? [];
  const core = d.core_values_json ?? [];
  const asp = d.aspirational_values_json ?? [];

  return (
    <section className={styles.card} aria-label="XQ summary">
      <header className={styles.header}>
        <div>
          <div className={styles.tag}>XQ — Conviction Index</div>
          <h3 className={styles.name}>{d.xq_archetype_name ?? "—"}</h3>
          {d.xq_archetype_tagline && (
            <p className={styles.tagline}>
              &ldquo;{d.xq_archetype_tagline}&rdquo;
            </p>
          )}
        </div>
        {d.xq_code && <span className={styles.code}>{d.xq_code}</span>}
      </header>

      <div className={styles.axisStrip}>
        {axes.map((a) => (
          <div key={a.label} className={styles.axisCell}>
            <span className={styles.axisLabel}>{a.label}</span>
            <span className={styles.axisValue}>
              {a.letter ? AXIS_LABEL[a.letter] ?? a.letter : "—"}
            </span>
          </div>
        ))}
      </div>

      {(nn.length > 0 || core.length > 0 || asp.length > 0) && (
        <div className={styles.bucketsCompact}>
          {nn.length > 0 && (
            <BucketRow label="Non-negotiables" tint="nn" values={nn} />
          )}
          {core.length > 0 && (
            <BucketRow label="Core" tint="core" values={core} />
          )}
          {asp.length > 0 && (
            <BucketRow label="Aspirational" tint="asp" values={asp} />
          )}
        </div>
      )}

      <div className={styles.meta}>
        Submitted {new Date(d.submitted_at).toLocaleDateString()}
      </div>
    </section>
  );
}

function BucketRow({
  label,
  tint,
  values,
}: {
  label: string;
  tint: "nn" | "core" | "asp";
  values: string[];
}) {
  return (
    <div className={styles.bucketRow}>
      <span className={`${styles.bucketLabel} ${styles[`bucketLabel_${tint}`]}`}>
        {label}
      </span>
      <div>
        {values.map((v) => (
          <span key={v} className={`${styles.tagPill} ${styles[`tagPill_${tint}`]}`}>
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

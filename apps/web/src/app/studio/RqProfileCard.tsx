"use client";

import { RQResultsGraph } from "@/components/rq/RQResultsGraph";
import type { RQResult } from "@/lib/rq/scoring";
import type { StudioRqSummary } from "@/lib/studio-data";

import styles from "./RqProfileCard.module.css";

/** Dashboard RQ profile — mirrors the post-quiz reveal: the
 *  RQResultsGraph radar / axis-bar visualization + three axis
 *  summary blocks (letter + score + brief). Empty state nudges
 *  the user to take the RQ. */
export function RqProfileCard({
  summary,
  fallbackCode,
}: {
  summary: StudioRqSummary | null;
  fallbackCode: string | null;
}) {
  if (!summary && !fallbackCode) {
    return (
      <div className={styles.card}>
        <div className={styles.tag}>RQ · Resonance Quotient</div>
        <p className={styles.empty}>
          You haven&apos;t taken the RQ yet. It reads how your brand or
          show actually lands — clarity, authenticity, undertone.{" "}
          <a href="/rq-quiz">Take the RQ →</a>
        </p>
      </div>
    );
  }

  const code = summary?.code ?? fallbackCode;
  const hasGraphData =
    summary &&
    summary.details.values &&
    summary.details.authenticity &&
    summary.details.horizon;

  return (
    <div className={styles.card}>
      <div className={styles.tag}>RQ · Resonance Quotient</div>

      <div className={styles.hero}>
        <div className={styles.codeChip}>{code ?? "—"}</div>
        {summary?.name && (
          <h4 className={styles.archetypeName}>{summary.name}</h4>
        )}
      </div>

      {summary?.clarityLabel && (
        <div className={styles.clarity}>
          <span className={styles.clarityLabel}>Signal clarity</span>
          <span
            className={`${styles.clarityBadge} ${
              styles[`clarity_${summary.clarityLabel.toLowerCase()}`] ?? ""
            }`}
          >
            {summary.clarityLabel}
          </span>
          {summary.clarityNote && (
            <p className={styles.clarityNote}>{summary.clarityNote}</p>
          )}
        </div>
      )}

      {hasGraphData ? (
        <div className={styles.graphFrame}>
          <RQResultsGraph result={summaryToRqResult(summary)} />
        </div>
      ) : (
        summary && (
          <p className={styles.hint}>
            We don&apos;t have your full RQ dossier on file —{" "}
            <a href="/rq-quiz">re-take the RQ</a> to surface the axis
            graph + per-axis breakdown.
          </p>
        )
      )}

      {summary?.undertone && (
        <div className={styles.row}>
          <span className={styles.rowLabel}>Undertone</span>
          <span className={styles.rowValue}>{summary.undertone}</span>
        </div>
      )}
    </div>
  );
}

/** Reshape the loaded summary into the RQResult shape RQResultsGraph
 *  expects. Caller must have verified `hasGraphData` first. */
function summaryToRqResult(summary: StudioRqSummary): RQResult {
  return {
    rq: summary.code ?? "",
    rqName: summary.name ?? "",
    details: {
      values: summary.details.values!,
      authenticity: summary.details.authenticity!,
      horizon: summary.details.horizon!,
    },
    profile: {
      values: summary.profile.values ?? "",
      authenticity: summary.profile.authenticity ?? "",
      horizon: summary.profile.horizon ?? "",
    },
  };
}

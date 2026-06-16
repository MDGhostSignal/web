"use client";

import type { StudioRqSummary } from "@/lib/studio-data";

import styles from "./RqProfileCard.module.css";

/** Dashboard RQ profile — compact reveal-style card. Replaces the
 *  heavy full RQResultsGraph from the quiz reveal with three slim
 *  axis bars + native <details> for the per-axis prose. Empty state
 *  nudges the user to take the RQ. */
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
  const hasAxes =
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
        {summary?.clarityLabel && (
          <span
            className={`${styles.clarityBadge} ${
              styles[`clarity_${summary.clarityLabel.toLowerCase()}`] ?? ""
            }`}
          >
            {summary.clarityLabel} signal
          </span>
        )}
      </div>

      {summary?.clarityNote && (
        <p className={styles.clarityNote}>{summary.clarityNote}</p>
      )}

      {hasAxes ? (
        <div className={styles.axes}>
          <AxisRow
            label="Values"
            leftLetter="F"
            leftName="Formative"
            rightLetter="I"
            rightName="Implicit"
            detail={summary.details.values!}
            profile={summary.profile.values}
          />
          <AxisRow
            label="Authenticity"
            leftLetter="R"
            leftName="Relational"
            rightLetter="S"
            rightName="Structural"
            detail={summary.details.authenticity!}
            profile={summary.profile.authenticity}
          />
          <AxisRow
            label="Horizon"
            leftLetter="L"
            leftName="Long-Arc"
            rightLetter="C"
            rightName="Catalytic"
            detail={summary.details.horizon!}
            profile={summary.profile.horizon}
          />
        </div>
      ) : (
        summary && (
          <p className={styles.hint}>
            We don&apos;t have your full RQ dossier on file —{" "}
            <a href="/rq-quiz">re-take the RQ</a> to surface the axis
            breakdown.
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

/** A single axis line — letter+score badge, an inline bar showing
 *  position 1–10, and a native <details> that reveals the prose
 *  profile without forcing it into the always-visible card height. */
function AxisRow({
  label,
  leftLetter,
  leftName,
  rightLetter,
  rightName,
  detail,
  profile,
}: {
  label: string;
  leftLetter: string;
  leftName: string;
  rightLetter: string;
  rightName: string;
  detail: { letter: string; score: number; band: string };
  profile: string | null;
}) {
  // Position on the 1–10 scale, with 5 at center (50%).
  const position =
    detail.score <= 5
      ? ((detail.score - 1) / 4) * 50
      : 50 + ((detail.score - 5) / 5) * 50;
  const isLeft = detail.letter === leftLetter;
  const bandTint =
    detail.score <= 3
      ? "light"
      : detail.score <= 6
        ? "balanced"
        : "strong";

  return (
    <details className={styles.axisDetails}>
      <summary className={styles.axisSummary}>
        <div className={styles.axisHeader}>
          <span className={styles.axisLabel}>{label}</span>
          <span
            className={`${styles.axisBadge} ${
              styles[`axisBadge_${bandTint}`]
            }`}
          >
            {detail.letter} · {detail.score}
          </span>
        </div>
        <div className={styles.axisBar}>
          <span
            className={`${styles.axisLeftLabel} ${
              isLeft ? styles.axisActive : ""
            }`}
          >
            {leftName}
          </span>
          <div className={styles.axisTrack}>
            <span className={styles.axisCenter} />
            <span
              className={styles.axisDot}
              style={{ left: `${position}%` }}
            />
          </div>
          <span
            className={`${styles.axisRightLabel} ${
              !isLeft ? styles.axisActive : ""
            }`}
          >
            {rightName}
          </span>
        </div>
      </summary>
      {profile && (
        <p className={styles.axisProfile}>
          As {isLeft ? leftName : rightName}, {profile}
        </p>
      )}
    </details>
  );
}

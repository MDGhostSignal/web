import { XQCharacter3D } from "@/components/xq/XQCharacter3D";
import { CHARACTERS } from "@/lib/xq/characters";
import type { ArchetypeCode } from "@/lib/xq/constants";
import type { StudioXqSummary } from "@/lib/studio-data";

import styles from "./XqProfileCard.module.css";

/** Dashboard XQ profile — mirrors the post-quiz reveal: 3D portrait,
 *  archetype name + tagline, three value-bucket rows (non-negotiables /
 *  core / aspirational) all themed to the archetype's accent color.
 *  Empty state nudges the user to take the quiz. */
export function XqProfileCard({
  summary,
  fallbackCode,
}: {
  summary: StudioXqSummary | null;
  fallbackCode: string | null;
}) {
  if (!summary && !fallbackCode) {
    return (
      <div className={styles.card}>
        <div className={styles.tag}>XQ · Conviction Quotient</div>
        <p className={styles.empty}>
          You haven&apos;t taken the XQ yet. It surfaces your values DNA
          and powers the matching engine — under 5 minutes.{" "}
          <a href="/xq-quiz">Take the XQ →</a>
        </p>
      </div>
    );
  }

  const code = (summary?.code ?? fallbackCode) as ArchetypeCode | null;
  const identity = code ? CHARACTERS[code] : undefined;
  const accent = identity?.accent ?? "#7c58d6";
  const accentSoft = identity?.accentSoft ?? "rgba(124, 88, 214, 0.18)";

  // CSS variables let the bucket chips, eyebrows, and code chip pick
  // up the archetype's color without per-archetype class names.
  const themeVars = {
    "--xq-accent": accent,
    "--xq-accent-soft": accentSoft,
  } as React.CSSProperties;

  return (
    <div className={styles.card} style={themeVars}>
      <div className={styles.tag}>XQ · Conviction Quotient</div>

      <div className={styles.hero}>
        {code && (
          <div className={styles.portrait}>
            <XQCharacter3D code={code} />
          </div>
        )}
        <div className={styles.heroText}>
          <div className={styles.codeChip}>{code ?? "—"}</div>
          {summary?.archetypeName && (
            <h4 className={styles.archetypeName}>{summary.archetypeName}</h4>
          )}
          {summary?.tagline && (
            <p className={styles.tagline}>&ldquo;{summary.tagline}&rdquo;</p>
          )}
        </div>
      </div>

      {summary &&
      (summary.values.nonNegotiables.length > 0 ||
        summary.values.core.length > 0 ||
        summary.values.aspirational.length > 0) ? (
        <div className={styles.values}>
          {summary.values.nonNegotiables.length > 0 && (
            <ValueRow
              label="Non-negotiables"
              tint="nn"
              items={summary.values.nonNegotiables}
            />
          )}
          {summary.values.core.length > 0 && (
            <ValueRow label="Core" tint="core" items={summary.values.core} />
          )}
          {summary.values.aspirational.length > 0 && (
            <ValueRow
              label="Aspirational"
              tint="asp"
              items={summary.values.aspirational}
            />
          )}
        </div>
      ) : (
        !summary &&
        fallbackCode && (
          <p className={styles.hint}>
            Your archetype is set, but we don&apos;t have your full XQ
            dossier on file. <a href="/xq-quiz">Re-take the XQ</a> to
            surface your value chips.
          </p>
        )
      )}
    </div>
  );
}

function ValueRow({
  label,
  tint,
  items,
}: {
  label: string;
  tint: "nn" | "core" | "asp";
  items: string[];
}) {
  return (
    <div className={styles.valueRow}>
      <span className={styles.valueLabel}>{label}</span>
      <div className={styles.valuePills}>
        {items.map((v) => (
          <span
            key={v}
            className={`${styles.valuePill} ${styles[`valuePill_${tint}`]}`}
          >
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

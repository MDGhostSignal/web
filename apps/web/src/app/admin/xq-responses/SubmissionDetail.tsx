"use client";

import styles from "./xq-responses.module.css";

/** Local shape — only what we actually read off the row in the
 *  detail panel. Keeps the component decoupled from the upstream
 *  XQSubmissionRow type so this file can move/test independently. */
export type XQSubmissionLite = {
  id: string;
  submitted_at: string;
  status: "incomplete" | "complete" | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  organization: string | null;
  role: string | null;
  industry: string | null;
  website: string | null;
  participant_type: string | null;
  xq_code: string | null;
  xq_archetype_name: string | null;
  xq_archetype_tagline: string | null;
  axis_continuity_change: string | null;
  axis_person_system: string | null;
  axis_craft_leverage: string | null;
  profile_json: unknown;
  details_json: unknown;
  non_negotiables_json: string[] | null;
  core_values_json: string[] | null;
  aspirational_values_json: string[] | null;
  background_values_json: string[] | null;
  answers_json: Record<string, unknown> | null;
};

type Props = {
  submission: XQSubmissionLite;
};

const AXIS_LABEL: Record<string, string> = {
  C: "Continuity / Craft",
  X: "Change",
  P: "Person",
  S: "System",
  L: "Leverage",
};

/**
 * Detail panel for one XQ submission — renders inside the DataTable's
 * expanded row. Mirrors what the user sees on their results screen but
 * with admin-side metadata (raw axis letters, submission timestamp).
 */
export function SubmissionDetail({ submission }: Props) {
  const profile =
    typeof submission.profile_json === "string"
      ? submission.profile_json
      : "";
  const buckets = {
    nn: submission.non_negotiables_json ?? [],
    core: submission.core_values_json ?? [],
    asp: submission.aspirational_values_json ?? [],
    bg: submission.background_values_json ?? [],
  };

  const axisCells: Array<{ label: string; letter: string | null }> = [
    {
      label: "Continuity ↔ Change",
      letter: submission.axis_continuity_change,
    },
    { label: "Person ↔ System", letter: submission.axis_person_system },
    { label: "Craft ↔ Leverage", letter: submission.axis_craft_leverage },
  ];

  return (
    <div className={styles.detailWrap}>
      <section className={styles.archHero}>
        <div className={styles.archTag}>Archetype</div>
        <h3 className={styles.archName}>
          {submission.xq_archetype_name ?? "—"}
        </h3>
        {submission.xq_archetype_tagline && (
          <p className={styles.archTagline}>
            &ldquo;{submission.xq_archetype_tagline}&rdquo;
          </p>
        )}
        {submission.xq_code && (
          <div className={styles.archCode}>{submission.xq_code}</div>
        )}
      </section>

      {profile && <p className={styles.archDesc}>{profile}</p>}

      <div className={styles.axisStrip}>
        {axisCells.map((a) => (
          <div key={a.label} className={styles.axisCell}>
            <span className={styles.axisCellLabel}>{a.label}</span>
            <span className={styles.axisCellValue}>
              {a.letter ? `${a.letter} — ${AXIS_LABEL[a.letter] ?? a.letter}` : "—"}
            </span>
          </div>
        ))}
      </div>

      <h4 className={styles.sectionTitle}>Conviction Dossier</h4>

      <Bucket label="🔴 Non-Negotiable Guardrails" tint="nn" values={buckets.nn} />
      <Bucket label="🔹 Core Operating Framework" tint="core" values={buckets.core} />
      <Bucket label="🔮 Aspirational Horizons" tint="asp" values={buckets.asp} />
      <Bucket label="💡 Background Context Nuances" tint="bg" values={buckets.bg} />

      <div className={styles.metaGrid}>
        <Meta label="Submitted">
          {new Date(submission.submitted_at).toLocaleString()}
        </Meta>
        <Meta label="Role">{submission.role || "—"}</Meta>
        <Meta label="Industry">{submission.industry || "—"}</Meta>
        <Meta label="Website">
          {submission.website ? (
            <a
              href={submission.website}
              target="_blank"
              rel="noopener noreferrer"
            >
              {submission.website}
            </a>
          ) : (
            "—"
          )}
        </Meta>
      </div>
    </div>
  );
}

function Bucket({
  label,
  tint,
  values,
}: {
  label: string;
  tint: "nn" | "core" | "asp" | "bg";
  values: string[];
}) {
  return (
    <div className={styles.bucket}>
      <span className={`${styles.bucketLabel} ${styles[`bucketLabel_${tint}`]}`}>
        {label}
      </span>
      <div>
        {values.length === 0 ? (
          <span className={styles.bucketEmpty}>—</span>
        ) : (
          values.map((v) => (
            <span
              key={v}
              className={`${styles.tag} ${styles[`tag_${tint}`]}`}
            >
              {v}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.metaCell}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{children}</span>
    </div>
  );
}

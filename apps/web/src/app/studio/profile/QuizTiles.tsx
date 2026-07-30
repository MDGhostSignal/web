import Link from "next/link";

import { CHARACTERS } from "@/lib/xq/characters";
import type { ArchetypeCode } from "@/lib/xq/constants";
import type { StudioRqSummary, StudioXqSummary } from "@/lib/studio-data";

import styles from "../studio.module.css";
import welcomeStyles from "../welcome/welcome.module.css";

/**
 * XQ / RQ status tiles on /studio/profile.
 *
 * Until the member completes an assessment, its tile is a persistent
 * (non-dismissible) call to action — it renders on every visit until
 * a submission exists. Once completed, the tile flips to a compact
 * summary of their result.
 */

export function XqTile({ summary }: { summary: StudioXqSummary | null }) {
  const done = summary?.code != null;
  if (!done) {
    return (
      <TodoTile
        title="Fill out your XQ"
        body="Three minutes. The Values Blueprint maps your conviction across eight archetypes — it's how the network reads you."
        href="/xq-quiz"
        cta="Take the XQ"
      />
    );
  }

  const identity = CHARACTERS[summary.code as ArchetypeCode] ?? null;
  const nonNeg = summary.values.nonNegotiables.slice(0, 3);
  return (
    <section
      className={styles.quizTile}
      style={
        {
          "--bp-accent": identity?.accent ?? "var(--studio-accent)",
          "--bp-accent-soft":
            identity?.accentSoft ?? "var(--studio-accent-soft)",
        } as React.CSSProperties
      }
      aria-label="Your XQ result"
    >
      <span className={styles.quizTileEyebrow}>Your XQ</span>
      <div className={styles.quizTileHead}>
        <span className={styles.quizChip}>{summary.code}</span>
        <span className={styles.quizTileTitle}>
          {summary.archetypeName ?? "Classified"}
        </span>
      </div>
      {summary.tagline && (
        <p className={styles.quizTileBody}>{summary.tagline}</p>
      )}
      {nonNeg.length > 0 && (
        <div className={styles.quizPills}>
          {nonNeg.map((v) => (
            <span key={v} className={styles.quizPill}>
              {v}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

export function RqTile({ summary }: { summary: StudioRqSummary | null }) {
  const done = summary?.code != null;
  if (!done) {
    return (
      <TodoTile
        title="Fill out your RQ"
        body="The Resonance Quotient turns your blueprint into partner matches — it's the matching engine's other half."
        href="/rq-quiz"
        cta="Take the RQ"
      />
    );
  }

  return (
    <section className={styles.quizTile} aria-label="Your RQ result">
      <span className={styles.quizTileEyebrow}>Your RQ</span>
      <div className={styles.quizTileHead}>
        <span className={styles.quizChip}>{summary.code}</span>
        <span className={styles.quizTileTitle}>{summary.name ?? "Read"}</span>
      </div>
      {summary.clarityLabel && (
        <span className={styles.quizClarity}>
          Signal clarity: {summary.clarityLabel}
        </span>
      )}
      {summary.undertone && (
        <p className={styles.quizTileBody}>Undertone: {summary.undertone}</p>
      )}
      {summary.clarityNote && (
        <p className={styles.quizTileBody}>{summary.clarityNote}</p>
      )}
    </section>
  );
}

/** Not-done state — same visual language as the /studio/welcome
 *  splash quiz tiles (shared welcome.module.css classes), so the
 *  reminder looks identical wherever the member meets it. */
function TodoTile({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <section className={welcomeStyles.quizTile} aria-label={title}>
      <h3 className={welcomeStyles.quizTileName}>{title}</h3>
      <p className={welcomeStyles.quizTileBlurb}>{body}</p>
      <Link href={href} className={welcomeStyles.quizTileCta}>
        {cta} →
      </Link>
    </section>
  );
}

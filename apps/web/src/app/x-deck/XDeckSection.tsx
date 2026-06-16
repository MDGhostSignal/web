"use client";

import { useMemo, useState } from "react";

import { scoreAndRank } from "@/lib/match/compatibility";
import type { MatchCandidate, ViewerProfile } from "@/lib/match/types";

import { MatchCardDetail } from "./MatchCardDetail";
import { MatchDeck } from "./MatchDeck";
import { ThumbnailRail } from "./ThumbnailRail";
import styles from "./x-deck.module.css";

type Props = {
  viewer: ViewerProfile;
  candidates: MatchCandidate[];
  /** Small monospace eyebrow above the title. Optional. */
  eyebrow?: string;
  /** Section title shown above the deck. Defaults to a count-based
   *  string ("N creators ranked by conviction fit"). */
  title?: string;
  /** When true, hide the long ThumbnailRail navigation strip. The
   *  active-card MatchCardDetail panel underneath the deck still
   *  renders — it's the per-card summary + connect CTA that pairs
   *  with whichever card is centered. Used by the Studio marketplace
   *  surface, where the long secondary candidate list was redundant
   *  but the per-card detail is the thing that drives action. */
  compact?: boolean;
};

/**
 * Reusable deck block — coverflow + thumbnail rail + active-card detail
 * panel. Shared between the standalone /x-deck page and the embedded
 * X-Deck section on the XQ quiz results screen.
 *
 * Hero callouts (the "you are ___" intro) are NOT included here; the
 * surrounding context owns that. On /x-deck the page-level HeroCallout
 * runs above this; on the results screen the persona reveal stage
 * already serves the same purpose.
 */
export function XDeckSection({
  viewer,
  candidates,
  eyebrow,
  title,
  compact = false,
}: Props) {
  const ranked = useMemo(
    () => scoreAndRank(viewer, candidates),
    [viewer, candidates],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const active = ranked[activeIndex];

  const resolvedTitle =
    title ??
    `${ranked.length} ${viewer.memberType === "brand" ? "creators" : "brands"} ranked by conviction fit`;

  return (
    <section className={styles.section} aria-label="Your matched deck">
      {eyebrow && <p className={styles.deckSectionEyebrow}>{eyebrow}</p>}
      <h2 className={styles.deckSectionTitle}>{resolvedTitle}</h2>

      <MatchDeck
        ranked={ranked}
        activeIndex={activeIndex}
        onChange={setActiveIndex}
      />

      {!compact && (
        <ThumbnailRail
          candidates={ranked.map((r) => r.candidate)}
          activeIndex={activeIndex}
          onSelect={setActiveIndex}
        />
      )}

      <p className={styles.keyHint}>
        <kbd>←</kbd> <kbd>→</kbd> navigate · click any card to center
      </p>

      {active && (
        <MatchCardDetail
          candidate={active.candidate}
          compatibility={active.compatibility}
          viewer={viewer}
        />
      )}
    </section>
  );
}

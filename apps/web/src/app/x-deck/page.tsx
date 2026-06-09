"use client";

import { useMemo, useState } from "react";

import { scoreAndRank } from "@/lib/match/compatibility";
import { MOCK_CANDIDATES, MOCK_VIEWER } from "@/lib/match/fixtures";

import { HeroCallout } from "./HeroCallout";
import { MatchCard } from "./MatchCard";
import { MatchCardDetail } from "./MatchCardDetail";
import { MatchDeck } from "./MatchDeck";
import { ThumbnailRail } from "./ThumbnailRail";
import styles from "./x-deck.module.css";

// Silence unused-import warning — MatchCard is consumed via MatchDeck.
void MatchCard;

/**
 * /x-deck — trading-card preview surface.
 *
 * Standalone page for iterating on the deck UI before wiring it to
 * the XQ quiz results screen. Pulls a mocked viewer + candidate list
 * from `@/lib/match/fixtures`, scores via `scoreAndRank`, and renders
 * a Coverflow deck above a detail panel.
 */
export default function XDeckPage() {
  const ranked = useMemo(
    () => scoreAndRank(MOCK_VIEWER, MOCK_CANDIDATES),
    [],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const active = ranked[activeIndex];

  return (
    <main className={styles.page}>
      <HeroCallout viewer={MOCK_VIEWER} />

      <p className={styles.deckSectionEyebrow}>Your matched deck</p>
      <h2 className={styles.deckSectionTitle}>
        {ranked.length} creators ranked by conviction fit
      </h2>

      <MatchDeck
        ranked={ranked}
        activeIndex={activeIndex}
        onChange={setActiveIndex}
      />

      <ThumbnailRail
        candidates={ranked.map((r) => r.candidate)}
        activeIndex={activeIndex}
        onSelect={setActiveIndex}
      />

      <p className={styles.keyHint}>
        <kbd>←</kbd> <kbd>→</kbd> navigate · click any card to center
      </p>

      {active && (
        <MatchCardDetail
          candidate={active.candidate}
          compatibility={active.compatibility}
          viewer={MOCK_VIEWER}
        />
      )}
    </main>
  );
}

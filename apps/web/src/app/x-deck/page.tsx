"use client";

import { MOCK_CANDIDATES, MOCK_VIEWER } from "@/lib/match/fixtures";

import { HeroCallout } from "./HeroCallout";
import { XDeckSection } from "./XDeckSection";
import styles from "./x-deck.module.css";

/**
 * /x-deck — trading-card preview surface.
 *
 * Standalone page for iterating on the deck UI. Pulls a mocked viewer +
 * candidate list from `@/lib/match/fixtures` and hands them to
 * `XDeckSection`. The same section component is embedded into the XQ
 * quiz results screen so production users see their personalised deck
 * immediately after the persona reveal.
 */
export default function XDeckPage() {
  return (
    <main className={styles.page}>
      <HeroCallout viewer={MOCK_VIEWER} />
      <XDeckSection
        viewer={MOCK_VIEWER}
        candidates={MOCK_CANDIDATES}
        eyebrow="Your matched deck"
      />
    </main>
  );
}

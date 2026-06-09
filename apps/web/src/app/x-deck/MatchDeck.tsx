"use client";

import { useCallback, useEffect } from "react";

import type { Compatibility, MatchCandidate } from "@/lib/match/types";

import { MatchCard } from "./MatchCard";
import styles from "./x-deck.module.css";

type RankedCandidate = {
  candidate: MatchCandidate;
  compatibility: Compatibility;
};

type Props = {
  ranked: RankedCandidate[];
  activeIndex: number;
  onChange: (next: number) => void;
};

/** Compute the shortest signed offset around a circular deck. */
function shortestOffset(cardIdx: number, activeIdx: number, total: number) {
  let offset = cardIdx - activeIdx;
  if (offset > total / 2) offset -= total;
  if (offset < -total / 2) offset += total;
  return offset;
}

/**
 * Coverflow-style carousel — active card centered, ±1 and ±2 peek
 * with perspective tilt + scale, the rest stack offstage. Wraparound
 * is handled by `shortestOffset` so left-arrow at index 0 cycles to
 * the last card cleanly.
 */
export function MatchDeck({ ranked, activeIndex, onChange }: Props) {
  const total = ranked.length;

  const next = useCallback(() => {
    onChange((activeIndex + 1) % total);
  }, [activeIndex, total, onChange]);
  const prev = useCallback(() => {
    onChange((activeIndex - 1 + total) % total);
  }, [activeIndex, total, onChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  return (
    <div className={styles.deckStage} aria-roledescription="carousel">
      <div className={styles.deckStageInner}>
        {ranked.map((entry, idx) => {
          const offset = shortestOffset(idx, activeIndex, total);
          const position =
            offset === 0
              ? 0
              : offset === -1
                ? -1
                : offset === 1
                  ? 1
                  : offset === -2
                    ? -2
                    : offset === 2
                      ? 2
                      : "offstage";
          return (
            <MatchCard
              key={entry.candidate.id}
              candidate={entry.candidate}
              compatibility={entry.compatibility}
              position={position}
              cardNumber={idx + 1}
              total={total}
              onSelect={() => onChange(idx)}
            />
          );
        })}
      </div>
    </div>
  );
}

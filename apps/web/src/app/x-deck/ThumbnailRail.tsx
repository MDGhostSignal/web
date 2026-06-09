"use client";

import { CHARACTERS } from "@/lib/xq/characters";
import type { MatchCandidate } from "@/lib/match/types";

import styles from "./x-deck.module.css";

type Props = {
  candidates: MatchCandidate[];
  activeIndex: number;
  onSelect: (i: number) => void;
};

/** Compact bottom rail — one chip per card in deck order, accent-tinted
 *  on the currently-active card so the user has a quick-jump nav. */
export function ThumbnailRail({ candidates, activeIndex, onSelect }: Props) {
  return (
    <div className={styles.thumbRail} role="tablist" aria-label="Match deck navigation">
      {candidates.map((c, i) => {
        const identity = CHARACTERS[c.archetype];
        const isActive = i === activeIndex;
        return (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(i)}
            className={`${styles.thumb} ${isActive ? styles.thumbActive : ""}`}
            style={
              isActive
                ? {
                    ["--card-accent" as string]: identity.accent,
                    ["--card-accent-soft" as string]: identity.accentSoft,
                  }
                : undefined
            }
          >
            {String(i + 1).padStart(2, "0")} · {c.name.split(" ")[0]}
          </button>
        );
      })}
    </div>
  );
}

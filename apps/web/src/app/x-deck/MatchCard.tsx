"use client";

import { CHARACTERS } from "@/lib/xq/characters";
import { ARCHETYPES } from "@/lib/xq/constants";
import type { Compatibility, MatchCandidate } from "@/lib/match/types";

import styles from "./x-deck.module.css";

type Position = -2 | -1 | 0 | 1 | 2 | "offstage";

type Props = {
  candidate: MatchCandidate;
  compatibility: Compatibility;
  /** Slot in the Coverflow: 0 = active center, ±1 = peeking adjacent,
   *  ±2 = far peek, "offstage" = hidden in the stack. */
  position: Position;
  cardNumber: number;
  total: number;
  onSelect: () => void;
};

const RING_RADIUS = 28;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

/** Coverflow transform per position. Tweaking these tunes the
 *  cinematic feel of the deck. */
function transformForPosition(position: Position) {
  switch (position) {
    case 0:
      return {
        transform: "translateX(0%) scale(1) rotateY(0deg)",
        opacity: 1,
        filter: "brightness(1)",
        zIndex: 30,
      };
    case -1:
      return {
        transform: "translateX(-62%) scale(0.78) rotateY(28deg)",
        opacity: 0.86,
        filter: "brightness(0.82)",
        zIndex: 20,
      };
    case 1:
      return {
        transform: "translateX(62%) scale(0.78) rotateY(-28deg)",
        opacity: 0.86,
        filter: "brightness(0.82)",
        zIndex: 20,
      };
    case -2:
      return {
        transform: "translateX(-105%) scale(0.6) rotateY(42deg)",
        opacity: 0.4,
        filter: "brightness(0.65)",
        zIndex: 10,
      };
    case 2:
      return {
        transform: "translateX(105%) scale(0.6) rotateY(-42deg)",
        opacity: 0.4,
        filter: "brightness(0.65)",
        zIndex: 10,
      };
    default:
      return {
        transform: "translateX(0%) scale(0.4) rotateY(0deg)",
        opacity: 0,
        filter: "brightness(0.5)",
        zIndex: 0,
        pointerEvents: "none" as const,
      };
  }
}

export function MatchCard({
  candidate,
  compatibility,
  position,
  cardNumber,
  total,
  onSelect,
}: Props) {
  const identity = CHARACTERS[candidate.archetype];
  const archetype = ARCHETYPES[candidate.archetype];
  const isActive = position === 0;
  const t = transformForPosition(position);

  // Stroke-dashoffset for the gauge ring — animate only on active card
  // so the gauge "fills" cinematically when a card centers.
  const ringOffset = isActive
    ? RING_CIRC * (1 - compatibility.score / 100)
    : RING_CIRC;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`${styles.card} ${isActive ? styles.cardActive : ""}`}
      style={{
        ...t,
        ["--card-accent" as string]: identity.accent,
        ["--card-accent-soft" as string]: identity.accentSoft,
      }}
      aria-label={`${candidate.name}, ${archetype.name}, compatibility ${compatibility.score}%`}
      aria-pressed={isActive}
      tabIndex={isActive ? 0 : -1}
    >
      <div className={styles.cardInner}>
        <div className={styles.cardTopBanner}>
          <div>
            <span className={styles.cardArchetype}>{archetype.name}</span>
            <span className={styles.cardArchetypeCode}>{candidate.archetype}</span>
          </div>
          <div className={styles.cardNumber}>
            {String(cardNumber).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </div>
        </div>

        <div className={styles.cardPortrait}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={candidate.imageUrl}
            alt={`${candidate.name}, ${candidate.organization}`}
            className={styles.cardPortraitImg}
            loading={isActive ? "eager" : "lazy"}
            draggable={false}
          />
          <div className={styles.cardPortraitGlow} aria-hidden="true" />
        </div>

        <div className={styles.cardIdentity}>
          <span className={styles.cardMemberChip}>{candidate.memberType}</span>
          <div className={styles.cardName}>{candidate.name}</div>
          <div className={styles.cardRoleLine}>
            {candidate.role} &middot; {candidate.organization}
          </div>
        </div>

        <div className={styles.cardPitch}>{candidate.pitch}</div>

        <div className={styles.cardGaugeWrap}>
          <div className={styles.cardGauge}>
            <svg viewBox="0 0 70 70" width="70" height="70" aria-hidden="true">
              <circle
                cx="35"
                cy="35"
                r={RING_RADIUS}
                fill="none"
                strokeWidth="5"
                className={styles.cardGaugeRingBg}
              />
              <circle
                cx="35"
                cy="35"
                r={RING_RADIUS}
                fill="none"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={RING_CIRC}
                strokeDashoffset={ringOffset}
                transform="rotate(-90 35 35)"
                className={styles.cardGaugeRingFg}
              />
            </svg>
            <div className={styles.cardGaugeNumber}>{compatibility.score}</div>
          </div>
          <div className={styles.cardGaugeLabel}>
            <strong>Compatibility</strong>
            {compatibility.sharedNonNegotiables.length > 0 && (
              <>
                {compatibility.sharedNonNegotiables.length} shared
                <br />
                non-negotiable
                {compatibility.sharedNonNegotiables.length === 1 ? "" : "s"}
              </>
            )}
          </div>
        </div>

        <div className={styles.cardFooter}>
          <span>
            {candidate.rarity === "founding" && (
              <span className={styles.cardRarityFounding}>◆ Founding</span>
            )}
            {candidate.rarity === "featured" && (
              <span className={styles.cardRarityFeatured}>◇ Featured</span>
            )}
            {!candidate.rarity && <span>&nbsp;</span>}
          </span>
          <span>
            {compatibility.axisAlignment >= 75
              ? "Tight axis fit"
              : compatibility.axisAlignment >= 55
                ? "Moderate axis fit"
                : "Loose axis fit"}
          </span>
        </div>
      </div>
    </button>
  );
}

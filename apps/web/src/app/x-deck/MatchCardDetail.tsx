"use client";

import { CHARACTERS } from "@/lib/xq/characters";
import { ARCHETYPES } from "@/lib/xq/constants";
import type {
  Compatibility,
  MatchCandidate,
  ViewerProfile,
} from "@/lib/match/types";

import styles from "./x-deck.module.css";

type Props = {
  candidate: MatchCandidate;
  compatibility: Compatibility;
  viewer: ViewerProfile;
  /** When true, the connect CTAs render as disabled buttons — used
   *  on public marketing surfaces where the deck is a preview, not a
   *  real action surface. */
  previewMode?: boolean;
};

type AxisRowProps = {
  leftLabel: string;
  rightLabel: string;
  /** Value in [-1, +1]; -1 anchors to left, +1 to right. */
  value: number;
};

/** Single axis row in the detail panel — left label, track, right label. */
function AxisRow({ leftLabel, rightLabel, value }: AxisRowProps) {
  // Map [-1, +1] → [0%, 100%] for absolute positioning along the track
  const pct = ((value + 1) / 2) * 100;
  return (
    <div className={styles.axisRow}>
      <span className={styles.axisLabelLeft}>{leftLabel}</span>
      <div className={styles.axisTrack}>
        <div className={styles.axisTrackMid} />
        <div className={styles.axisDot} style={{ left: `${pct}%` }} />
      </div>
      <span>{rightLabel}</span>
    </div>
  );
}

export function MatchCardDetail({
  candidate,
  compatibility,
  viewer,
  previewMode = false,
}: Props) {
  const identity = CHARACTERS[candidate.archetype];
  const archetype = ARCHETYPES[candidate.archetype];
  const sharedSet = new Set(compatibility.sharedNonNegotiables);
  return (
    <section
      className={styles.detail}
      style={{
        ["--card-accent" as string]: identity.accent,
        ["--card-accent-soft" as string]: identity.accentSoft,
      }}
      aria-labelledby="x-deck-detail-name"
    >
      <div>
        <div className={styles.detailHeader}>
          <span className={styles.detailEyebrow}>
            {archetype.name} · {candidate.archetype}
          </span>
        </div>
        <h2 id="x-deck-detail-name" className={styles.detailName}>
          {candidate.name}
        </h2>
        <p className={styles.detailOrg}>
          {candidate.role} · {candidate.organization}
        </p>
        <p className={styles.detailBio}>{candidate.bio}</p>

        <div className={styles.detailAxisBlock}>
          <h3 className={styles.detailAxisTitle}>Axis profile</h3>
          <AxisRow
            leftLabel="Change"
            rightLabel="Continuity"
            value={candidate.axisVector.continuityChange}
          />
          <AxisRow
            leftLabel="System"
            rightLabel="Person"
            value={candidate.axisVector.personSystem}
          />
          <AxisRow
            leftLabel="Leverage"
            rightLabel="Craft"
            value={candidate.axisVector.craftLeverage}
          />
        </div>

        <div className={styles.detailCta}>
          <button
            type="button"
            className={`${styles.detailCtaBtn} ${previewMode ? styles.detailCtaBtnDisabled : ""}`}
            disabled={previewMode}
            aria-disabled={previewMode}
          >
            Request intro →
          </button>
          <button
            type="button"
            className={`${styles.detailCtaBtnGhost} ${previewMode ? styles.detailCtaBtnDisabled : ""}`}
            disabled={previewMode}
            aria-disabled={previewMode}
          >
            Save for later
          </button>
          {previewMode && (
            <span className={styles.detailCtaPreviewNote}>
              Preview only &mdash; intros open after the XQ.
            </span>
          )}
        </div>
      </div>

      <div className={styles.detailValues}>
        <div className={styles.valueBucket}>
          <h4>Non-negotiables · ◆ shared with you</h4>
          <div className={styles.valueChips}>
            {candidate.nonNegotiables.map((v) => (
              <span
                key={v}
                className={`${styles.valueChip} ${sharedSet.has(v) ? styles.valueChipShared : ""}`}
              >
                {v}
              </span>
            ))}
          </div>
        </div>
        <div className={styles.valueBucket}>
          <h4>Core values</h4>
          <div className={styles.valueChips}>
            {candidate.coreValues.map((v) => (
              <span key={v} className={styles.valueChip}>
                {v}
              </span>
            ))}
          </div>
        </div>
        <div className={styles.valueBucket}>
          <h4>Aspirational</h4>
          <div className={styles.valueChips}>
            {candidate.aspirationalValues.map((v) => (
              <span key={v} className={styles.valueChip}>
                {v}
              </span>
            ))}
          </div>
        </div>
        <div className={styles.valueBucket}>
          <h4>
            You ({viewer.name.split(" ")[0]}) · for reference
          </h4>
          <div className={styles.valueChips}>
            {viewer.nonNegotiables.map((v) => (
              <span
                key={v}
                className={`${styles.valueChip} ${sharedSet.has(v) ? styles.valueChipShared : ""}`}
              >
                {v}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

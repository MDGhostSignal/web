"use client";

import { CHARACTERS } from "@/lib/xq/characters";
import { ARCHETYPES } from "@/lib/xq/constants";
import { XQCharacter3D } from "@/components/xq/XQCharacter3D";
import type { ViewerProfile } from "@/lib/match/types";

import styles from "./x-deck.module.css";

type Props = { viewer: ViewerProfile };

/**
 * Mocked "you are ___" callout at the top of /x-deck. Stands in for
 * what would come from the freshly-computed XQ result on the quiz
 * results screen when the deck eventually wires up to the quiz flow.
 */
export function HeroCallout({ viewer }: Props) {
  const identity = CHARACTERS[viewer.archetype];
  const archetype = ARCHETYPES[viewer.archetype];
  return (
    <section className={styles.hero}>
      <div
        className={styles.heroPortrait}
        style={{ ["--xd-accent" as string]: identity.accent }}
      >
        {/* No avatar uploaded yet — the 3D archetype character stands
         *  in for the viewer's visual identity. Card portraits below
         *  use real images. */}
        <XQCharacter3D code={viewer.archetype} />
      </div>
      <div>
        <p className={styles.heroEyebrow}>
          Your dossier · {viewer.organization}
        </p>
        <h1 className={styles.heroTitle}>
          You are{" "}
          <span
            className={styles.heroAccentName}
            style={{ color: identity.accent }}
          >
            {archetype.name}
          </span>
        </h1>
        <p className={styles.heroSub}>
          {archetype.tagline}. These are the {viewer.memberType === "brand"
            ? "creators"
            : "brands"}{" "}
          whose convictions align most tightly with yours — ranked by axis
          alignment + shared non-negotiable values.
        </p>
      </div>
    </section>
  );
}

/**
 * XQ Character Visual Identity Manifest
 *
 * Single source of truth for per-archetype illustration metadata.
 * Consumed by:
 *   - /xq-characters       (gallery review page)
 *   - /xq-quiz/results     (reveal screen)
 *   - XQ spectrum map      (cube → 2D projection)
 *
 * Color discipline: every accent below comes from the GhostSignal
 * brand palette. The five primaries (`--gs-tw-brand-{red, purple,
 * green, pink, orange}`) cover four archetypes; the three "sister"
 * hues (`coral`, `cyan`, `indigo`) extend the palette using shades
 * already in use elsewhere in the product (marketplace welcome card,
 * admin task assignee stripes) so the system reads as one family.
 *
 * Axis encoding:
 *   axis1: C (Continuity)  ↔ X (Change)     — warm hues vs cool hues
 *   axis2: P (Person)      ↔ S (System)     — organic motifs vs structural
 *   axis3: C (Craft)       ↔ L (Leverage)   — single prop vs system of props
 *
 * Motif language: every character holds or stands beside one signature
 * object. The prop names appear in copy + accessible alt text and pin
 * each character's meaning concretely.
 */

import type { ArchetypeCode } from "./constants";

export type CharacterIdentity = {
  code: ArchetypeCode;
  /** Primary brand-aligned accent (used for card chrome, line stroke,
   *  highlight ring on the spectrum map). */
  accent: string;
  /** ~16% alpha of the accent — for card glow backgrounds. */
  accentSoft: string;
  /** Semantic prop name surfaced in copy / alt text. */
  prop: string;
  /** One-sentence visual brief — guides the illustration. */
  visualBrief: string;
  /** Where the character lives on the three axes, as raw 1 or -1.
   *  Used by the spectrum map for placement. */
  axisVector: { axis1: 1 | -1; axis2: 1 | -1; axis3: 1 | -1 };
};

/**
 * Eight character identities, keyed by archetype code.
 *
 * `axisVector` convention:
 *   axis1:  1 = Continuity (C), -1 = Change (X)
 *   axis2:  1 = Person      (P), -1 = System (S)
 *   axis3:  1 = Craft       (C), -1 = Leverage (L)
 */
export const CHARACTERS: Record<ArchetypeCode, CharacterIdentity> = {
  "C-P-C": {
    code: "C-P-C",
    accent: "#FBAD25",
    accentSoft: "rgba(251, 173, 37, 0.18)",
    prop: "a tended lantern",
    visualBrief:
      "Robed figure cupping a small flame in a lantern, head bowed slightly in care. Roots or growth rings beneath the feet hint at lineage. Warm, intimate, candle-lit.",
    axisVector: { axis1: 1, axis2: 1, axis3: 1 },
  },
  "C-P-L": {
    code: "C-P-L",
    accent: "#FF7BAD",
    accentSoft: "rgba(255, 123, 173, 0.18)",
    prop: "a shepherd's staff and open arms",
    visualBrief:
      "Open-armed figure with a long staff, gathering a small flock or constellation of dots. Warm, welcoming, expansive gesture without losing intimacy.",
    axisVector: { axis1: 1, axis2: 1, axis3: -1 },
  },
  "C-S-C": {
    code: "C-S-C",
    accent: "#D66157",
    accentSoft: "rgba(214, 97, 87, 0.18)",
    prop: "a compass and a master ledger",
    visualBrief:
      "Seated craftsman bent over a ledger, compass in one hand, fine instruments arrayed in a precise grid. Quiet intensity, ordered tools, measured posture.",
    axisVector: { axis1: 1, axis2: -1, axis3: 1 },
  },
  "C-S-L": {
    code: "C-S-L",
    accent: "#00B29C",
    accentSoft: "rgba(0, 178, 156, 0.18)",
    prop: "an unrolled blueprint and a colonnade",
    visualBrief:
      "Standing figure holding an unfurled scroll-blueprint, a colonnade of pillars rising behind. Monumental scale, grounded stance, decades-thinking gaze.",
    axisVector: { axis1: 1, axis2: -1, axis3: -1 },
  },
  "X-P-C": {
    code: "X-P-C",
    accent: "#9F71AF",
    accentSoft: "rgba(159, 113, 175, 0.18)",
    prop: "a broken mold and a paintbrush",
    visualBrief:
      "Standing figure with a brush raised mid-stroke, a cracked mold or template at their feet. Subversive but soulful — they're making something better, not destroying.",
    axisVector: { axis1: -1, axis2: 1, axis3: 1 },
  },
  "X-P-L": {
    code: "X-P-L",
    accent: "#FA7B3F",
    accentSoft: "rgba(250, 123, 63, 0.18)",
    prop: "a megaphone trailing sparks",
    visualBrief:
      "Forward-leaning figure with a megaphone, sparks or particles streaming outward to a crowd of small silhouettes. Kinetic, contagious energy.",
    axisVector: { axis1: -1, axis2: 1, axis3: -1 },
  },
  "X-S-C": {
    code: "X-S-C",
    accent: "#4DC9AE",
    accentSoft: "rgba(77, 201, 174, 0.18)",
    prop: "drafting tools over a grid",
    visualBrief:
      "Figure at a drafting table, compass and triangle on a precise grid, a single elegant form taking shape. Innovation through restraint, not chaos.",
    axisVector: { axis1: -1, axis2: -1, axis3: 1 },
  },
  "X-S-L": {
    code: "X-S-L",
    accent: "#7C58D6",
    accentSoft: "rgba(124, 88, 214, 0.18)",
    prop: "a floating system of nodes",
    visualBrief:
      "Standing figure orchestrating a network of nodes and connections suspended around them. Systemic scale, calm command, infrastructure as canvas.",
    axisVector: { axis1: -1, axis2: -1, axis3: -1 },
  },
};

/** Stable iteration order — Continuity quartet first (warm), then
 *  Change quartet (cool). Useful for the gallery grid + map legend. */
export const CHARACTER_ORDER: ArchetypeCode[] = [
  "C-P-C",
  "C-P-L",
  "C-S-C",
  "C-S-L",
  "X-P-C",
  "X-P-L",
  "X-S-C",
  "X-S-L",
];

/** Brief axis labels for compact display (chips, badges). */
export const AXIS_CHIP = {
  axis1: { C: "Continuity", X: "Change" },
  axis2: { P: "Person", S: "System" },
  axis3: { C: "Craft", L: "Leverage" },
} as const;

/** Returns the codes that differ from `code` on exactly one axis.
 *  Used by the spectrum map to draw "neighbor" connectors. */
export function getNeighbors(code: ArchetypeCode): ArchetypeCode[] {
  const [a1, a2, a3] = code.split("-") as ["C" | "X", "P" | "S", "C" | "L"];
  const flip1 = `${a1 === "C" ? "X" : "C"}-${a2}-${a3}` as ArchetypeCode;
  const flip2 = `${a1}-${a2 === "P" ? "S" : "P"}-${a3}` as ArchetypeCode;
  const flip3 = `${a1}-${a2}-${a3 === "C" ? "L" : "C"}` as ArchetypeCode;
  return [flip1, flip2, flip3];
}

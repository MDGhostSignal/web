import { AXES, DESCRIPTIONS, WORDS } from "@/lib/rq/constants";

/**
 * Data for the static RQ explorer on /xqrq.
 *
 * The RQ has three axes (see lib/rq/scoring.ts). Each axis is laid out
 * as an ordered spectrum from one pole to the other — three intensity
 * bands per pole, six stops in all — using the word pools in
 * lib/rq/constants.ts. A combination is one stop on each axis; hovering
 * a point on the grid resolves to one.
 *
 *   Values        Implicit  ← Veiled … Beacon →   Formative
 *   Authenticity  Relational← Intimate … Architected → Structural
 *   Horizon       Catalytic ← Igniting … Enduring →   Long-Arc
 *
 * Each axis maps to one colour channel so the grid reads as a colour
 * space.
 */

export type Pole = "I" | "F" | "R" | "S" | "C" | "L";

export type AxisStop = {
  /** Pole letter at this stop. */
  letter: Pole;
  /** Intensity band 0–2 (mild → strong) within the pole. */
  band: 0 | 1 | 2;
  /** Display word from the pool. */
  word: string;
  /** Representative strength number shown in the code. */
  strength: number;
};

// band → representative strength for the code readout.
const STRENGTH = [2, 5, 9] as const;

/** Build a pole's three stops, ordered mild → strong. */
function poleStops(
  axis: "Values" | "Authenticity" | "Horizon",
  letter: Pole,
): AxisStop[] {
  const words = WORDS[axis][letter as keyof (typeof WORDS)[typeof axis]];
  return [0, 1, 2].map((b) => ({
    letter,
    band: b as 0 | 1 | 2,
    word: words[b],
    strength: STRENGTH[b],
  }));
}

/**
 * A full axis spectrum: [strong negative pole … strong positive pole].
 * `neg` stops are reversed (strong → mild) so the array reads smoothly
 * from one extreme to the other.
 */
function spectrum(
  axis: "Values" | "Authenticity" | "Horizon",
  neg: Pole,
  pos: Pole,
): AxisStop[] {
  return [...poleStops(axis, neg).reverse(), ...poleStops(axis, pos)];
}

export type AxisDef = {
  key: "values" | "authenticity" | "horizon";
  name: string;
  negLabel: string;
  posLabel: string;
  stops: AxisStop[];
};

export const VALUES_AXIS: AxisDef = {
  key: "values",
  name: AXES.values.name,
  negLabel: AXES.values.leftLabel, // Implicit
  posLabel: AXES.values.rightLabel, // Formative
  stops: spectrum("Values", "I", "F"),
};

export const AUTH_AXIS: AxisDef = {
  key: "authenticity",
  name: AXES.authenticity.name,
  negLabel: AXES.authenticity.rightLabel, // Relational
  posLabel: AXES.authenticity.leftLabel, // Structural
  stops: spectrum("Authenticity", "R", "S"),
};

export const HORIZON_AXIS: AxisDef = {
  key: "horizon",
  name: AXES.horizon.name,
  negLabel: AXES.horizon.rightLabel, // Catalytic
  posLabel: AXES.horizon.leftLabel, // Long-Arc
  stops: spectrum("Horizon", "C", "L"),
};

/** 6 stops on 3 axes → 216 named combinations. */
export const AXIS_LEN = VALUES_AXIS.stops.length; // 6
export const TOTAL_COMBOS =
  VALUES_AXIS.stops.length * AUTH_AXIS.stops.length * HORIZON_AXIS.stops.length;

export type RQCombo = {
  code: string;
  name: string;
  color: string;
  /** Brief 3-sentence read of what this combination means. */
  summary: string;
  values: AxisStop;
  authenticity: AxisStop;
  horizon: AxisStop;
};

/** Pull the first descriptive sentence out of a profile paragraph
 *  (which starts with an "F (7–10) — Label." prefix we drop). */
function gist(paragraph: string): string {
  const parts = paragraph.split(". ");
  return parts[1] ? `${parts[1].trim()}.` : paragraph;
}

/** A 3-sentence summary: one gist per axis. */
function summaryFor(v: AxisStop, a: AxisStop, h: AxisStop): string {
  return [
    gist(DESCRIPTIONS.Values[v.letter as "I" | "F"][v.band]),
    gist(DESCRIPTIONS.Authenticity[a.letter as "R" | "S"][a.band]),
    gist(DESCRIPTIONS.Horizon[h.letter as "L" | "C"][h.band]),
  ].join(" ");
}

/** Bright/legible channel value for a 0..(len-1) index. */
function channel(i: number, len: number): number {
  const t = len <= 1 ? 0.5 : i / (len - 1);
  return Math.round(70 + t * 150); // 70..220
}

/** Resolve a combination from one stop-index per axis. */
export function comboAt(vi: number, ai: number, hi: number): RQCombo {
  const v = VALUES_AXIS.stops[vi];
  const a = AUTH_AXIS.stops[ai];
  const h = HORIZON_AXIS.stops[hi];
  return {
    code: `${v.letter}(${v.strength})-${a.letter}(${a.strength})-${h.letter}(${h.strength})`,
    name: `${v.word} ${a.word} ${h.word}`,
    color: `rgb(${channel(vi, AXIS_LEN)}, ${channel(ai, AXIS_LEN)}, ${channel(hi, AXIS_LEN)})`,
    summary: summaryFor(v, a, h),
    values: v,
    authenticity: a,
    horizon: h,
  };
}

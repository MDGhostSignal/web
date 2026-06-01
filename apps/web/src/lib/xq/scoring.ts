/**
 * XQ Quotient Scoring
 *
 * Pure functions — no React, no I/O. Consumed by the public quiz UI
 * (`/xq-quiz`) and the API submission route (`/api/xq-submissions`).
 *
 * Mirrors `src/lib/rq/scoring.ts` in shape (typed `Answers` input,
 * typed `Result` output, single `computeXQ` entry-point).
 */

import {
  ARCHETYPES,
  AXIS_LABELS,
  PHASE1_QUESTIONS,
  type ArchetypeCode,
  type ArchetypeDef,
  type AxisKey,
} from "./constants";

/** Phase 1 + Phase 2 answers — id → "a" | "b". */
export type XQAnswers = Record<string, "a" | "b">;

/** Phase 3 stress-test response — which values the user checked
 *  in each of the three buckets. Each array holds value-name strings
 *  drawn from the user's Phase 2 selectedValuesPool. */
export type XQStressInput = {
  nonNegotiables: string[];
  core: string[];
  aspirational: string[];
};

/** Final dossier returned by `computeXQ`. */
export type XQResult = {
  /** 3-letter archetype code, e.g. "C-P-C". */
  code: ArchetypeCode;
  archetype: ArchetypeDef;
  /** Per-axis triangulation breakdown. The letter is the winning
   *  side; the score is its raw point total (the higher of the two
   *  competing axes). */
  details: {
    axis1: { letter: "C" | "X"; score: number; opposingScore: number };
    axis2: { letter: "P" | "S"; score: number; opposingScore: number };
    axis3: { letter: "C" | "L"; score: number; opposingScore: number };
  };
  /** The 14 values the user picked in Phase 2 (insertion order). */
  selectedValuesPool: string[];
  /** Buckets produced by Phase 3 stress tests + leftover routing. */
  buckets: {
    nonNegotiables: string[];
    core: string[];
    aspirational: string[];
    background: string[];
  };
  /** Human-readable triangulated vector bias, e.g.
   *  "Continuity · Person · Craft". Convenience for UI surfaces. */
  vectorBias: string;
};

/* =====================================================================
 * Archetype triangulation (Phase 1)
 * ===================================================================== */

/**
 * Walk Phase 1 answers, accumulate per-axis points, pick the winning
 * letter for each of the three binary axes. Returns the 3-letter
 * archetype code + the per-axis score breakdown.
 *
 * Ties favour the "a" side (matches Jeremy's draft: `scores.C >=
 * scores.X` → "C"). Documented here so a future tweak to tie-breaking
 * stays consistent across surfaces.
 */
export function triangulateArchetype(answers: XQAnswers): {
  code: ArchetypeCode;
  details: XQResult["details"];
} {
  const scores: Record<AxisKey, number> = {
    C: 0,
    X: 0,
    P: 0,
    S: 0,
    C2: 0,
    L: 0,
  };

  for (const q of PHASE1_QUESTIONS) {
    const pick = answers[q.id];
    if (pick === "a") scores[q.axis] += q.aVal;
    else if (pick === "b") scores[q.bAxis] += q.bVal;
    // Unanswered → no contribution. Caller is expected to validate
    // completeness before scoring, but we don't crash here.
  }

  const a1: "C" | "X" = scores.C >= scores.X ? "C" : "X";
  const a2: "P" | "S" = scores.P >= scores.S ? "P" : "S";
  const a3: "C" | "L" = scores.C2 >= scores.L ? "C" : "L";

  const code = `${a1}-${a2}-${a3}` as ArchetypeCode;

  return {
    code,
    details: {
      axis1: {
        letter: a1,
        score: a1 === "C" ? scores.C : scores.X,
        opposingScore: a1 === "C" ? scores.X : scores.C,
      },
      axis2: {
        letter: a2,
        score: a2 === "P" ? scores.P : scores.S,
        opposingScore: a2 === "P" ? scores.S : scores.P,
      },
      axis3: {
        letter: a3,
        score: a3 === "C" ? scores.C2 : scores.L,
        opposingScore: a3 === "C" ? scores.L : scores.C2,
      },
    },
  };
}

/* =====================================================================
 * Value pool (Phase 2)
 * ===================================================================== */

/**
 * Extract the 14 value-name strings the user implicitly selected by
 * answering Phase 2. Insertion order matches the question order so
 * the UI can render the stress-test checkboxes in a stable layout.
 */
export function extractValuesPool(
  answers: XQAnswers,
  phase2Questions: readonly { id: string; aValue: string; bValue: string }[],
): string[] {
  const out: string[] = [];
  for (const q of phase2Questions) {
    const pick = answers[q.id];
    if (pick === "a") out.push(q.aValue);
    else if (pick === "b") out.push(q.bValue);
  }
  return out;
}

/* =====================================================================
 * Bucket classification (Phase 3)
 * ===================================================================== */

/**
 * Apply Phase 3 stress-test outputs to the value pool to produce the
 * four-bucket blueprint. Priority is strict (matches Jeremy's draft):
 *
 *   non-negotiables > core > aspirational > background
 *
 * A value can only land in one bucket. Background catches every value
 * the user didn't tick anywhere — those are context influences that
 * shape behaviour without being a stated priority.
 *
 * Input arrays are filtered against `selectedValuesPool` so an
 * accidentally-submitted unknown value can't sneak through.
 */
export function classifyBuckets(
  selectedValuesPool: string[],
  stress: XQStressInput,
): XQResult["buckets"] {
  const poolSet = new Set(selectedValuesPool);
  const filterToPool = (arr: string[]): string[] =>
    arr.filter((v) => poolSet.has(v));

  const nonNegotiables = filterToPool(stress.nonNegotiables);
  const nnSet = new Set(nonNegotiables);

  const core = filterToPool(stress.core).filter((v) => !nnSet.has(v));
  const coreSet = new Set(core);

  const aspirational = filterToPool(stress.aspirational).filter(
    (v) => !nnSet.has(v) && !coreSet.has(v),
  );
  const aspSet = new Set(aspirational);

  const background = selectedValuesPool.filter(
    (v) => !nnSet.has(v) && !coreSet.has(v) && !aspSet.has(v),
  );

  return { nonNegotiables, core, aspirational, background };
}

/* =====================================================================
 * Top-level entry point
 * ===================================================================== */

/**
 * Compute the full XQ dossier from a complete set of answers + stress
 * inputs. Convenience wrapper that runs the three pure helpers and
 * stitches their outputs into the `XQResult` shape the UI + API both
 * consume.
 */
export function computeXQ(
  answers: XQAnswers,
  selectedValuesPool: string[],
  stress: XQStressInput,
): XQResult {
  const { code, details } = triangulateArchetype(answers);
  const archetype = ARCHETYPES[code];
  const buckets = classifyBuckets(selectedValuesPool, stress);

  const vectorBias = [
    AXIS_LABELS.axis1[details.axis1.letter],
    AXIS_LABELS.axis2[details.axis2.letter],
    AXIS_LABELS.axis3[details.axis3.letter],
  ].join(" · ");

  return {
    code,
    archetype,
    details,
    selectedValuesPool,
    buckets,
    vectorBias,
  };
}

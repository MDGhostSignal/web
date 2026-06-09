/**
 * First-pass compatibility scoring for the /x-deck preview surface.
 *
 * Two-part score, weighted then clamped to 0-100:
 *
 *   1. **Axis alignment** (weight 0.70). Cosine similarity between
 *      viewer + candidate `axisVector` mapped from [-1, +1] → [0, 100].
 *      A perfectly aligned vector scores 100; a perfectly opposing
 *      one scores 0.
 *
 *   2. **Values alignment** (weight 0.30). Jaccard-style overlap of
 *      non-negotiable values, mapped to [0, 100].
 *
 * Final score is `round(0.70 * axis + 0.30 * values)`, clamped 0-100.
 *
 * This is a deliberately simple model. The real matching algorithm
 * will live behind an API and be informed by lifecycle phase,
 * audience overlap, contract availability, etc. For now this just
 * needs to produce a believable-looking number on the card gauge.
 */

import type {
  AxisVector,
  Compatibility,
  MatchCandidate,
  ViewerProfile,
} from "./types";

function cosineSimilarity(a: AxisVector, b: AxisVector): number {
  const dot =
    a.continuityChange * b.continuityChange +
    a.personSystem * b.personSystem +
    a.craftLeverage * b.craftLeverage;
  const magA = Math.sqrt(
    a.continuityChange ** 2 + a.personSystem ** 2 + a.craftLeverage ** 2,
  );
  const magB = Math.sqrt(
    b.continuityChange ** 2 + b.personSystem ** 2 + b.craftLeverage ** 2,
  );
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

function intersection<T>(a: T[], b: T[]): T[] {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x));
}

const AXIS_WEIGHT = 0.7;
const VALUES_WEIGHT = 0.3;

export function scoreCandidate(
  viewer: ViewerProfile,
  candidate: MatchCandidate,
): Compatibility {
  // Cosine similarity in [-1, +1] → [0, 100]
  const cos = cosineSimilarity(viewer.axisVector, candidate.axisVector);
  const axisAlignment = Math.round(((cos + 1) / 2) * 100);

  // Jaccard overlap on non-negotiables → [0, 100]
  const shared = intersection(viewer.nonNegotiables, candidate.nonNegotiables);
  const union = new Set([
    ...viewer.nonNegotiables,
    ...candidate.nonNegotiables,
  ]);
  const valuesAlignment =
    union.size === 0 ? 0 : Math.round((shared.length / union.size) * 100);

  const blended = AXIS_WEIGHT * axisAlignment + VALUES_WEIGHT * valuesAlignment;
  const score = Math.max(0, Math.min(100, Math.round(blended)));

  return {
    score,
    axisAlignment,
    valuesAlignment,
    sharedNonNegotiables: shared,
  };
}

/** Score a viewer against an array of candidates, sorted desc by score. */
export function scoreAndRank(
  viewer: ViewerProfile,
  candidates: MatchCandidate[],
): { candidate: MatchCandidate; compatibility: Compatibility }[] {
  return candidates
    .map((c) => ({ candidate: c, compatibility: scoreCandidate(viewer, c) }))
    .sort((a, b) => b.compatibility.score - a.compatibility.score);
}

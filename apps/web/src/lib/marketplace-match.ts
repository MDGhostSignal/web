/**
 * Resonance scoring for the marketplace. Brand and creator each carry
 * trait values across the same axes (`TRAIT_KEYS`); resonance is
 * `100 - weighted_normalized_distance`. Higher = better match.
 *
 * Trait axes are weighted equally for v1. When the "huge RQ" quiz
 * lands, add the new keys to `TRAIT_KEYS` (in `marketplace-mocks.ts`)
 * and any per-axis weight overrides in `TRAIT_WEIGHTS`. Call sites
 * don't need to change.
 */

import {
  TRAIT_KEYS,
  type MarketplaceEntity,
  type TraitKey,
} from "./marketplace-mocks";

export const TRAIT_WEIGHTS: Record<TraitKey, number> = {
  values: 1,
  authenticity: 1,
  horizon: 1,
};

/** Each shared descriptive tag adds this many points to resonance. */
export const TAG_BONUS_PER_SHARED = 2;
/** Max total tag bonus, capped so tags can't dominate trait alignment. */
export const TAG_BONUS_MAX = 6;

/**
 * Count tags that appear on both entities (case-insensitive). Tags
 * are flat strings — no namespacing yet, no synonym matching.
 */
export function countSharedTags(
  a: MarketplaceEntity,
  b: MarketplaceEntity,
): number {
  const aSet = new Set(a.tags.map((t) => t.toLowerCase()));
  let n = 0;
  for (const t of b.tags) if (aSet.has(t.toLowerCase())) n++;
  return n;
}

/**
 * Pairwise resonance between two entities. Symmetric — pass them in
 * either order. Range 0..100.
 *
 * Composition:
 *   1. Trait-distance base — RMS distance across the configured axes,
 *      normalised against the max possible distance, folded into
 *      a 0..100 score (100 = perfect alignment, 0 = full disagreement).
 *   2. Tag-overlap bonus — each shared descriptive tag adds
 *      `TAG_BONUS_PER_SHARED`, capped at `TAG_BONUS_MAX`. Tags refine
 *      the score when two entities share genre / medium / topic
 *      vocabulary; they can't override poor trait alignment but they
 *      can lift a fair match into strong territory.
 */
export function resonance(a: MarketplaceEntity, b: MarketplaceEntity): number {
  let weightedSqDist = 0;
  let weightSum = 0;
  for (const k of TRAIT_KEYS) {
    const w = TRAIT_WEIGHTS[k];
    const d = a.traits[k] - b.traits[k];
    weightedSqDist += w * d * d;
    weightSum += w;
  }
  const rms = Math.sqrt(weightedSqDist / weightSum);
  const normalised = rms / 100;
  const base = 100 * (1 - normalised);
  const tagBonus = Math.min(
    TAG_BONUS_MAX,
    countSharedTags(a, b) * TAG_BONUS_PER_SHARED,
  );
  return Math.max(0, Math.min(100, Math.round(base + tagBonus)));
}

export type ResonanceTier = "strong" | "fair" | "weak";

export const RESONANCE_TIERS = {
  strong: 80,
  fair: 60,
} as const;

export function tierFor(score: number): ResonanceTier {
  if (score >= RESONANCE_TIERS.strong) return "strong";
  if (score >= RESONANCE_TIERS.fair) return "fair";
  return "weak";
}

/**
 * Top-N suggestions for a given anchor entity, picked from the pool
 * of opposite-kind entities. Already-confirmed pairs are filtered out
 * by the caller (the store knows which matches are taken).
 */
export function suggestMatches(
  anchor: MarketplaceEntity,
  pool: readonly MarketplaceEntity[],
  options: { limit?: number; exclude?: ReadonlySet<string> } = {},
): { entity: MarketplaceEntity; score: number }[] {
  const { limit = 3, exclude } = options;
  const opposite = anchor.kind === "creator" ? "brand" : "creator";
  const scored: { entity: MarketplaceEntity; score: number }[] = [];
  for (const e of pool) {
    if (e.kind !== opposite) continue;
    if (exclude?.has(e.id)) continue;
    scored.push({ entity: e, score: resonance(anchor, e) });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * Highest-resonance unconfirmed brand × creator pair across the whole
 * pool. Powers the "match of the day" pin at the top of the Match view —
 * surfaces the strongest pairing the admin hasn't acted on yet.
 *
 * `excludeKey(brandId, creatorId)` should return true for any pair that
 * already has a confirmed or rejected match record (so we don't re-pin
 * pairs the user has already decided about).
 */
export function findTopUnconfirmed(
  pool: readonly MarketplaceEntity[],
  excludeKey: (brandId: string, creatorId: string) => boolean,
): { brand: MarketplaceEntity; creator: MarketplaceEntity; score: number } | null {
  let best: {
    brand: MarketplaceEntity;
    creator: MarketplaceEntity;
    score: number;
  } | null = null;
  for (const a of pool) {
    if (a.kind !== "brand") continue;
    for (const b of pool) {
      if (b.kind !== "creator") continue;
      if (excludeKey(a.id, b.id)) continue;
      const score = resonance(a, b);
      if (best === null || score > best.score) {
        best = { brand: a, creator: b, score };
      }
    }
  }
  return best;
}

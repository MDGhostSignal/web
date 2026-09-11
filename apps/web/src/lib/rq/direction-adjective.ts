/**
 * RQ direction adjective + XQ/RQ paired summary title.
 *
 * Product rule: docs/XQ_RQ_MATCH_SUMMARY.md
 *
 * - Three-word RQ names stay computed and stored forever.
 * - When both XQ and RQ exist, Studio summary tiles show
 *   "{ArchetypeNoun} {DirectionAdjective}" instead of the three-word name.
 * - Lookup is by the stored three-word name (Jeremy sheet originals).
 * - Missing lookup → null so callers fall back to the three-word name.
 */

import { RQ_DIRECTION_ADJECTIVES } from "./data/rq-direction-adjectives";

/** Resolve Jeremy's direction adjective from a stored three-word RQ name. */
export function lookupRqDirectionAdjective(
  threeWordName: string | null | undefined,
): string | null {
  const key = threeWordName?.trim();
  if (!key) return null;
  return RQ_DIRECTION_ADJECTIVES[key] ?? null;
}

/** Strip a leading "The " for combo titles only — does not mutate ARCHETYPES. */
export function archetypeNounForSummary(
  xqArchetypeName: string | null | undefined,
): string | null {
  const raw = xqArchetypeName?.trim();
  if (!raw) return null;
  return raw.replace(/^The\s+/i, "").trim() || null;
}

/**
 * Paired summary title: "Architect Radiant".
 * Returns null when either side is missing or the adjective is unknown —
 * callers must fall back to the three-word RQ name.
 */
export function formatXqRqSummaryTitle(
  xqArchetypeName: string | null | undefined,
  threeWordName: string | null | undefined,
): string | null {
  const noun = archetypeNounForSummary(xqArchetypeName);
  const adjective = lookupRqDirectionAdjective(threeWordName);
  if (!noun || !adjective) return null;
  return `${noun} ${adjective}`;
}

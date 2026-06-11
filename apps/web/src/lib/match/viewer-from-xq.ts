/**
 * Convert a freshly-computed XQResult + the contact-step Basics into a
 * `ViewerProfile` the /x-deck deck can rank candidates against.
 *
 * The XQResult details carry the discrete winning letter per axis + the
 * raw point spread between competing sides. We normalize each axis to
 * `(winning - opposing) / (winning + opposing)` ∈ [0, 1], then flip the
 * sign so the axis lands on the same convention as `AxisVector`:
 *
 *   continuityChange: +1 = Continuity (C), -1 = Change     (X)
 *   personSystem:     +1 = Person     (P), -1 = System     (S)
 *   craftLeverage:    +1 = Craft      (C), -1 = Leverage   (L)
 *
 * This matches the `toSpectrumPosition` logic already used by
 * ResultsScreen for the spectrum map, so the deck and the map agree on
 * where the user lands.
 */

import type { ViewerProfile, MemberType } from "@/lib/match/types";
import type { XQResult } from "@/lib/xq/scoring";
import type { Basics } from "@/app/xq-quiz/types";

function normalize(winning: number, opposing: number): number {
  const total = winning + opposing;
  return total === 0 ? 0 : (winning - opposing) / total;
}

function memberTypeFromBasics(type: string): MemberType {
  const t = type.trim().toLowerCase();
  if (t.startsWith("creator") || t.startsWith("podcast")) return "creator";
  if (t.startsWith("brand") || t.startsWith("agency")) return "brand";
  return "other";
}

export function viewerProfileFromXQ(
  result: XQResult,
  basics: Basics,
): ViewerProfile {
  const { details } = result;

  const a1 = normalize(details.axis1.score, details.axis1.opposingScore);
  const a2 = normalize(details.axis2.score, details.axis2.opposingScore);
  const a3 = normalize(details.axis3.score, details.axis3.opposingScore);

  const fullName = [basics.first, basics.last].filter(Boolean).join(" ").trim();

  return {
    name: fullName || "You",
    organization: basics.org || "—",
    memberType: memberTypeFromBasics(basics.type),
    archetype: result.code,
    axisVector: {
      continuityChange: details.axis1.letter === "C" ? a1 : -a1,
      personSystem: details.axis2.letter === "P" ? a2 : -a2,
      craftLeverage: details.axis3.letter === "C" ? a3 : -a3,
    },
    nonNegotiables: result.buckets.nonNegotiables,
  };
}

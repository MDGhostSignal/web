/**
 * Type definitions for the /x-deck preview surface.
 *
 * Eventually these will be derived from the `members` + `xq_submissions`
 * Supabase rows; for now the /x-deck page consumes the mock fixtures
 * in `./fixtures.ts` so we can iterate on the UI without depending on
 * production data.
 */

import type { ArchetypeCode } from "@/lib/xq/constants";

/** Continuous axis vector — each component in [-1, +1]. Lives parallel
 *  to the discrete (C/X, P/S, C/L) letter encoding so the spectrum map
 *  + compatibility scorer can use either. */
export type AxisVector = {
  /** Continuity (+1) ↔ Change (-1) */
  continuityChange: number;
  /** Person (+1) ↔ System (-1) */
  personSystem: number;
  /** Craft (+1) ↔ Leverage (-1) */
  craftLeverage: number;
};

export type MemberType = "creator" | "brand" | "other";

/** Optional rarity tier surfaced as a visual flourish on the card —
 *  founding members get a distinguishing glyph; "recommended" marks a
 *  hand-picked GhostSignal-team recommendation for the viewing member.
 *  Pure visual; nothing functional gates on this. */
export type CardRarity = "founding" | "featured" | "recommended" | null;

/** A single candidate in the deck — either a creator being shown to a
 *  brand viewer, or vice versa. */
export type MatchCandidate = {
  id: string;
  name: string;
  organization: string;
  role: string;
  memberType: MemberType;
  /** Headshot, brand logo, podcast cover art — whatever the member
   *  uses to represent themselves. Surfaced as the card portrait. */
  imageUrl: string;
  /** One-line "what they do" summary surfaced on the card body. */
  pitch: string;
  /** Longer description surfaced in the detail panel below the deck. */
  bio: string;
  /** Archetype code drives accent color + character renderer. */
  archetype: ArchetypeCode;
  /** Continuous position used by the compatibility scorer + axis bars. */
  axisVector: AxisVector;
  /** Top non-negotiable values (max 3 shown on card front; full list in detail). */
  nonNegotiables: string[];
  /** Secondary value buckets, surfaced in the detail panel only. */
  coreValues: string[];
  aspirationalValues: string[];
  /** Rarity tier — drives the footer glyph treatment. */
  rarity: CardRarity;
};

/** The "viewer" — i.e. the user whose XQ result is driving the matches.
 *  On the standalone preview page this is mocked; eventually it'll be
 *  derived from the freshly-computed XQResult on the quiz results
 *  screen. */
/** The "viewer" is the user who just completed the XQ quiz. They
 *  haven't uploaded an avatar/logo yet — so unlike `MatchCandidate`,
 *  this profile carries no `imageUrl`. The 3D archetype character
 *  stands in for their visual identity in the meantime. */
export type ViewerProfile = {
  name: string;
  organization: string;
  memberType: MemberType;
  archetype: ArchetypeCode;
  axisVector: AxisVector;
  nonNegotiables: string[];
};

/** Output of the compatibility scorer for a single candidate. */
export type Compatibility = {
  /** 0-100 integer, suitable for the radial gauge. */
  score: number;
  /** 0-100 contribution from cosine-similarity on the axis vectors. */
  axisAlignment: number;
  /** 0-100 contribution from shared non-negotiables. */
  valuesAlignment: number;
  /** Specific non-negotiables both viewer + candidate share. */
  sharedNonNegotiables: string[];
};

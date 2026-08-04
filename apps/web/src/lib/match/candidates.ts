/**
 * Mappers that turn marketplace DB rows (brands/creators joined with
 * their contact's XQ archetype) into the MatchCandidate shape the
 * X-Deck renders. Extracted from the legacy /studio/marketplace page
 * so the Studio Lite roster deck can share them.
 */

import type { ArchetypeCode } from "@/lib/xq/constants";
import type { AxisVector, MatchCandidate } from "@/lib/match/types";
import type { MarketplaceBrand, MarketplaceCreator } from "@/lib/studio-data";

export function brandToCandidate(b: MarketplaceBrand): MatchCandidate {
  const archetype = (b.contactArchetype as ArchetypeCode | null) ?? "X-S-L";
  return {
    id: `brand-${b.id}`,
    name: b.name,
    organization: b.name,
    role: "Brand",
    memberType: "brand",
    imageUrl: b.logoUrl ?? `https://picsum.photos/seed/${b.id}/600/780`,
    pitch: truncate(b.description ?? "A brand on GHOSTSignal.", 96),
    bio: b.description ?? "Profile to come.",
    archetype,
    axisVector: archetypeToAxis(b.contactArchetype),
    nonNegotiables: [],
    coreValues: [],
    aspirationalValues: [],
    rarity: null,
  };
}

export function creatorToCandidate(c: MarketplaceCreator): MatchCandidate {
  const archetype = (c.contactArchetype as ArchetypeCode | null) ?? "X-S-L";
  const subtitle = c.showTitle
    ? `${c.showTitle}${
        c.showListenCount ? ` · ${formatListens(c.showListenCount)} listens` : ""
      }`
    : "Creator on GHOSTSignal.";
  return {
    id: `creator-${c.id}`,
    name: c.name,
    organization: c.showTitle ?? c.name,
    role: "Host",
    memberType: "creator",
    imageUrl: c.avatarUrl ?? `https://picsum.photos/seed/${c.id}/600/780`,
    pitch: truncate(c.description ?? subtitle, 96),
    bio: c.description ?? subtitle,
    archetype,
    axisVector: archetypeToAxis(c.contactArchetype),
    nonNegotiables: [],
    coreValues: [],
    aspirationalValues: [],
    rarity: null,
  };
}

/** Derive a continuous axis vector from a discrete archetype code.
 *  3-letter codes (C/X · P/S · C/L) map to ±1 on each axis. Returns
 *  zero-vector when no archetype is known so the matching engine
 *  still has something to compute against. */
export function archetypeToAxis(code: string | null): AxisVector {
  if (!code) return { continuityChange: 0, personSystem: 0, craftLeverage: 0 };
  const [a, b, c] = code.split("-");
  return {
    continuityChange: a === "C" ? 1 : a === "X" ? -1 : 0,
    personSystem: b === "P" ? 1 : b === "S" ? -1 : 0,
    craftLeverage: c === "C" ? 1 : c === "L" ? -1 : 0,
  };
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trimEnd()}…`;
}

function formatListens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

import { redirect } from "next/navigation";

import { XDeckSection } from "@/app/x-deck/XDeckSection";

/** Marketplace is auth-scoped — no static output possible. */
export const dynamic = "force-dynamic";
import type { ArchetypeCode } from "@/lib/xq/constants";
import type {
  AxisVector,
  MatchCandidate,
  ViewerProfile,
} from "@/lib/match/types";
import {
  loadMarketplaceBrands,
  loadMarketplaceCreators,
  type MarketplaceBrand,
  type MarketplaceCreator,
} from "@/lib/studio-data";
import { loadCurrentStudioMember } from "@/lib/studio-auth";

import { StudioHeader } from "../StudioHeader";
import styles from "../studio.module.css";

/** Studio marketplace — cross-side discovery.
 *  Creators flick through brand candidates; brands flick through
 *  creator candidates. Powered by the same MatchDeck / coverflow UI
 *  that the /x-deck preview page uses, but with real data from the
 *  brands + creators tables (joined with members for the contact's
 *  XQ archetype). */
export default async function StudioMarketplacePage() {
  const member = await loadCurrentStudioMember();
  if (!member) redirect("/studio/login");
  if (!member.isApproved) redirect("/studio/pending");

  // Build the viewer profile for the matching engine. Falls back to
  // a neutral axis vector when the member hasn't taken the XQ yet —
  // the deck still renders but match scores are unranked.
  const viewer: ViewerProfile = {
    name: member.displayName,
    organization: member.displayName, // No organization name surfaced yet
    memberType: member.kind === "other" ? "creator" : member.kind,
    archetype: (member.xqArchetype as ArchetypeCode) ?? "X-S-L",
    axisVector: archetypeToAxis(member.xqArchetype),
    nonNegotiables: [],
  };

  // Load the opposite side. Creator viewers see brands; brand viewers
  // see creators. 'other' viewers see creators by default (the more
  // common starting browse).
  const candidates: MatchCandidate[] =
    member.kind === "brand"
      ? (await loadMarketplaceCreators(member.xqArchetype)).map(creatorToCandidate)
      : (await loadMarketplaceBrands(member.xqArchetype)).map(brandToCandidate);

  return (
    <>
      <StudioHeader activeTab="marketplace" />
      <main className={styles.dashMain}>
        <h1 className={styles.dashWelcome}>Marketplace</h1>
        <p className={styles.dashSubtitle}>
          {member.kind === "brand"
            ? "Podcasts whose values align with yours. Flick through the deck — arrows or click a thumbnail."
            : "Brands whose values align with yours. Flick through the deck — arrows or click a thumbnail."}
        </p>

        {candidates.length === 0 ? (
          <div className={styles.dashCard}>
            <div className={styles.dashCardLabel}>Empty deck</div>
            <div className={styles.dashCardValue}>No candidates yet</div>
            <div className={styles.dashCardHint}>
              As more {member.kind === "brand" ? "creators" : "brands"} register
              and complete their XQ, they&apos;ll appear here ranked by
              conviction fit.
            </div>
          </div>
        ) : (
          <XDeckSection
            viewer={viewer}
            candidates={candidates}
            eyebrow={
              member.kind === "brand"
                ? "Creators matched to your XQ"
                : "Brands matched to your XQ"
            }
          />
        )}
      </main>
    </>
  );
}

/* ============================================================
 * Mappers — turn the marketplace DB rows into MatchCandidate
 * ============================================================ */

function brandToCandidate(b: MarketplaceBrand): MatchCandidate {
  const archetype = (b.contactArchetype as ArchetypeCode | null) ?? "X-S-L";
  return {
    id: `brand-${b.id}`,
    name: b.name,
    organization: b.name,
    role: "Brand",
    memberType: "brand",
    imageUrl: b.logoUrl ?? `https://picsum.photos/seed/${b.id}/600/780`,
    pitch: truncate(b.description ?? "A brand on GhostSignal.", 96),
    bio: b.description ?? "Profile to come.",
    archetype,
    axisVector: archetypeToAxis(b.contactArchetype),
    nonNegotiables: [],
    coreValues: [],
    aspirationalValues: [],
    rarity: null,
  };
}

function creatorToCandidate(c: MarketplaceCreator): MatchCandidate {
  const archetype = (c.contactArchetype as ArchetypeCode | null) ?? "X-S-L";
  const subtitle = c.showTitle
    ? `${c.showTitle}${
        c.showListenCount ? ` · ${formatListens(c.showListenCount)} listens` : ""
      }`
    : "Creator on GhostSignal.";
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
function archetypeToAxis(code: string | null): AxisVector {
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

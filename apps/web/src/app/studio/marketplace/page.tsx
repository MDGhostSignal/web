import { redirect } from "next/navigation";

import { XDeckSection } from "@/app/x-deck/XDeckSection";

/** Marketplace is auth-scoped — no static output possible. */
export const dynamic = "force-dynamic";
import type { ArchetypeCode } from "@/lib/xq/constants";
import type { MatchCandidate, ViewerProfile } from "@/lib/match/types";
import {
  archetypeToAxis,
  brandToCandidate,
  creatorToCandidate,
} from "@/lib/match/candidates";
import {
  loadMarketplaceBrands,
  loadMarketplaceCreators,
} from "@/lib/studio-data";
import { loadCurrentStudioMember } from "@/lib/studio-auth";
import { STUDIO_LITE_ONLY } from "@/lib/studio-lite";

import { StudioHeader } from "../StudioHeader";
import styles from "../studio.module.css";

/** Studio marketplace — cross-side discovery.
 *  Creators flick through brand candidates; brands flick through
 *  creator candidates. Powered by the same MatchDeck / coverflow UI
 *  that the /x-deck preview page uses, but with real data from the
 *  brands + creators tables (joined with members for the contact's
 *  XQ archetype). */
export default async function StudioMarketplacePage() {
  // Legacy surface — unrouted while Studio Lite is the live shape.
  if (STUDIO_LITE_ONLY) redirect("/studio/roster");
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
            compact
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

/* Candidate mappers moved to lib/match/candidates.ts so the Studio
 * Lite roster deck shares them with this (legacy) page. */

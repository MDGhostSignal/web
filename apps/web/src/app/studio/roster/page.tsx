import Image from "next/image";
import { redirect } from "next/navigation";

/** Roster is auth-scoped — no static output possible. */
export const dynamic = "force-dynamic";

import { XDeckSection } from "@/app/x-deck/XDeckSection";
import type { ArchetypeCode } from "@/lib/xq/constants";
import type { MatchCandidate, ViewerProfile } from "@/lib/match/types";
import { archetypeToAxis, brandToCandidate } from "@/lib/match/candidates";
import { loadCurrentStudioMember } from "@/lib/studio-auth";
import {
  formatListens,
  loadBrandRecommendations,
  loadMarketplaceBrands,
  loadMarketplaceCreators,
  type MarketplaceCreator,
} from "@/lib/studio-data";

import { StudioHeader } from "../StudioHeader";
import styles from "../studio.module.css";

/** /studio/roster — who's on the network.
 *
 *  Brand roster (creator/other viewers): a full character-card deck —
 *  flick through every brand one card at a time, thumbnail rail for
 *  navigation. The GhostSignal team's hand-picked recommendations for
 *  this member (up to four, from studio_brand_recommendations) lead
 *  the deck and carry the "✦ GhostSignal Pick" badge.
 *
 *  Creator roster (brand viewers): the scannable directory grid,
 *  unchanged pending its own design pass. */
export default async function StudioRosterPage() {
  const member = await loadCurrentStudioMember();
  if (!member) redirect("/studio/login");
  if (!member.isApproved) redirect("/studio/pending");

  if (member.kind === "brand") {
    const creators = await loadMarketplaceCreators(member.xqArchetype);
    return (
      <RosterShell
        title="Creator roster"
        subtitle="Every show on the GhostSignal network."
      >
        {creators.length === 0 ? (
          <EmptyRoster side="creators" />
        ) : (
          <div className={styles.rosterGrid}>
            {creators.map((c) => (
              <CreatorCard key={c.id} creator={c} />
            ))}
          </div>
        )}
      </RosterShell>
    );
  }

  // Brand roster — deck view. Recommendations load in parallel with
  // the roster; the loader returns [] if the table isn't there yet.
  const [brands, recommendations] = await Promise.all([
    loadMarketplaceBrands(member.xqArchetype),
    loadBrandRecommendations(member.id),
  ]);

  const recPosition = new Map(
    recommendations.map((r) => [r.brandId, r.position]),
  );
  const ordered = [...brands].sort((a, b) => {
    const ra = recPosition.get(a.id) ?? Number.POSITIVE_INFINITY;
    const rb = recPosition.get(b.id) ?? Number.POSITIVE_INFINITY;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
  const candidates: MatchCandidate[] = ordered.map((b) => ({
    ...brandToCandidate(b),
    rarity: recPosition.has(b.id) ? ("recommended" as const) : null,
  }));
  const pickCount = candidates.filter((c) => c.rarity === "recommended").length;

  const viewer: ViewerProfile = {
    name: member.displayName,
    organization: member.displayName,
    memberType: member.kind === "other" ? "creator" : member.kind,
    archetype: (member.xqArchetype as ArchetypeCode) ?? "X-S-L",
    axisVector: archetypeToAxis(member.xqArchetype),
    nonNegotiables: [],
  };

  return (
    <RosterShell
      title="Brand roster"
      subtitle={
        pickCount > 0
          ? `The GhostSignal team picked ${pickCount === 1 ? "one brand" : `${pickCount} brands`} for you — they lead the deck, marked ✦ GhostSignal Pick. Flick through the rest with the arrows or the rail.`
          : "Every brand on the network, one card at a time. Flick through with the arrows or the rail."
      }
    >
      {candidates.length === 0 ? (
        <EmptyRoster side="brands" />
      ) : (
        <XDeckSection
          viewer={viewer}
          candidates={candidates}
          eyebrow="The network"
          title={
            pickCount > 0
              ? "Recommended for you, then the full roster"
              : "The full brand roster"
          }
        />
      )}
    </RosterShell>
  );
}

/* ============================================================
 * Shell + shared pieces
 * ============================================================ */

function RosterShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <StudioHeader activeTab="roster" />
      <main className={styles.dashMain}>
        <h1 className={styles.dashWelcome}>{title}</h1>
        <p className={styles.dashSubtitle}>{subtitle}</p>
        {children}
      </main>
    </>
  );
}

function EmptyRoster({ side }: { side: "brands" | "creators" }) {
  return (
    <div className={styles.dashCard}>
      <div className={styles.dashCardLabel}>Roster</div>
      <div className={styles.dashCardValue}>Nobody here yet</div>
      <div className={styles.dashCardHint}>
        As {side} join the network, they&apos;ll appear here.
      </div>
    </div>
  );
}

function CreatorCard({ creator }: { creator: MarketplaceCreator }) {
  const meta = [
    creator.showTitle,
    creator.showListenCount != null
      ? `${formatListens(creator.showListenCount)} listens`
      : null,
    creator.showEpisodeCount != null
      ? `${creator.showEpisodeCount} episodes`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className={styles.rosterCard}>
      <div className={styles.rosterCardHead}>
        <RosterAvatar url={creator.avatarUrl} name={creator.name} />
        <div>
          <div className={styles.rosterName}>{creator.name}</div>
          {meta && <div className={styles.rosterMeta}>{meta}</div>}
        </div>
      </div>
      {creator.description && (
        <p className={styles.rosterDesc}>{creator.description}</p>
      )}
      {creator.contactArchetype && (
        <span className={styles.rosterChip}>{creator.contactArchetype}</span>
      )}
    </article>
  );
}

/** Logo/avatar with an initial-letter fallback — no placeholder-photo
 *  services on the roster; this surface is about legitimacy. */
function RosterAvatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      <Image
        src={url}
        alt={name}
        width={56}
        height={56}
        className={styles.rosterAvatar}
        unoptimized
      />
    );
  }
  return (
    <div className={styles.rosterInitial} aria-hidden>
      {name.trim().charAt(0).toUpperCase() || "?"}
    </div>
  );
}

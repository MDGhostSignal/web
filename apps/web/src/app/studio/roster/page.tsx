import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/** Roster is auth-scoped — no static output possible. */
export const dynamic = "force-dynamic";

import { loadCurrentStudioMember, type StudioMember } from "@/lib/studio-auth";
import { STUDIO_ROSTER_HIDDEN } from "@/lib/studio-lite";
import {
  formatListens,
  loadBrandRecommendations,
  loadMarketplaceBrands,
  loadMarketplaceCreators,
  loadStudioOrgProfile,
  studioOnboardingStatus,
  type MarketplaceCreator,
  type StudioOrgProfile,
} from "@/lib/studio-data";

import { StudioHeader } from "../StudioHeader";
import { StudioNotices } from "../StudioNotices";
import { BrandDeck, type RosterBrandCard } from "./BrandDeck";
import styles from "../studio.module.css";

/** /studio/roster — who's on the network.
 *
 *  Brand roster (creator/other viewers): a baseball-card deck you
 *  flick through, one brand at a time. The GHOSTSignal team's
 *  hand-picked recommendations lead the deck with the "✦ GS Pick"
 *  badge.
 *
 *  Creator roster (brand viewers): the scannable directory grid. */
export default async function StudioRosterPage() {
  // Roster pause: hidden from the nav and unrouted, but not deleted.
  if (STUDIO_ROSTER_HIDDEN) redirect("/studio/profile");

  const member = await loadCurrentStudioMember();
  if (!member) redirect("/studio/login");
  if (!member.isApproved) redirect("/studio/pending");

  const org = await loadStudioOrgProfile(member);

  // First-login onboarding: while setup is incomplete (quizzes, image,
  // description, creator RSS), the signed-in home is the welcome
  // splash instead. "Skip for now" sets a 7-day cookie that keeps the
  // roster reachable anyway.
  const onboarding = studioOnboardingStatus(member, org);
  if (!onboarding.complete) {
    const jar = await cookies();
    if (!jar.get("studio-welcome-skip")) redirect("/studio/welcome");
  }

  const headerProfile = profileBadge(member, org);

  if (member.kind === "brand") {
    const creators = await loadMarketplaceCreators(member.xqArchetype);
    return (
      <RosterShell
        member={member}
        org={org}
        headerProfile={headerProfile}
        title="Creator roster"
        subtitle="Every show on the GHOSTSignal network."
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

  // Brand roster — flat card row. Recommendations load in parallel;
  // the loader returns [] if the table isn't there yet.
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
  const pickCount = ordered.filter((b) => recPosition.has(b.id)).length;

  const cards: RosterBrandCard[] = ordered.map((b) => ({
    id: b.id,
    name: b.name,
    tagline: b.tagline,
    description: b.description,
    website: b.website,
    logoUrl: b.logoUrl,
    sinceYear: b.sinceYear,
    archetype: b.contactArchetype,
    matchScore: b.matchScore,
    recommended: recPosition.has(b.id),
  }));

  return (
    <RosterShell
      member={member}
      org={org}
      headerProfile={headerProfile}
      title="Brand roster"
      subtitle={
        pickCount > 0
          ? `The GHOSTSignal team picked ${pickCount === 1 ? "one brand" : `${pickCount} brands`} for you — they lead the deck, marked ✦ GS Pick. Flick through the cards; tap one for the full story.`
          : "Every brand on the network, one card at a time. Flick through the deck; tap a card for the full story."
      }
    >
      {cards.length === 0 ? (
        <EmptyRoster side="brands" />
      ) : (
        <BrandDeck brands={cards} />
      )}
    </RosterShell>
  );
}

/* ============================================================
 * Shell + shared pieces
 * ============================================================ */

/** Header avatar shortcut: uploaded logo when there is one, else the
 *  member initial; attention dot while any onboarding gap is open. */
function profileBadge(member: StudioMember, org: StudioOrgProfile | null) {
  return {
    initial: member.displayName.trim().charAt(0).toUpperCase() || "?",
    imageUrl: org?.imageUrl ?? null,
    attention: !member.xqSubmissionId || !member.rqSubmissionId,
  };
}

function RosterShell({
  member,
  org,
  headerProfile,
  title,
  subtitle,
  children,
}: {
  member: StudioMember;
  org: StudioOrgProfile | null;
  headerProfile: { initial: string; imageUrl: string | null; attention: boolean };
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <StudioHeader activeTab="roster" profile={headerProfile} />
      <main className={styles.dashMain}>
        <StudioNotices member={member} org={org} />
        <p className={styles.dashGreeting}>
          Welcome back, {member.firstName?.trim() || member.displayName}.
        </p>
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
    <article className={styles.creatorCard}>
      <div className={styles.creatorCardHead}>
        <RosterAvatar url={creator.avatarUrl} name={creator.name} size={56} />
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
function RosterAvatar({
  url,
  name,
  size,
}: {
  url: string | null;
  name: string;
  size: number;
}) {
  if (url) {
    return (
      <Image
        src={url}
        alt={name}
        width={size}
        height={size}
        className={styles.rosterAvatar}
        style={{ width: size, height: size }}
        unoptimized
      />
    );
  }
  return (
    <div
      className={styles.rosterInitial}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </div>
  );
}

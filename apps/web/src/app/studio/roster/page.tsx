import Image from "next/image";
import { redirect } from "next/navigation";

/** Roster is auth-scoped — no static output possible. */
export const dynamic = "force-dynamic";

import { loadCurrentStudioMember, type StudioMember } from "@/lib/studio-auth";
import {
  formatListens,
  loadBrandRecommendations,
  loadMarketplaceBrands,
  loadMarketplaceCreators,
  type MarketplaceCreator,
} from "@/lib/studio-data";

import { StudioHeader } from "../StudioHeader";
import { StudioNotices } from "../StudioNotices";
import { BrandProfileCard } from "./BrandProfileCard";
import styles from "../studio.module.css";

/** /studio/roster — who's on the network.
 *
 *  Brand roster (creator/other viewers): one horizontal row of flat,
 *  simplified cards — no outline, no 3D coverflow, no heavy shadow
 *  work. The GhostSignal team's hand-picked recommendations for this
 *  member lead the row with the "✦ GhostSignal Pick" badge.
 *
 *  Creator roster (brand viewers): the scannable directory grid. */
export default async function StudioRosterPage() {
  const member = await loadCurrentStudioMember();
  if (!member) redirect("/studio/login");
  if (!member.isApproved) redirect("/studio/pending");

  const headerProfile = profileBadge(member);

  if (member.kind === "brand") {
    const creators = await loadMarketplaceCreators(member.xqArchetype);
    return (
      <RosterShell
        member={member}
        headerProfile={headerProfile}
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

  return (
    <RosterShell
      member={member}
      headerProfile={headerProfile}
      title="Brand roster"
      subtitle={
        pickCount > 0
          ? `The GhostSignal team picked ${pickCount === 1 ? "one brand" : `${pickCount} brands`} for you — they lead the row, marked ✦ GhostSignal Pick.`
          : "Every brand on the network. Scroll the row to browse."
      }
    >
      {ordered.length === 0 ? (
        <EmptyRoster side="brands" />
      ) : (
        <div className={styles.deckRow}>
          {ordered.map((b) => (
            <BrandProfileCard
              key={b.id}
              brand={b}
              recommended={recPosition.has(b.id)}
            />
          ))}
        </div>
      )}
    </RosterShell>
  );
}

/* ============================================================
 * Shell + shared pieces
 * ============================================================ */

/** Header avatar shortcut: member initial + attention dot while any
 *  onboarding gap is open (XQ, RQ — profile gaps surface via the
 *  notices, which run their own org query). */
function profileBadge(member: StudioMember) {
  return {
    initial: member.displayName.trim().charAt(0).toUpperCase() || "?",
    attention: !member.xqSubmissionId || !member.rqSubmissionId,
  };
}

function RosterShell({
  member,
  headerProfile,
  title,
  subtitle,
  children,
}: {
  member: StudioMember;
  headerProfile: { initial: string; attention: boolean };
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <StudioHeader activeTab="roster" profile={headerProfile} />
      <main className={styles.dashMain}>
        <StudioNotices member={member} />
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

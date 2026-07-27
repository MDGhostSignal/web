import Image from "next/image";
import { redirect } from "next/navigation";

/** Roster is auth-scoped — no static output possible. */
export const dynamic = "force-dynamic";

import { loadCurrentStudioMember } from "@/lib/studio-auth";
import {
  formatListens,
  loadMarketplaceBrands,
  loadMarketplaceCreators,
  type MarketplaceBrand,
  type MarketplaceCreator,
} from "@/lib/studio-data";

import { StudioHeader } from "../StudioHeader";
import styles from "../studio.module.css";

/** /studio/roster — the plain-directory view of the other side of
 *  the marketplace. Same data and same side-selection rule as
 *  /studio/marketplace (brands see creators, everyone else sees
 *  brands), but rendered as a scannable grid instead of the
 *  one-at-a-time deck: this is the "who's on the network" roster,
 *  the deck is the matching flow. */
export default async function StudioRosterPage() {
  const member = await loadCurrentStudioMember();
  if (!member) redirect("/studio/login");
  if (!member.isApproved) redirect("/studio/pending");

  const showCreators = member.kind === "brand";
  const [brands, creators] = showCreators
    ? [[], await loadMarketplaceCreators(member.xqArchetype)]
    : [await loadMarketplaceBrands(member.xqArchetype), []];
  const count = showCreators ? creators.length : brands.length;

  return (
    <>
      <StudioHeader activeTab="roster" />
      <main className={styles.dashMain}>
        <h1 className={styles.dashWelcome}>
          {showCreators ? "Creator roster" : "Brand roster"}
        </h1>
        <p className={styles.dashSubtitle}>
          {showCreators
            ? "Every show on the GhostSignal network. For value-ranked matching, use the Marketplace deck."
            : "Brands partnering through GhostSignal. For value-ranked matching, use the Marketplace deck."}
        </p>

        {count === 0 ? (
          <div className={styles.dashCard}>
            <div className={styles.dashCardLabel}>Roster</div>
            <div className={styles.dashCardValue}>Nobody here yet</div>
            <div className={styles.dashCardHint}>
              As {showCreators ? "creators" : "brands"} join the network,
              they&apos;ll appear here.
            </div>
          </div>
        ) : (
          <div className={styles.rosterGrid}>
            {showCreators
              ? creators.map((c) => <CreatorCard key={c.id} creator={c} />)
              : brands.map((b) => <BrandCard key={b.id} brand={b} />)}
          </div>
        )}
      </main>
    </>
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

function BrandCard({ brand }: { brand: MarketplaceBrand }) {
  return (
    <article className={styles.rosterCard}>
      <div className={styles.rosterCardHead}>
        <RosterAvatar url={brand.logoUrl} name={brand.name} />
        <div>
          <div className={styles.rosterName}>{brand.name}</div>
          {brand.website && (
            <a
              className={styles.rosterMeta}
              href={brand.website}
              target="_blank"
              rel="noopener noreferrer"
            >
              {brand.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
          )}
        </div>
      </div>
      {brand.description && (
        <p className={styles.rosterDesc}>{brand.description}</p>
      )}
      {brand.contactArchetype && (
        <span className={styles.rosterChip}>{brand.contactArchetype}</span>
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

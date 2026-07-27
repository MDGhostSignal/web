"use client";

import Image from "next/image";
import { useState } from "react";

import { CHARACTERS } from "@/lib/xq/characters";
import { ARCHETYPES, type ArchetypeCode } from "@/lib/xq/constants";

import styles from "../studio.module.css";

/** Serializable card data the server page hands the browser. */
export type RosterBrandCard = {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  sinceYear: number | null;
  archetype: string | null;
  matchScore: number | null;
  recommended: boolean;
};

/**
 * Brand roster browser — a row of welcome-card business cards (the
 * digital twin of the physical GhostSignal Welcome Box card, same
 * construction as admin's mmWelcomeCard: black 1.6:1 body, five
 * diagonal brand stripes, plastic shine, logo top-left, GS wordmark
 * bottom-right) with a click-through detail panel underneath.
 *
 * The card face carries only the short story: logo, name, Member
 * Since, tagline. Everything extensive (full description, website,
 * archetype read, values fit) lives in the detail panel that opens
 * when a card is selected.
 */
/** Cards revealed initially / added per "Show more" click. Two-ish
 *  rows on a typical desktop grid — the grid fills the width, and
 *  the list extends by button instead of any scrollbar. */
const PAGE_SIZE = 8;

export function BrandCardBrowser({ brands }: { brands: RosterBrandCard[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const selected = brands.find((b) => b.id === selectedId) ?? null;
  const visible = brands.slice(0, visibleCount);
  const hiddenCount = brands.length - visible.length;

  return (
    <>
      <div className={styles.wcGrid}>
        {visible.map((b) => (
          <WelcomeCard
            key={b.id}
            brand={b}
            active={b.id === selectedId}
            onSelect={() =>
              setSelectedId((cur) => (cur === b.id ? null : b.id))
            }
          />
        ))}
      </div>
      {hiddenCount > 0 && (
        <button
          type="button"
          className={styles.wcShowMore}
          onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
        >
          Show {Math.min(hiddenCount, PAGE_SIZE)} more of {hiddenCount}
        </button>
      )}
      {selected && <BrandDetail brand={selected} />}
    </>
  );
}

function WelcomeCard({
  brand,
  active,
  onSelect,
}: {
  brand: RosterBrandCard;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.wcCard} ${styles.rosterCard} ${active ? styles.wcCardActive : ""}`}
      onClick={onSelect}
      aria-expanded={active}
      aria-label={`${brand.name} — ${active ? "hide" : "show"} details`}
    >
      {brand.logoUrl ? (
        <Image
          src={brand.logoUrl}
          alt=""
          width={72}
          height={72}
          className={styles.wcLogo}
          unoptimized
        />
      ) : (
        <span className={styles.wcLogoEmpty} aria-hidden="true">
          {brand.name.trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}

      {brand.recommended && (
        <span className={styles.wcPick}>✦ GS Pick</span>
      )}

      <span className={styles.wcText}>
        <span className={styles.wcName}>{brand.name}</span>
        {brand.sinceYear !== null && (
          <span className={styles.wcSince}>Member Since {brand.sinceYear}</span>
        )}
        {brand.tagline && (
          <span className={styles.wcTagline}>{brand.tagline}</span>
        )}
      </span>
    </button>
  );
}

function BrandDetail({ brand }: { brand: RosterBrandCard }) {
  const code = brand.archetype as ArchetypeCode | null;
  const identity = code ? CHARACTERS[code] : null;
  const archetypeDef = code ? ARCHETYPES[code] : null;

  return (
    <section
      className={styles.wcDetail}
      style={
        {
          "--bp-accent": identity?.accent ?? "var(--studio-accent)",
        } as React.CSSProperties
      }
      aria-label={`${brand.name} details`}
    >
      <header className={styles.wcDetailHead}>
        <div>
          <h2 className={styles.wcDetailName}>{brand.name}</h2>
          {brand.tagline && (
            <p className={styles.wcDetailTagline}>{brand.tagline}</p>
          )}
        </div>
        {brand.recommended && (
          <span className={styles.wcDetailPickNote}>
            ✦ Hand-picked for you by the GhostSignal team
          </span>
        )}
      </header>

      {brand.description ? (
        <p className={styles.wcDetailAbout}>{brand.description}</p>
      ) : (
        <p className={styles.wcDetailAboutEmpty}>
          This brand hasn&apos;t written their full story yet.
        </p>
      )}

      <div className={styles.wcDetailMeta}>
        {brand.website && (
          <a
            className={styles.wcDetailSite}
            href={brand.website}
            target="_blank"
            rel="noopener noreferrer"
          >
            {brand.website.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗
          </a>
        )}
        <span className={styles.bpArchetype}>
          <i className={styles.bpArchetypeDot} aria-hidden="true" />
          {archetypeDef
            ? `${archetypeDef.name} — ${archetypeDef.tagline}`
            : "Unclassified"}
        </span>
        {brand.matchScore != null && (
          <span
            className={styles.bpFit}
            title={`${brand.matchScore} of 3 XQ axes shared with you`}
          >
            <span className={styles.bpFitLabel}>Values fit</span>
            {[0, 1, 2].map((i) => (
              <i
                key={i}
                className={`${styles.bpFitDot} ${i < (brand.matchScore ?? 0) ? styles.bpFitDotOn : ""}`}
                aria-hidden="true"
              />
            ))}
          </span>
        )}
      </div>
    </section>
  );
}

import Image from "next/image";

import { CHARACTERS } from "@/lib/xq/characters";
import { ARCHETYPES, type ArchetypeCode } from "@/lib/xq/constants";
import type { MarketplaceBrand } from "@/lib/studio-data";

import styles from "../studio.module.css";

/**
 * Brand profile card — the roster's static presentation of a brand.
 * Borrows the marketplace card's visual language (per-archetype accent
 * from lib/xq/characters, structured identity) without the swipe/deck
 * mechanic: an accent-tinted identity band with the logo, then name,
 * website, description, and an archetype + values-fit footer.
 *
 * Flat by design: no outline, no shadow, no 3D. The archetype accent
 * arrives via two CSS vars so the module stays theme-safe.
 */
export function BrandProfileCard({
  brand,
  recommended,
}: {
  brand: MarketplaceBrand;
  recommended: boolean;
}) {
  const code = brand.contactArchetype as ArchetypeCode | null;
  const identity = code ? CHARACTERS[code] : null;
  const archetypeName = code ? ARCHETYPES[code]?.name : null;

  return (
    <article
      className={styles.bpCard}
      style={
        {
          "--bp-accent": identity?.accent ?? "var(--studio-accent)",
          "--bp-accent-soft":
            identity?.accentSoft ?? "var(--studio-accent-soft)",
        } as React.CSSProperties
      }
    >
      <div className={styles.bpBand}>
        {brand.logoUrl ? (
          <Image
            src={brand.logoUrl}
            alt={brand.name}
            width={64}
            height={64}
            className={styles.bpLogo}
            unoptimized
          />
        ) : (
          <div className={styles.bpLogoFallback} aria-hidden>
            {brand.name.trim().charAt(0).toUpperCase() || "?"}
          </div>
        )}
        {recommended && (
          <span className={styles.bpPick}>✦ GhostSignal Pick</span>
        )}
      </div>

      <div className={styles.bpBody}>
        <h3 className={styles.bpName}>{brand.name}</h3>
        {brand.website && (
          <a
            className={styles.bpSite}
            href={brand.website}
            target="_blank"
            rel="noopener noreferrer"
          >
            {brand.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </a>
        )}
        {brand.description && (
          <p className={styles.bpDesc}>{brand.description}</p>
        )}
      </div>

      <div className={styles.bpFooter}>
        <span className={styles.bpArchetype}>
          <i className={styles.bpArchetypeDot} aria-hidden="true" />
          {archetypeName ?? "Unclassified"}
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
    </article>
  );
}

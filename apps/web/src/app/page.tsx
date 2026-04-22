"use client";

import Link from "next/link";

import { SiteHeader } from "@/components/SiteHeader";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";

import styles from "./page.module.css";
import { navLinks } from "@/lib/nav";

const HOME_IMG_PREFIX = "/images/home/";

/**
 * 6 grid slots (2 rows × 3 cols, left-to-right, top-to-bottom). Each value
 * is a base filename under `public/images/home/` — the code appends `.webm`
 * + `-optimized.mp4`. Leave `null` for empty cells; fill in as videos are
 * delivered + transcoded.
 */
const GRID_SLOTS: (string | null)[] = [
  "desktop", "cloudblack", "city",
  "ship2", "country", "twoclouds",
];

export default function LegacyHomePage() {
  return (
    <main className={styles.legacyHome}>
      <SiteHeader links={navLinks} animateIn />

      {/* Temporary Design Feedback Button */}
      <Link href="/design-tasks" className={styles.designFeedbackBtn}>
        DESIGN Feedback
      </Link>

      {/* 2-row × 3-col grid background — cells filled as videos are
          delivered. Slot index is left-to-right, top-to-bottom (1..6). */}
      <div className={styles.cloudBackground} aria-hidden="true">
        {GRID_SLOTS.map((slot, i) => (
          <div key={i} className={styles.gridCell} data-slot={i + 1}>
            {slot && (
              <video
                className={styles.gridCellVideo}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                disablePictureInPicture
              >
                <source src={HOME_IMG_PREFIX + slot + ".webm"} type="video/webm" />
                <source src={HOME_IMG_PREFIX + slot + "-optimized.mp4"} type="video/mp4" />
              </video>
            )}
          </div>
        ))}
      </div>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <h1 className={styles.heroHeadline}>
          <SplitLinesReveal duration={1.8} stagger={0.25} className={styles.heroLine}>
            <span>
              <span className={styles.heroHeadlineBrand}>
                <span className={styles.heroGhost}>GHOST</span>
                <span className={styles.heroSignal}>Signal</span>
              </span>
              {" "}is for people
            </span>
          </SplitLinesReveal>
          <SplitLinesReveal duration={1.8} stagger={0.25} delay={1.5} className={styles.heroLine}>
            <span>who are making the world.</span>
          </SplitLinesReveal>
        </h1>

        <ScrollFadeUp index={0} duration={1.4} delay={3.0} start="top 90%">
          <p className={styles.heroSubtitle}>
            Soulful partnerships for podcasters and advertisers who care
          </p>
        </ScrollFadeUp>

        <ScrollFadeUp index={1} duration={1.4} delay={3.0} start="top 90%">
          <Link href="/what-is-this" className={styles.ctaButton}>
            Learn more
          </Link>
        </ScrollFadeUp>
      </section>
    </main>
  );
}

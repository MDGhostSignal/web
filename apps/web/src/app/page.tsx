"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

import { SiteHeader } from "@/components/SiteHeader";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";

// FogOverlay is a purely decorative WebGL layer — load it after the page
// has hydrated so it doesn't block the hero's initial paint.
const FogOverlay = dynamic(() => import("./FogOverlay"), { ssr: false });

import styles from "./page.module.css";
import { navLinks } from "@/lib/nav";

export default function LegacyHomePage() {
  return (
    <main className={styles.legacyHome}>
      <SiteHeader links={navLinks} animateIn />

      {/* Temporary Design Feedback Button */}
      <Link href="/design-tasks" className={styles.designFeedbackBtn}>
        DESIGN Feedback
      </Link>

      {/* Cloud Video Background */}
      <div className={styles.cloudBackground} aria-hidden="true">
        <video
          className={styles.cloudVideo}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
        >
          {/* VP9/WebM first (Chrome, Edge, Firefox) — ~1.7 MB. */}
          <source src="/images/home/desktopblankcloud2.webm" type="video/webm" />
          {/* H.264 MP4 fallback (Safari / older browsers) — ~3 MB. */}
          <source src="/images/home/desktopblankcloud2-optimized.mp4" type="video/mp4" />
        </video>
        <div className={styles.cloudOverlay} />
        <FogOverlay className={styles.fogOverlay} />
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

"use client";

import Link from "next/link";

import { SiteHeader } from "@/components/SiteHeader";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";

import styles from "./page.module.css";

const navLinks = [
  { href: "/what-is-this", label: "What is this" },
  { href: "/for-creators", label: "For Creators" },
  { href: "/for-advertisers", label: "For Advertisers" },
  { href: "/who-are-we", label: "Who Are We" },
  { href: "/snowdrift", label: "SNOWDRIFT" },
  { href: "/get-in-touch", label: "Get In Touch" },
] as const;

export default function LegacyHomePage() {
  return (
    <main className={styles.legacyHome}>
      <SiteHeader links={navLinks} />

      {/* Cloud Video Background */}
      <div className={styles.cloudBackground} aria-hidden="true">
        <video
          className={styles.cloudVideo}
          src="/images/home/desktopblankcloud2.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
        />
        <div className={styles.cloudOverlay} />
      </div>

      {/* Hero Section */}
      <section className={styles.heroSection}>
        <SplitLinesReveal duration={1.8} stagger={0.25}>
          <h1 className={styles.heroHeadline}>
            <span className={styles.heroHeadlineBrand}>
              <span className={styles.heroGhost}>GHOST</span>
              <span className={styles.heroSignal}>Signal</span>
            </span>
            {" "}is for people
            <br />
            who are making the world.
          </h1>
        </SplitLinesReveal>

        <ScrollFadeUp index={0} duration={1.4} start="top 90%">
          <p className={styles.heroSubtitle}>
            Soulful partnerships for podcasters and advertisers who care
          </p>
        </ScrollFadeUp>

        <ScrollFadeUp index={1} duration={1.4} start="top 90%">
          <Link href="/what-is-this" className={styles.ctaButton}>
            Learn more
          </Link>
        </ScrollFadeUp>
      </section>
    </main>
  );
}

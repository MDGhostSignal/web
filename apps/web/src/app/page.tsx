"use client";

import Link from "next/link";
import { useEffect } from "react";

import { SiteHeader } from "@/components/SiteHeader";
import { Section } from "@/components/layout";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";

import { HomeTypingHero } from "./HomeTypingLoop";
import styles from "./page.module.css";
import { navLinks } from "@/lib/nav";

const HOME_IMG_PREFIX = "/images/home/";
const HERO_VIDEO_SLOT = "desktop";

export default function LegacyHomePage() {
  // The homepage is a full-bleed black video backdrop. Two global
  // pieces work against that: (a) scrollbar-gutter:stable on html
  // reserves ~15px on the right so fixed/right:0 stops short of the
  // viewport edge, and (b) body's default white shows through any
  // hairline gap. For this page only, drop the gutter and force
  // html+body black so the video reaches every edge. Reverted on
  // unmount — every other page keeps its global behaviour.
  useEffect(() => {
    const htmlEl = document.documentElement;
    const prev = {
      htmlBg: htmlEl.style.backgroundColor,
      bodyBg: document.body.style.backgroundColor,
      gutter: htmlEl.style.scrollbarGutter,
    };
    htmlEl.style.backgroundColor = "#000";
    htmlEl.style.scrollbarGutter = "auto";
    document.body.style.backgroundColor = "#000";
    return () => {
      htmlEl.style.backgroundColor = prev.htmlBg;
      htmlEl.style.scrollbarGutter = prev.gutter;
      document.body.style.backgroundColor = prev.bodyBg;
    };
  }, []);

  return (
    <main className={styles.page}>
      <SiteHeader links={navLinks} animateIn />

      {/* Top-right admin entry — a single pill that drops straight
         into the CRM. Internal tooling (RQ responses, design tasks)
         lives in the admin tabs inside /admin/*. */}
      <div className={styles.adminButtonRow}>
        <Link href="/admin/leads" className={styles.crmBtn}>
          CRM
        </Link>
      </div>

      {/* Single centered hero video — natural size, padded frame. */}
      <div className={styles.cloudBackground} aria-hidden="true">
        <video
          className={styles.heroVideo}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
        >
          <source src={HOME_IMG_PREFIX + HERO_VIDEO_SLOT + ".webm"} type="video/webm" />
          <source src={HOME_IMG_PREFIX + HERO_VIDEO_SLOT + "-optimized.mp4"} type="video/mp4" />
        </video>
      </div>

      {/* Hero Section */}
      <Section className={styles.heroSection}>
        <h1 className={styles.heroHeadline}>
          <HomeTypingHero />
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
      </Section>
    </main>
  );
}

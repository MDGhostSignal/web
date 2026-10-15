"use client";

import { SiteHeader } from "@/components/SiteHeader";
import { Section } from "@/components/layout";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";

import styles from "../../for-advertisers/page.module.css";
import ForAdvertisersPage from "../../for-advertisers/page";
import { previewNavLinks } from "../nav";
import preview from "./preview.module.css";

/**
 * Preview of the For Advertisers hero. The live page is unchanged.
 */
export default function AdvertisersHeroPreviewPage() {
  return (
    <main className={preview.page}>
      <SiteHeader links={previewNavLinks} />
      <div className={styles.staticOverlay} aria-hidden="true" />
      <Section className={preview.hero}>
        <div className={preview.videoWrap}>
          <img
            className={preview.video}
            src="/images/preview/football-player.jpg"
            alt=""
          />
        </div>
        <div className={styles.heroContent}>
          <h1 className={styles.heroHeadline}>
            <SplitLinesReveal duration={2.2}>The right audience</SplitLinesReveal>
            <SplitLinesReveal duration={2.2} delay={0.3}>
              changes
            </SplitLinesReveal>
            <SplitLinesReveal duration={2.2} delay={0.6}>
              everything.
            </SplitLinesReveal>
          </h1>
          <ScrollFadeUp index={1} duration={1.8}>
            <p className={styles.heroSubhead}>
              The fear is spending into the void. We zoom you in on your
              people — from a city of strangers to a seat at a friend&apos;s
              house, from anonymity to personal knowledge. The spend should
              feel like: I saw this, and I thought of you.
            </p>
          </ScrollFadeUp>
        </div>
      </Section>
      <ForAdvertisersPage
        showHeader={false}
        showHero={false}
        showGraphs={false}
        previewCopy
      />
    </main>
  );
}

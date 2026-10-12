"use client";

import dynamic from "next/dynamic";

import { SiteHeader } from "@/components/SiteHeader";
import { Section } from "@/components/layout";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";
import { navLinks } from "@/lib/nav";

import styles from "../../for-advertisers/page.module.css";
import preview from "./preview.module.css";

const HeroPollen = dynamic(() => import("../../for-advertisers/HeroPollen"), {
  ssr: false,
});

/**
 * Local preview of the For Advertisers hero with the Cloud of Glory loop.
 * Not linked from navigation. The live /for-advertisers page is unchanged.
 */
export default function AdvertisersHeroPreviewPage() {
  return (
    <main className={preview.page}>
      <SiteHeader links={navLinks} />
      <div className={styles.staticOverlay} aria-hidden="true" />
      <Section className={preview.hero}>
        <div className={preview.videoWrap}>
          <video
            className={preview.video}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            aria-hidden="true"
          >
            <source
              src="/images/preview/advertisers-glory-drift-1080-45s.mp4"
              type="video/mp4"
            />
          </video>
        </div>
        <div className={styles.heroPollenLayer} style={{ transform: "none" }}>
          <HeroPollen />
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
              We help you reach the right audience by pairing your brand with
              creators who share your convictions. When alignment is authentic,
              trust flows naturally — and{" "}
              <strong>trust is the soil where conversion grows.</strong>
            </p>
          </ScrollFadeUp>
        </div>
      </Section>
    </main>
  );
}

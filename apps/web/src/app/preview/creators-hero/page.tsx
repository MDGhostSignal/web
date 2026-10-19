"use client";

import Image from "next/image";

import { SiteHeader } from "@/components/SiteHeader";
import { Section } from "@/components/layout";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";
import { previewNavLinks } from "../nav";

import styles from "../../for-creators/page.module.css";
import ForCreatorsPage from "../../for-creators/page";
import preview from "./preview.module.css";

/**
 * Local preview of the For Creators hero.
 * Not linked from navigation. The live /for-creators page is unchanged.
 */
export default function CreatorsHeroPreviewPage() {
  return (
    <main className={styles.page}>
      <SiteHeader links={previewNavLinks} />
      <div className={styles.staticOverlay} aria-hidden="true" />
      <Section className={`${styles.hero} ${preview.hero}`}>
        <div className={`${styles.heroVideoWrapper} ${preview.frame}`}>
          <img
            className={preview.still}
            src="/images/preview/creators-suburban-tree.jpg"
            alt=""
          />
        </div>
        <div className={styles.heroContent}>
          <ScrollFadeUp index={0} duration={1.4} distance={24}>
            <div className={styles.heroLogos}>
              <Image
                src="/images/for-creators/lettermark-white.png"
                alt=""
                width={30}
                height={30}
                className={styles.heroLogo}
              />
              <Image
                src="/images/for-creators/lettermark-white.png"
                alt=""
                width={30}
                height={30}
                className={styles.heroLogo}
              />
              <Image
                src="/images/for-creators/lettermark-white.png"
                alt="GhostSignal"
                width={30}
                height={30}
                className={styles.heroLogo}
              />
            </div>
          </ScrollFadeUp>
          <h1 className={styles.heroHeadline}>
            <SplitLinesReveal duration={2.2}>Trust is everything.</SplitLinesReveal>
            <SplitLinesReveal duration={2.2} delay={0.35}>
              Partnerships that honor your voice
            </SplitLinesReveal>
            <SplitLinesReveal duration={2.2} delay={0.7}>
              and your audience thank you for.
            </SplitLinesReveal>
          </h1>
          <div className={`${styles.heroSubhead} ${preview.subhead}`}>
            <span className={preview.subheadLine}>When good creators partner with good brands,</span>
            <span className={preview.subheadLine}>the world is made in the right direction.</span>
          </div>
        </div>
      </Section>
      <ForCreatorsPage
        showHeader={false}
        showHero={false}
        showGraphs={false}
        previewCopy
      />
    </main>
  );
}

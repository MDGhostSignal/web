"use client";

import Image from "next/image";
import { useRef } from "react";

import { SiteHeader } from "@/components/SiteHeader";
import { Section } from "@/components/layout";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";
import { gsap } from "@/motion/gsap";
import { useIsomorphicLayoutEffect } from "@/motion/useIsomorphicLayoutEffect";
import { previewNavLinks } from "../nav";

import styles from "../../for-creators/page.module.css";
import ForCreatorsPage from "../../for-creators/page";
import preview from "./preview.module.css";

/**
 * Local preview of the For Creators hero.
 * Not linked from navigation. The live /for-creators page is unchanged.
 */
export default function CreatorsHeroPreviewPage() {
  const heroVideoWrapperRef = useRef<HTMLDivElement>(null);
  const heroStillRef = useRef<HTMLImageElement>(null);

  useIsomorphicLayoutEffect(() => {
    const wrapper = heroVideoWrapperRef.current;
    const still = heroStillRef.current;
    if (!wrapper || !still) return;

    const stillTween = gsap.fromTo(
      still,
      { opacity: 1 },
      {
        opacity: 0,
        ease: "power1.inOut",
        scrollTrigger: {
          trigger: wrapper,
          start: "top top",
          end: "+=140%",
          scrub: 1,
        },
      },
    );

    return () => {
      stillTween.scrollTrigger?.kill();
      stillTween.kill();
    };
  }, []);

  return (
    <main className={styles.page}>
      <SiteHeader links={previewNavLinks} />
      <div className={styles.staticOverlay} aria-hidden="true" />
      <Section className={`${styles.hero} ${preview.hero}`}>
        <div
          ref={heroVideoWrapperRef}
          className={`${styles.heroVideoWrapper} ${preview.frame}`}
        >
          <img
            ref={heroStillRef}
            className={preview.still}
            src="/images/preview/creators-suburban-tree.jpg"
            alt=""
          />
        </div>
        <div className={styles.heroContent}>
          <div className={styles.heroLogosSpacer} aria-hidden="true" />
          <h1 className={styles.heroHeadline}>
            <SplitLinesReveal duration={2.2}>Your podcast is</SplitLinesReveal>
            <SplitLinesReveal duration={2.2} delay={0.35}>
              Cultural architecture.
            </SplitLinesReveal>
            <SplitLinesReveal duration={2.2} delay={0.7}>
              You are building the future.
            </SplitLinesReveal>
          </h1>
          <ScrollFadeUp index={1} duration={1.4} distance={24}>
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
          <div className={styles.heroSubhead}>
            <SplitLinesReveal duration={1.8}>
              Good people, good brands,
            </SplitLinesReveal>
            <SplitLinesReveal duration={1.8} delay={0.3}>
              a net good.
            </SplitLinesReveal>
            <SplitLinesReveal duration={1.8} delay={0.6}>
              Your audience thanks you for
            </SplitLinesReveal>
          </div>
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
                alt=""
                width={30}
                height={30}
                className={styles.heroLogo}
              />
            </div>
          </ScrollFadeUp>
          <div className={styles.heroBodyGrid}>
            <ScrollFadeUp duration={1.8}>
              <p className={styles.heroBodyText}>
                Keep the trust you already have. We connect you with brands that are a net good, the kind your audience thanks you for.
              </p>
            </ScrollFadeUp>
            <ScrollFadeUp duration={1.8} delay={0.4}>
              <p className={styles.heroBodyText}>
                You stay yourself. You make money. The relationship gets stronger.
              </p>
            </ScrollFadeUp>
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

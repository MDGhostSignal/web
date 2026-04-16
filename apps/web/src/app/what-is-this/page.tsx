"use client";

import { useRef } from "react";
import Image from "next/image";

import { SiteHeader } from "@/components/SiteHeader";
import { ScrollScenes } from "@/components/ScrollScenes";
import { ParallaxBackground } from "@/components/ParallaxBackground";
import { Footer } from "@/components/Footer";
import { BrandedGhostSignal } from "@/components/BrandedGhostSignal";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";
import { gsap } from "@/motion/gsap";
import { useIsomorphicLayoutEffect } from "@/motion/useIsomorphicLayoutEffect";

import styles from "./page.module.css";

const navLinks = [
  { href: "/what-is-this", label: "What is this" },
  { href: "/for-creators", label: "For Creators" },
  { href: "/for-advertisers", label: "For Advertisers" },
  { href: "/who-are-we", label: "Who Are We" },
  { href: "/snowdrift", label: "SNOWDRIFT" },
  { href: "/get-in-touch", label: "Get In Touch" },
] as const;

export default function WhatIsThisPage() {
  const heroWrapperRef = useRef<HTMLDivElement>(null);
  const whitePanelRef = useRef<HTMLDivElement>(null);
  const imagePanelRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const heroWrapper = heroWrapperRef.current;
    const whitePanel = whitePanelRef.current;
    const imagePanel = imagePanelRef.current;

    if (!heroWrapper || !whitePanel || !imagePanel) return;

    // Create scroll-triggered animation for the split panels
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: heroWrapper,
        start: "top top",
        end: "bottom top",
        scrub: 1,
        pin: false,
      },
    });

    // Animate white panel to the left
    tl.to(whitePanel, {
      xPercent: -100,
      ease: "none",
    }, 0);

    // Animate image panel to the right
    tl.to(imagePanel, {
      xPercent: 100,
      ease: "none",
    }, 0);

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  return (
    <main className={styles.page}>
      <SiteHeader links={navLinks} />

      {/* Parallax background - visible after hero slides away */}
      <ParallaxBackground
        imageSrc="/images/what-is-this/clouds-bg.jpg"
        speed={0.3}
      />

      {/* Split-screen Hero Section */}
      <div ref={heroWrapperRef} className={styles.splitHeroWrapper}>
        {/* White left panel with text */}
        <div ref={whitePanelRef} className={styles.splitHeroLeft}>
          <div className={styles.splitHeroTextContainer}>
            {/* Top logo row */}
            <div className={styles.logoRow}>
              <Image
                src="/images/what-is-this/lettermark-black.png"
                alt=""
                width={24}
                height={24}
                className={styles.framingLogo}
              />
              <Image
                src="/images/what-is-this/lettermark-black.png"
                alt=""
                width={24}
                height={24}
                className={styles.framingLogo}
              />
              <Image
                src="/images/what-is-this/lettermark-black.png"
                alt=""
                width={24}
                height={24}
                className={styles.framingLogo}
              />
            </div>

            <h1 className={styles.splitHeroHeadline}>
              <SplitLinesReveal duration={1.8} stagger={0.25} className={styles.headlineLine}>
                <span>The values-based podcast</span>
              </SplitLinesReveal>
              <SplitLinesReveal duration={1.8} stagger={0.25} delay={1.5} className={styles.headlineLine}>
                <span>Advertising network</span>
              </SplitLinesReveal>
            </h1>

            <h3 className={styles.splitHeroSubtitle}>
              <SplitLinesReveal duration={1.4} stagger={0.2} delay={2.6} className={styles.subtitleLine}>
                <span>We create partnerships that feel good.</span>
              </SplitLinesReveal>
              <SplitLinesReveal duration={1.4} stagger={0.2} delay={3.0} className={styles.subtitleLine}>
                <span>Because they are good.</span>
              </SplitLinesReveal>
            </h3>

          </div>
        </div>

        {/* Image right panel */}
        <div ref={imagePanelRef} className={styles.splitHeroRight}>
          <Image
            src="/images/what-is-this/top.jpg"
            alt="GhostSignal values-based advertising"
            fill
            className={styles.splitHeroImage}
            priority
          />
          {/* Static flicker overlay */}
          <div className={styles.staticFlicker} aria-hidden="true" />
        </div>
      </div>

      {/* Globe Background Container */}
      <div className={styles.globeWrapper}>
        {/* Centered decorative bars */}
        <div className={styles.decorativeBars}>
          <Image
            src="/images/what-is-this/color-bars.png"
            alt=""
            width={652}
            height={7548}
            className={styles.barsImage}
            aria-hidden="true"
          />
        </div>

        {/* Scrolling Content Over Globe */}
        <div className={styles.scrollContent}>
          {/* Section 2: Advertising Harmony */}
          <section className={styles.harmonySection}>
            {/* Headline centered */}
            <div className={styles.centeredHeadlineContainer}>
              {/* Animated overlapping circles behind headline */}
              <div className={styles.harmonyCircles} aria-hidden="true">
                <div className={styles.harmonyCircle1} />
                <div className={styles.harmonyCircle2} />
              </div>
              <h2 className={styles.sectionHeadline}>
                <SplitLinesReveal duration={1.8} stagger={0.25} className={styles.headlineLine}>
                  <span>What if</span>
                </SplitLinesReveal>
                <SplitLinesReveal duration={1.8} stagger={0.25} className={styles.headlineLine}>
                  <span>advertising</span>
                </SplitLinesReveal>
                <SplitLinesReveal duration={1.8} stagger={0.25} className={styles.headlineLine}>
                  <span>could make</span>
                </SplitLinesReveal>
                <SplitLinesReveal duration={1.8} stagger={0.25} className={styles.headlineLine}>
                  <span>harmony</span>
                </SplitLinesReveal>
              </h2>
            </div>
            {/* Body text centered on page, left-aligned inside */}
            <div className={styles.centeredBodyContainer}>
              <ScrollFadeUp index={0} duration={1.6}>
                <p className={styles.sectionBody}>
                  Using this shared values matrix, we connect podcasters and brands who believe in the same things about people, purpose, moral imagination, and meaning. Our values determine the kind of world we are making and when we share values we are all building in the same direction to the world we want.
                </p>
              </ScrollFadeUp>
              <ScrollFadeUp index={1} duration={1.6}>
                <p className={styles.sectionBody}>
                  We go beyond algorithmic targeting to find deep human connection. This is genuine alignment: creators keep their voice, brands keep their conviction, and audiences feel harmony instead of interruption.
                </p>
              </ScrollFadeUp>
            </div>
          </section>

          {/* Section 3: Values Create Value - LEFT */}
          <section className={`${styles.textSection} ${styles.alignLeft}`}>
            <div className={styles.textContainer}>
              <h2 className={styles.sectionHeadline}>
                <SplitLinesReveal duration={1.8} stagger={0.25} className={styles.headlineLine}>
                  <span>Values</span>
                </SplitLinesReveal>
                <SplitLinesReveal duration={1.8} stagger={0.25} className={styles.headlineLine}>
                  <span>Create</span>
                </SplitLinesReveal>
                <SplitLinesReveal duration={1.8} stagger={0.25} className={styles.headlineLine}>
                  <span>Value</span>
                </SplitLinesReveal>
              </h2>
              <ScrollFadeUp index={0} duration={1.6}>
                <p className={styles.sectionBody}>
                  When a partnership shares soul, trust flows naturally. Trust becomes resonance. Resonance drives results. 75% of listeners happily pay more for brands that feel right (Edelman 2025) and shared loves create deep lasting trust that low-trust systems can never match.
                </p>
              </ScrollFadeUp>
            </div>
          </section>

          {/* Section 4: Who is GhostSignal - RIGHT */}
          <section className={`${styles.textSection} ${styles.alignRight}`}>
            <div className={styles.textContainer}>
              <h2 className={styles.sectionHeadline}>
                <SplitLinesReveal duration={1.8} stagger={0.25} className={styles.headlineLine}>
                  <span>Who is</span>
                </SplitLinesReveal>
                <SplitLinesReveal duration={1.8} stagger={0.25} className={styles.headlineLine}>
                  <span><BrandedGhostSignal />?</span>
                </SplitLinesReveal>
              </h2>
              <ScrollFadeUp index={0} duration={1.6}>
                <p className={styles.sectionBody}>
                  We are a network that connects podcasters and brands who share soul—those who know their work shapes the future and take that responsibility seriously. As a creator or advertiser, whether you are value-sensitive, faith-based, or simply aware of the ethical impact of what you make, you belong in GhostSignal if you sense that your work is making the world.
                </p>
              </ScrollFadeUp>
            </div>
          </section>

          {/* Final Section: This is the Signal - with globe below */}
          <section className={styles.finalSection}>
            <div className={styles.finalContent}>
              <ScrollFadeUp index={0} duration={1.6}>
                <Image
                  src="/images/brand/brandmark-vert-white.svg"
                  alt="GhostSignal"
                  width={309}
                  height={263}
                  className={styles.finalLogo}
                />
              </ScrollFadeUp>
              <ScrollFadeUp index={1} duration={1.6}>
                <p className={styles.finalSubheadline}>
                  This is values-based advertising. This is world making.
                </p>
              </ScrollFadeUp>
              <h2 className={styles.finalHeadline}>
                <SplitLinesReveal duration={3.6} stagger={0.5} className={styles.headlineLine}>
                  <span>This is the</span>
                </SplitLinesReveal>
                <SplitLinesReveal duration={3.6} stagger={0.5} className={styles.headlineLine}>
                  <span>Signal</span>
                </SplitLinesReveal>
              </h2>
              <ScrollFadeUp index={2} duration={1.6}>
                <p className={styles.finalTagline}>
                  Everything else is just static.
                </p>
              </ScrollFadeUp>
            </div>
            {/* Globe behind the headline */}
            <div className={styles.finalGlobeWrapper}>
              <ScrollScenes className={styles.finalGlobe} verticalOffset={0} scale={0.88} />
            </div>
          </section>

          {/* White Paper CTA Section */}
          <section className={styles.whitepaperSection}>
            <div className={styles.whitepaperContent}>
              <ScrollFadeUp index={0} duration={1.6}>
                <p className={styles.whitepaperText}>
                  Access our white paper and read about how <BrandedGhostSignal /> can help you make the world.
                </p>
              </ScrollFadeUp>
              <ScrollFadeUp index={1} duration={1.6}>
                <a
                  href="https://drive.google.com/file/d/1Jgn7CTqYcfqxxM8d14fjlDfVydsi2up3/view?usp=drive_link"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.whitepaperButton}
                >
                  Read the White Paper
                </a>
              </ScrollFadeUp>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </main>
  );
}

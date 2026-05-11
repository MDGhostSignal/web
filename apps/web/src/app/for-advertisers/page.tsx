"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui";
import { LazyLottie } from "@/components/LazyLottie";

import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { ContactSection } from "@/components/ContactSection";
import { ResultTyping } from "./ResultTyping";
import { BrandedGhostSignal } from "@/components/BrandedGhostSignal";
import { ParallaxY } from "@/motion/ParallaxY";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";

// Heavy WebGL background — keep it off the initial chunk.
const StarFogBackground = dynamic(() => import("./StarFogBackground"), {
  ssr: false,
});

// Canvas pollen overlay — ssr:false since it needs the DOM.
const HeroPollen = dynamic(() => import("./HeroPollen"), { ssr: false });
import styles from "./page.module.css";
import { navLinks } from "@/lib/nav";

const features = [
  {
    title: "Highly-Attuned Audiences",
    description: "We locate you in front of considered communities where alignment runs deep.",
  },
  {
    title: "Targeted Spending",
    description: "Every dollar is focused on maximizing impact, not impressions.",
  },
  {
    title: "Administrative Simplicity",
    description: "We handle invoicing, payments, ensuring efficiency and transparency — without individual podcaster contracts, simplifying your process.",
  },
  {
    title: "Real Conversion",
    description: "Audiences who are aligned and feel seen are far more likely to become customers.",
  },
] as const;

const journeySteps = [
  {
    number: "01",
    title: "DISCERN FIT",
    description: "We begin with you: we assess your mission and goals to ensure your brand is suitable for our ecosystem of creators.",
  },
  {
    number: "02",
    title: "MEMBERSHIP",
    description: "If we are right for each other, we extend a GHOSTSignal membership offer. This means we formally commit to finding resonant audiences as part of your world building.",
  },
  {
    number: "03",
    title: "RELATIONSHIP",
    description: "We connect you with creators whose audiences are ready to embrace your brand. We have a system called the 'Resonance Quotient' that helps us learn about you and steward your story. We handle the contracts, ad creation, and transparent reporting — ensuring the partnership feels natural and delivers a resonant return.",
  },
] as const;

export default function ForAdvertisersPage() {
  const heroRef = useRef<HTMLElement>(null);
  const businessRef = useRef<HTMLElement>(null);

  // Mouse-driven parallax for the mariah statue PNG in the business
  // section. Same lerp + rAF pattern as the hero parallax below;
  // CSS reads --mx / --my off the section with negative multipliers
  // so the statue drifts opposite the cursor. Skipped on coarse pointers.
  useEffect(() => {
    const el = businessRef.current;
    if (!el) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let rafId: number | null = null;

    const loop = () => {
      currentX += (targetX - currentX) * 0.09;
      currentY += (targetY - currentY) * 0.09;
      el.style.setProperty("--mx", currentX.toFixed(4));
      el.style.setProperty("--my", currentY.toFixed(4));
      const dx = targetX - currentX;
      const dy = targetY - currentY;
      if (Math.abs(dx) > 0.0005 || Math.abs(dy) > 0.0005) {
        rafId = requestAnimationFrame(loop);
      } else {
        currentX = targetX;
        currentY = targetY;
        el.style.setProperty("--mx", currentX.toFixed(4));
        el.style.setProperty("--my", currentY.toFixed(4));
        rafId = null;
      }
    };
    const ensureLoop = () => {
      if (rafId === null) rafId = requestAnimationFrame(loop);
    };
    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      targetX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      targetY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      ensureLoop();
    };
    const handleLeave = () => {
      targetX = 0;
      targetY = 0;
      ensureLoop();
    };
    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    // Touch devices don't have a hovering cursor — skip entirely.
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let rafId: number | null = null;

    const loop = () => {
      currentX += (targetX - currentX) * 0.09;
      currentY += (targetY - currentY) * 0.09;
      el.style.setProperty("--mx", currentX.toFixed(4));
      el.style.setProperty("--my", currentY.toFixed(4));
      const dx = targetX - currentX;
      const dy = targetY - currentY;
      if (Math.abs(dx) > 0.0005 || Math.abs(dy) > 0.0005) {
        rafId = requestAnimationFrame(loop);
      } else {
        currentX = targetX;
        currentY = targetY;
        el.style.setProperty("--mx", currentX.toFixed(4));
        el.style.setProperty("--my", currentY.toFixed(4));
        rafId = null;
      }
    };

    const ensureLoop = () => {
      if (rafId === null) rafId = requestAnimationFrame(loop);
    };

    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      targetX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      targetY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      ensureLoop();
    };

    const handleLeave = () => {
      targetX = 0;
      targetY = 0;
      ensureLoop();
    };

    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);

    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <main className={styles.page}>
      <SiteHeader links={navLinks} />

      {/* Static overlay effect */}
      <div className={styles.staticOverlay} aria-hidden="true" />

      {/* Hero Section */}
      <section ref={heroRef} className={styles.hero}>
        <div className={styles.heroVideoWrapper}>
          <div className={styles.heroVideoTilt}>
            <video
              className={styles.heroVideo}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              disablePictureInPicture
              aria-hidden="true"
            >
              <source src="/images/for-advertisers/loop5.webm" type="video/webm" />
              <source src="/images/for-advertisers/loop5.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
        <div className={styles.heroPollenLayer}>
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
              We help you reach the right audience by pairing your brand with creators who share your convictions. When alignment is authentic, trust flows naturally — and <strong>trust is the soil where conversion grows.</strong>
            </p>
          </ScrollFadeUp>
        </div>
      </section>

      {/* Why This Works Section */}
      <section className={styles.featuresSection}>
        <div className={styles.featuresContainer}>
          <div className={styles.featuresHeader}>
            <ScrollFadeUp index={0} duration={1.6}>
              <p className={styles.featuresSubhead}>Why this works</p>
            </ScrollFadeUp>
            <SplitLinesReveal duration={2} stagger={0.28}>
              <h2 className={styles.featuresHeadline}>
                THE BUSINESS CASE
              </h2>
            </SplitLinesReveal>
            <ScrollFadeUp index={1} duration={1.6}>
              <p className={styles.featuresTagline}>
                We connect you with audiences who already believe what you believe.
              </p>
            </ScrollFadeUp>
            <ScrollFadeUp index={2} duration={1.6}>
              <Image
                src="/images/for-advertisers/color-bars-hor.png"
                alt=""
                width={800}
                height={69}
                className={styles.featuresColorBars}
              />
            </ScrollFadeUp>
          </div>
          <div className={styles.featuresLayout}>
            <div className={styles.featuresList}>
              {features.map((feature, index) => (
                <ScrollFadeUp key={feature.title} index={index} duration={1.6}>
                  <article className={styles.featureCard}>
                    <h3 className={styles.featureTitle}>{feature.title}</h3>
                    <p className={styles.featureDescription}>{feature.description}</p>
                  </article>
                </ScrollFadeUp>
              ))}
              <ScrollFadeUp index={4} duration={1.6}>
                <Button href="/get-in-touch">Find Your Frequency</Button>
              </ScrollFadeUp>
            </div>
            <div className={styles.featuresAnimation}>
              <LazyLottie src="/images/for-advertisers/advertisers.json" />
            </div>
          </div>
        </div>
      </section>

      {/* The Pitch Section */}
      <section className={styles.pitchSection}>
        <StarFogBackground />
        <div className={styles.pitchContent}>
          <h2 className={styles.pitchHeadline}>
            <SplitLinesReveal duration={2}>Most ad buys</SplitLinesReveal>
            <SplitLinesReveal duration={2} delay={0.3}>
              Chase{" "}
              <span className={styles.impressionsWord}>impressions</span>
            </SplitLinesReveal>
            <SplitLinesReveal duration={2} delay={0.6}>
              We curate{" "}
              <span className={styles.convictionWord}>
                c
                <span className={styles.convictionO}>
                  o
                  <span className={styles.halo} aria-hidden="true" />
                  <span className={styles.haloGlow} aria-hidden="true" />
                </span>
                nviction
              </span>
            </SplitLinesReveal>
          </h2>
          <ScrollFadeUp index={0} duration={1.6}>
            <p className={styles.pitchBody}>
              When your brand shows up in a podcast community that shares your values, you&apos;re not fighting for attention. You&apos;re joining a conversation that&apos;s already happening.
            </p>
          </ScrollFadeUp>
          <ScrollFadeUp index={1} duration={1.6}>
            <Button variant="secondary" href="/get-in-touch">
              Find Your Frequency
              <Image
                src="/images/home/icon-arrow-right.svg"
                alt=""
                width={24}
                height={24}
                className={styles.ctaArrow}
              />
            </Button>
          </ScrollFadeUp>
        </div>
      </section>

      {/* The Business Case Section */}
      <section ref={businessRef} className={styles.businessSection}>
        {/* Floating clouds — same animated pattern as /who-are-we hero,
            ported here per request. Wrapper is absolute + overflow:hidden
            so the section can keep position:relative without breaking
            the sticky businessVisual on the right. */}
        <div className={styles.businessCloudWrapper} aria-hidden="true">
          <Image src="/images/for-advertisers/cloud.png" alt="" width={600} height={400} className={`${styles.businessCloud} ${styles.businessCloud1}`} />
          <Image src="/images/for-advertisers/cloud.png" alt="" width={600} height={400} className={`${styles.businessCloud} ${styles.businessCloud2}`} />
          <Image src="/images/for-advertisers/cloud.png" alt="" width={600} height={400} className={`${styles.businessCloud} ${styles.businessCloud3}`} />
          <Image src="/images/for-advertisers/cloud.png" alt="" width={600} height={400} className={`${styles.businessCloud} ${styles.businessCloud4}`} />
          <Image src="/images/for-advertisers/cloud.png" alt="" width={600} height={400} className={`${styles.businessCloud} ${styles.businessCloud5}`} />
          <Image src="/images/for-advertisers/cloud.png" alt="" width={600} height={400} className={`${styles.businessCloud} ${styles.businessCloud6}`} />
          <Image src="/images/for-advertisers/cloud.png" alt="" width={600} height={400} className={`${styles.businessCloud} ${styles.businessCloud7}`} />
          <Image src="/images/for-advertisers/cloud.png" alt="" width={600} height={400} className={`${styles.businessCloud} ${styles.businessCloud8}`} />
          <Image src="/images/for-advertisers/cloud.png" alt="" width={600} height={400} className={`${styles.businessCloud} ${styles.businessCloud9}`} />
          <Image src="/images/for-advertisers/cloud.png" alt="" width={600} height={400} className={`${styles.businessCloud} ${styles.businessCloud10}`} />
        </div>
        <div className={styles.businessContainer}>
          <div className={styles.businessContent}>
            <h2 className={styles.businessTitle}>
              <SplitLinesReveal duration={2}>
                <span><BrandedGhostSignal /></span>
              </SplitLinesReveal>
              <SplitLinesReveal duration={2} delay={0.3}>
                is about resonance
              </SplitLinesReveal>
            </h2>
            <ScrollFadeUp index={0} duration={1.6}>
              <p className={styles.businessSubhead}>
                We only match you with creators who make sense for your mission. Every partnership is considered.
              </p>
            </ScrollFadeUp>

            <ol className={styles.businessSteps}>
              {journeySteps.map((step, index) => (
                <ScrollFadeUp key={step.number} index={index + 1} duration={1.8}>
                  <li className={styles.businessStep}>
                    <span className={styles.stepNumber} aria-hidden="true">{step.number}</span>
                    <div className={styles.stepContent}>
                      <h3 className={styles.stepTitle}>{step.title}</h3>
                      <p className={styles.stepDescription}>{step.description}</p>
                    </div>
                  </li>
                </ScrollFadeUp>
              ))}
            </ol>

            <ScrollFadeUp index={4} duration={1.6}>
              <div className={styles.businessResult}>
                <p className={styles.resultLabel}>This is world-making for advertisers.</p>
                <h2 className={styles.resultHeadlineH2}>
                  <SplitLinesReveal duration={2}>The result?</SplitLinesReveal>
                </h2>
                <h3 className={styles.resultHeadlineH3}>
                  <ResultTyping
                    loopLastLine
                    lines={[
                      "Advertising that",
                      "works better",
                      "because it is better.",
                    ]}
                  />
                </h3>
              </div>
            </ScrollFadeUp>

            <ScrollFadeUp index={5} duration={1.6}>
              <Button href="/get-in-touch">Find Your Frequency</Button>
            </ScrollFadeUp>
          </div>

          <div className={styles.businessVisual}>
            <ScrollFadeUp index={0} duration={1.8} distance={0}>
              <ParallaxY range={["-35rem", "35rem"]}>
                <Image
                  src="/images/home/figma/mariah.png"
                  alt="Classical sculpture representing timeless values"
                  width={2585}
                  height={3231}
                  className={styles.visualImage}
                />
              </ParallaxY>
            </ScrollFadeUp>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <ContactSection imageSrc="/images/for-advertisers/jeremycontact.jpg" />

      <Footer />
    </main>
  );
}

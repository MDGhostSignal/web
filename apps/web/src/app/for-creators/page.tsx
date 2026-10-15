"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui";
import { LazyLottie } from "@/components/LazyLottie";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { ContactSection } from "@/components/ContactSection";
import { BrandedGhostSignal } from "@/components/BrandedGhostSignal";
import { Container, Section } from "@/components/layout";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";
import { gsap } from "@/motion/gsap";
import { useIsomorphicLayoutEffect } from "@/motion/useIsomorphicLayoutEffect";

import { PreviewFeatureBuild } from "../for-advertisers/PreviewFeatureBuild";
import styles from "./page.module.css";
import previewHero from "../preview/creators-hero/preview.module.css";
import { navLinks } from "@/lib/nav";

const features = [
  {
    title: "Soul-Aligned Partnerships",
    description: "We match you with brands whose products and mission align with your own.",
  },
  {
    title: "Premium Revenue",
    description: "We reach for the stars with considered monetisation models that are true to your show's reach and values.",
  },
  {
    title: "Administrative Freedom",
    description: "We handle the paperwork, contracts, reporting, and payment tracking so you are freed up to create.",
  },
  {
    title: "World-Making Community",
    description: "You'll be a part of a community of world-makers: like-minded podcasters and brands who care about the sort of future we are creating.",
  },
] as const;

const previewFeatures = [
  {
    title: "Creative Freedom",
    description:
      "Be freed up to create. GHOSTSignal handles matching tech, contracts, podcast hosting, campaigns, and reporting — giving you network-wide resonance and reach without the hassle of individual deals.",
  },
  {
    title: "Values-Aligned Partnerships",
    description:
      "We understand that your voice, and the trust relationship with your listening community is everything. We connect you with brands you can be proud of. Nobel laureate economist Daron Acemoglu demonstrates that value alignment builds trust — allowing you to generate meaningful revenue while protecting and deepening the connection you have built with your audience.",
  },
  {
    title: "World-Making Membership",
    description:
      "Join a community of values-aware creators and brands who understand they are making the world through their work.",
  },
] as const;

const journeySteps = [
  {
    number: "01",
    title: "DISCERN FIT",
    description: "Let's start with you! We want to hear about your values, your show, your story. We assess your show and ensure there is compatibility before moving forward.",
  },
  {
    number: "02",
    title: "MEMBERSHIP",
    description: "If we are right for each other, we extend a GHOSTSignal membership offer. This means you gain access to our network benefits, including promotion, advocacy, a listening ear, and a group of like minded brands.",
  },
  {
    number: "03",
    title: "RELATIONSHIP",
    description: "We find advertisers who resonate with the world that you're building. Every partnership is curated to feel natural. We have a system called the 'Resonance Quotient' that helps us learn about you and steward your story. We handle the contracts, ad logistics, reporting, and analysis — ensuring our partnership feels natural and delivers a resonant return.",
  },
] as const;

const previewJourney = [
  {
    number: "01",
    title: "EXPLORING CONNECTION",
    description:
      "We'd love to hear your story. We discern the connection to ensure there is resonance.",
  },
  {
    number: "02",
    title: "MEMBERSHIP",
    description: "We extend a GHOSTSignal membership offer.",
  },
  {
    number: "03",
    title: "WORLD-MAKING CAMPAIGNS",
    description: "Campaigns you can be proud of.",
  },
] as const;

export default function ForCreatorsPage({
  showHeader = true,
  showHero = true,
  showGraphs = false,
  previewCopy = true,
}: {
  showHeader?: boolean;
  showHero?: boolean;
  showGraphs?: boolean;
  previewCopy?: boolean;
}) {
  const activeFeatures = previewCopy ? previewFeatures : features;
  const activeJourney = previewCopy ? previewJourney : journeySteps;
  const heroSectionRef = useRef<HTMLElement>(null);
  const heroVideoWrapperRef = useRef<HTMLDivElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const journeyRef = useRef<HTMLElement>(null);

  // Mouse-driven parallax for the membership-journey statue PNG.
  // Same lerp + rAF pattern as /for-advertisers and the homepage:
  // write smoothed --mx / --my (-1..1) onto the journey section;
  // CSS reads them with negative multipliers so the image drifts
  // opposite the cursor. Skipped on coarse pointers.
  useEffect(() => {
    const el = journeyRef.current;
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

  // Scroll-driven fade + looping safety-net for the hero field video.
  // Same pattern used on /what-is-this for the sunset: opacity-only
  // tween so the decoder keeps advancing frames (any transform/filter
  // on a video layer causes Chromium to flatten it into a static
  // texture). Extra event listeners restart the loop if a browser
  // pauses autoplay for tab-visibility or heavy-scroll reasons.
  useIsomorphicLayoutEffect(() => {
    const wrapper = heroVideoWrapperRef.current;
    const video = heroVideoRef.current;
    if (!wrapper || !video) return;

    const videoTween = gsap.fromTo(
      video,
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

    const ensurePlaying = () => {
      if (video.readyState < 2) return;
      void video.play().catch(() => {
        /* autoplay rejection — ignore */
      });
    };
    const onPause = () => ensurePlaying();
    const onEnded = () => ensurePlaying();
    const onVisibility = () => {
      if (document.visibilityState === "visible") ensurePlaying();
    };
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
      document.removeEventListener("visibilitychange", onVisibility);
      videoTween.scrollTrigger?.kill();
      videoTween.kill();
    };
  }, []);

  return (
    <main className={styles.page}>
      {showHeader ? <SiteHeader links={navLinks} /> : null}

      {showHero ? (
      <>
      {/* Static overlay effect */}
      <div className={styles.staticOverlay} aria-hidden="true" />

      {/* Hero Section */}
      <Section ref={heroSectionRef} className={`${styles.hero} ${previewHero.hero}`}>
        <div ref={heroVideoWrapperRef} className={`${styles.heroVideoWrapper} ${previewHero.frame}`}>
          <img
            className={previewHero.still}
            src="/images/preview/creators-suburban-tree.jpg"
            alt=""
          />
        </div>
        <div className={styles.heroContent}>
          {/* Spacer reserves the vertical room the removed top
              hero-logos row used to occupy so the headline stays
              in the same position. Matches .heroLogo's clamped
              height. */}
          <div className={styles.heroLogosSpacer} aria-hidden="true" />
          <h1 className={styles.heroHeadline}>
            <SplitLinesReveal duration={2.2}>Trust is everything.</SplitLinesReveal>
            <SplitLinesReveal duration={2.2} delay={0.35}>
              Partnerships that honor your voice
            </SplitLinesReveal>
            <SplitLinesReveal duration={2.2} delay={0.7}>
              and your audience thank you for.
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
          <div className={`${styles.heroSubhead} ${previewHero.subhead}`}>
            <span className={previewHero.subheadLine}>When good creators partner with good brands,</span>
            <span className={previewHero.subheadLine}>the world is made in the right direction.</span>
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
      </>
      ) : null}

      {/* Features Section */}
      <Section className={previewCopy ? `${styles.featuresSection} ${styles.featuresSectionPreview}` : styles.featuresSection}>
        <Container className={styles.features}>
          <div className={styles.featuresHeader}>
            <ScrollFadeUp index={0} duration={1.6}>
              <p className={styles.featuresSubhead}>Why this works</p>
            </ScrollFadeUp>
            <h2 className={styles.featuresHeadline}>
              <SplitLinesReveal duration={2}>GHOSTSignal is</SplitLinesReveal>
              <SplitLinesReveal duration={2} delay={0.35}>
                Advertising-as-Support-System
              </SplitLinesReveal>
            </h2>
            <ScrollFadeUp index={1} duration={1.6}>
              <p className={styles.featuresTagline}>
                We remove the static, so you can focus on the signal.
              </p>
            </ScrollFadeUp>
            <ScrollFadeUp
              index={2}
              duration={1.6}
              className={previewCopy ? styles.featuresBarsWrap : undefined}
            >
              <Image
                src="/images/for-creators/color-bars-hor.png"
                alt=""
                width={800}
                height={69}
                className={styles.featuresColorBars}
              />
            </ScrollFadeUp>
          </div>
          <div className={styles.featuresLayout}>
            <div className={styles.featuresList}>
              {previewCopy ? (
                <PreviewFeatureBuild
                  steps={previewFeatures}
                  conclusion="Advertising that builds trust with your audience."
                />
              ) : (
                activeFeatures.map((feature, index) => (
                  <ScrollFadeUp key={feature.title} index={index} duration={1.6}>
                    <article className={styles.featureCard}>
                      <h3 className={styles.featureTitle}>{feature.title}</h3>
                      <p className={styles.featureDescription}>{feature.description}</p>
                    </article>
                  </ScrollFadeUp>
                ))
              )}
              <ScrollFadeUp
                index={4}
                duration={1.6}
                className={previewCopy ? styles.featuresCta : undefined}
              >
                <Button href="/get-in-touch">Get In Touch</Button>
              </ScrollFadeUp>
            </div>
            {showGraphs ? (
              <div className={styles.featuresAnimation}>
                <LazyLottie src="/images/for-creators/creators.json" />
              </div>
            ) : null}
          </div>
        </Container>
      </Section>

      {/* Membership Journey Section */}
      <Section ref={journeyRef} className={styles.journeySection}>
        <div className={styles.journeyBackground} aria-hidden="true" />
        <Container className={styles.journeyHeader}>
          <ScrollFadeUp index={0} duration={1.6}>
            <p className={styles.journeySubtitle}>how it works</p>
          </ScrollFadeUp>
          <SplitLinesReveal duration={2.2}>
            <h2 className={styles.journeyTitle}>Your Membership Journey</h2>
          </SplitLinesReveal>
          <ScrollFadeUp index={2} duration={1.6}>
            <p className={styles.journeyIntro}>
              {previewCopy
                ? "Our process is simple, unhurried, and sensitive to your voice and mission."
                : "Our process is simple, unhurried, and sensitive to your voice and mission. Here's how it goes:"}
            </p>
          </ScrollFadeUp>
        </Container>

        <div className={styles.journeyLayout}>
          <ScrollFadeUp duration={1.8} distance={40}>
            <div className={styles.journeyImageWrapper}>
              <Image
                src="/images/for-creators/journey-statue.png"
                alt="Metallic sculpture"
                width={800}
                height={1000}
                className={styles.journeyImage}
              />
            </div>
          </ScrollFadeUp>
          <div className={styles.journeyRight}>
            <ol className={styles.journeySteps}>
              {activeJourney.map((step, index) => (
                <ScrollFadeUp key={step.number} index={index} duration={1.8}>
                  <li className={styles.journeyStep}>
                    <span className={styles.stepNumber} aria-hidden="true">{step.number}</span>
                    <div className={styles.stepContent}>
                      <h3 className={styles.stepTitle}>{step.title}</h3>
                      <p className={styles.stepDescription}>{step.description}</p>
                    </div>
                  </li>
                </ScrollFadeUp>
              ))}
            </ol>
            <ScrollFadeUp index={journeySteps.length} duration={1.8}>
              <Link href="/get-in-touch" className={styles.journeyCta}>
                Get in Touch
                <Image
                  src="/images/home/icon-arrow-right.svg"
                  alt=""
                  width={24}
                  height={24}
                  className={styles.ctaArrow}
                />
              </Link>
            </ScrollFadeUp>
            <ScrollFadeUp index={journeySteps.length + 1} duration={1.8}>
              <aside className={styles.art19Card} aria-label="ART19 Partnership">
                <h3 className={styles.art19Eyebrow}>ART19 Partnership</h3>
                <p className={styles.art19Body}>
                  Shows in the <BrandedGhostSignal /> network are hosted on
                  ART19, so you inherit their best-in-class delivery,
                  reporting, and dynamic ad insertion from day one.
                </p>
                <Image
                  src="/images/for-creators/AAC_ART19_black.svg"
                  alt="ART19 logo"
                  width={240}
                  height={64}
                  className={styles.art19Logo}
                />
              </aside>
            </ScrollFadeUp>
          </div>
        </div>
      </Section>

      {/* Closing Statement Section */}
      <Section className={styles.closingSection}>
        <Container className={styles.closing}>
          <h2 className={styles.closingHeadline}>
            <SplitLinesReveal duration={2.2}>You don&apos;t need</SplitLinesReveal>
            <SplitLinesReveal duration={2.2} delay={0.35}>
              A million downloads
            </SplitLinesReveal>
            <SplitLinesReveal duration={2.2} delay={0.7}>
              To <span className={styles.matterText}>matter</span>.
            </SplitLinesReveal>
          </h2>
          <SplitLinesReveal duration={1.8} stagger={0.25}>
            <p className={styles.closingSubhead}>
              You just need conviction and the right partner to amplify your voice.
            </p>
          </SplitLinesReveal>
          <ScrollFadeUp index={1} duration={1.6}>
            <Link href="/get-in-touch" className={styles.closingCta}>
              Find Your Frequency
              <Image
                src="/images/home/icon-arrow-right.svg"
                alt=""
                width={24}
                height={24}
                className={styles.ctaArrow}
              />
            </Link>
          </ScrollFadeUp>
        </Container>
      </Section>

      {/* Contact Section */}
      <ContactSection />

      <Footer />
    </main>
  );
}

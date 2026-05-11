"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui";
import { LazyLottie } from "@/components/LazyLottie";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { ContactSection } from "@/components/ContactSection";
import { BrandedGhostSignal } from "@/components/BrandedGhostSignal";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";
import { gsap } from "@/motion/gsap";
import { useIsomorphicLayoutEffect } from "@/motion/useIsomorphicLayoutEffect";

// Ambient firefly drift — client-only (uses window + rAF).
const HeroFirefliesDrift = dynamic(() => import("./HeroFirefliesDrift"), {
  ssr: false,
});
// Swarm of bees chasing the cursor — client-only.
const HeroFireflies = dynamic(() => import("./HeroFireflies"), { ssr: false });

import styles from "./page.module.css";
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

export default function ForCreatorsPage() {
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
      <SiteHeader links={navLinks} />

      {/* Static overlay effect */}
      <div className={styles.staticOverlay} aria-hidden="true" />

      {/* Hero Section */}
      <section ref={heroSectionRef} className={styles.hero}>
        {/* Ambient firefly drift — same cursor-repulsion pattern as
            the pollen on /for-advertisers and the blossoms on
            /what-is-this. Canvas fills the hero, fireflies float upward
            and respawn from below. */}
        <HeroFirefliesDrift />
        {/* Swarm of bees that chase the cursor inside the hero. */}
        <HeroFireflies sectionRef={heroSectionRef} />
        <div ref={heroVideoWrapperRef} className={styles.heroVideoWrapper}>
          <video
            ref={heroVideoRef}
            className={styles.heroVideo}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            aria-hidden="true"
          >
            <source src="/images/for-creators/seattle.mp4" type="video/mp4" />
          </video>
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
                alt=""
                width={30}
                height={30}
                className={styles.heroLogo}
              />
            </div>
          </ScrollFadeUp>
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
            <SplitLinesReveal duration={1.8}>Your voice is not for sale.</SplitLinesReveal>
            <SplitLinesReveal duration={1.8} delay={0.3}>
              Your audience is not a data point.
            </SplitLinesReveal>
            <SplitLinesReveal duration={1.8} delay={0.6}>
              Your work is not merely content.
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
                What if you could monetize your podcast while maintaining your voice and values? The traditional ad model forces impossible choices: compromise your voice, risk your audience&apos;s trust, or drown in administrative tasks.
              </p>
            </ScrollFadeUp>
            <ScrollFadeUp duration={1.8} delay={0.4}>
              <p className={styles.heroBodyText}>
                We are here to protect your voice, honor your audience, and help you find the partners who will make the world alongside you.
              </p>
            </ScrollFadeUp>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.featuresSection}>
        <div className={styles.featuresContainer}>
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
            <ScrollFadeUp index={2} duration={1.6}>
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
              {features.map((feature, index) => (
                <ScrollFadeUp key={feature.title} index={index} duration={1.6}>
                  <article className={styles.featureCard}>
                    <h3 className={styles.featureTitle}>{feature.title}</h3>
                    <p className={styles.featureDescription}>{feature.description}</p>
                  </article>
                </ScrollFadeUp>
              ))}
              <ScrollFadeUp index={4} duration={1.6}>
                <Button href="/get-in-touch">Get In Touch</Button>
              </ScrollFadeUp>
            </div>
            <div className={styles.featuresAnimation}>
              <LazyLottie src="/images/for-creators/creators.json" />
            </div>
          </div>
        </div>
      </section>

      {/* Membership Journey Section */}
      <section ref={journeyRef} className={styles.journeySection}>
        <div className={styles.journeyBackground} aria-hidden="true" />
        <div className={styles.journeyHeader}>
          <ScrollFadeUp index={0} duration={1.6}>
            <p className={styles.journeySubtitle}>how it works</p>
          </ScrollFadeUp>
          <SplitLinesReveal duration={2.2}>
            <h2 className={styles.journeyTitle}>Your Membership Journey</h2>
          </SplitLinesReveal>
          <ScrollFadeUp index={2} duration={1.6}>
            <p className={styles.journeyIntro}>
              Our process is simple, unhurried, and sensitive to your voice and mission. Here&apos;s how it goes:
            </p>
          </ScrollFadeUp>
        </div>

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
              {journeySteps.map((step, index) => (
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
      </section>

      {/* Closing Statement Section */}
      <section className={styles.closingSection}>
        <div className={styles.closingContent}>
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
        </div>
      </section>

      {/* Contact Section */}
      <ContactSection />

      <Footer />
    </main>
  );
}

"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRef } from "react";

import { SiteHeader } from "@/components/SiteHeader";
import { Section } from "@/components/layout";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";
import { gsap } from "@/motion/gsap";
import { useIsomorphicLayoutEffect } from "@/motion/useIsomorphicLayoutEffect";
import { navLinks } from "@/lib/nav";

import styles from "../../for-creators/page.module.css";

const HeroFirefliesDrift = dynamic(
  () => import("../../for-creators/HeroFirefliesDrift"),
  { ssr: false },
);
const HeroFireflies = dynamic(
  () => import("../../for-creators/HeroFireflies"),
  { ssr: false },
);

/**
 * Local preview of the For Creators hero.
 * Not linked from navigation. The live /for-creators page is unchanged.
 */
export default function CreatorsHeroPreviewPage() {
  const heroSectionRef = useRef<HTMLElement>(null);
  const heroVideoWrapperRef = useRef<HTMLDivElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);

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
      <div className={styles.staticOverlay} aria-hidden="true" />
      <Section ref={heroSectionRef} className={styles.hero}>
        <HeroFirefliesDrift />
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
            <source src="/images/for-creators/evening-yard.mp4" type="video/mp4" />
          </video>
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
      </Section>
    </main>
  );
}

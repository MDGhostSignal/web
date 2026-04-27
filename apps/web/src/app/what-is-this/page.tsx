"use client";

import { useRef } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";

import BarsRipple from "./BarsRipple";
import { SiteHeader } from "@/components/SiteHeader";
// ScrollScenes pulls in a custom WebGL globe + ring system (~700 LOC of
// shader and JS). Defer it off the initial route chunk — the globe only
// becomes visible well below the fold anyway.
const ScrollScenes = dynamic(
  () => import("@/components/ScrollScenes").then((m) => m.ScrollScenes),
  { ssr: false },
);

// Canvas cherry-blossom overlay — ssr:false since it needs the DOM.
const HeroBlossoms = dynamic(() => import("./HeroBlossoms"), { ssr: false });
import { ParallaxBackground } from "@/components/ParallaxBackground";
import { Footer } from "@/components/Footer";
import { ContactSection } from "@/components/ContactSection";
import { BrandedGhostSignal } from "@/components/BrandedGhostSignal";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";
import { gsap } from "@/motion/gsap";
import { useIsomorphicLayoutEffect } from "@/motion/useIsomorphicLayoutEffect";

import styles from "./page.module.css";
import { navLinks } from "@/lib/nav";

export default function WhatIsThisPage() {
  const heroVideoWrapperRef = useRef<HTMLDivElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const heroTextRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const wrapper = heroVideoWrapperRef.current;
    const video = heroVideoRef.current;
    const text = heroTextRef.current;
    if (!wrapper || !video) return;

    const trigger = {
      trigger: wrapper,
      start: "top top",
      // Extend the fade well past a single viewport — gives a longer,
      // more gradual dissolve from sunset loop into the night sky.
      end: "+=140%",
      scrub: 1,
    } as const;

    // Video: opacity fade ONLY. Every other property (filter, transform,
    // scale, y) has been removed after repeated Chromium decoder-stall
    // freezes — the browser will happily composite an opacity-only layer
    // while keeping the video decoder running. Parallax on the video is
    // not worth a frozen loop.
    const videoTween = gsap.fromTo(
      video,
      { opacity: 1 },
      {
        opacity: 0,
        ease: "power1.inOut",
        scrollTrigger: trigger,
      },
    );

    // Text overlay: plain fade + slight lift (no blur — keeps copy sharp
    // as it leaves). Shorter scroll distance so copy is gone before the
    // video has fully dispersed, which lets the sky reveal cleanly.
    const textTween = text
      ? gsap.fromTo(
          text,
          { opacity: 1, y: 0 },
          {
            opacity: 0,
            y: -60,
            ease: "power1.out",
            scrollTrigger: {
              trigger: wrapper,
              start: "top top",
              end: "+=80%",
              scrub: 1,
            },
          },
        )
      : null;

    // Belt-and-suspenders looping. The `loop` attribute is the primary
    // guarantee; these event listeners are safety-nets for cases where a
    // browser pauses an autoplaying video (tab backgrounded, heavy
    // scroll-fade blur, etc.). All wait for the video to be *ready* to
    // play — we never force a seek mid-load or fight the initial
    // buffering stage (an earlier attempt with a currentTime=0 watchdog
    // created a reload loop before first frame ever arrived).
    const ensurePlaying = () => {
      if (video.readyState < 2) return; // not ready — let the browser load
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
      textTween?.scrollTrigger?.kill();
      textTween?.kill();
    };
  }, []);

  return (
    <main className={styles.page}>
      <SiteHeader links={navLinks} />

      {/* Starry night background — the feathered cloud overlay has been
          removed so only the star layer shows through. */}
      <ParallaxBackground />

      {/* Hero video — fills the viewport, fades/disperses as the user
          scrolls, revealing the parallax cloud background beneath. */}
      <div ref={heroVideoWrapperRef} className={styles.heroVideoWrapper}>
        <video
          ref={heroVideoRef}
          className={styles.heroVideo}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
          aria-hidden="true"
        >
          <source src="/images/what-is-this/japanese.mp4" type="video/mp4" />
        </video>
        {/* Cherry blossom overlay — sits on top of the video AND the
            text, extending the video's falling-blossom motif onto the
            whole hero for a layered 3D read. */}
        <HeroBlossoms />
        {/* Headline + subtitle overlaid on the left half of the video,
            same position and framing the original white panel had, but
            white text with no panel behind it. */}
        <div ref={heroTextRef} className={styles.heroTextOverlay}>
          <div className={styles.heroTextContainer}>
            <div className={styles.heroLogoRow}>
              <Image
                src="/images/what-is-this/lettermark-black.png"
                alt=""
                width={24}
                height={24}
                className={styles.heroFramingLogo}
              />
              <Image
                src="/images/what-is-this/lettermark-black.png"
                alt=""
                width={24}
                height={24}
                className={styles.heroFramingLogo}
              />
              <Image
                src="/images/what-is-this/lettermark-black.png"
                alt=""
                width={24}
                height={24}
                className={styles.heroFramingLogo}
              />
            </div>

            <h1 className={styles.heroHeadline}>
              <SplitLinesReveal duration={1.8} className={styles.headlineLine}>
                <span>
                  <BrandedGhostSignal />
                </span>
              </SplitLinesReveal>
              <SplitLinesReveal duration={1.8} delay={0.6} className={styles.headlineLine}>
                <span>is the values-based</span>
              </SplitLinesReveal>
              <SplitLinesReveal duration={1.8} delay={1.2} className={styles.headlineLine}>
                <span>podcast advertising network</span>
              </SplitLinesReveal>
            </h1>

            <div className={styles.heroLogoRow}>
              <Image
                src="/images/what-is-this/lettermark-black.png"
                alt=""
                width={24}
                height={24}
                className={styles.heroFramingLogo}
              />
              <Image
                src="/images/what-is-this/lettermark-black.png"
                alt=""
                width={24}
                height={24}
                className={styles.heroFramingLogo}
              />
              <Image
                src="/images/what-is-this/lettermark-black.png"
                alt=""
                width={24}
                height={24}
                className={styles.heroFramingLogo}
              />
            </div>

            <h3 className={styles.heroSubtitle}>
              <SplitLinesReveal duration={1.4} delay={2.6} className={styles.subtitleLine}>
                <span>We create partnerships that feel good.</span>
              </SplitLinesReveal>
              <SplitLinesReveal duration={1.4} delay={3.1} className={styles.subtitleLine}>
                <span>Because they are good.</span>
              </SplitLinesReveal>
            </h3>

            <div className={styles.heroLogoRow}>
              <Image
                src="/images/what-is-this/lettermark-black.png"
                alt=""
                width={24}
                height={24}
                className={styles.heroFramingLogo}
              />
              <Image
                src="/images/what-is-this/lettermark-black.png"
                alt=""
                width={24}
                height={24}
                className={styles.heroFramingLogo}
              />
              <Image
                src="/images/what-is-this/lettermark-black.png"
                alt=""
                width={24}
                height={24}
                className={styles.heroFramingLogo}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Globe Background Container */}
      <div className={styles.globeWrapper}>
        {/* Centered decorative bars — now rendered via <BarsRipple>,
           a canvas component running a shallow-water height-field
           simulation. Cursor crossings seed splashes and the result
           refracts the vertical color bars like light through water. */}
        <BarsRipple
          src="/images/what-is-this/color-bars.png"
          className={styles.decorativeBars}
        />

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
                  We connect podcasters and brands who love the same things.
                </p>
              </ScrollFadeUp>
              <ScrollFadeUp index={1} duration={1.6}>
                <p className={styles.sectionBody}>
                  Every story told, ad placed, and partnership formed is an intentional act of world making. When good brands partner with good creators and their communities, the future is shaped in the right direction.
                </p>
              </ScrollFadeUp>
              <ScrollFadeUp index={2} duration={1.6}>
                <p className={styles.sectionBody}>
                  We go beyond algorithmic targeting in search of deep resonance. So, we&rsquo;ve developed the Resonance Quotient (RQ) to help us match you with partners you&rsquo;d be proud to work with.
                </p>
              </ScrollFadeUp>
              <ScrollFadeUp index={3} duration={1.6}>
                <p className={styles.sectionBody}>
                  This is genuine alignment: creators keep their voice, brands keep their conviction, and audiences sense harmony instead of interruption.
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
                  And when a partnership shares soul? Trust flows naturally.
                </p>
              </ScrollFadeUp>
              <ScrollFadeUp index={1} duration={1.6}>
                <p className={styles.sectionBody}>
                  Trust is the ultimate low-friction economic climate (Acoglu, 2023), and resonance loves this climate. 75% of listeners are happy to spend more towards brands that feel right (Edelman, 2025).
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
                  We are a podcast network that connects creators and brands who share soul. Those who know their work shapes the future and take that responsibility seriously. As a creator or advertiser, whether you are value-sensitive, faith-based, or simply aware of the ethical impact of what you make, you belong in <BrandedGhostSignal /> if you sense that your work is making the world.
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
                  <span>This is</span>
                </SplitLinesReveal>
                <SplitLinesReveal duration={3.6} stagger={0.5} delay={0.6} className={styles.headlineLine}>
                  <span>the signal</span>
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

      {/* Platforms — listening platforms row, all-black monochrome marks
          on a white backdrop. Sits above the standardised Get-In-Touch
          contact section. */}
      <section className={styles.platformsSection}>
        <div className={styles.platformsContainer}>
          <ScrollFadeUp index={0} duration={1.6}>
            <h2 className={styles.platformsHeadline}>Platforms</h2>
          </ScrollFadeUp>
          <ScrollFadeUp index={1} duration={1.6}>
            <p className={styles.platformsSubhead}>
              Listen on your favorite platform.
            </p>
          </ScrollFadeUp>
          <ScrollFadeUp index={2} duration={1.6}>
            <ul className={styles.platformsList} aria-label="Listening platforms">
              <li className={styles.platformItem}>
                <Image src="/images/what-is-this/spotify.svg" alt="Spotify" width={150} height={50} />
              </li>
              <li className={styles.platformItem}>
                <Image src="/images/what-is-this/applepodcasts.svg" alt="Apple Podcasts" width={150} height={29} />
              </li>
              <li className={styles.platformItem}>
                <Image src="/images/what-is-this/amazon.svg" alt="Amazon Music" width={150} height={34} />
              </li>
              <li className={styles.platformItem}>
                <Image src="/images/what-is-this/youtube.svg" alt="YouTube" width={150} height={42} />
              </li>
            </ul>
          </ScrollFadeUp>
        </div>
      </section>

      <ContactSection />

      <Footer />
    </main>
  );
}

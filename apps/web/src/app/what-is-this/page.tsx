"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";

import type { ValuesControl } from "./ValuesBinary";
import type { HarmonyControl } from "./HarmonyOrbs";

const HarmonyOrbs = dynamic(() => import("./HarmonyOrbs"), { ssr: false });

import BarsRipple from "./BarsRipple";
import { SiteHeader } from "@/components/SiteHeader";
// ScrollScenes pulls in a custom WebGL globe + ring system (~700 LOC of
// shader and JS). Defer it off the initial route chunk — the globe only
// becomes visible well below the fold anyway.
const ScrollScenes = dynamic(
  () => import("@/components/ScrollScenes").then((m) => m.ScrollScenes),
  { ssr: false },
);

// Binary-star R3F scene for the Values section. Pulls in three.js +
// R3F + drei + postprocessing — same chunk size that's already paid
// on /admin/marketplace, but here we dynamic-import + ssr:false so
// the marketing page's initial chunk stays light.
const ValuesBinary = dynamic(() => import("./ValuesBinary"), {
  ssr: false,
});

// Canvas cherry-blossom overlay — ssr:false since it needs the DOM.
const HeroBlossoms = dynamic(() => import("./HeroBlossoms"), { ssr: false });
import { ParallaxBackground } from "@/components/ParallaxBackground";
import { Footer } from "@/components/Footer";
import { ContactSection } from "@/components/ContactSection";
import { BrandedGhostSignal } from "@/components/BrandedGhostSignal";
import { Container, Section } from "@/components/layout";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";
import { gsap } from "@/motion/gsap";
import { useIsomorphicLayoutEffect } from "@/motion/useIsomorphicLayoutEffect";

import styles from "./page.module.css";
import { navLinks } from "@/lib/nav";

export default function WhatIsThisPage() {
  const heroVideoWrapperRef = useRef<HTMLDivElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const heroBackgroundRef = useRef<HTMLDivElement>(null);
  const heroTextRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const harmonyInteractionRef = useRef<HTMLDivElement>(null);
  const harmonyControlRef = useRef<HarmonyControl>({
    frozen: false,
    yaw: 0,
    pitch: 0,
  });
  const harmonyDragRef = useRef<{
    x: number;
    y: number;
    y0: number;
    p0: number;
  } | null>(null);

  // ValuesBinary control: a single ref shared with the R3F scene's
  // useFrame loop. The section-level pointer handlers below mutate
  // this ref directly so updates don't trigger React re-renders that
  // would tear the Canvas down. `frozen` slowly lerps the scene rate
  // to zero; `yaw` / `pitch` are the user-driven rotation deltas
  // applied on top of the auto-tilt/spin so the frozen scene can be
  // turned and twisted in 3D.
  const valuesControlRef = useRef<ValuesControl>({
    frozen: false,
    yaw: 0,
    pitch: 0,
  });
  const valuesDragRef = useRef<{
    x: number;
    y: number;
    y0: number;
    p0: number;
    dragged: boolean;
  } | null>(null);
  const [valuesGrabbing, setValuesGrabbing] = useState(false);

  const onValuesPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    valuesDragRef.current = {
      x: e.clientX,
      y: e.clientY,
      y0: valuesControlRef.current.yaw,
      p0: valuesControlRef.current.pitch,
      dragged: false,
    };
    // Hold-to-freeze: freezing happens for the duration of the press.
    valuesControlRef.current.frozen = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setValuesGrabbing(true);
  };
  const onValuesPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = valuesDragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    valuesControlRef.current.yaw = drag.y0 + dx * 0.008;
    valuesControlRef.current.pitch = drag.p0 + dy * 0.008;
  };
  const onValuesPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    // Release always resumes the animation — the in-scene speed lerp
    // makes it ramp back up smoothly.
    valuesControlRef.current.frozen = false;
    valuesDragRef.current = null;
    setValuesGrabbing(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Pointer capture may already be released — ignore.
    }
  };

  useIsomorphicLayoutEffect(() => {
    const wrapper = heroVideoWrapperRef.current;
    const video = heroVideoRef.current;
    const background = heroBackgroundRef.current;
    const text = heroTextRef.current;
    if (!wrapper || !video) return;

    const trigger = {
      trigger: wrapper,
      start: "top top",
      // Fade completes inside the first viewport of scroll so the video
      // is fully gone by the time the next section reaches the
      // viewport top — no visible seam between hero and the section
      // below it. Was "+=140%" (longer, more gradual) but the seam
      // read as a transition glitch.
      end: "+=80%",
      scrub: 1,
    } as const;

    // Video + white frame: opacity fade ONLY. Every other property
    // (filter, transform, scale, y) has been removed after repeated
    // Chromium decoder-stall freezes — the browser will happily
    // composite an opacity-only layer while keeping the video decoder
    // running. Parallax on the video is not worth a frozen loop. The
    // .heroBackground sibling fades in lockstep with the video so the
    // four-sided white frame dissolves together with the footage —
    // once both are gone, the starry parallax shows through the now-
    // transparent .hero into the gap before the harmony section.
    const videoTween = gsap.fromTo(
      background ? [video, background] : video,
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

    // Bars-graph fade-in — runs in lockstep with the video fade-out
    // (same trigger / start / end / scrub) so the bars emerge at exactly
    // the same scroll-rate that the video disappears. Target opacity
    // 0.6 matches the prior static value; CSS starts the wrapper at 0.
    const bars = barsRef.current;
    const barsTween = bars
      ? gsap.fromTo(
          bars,
          { opacity: 0 },
          {
            opacity: 0.6,
            ease: "power1.inOut",
            scrollTrigger: trigger,
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
      barsTween?.scrollTrigger?.kill();
      barsTween?.kill();
    };
  }, []);

  // Harmony orbit drive — JS-driven rAF loop replaces the prior CSS
  // animations on .harmonyOrbit + .harmonyOrbitSphere so the same code
  // path can do auto-spin AND respond to pointer-drag on the sphere.
  // Auto-spin: 36°/s (matches the prior 10s CSS cycle). Drag: cursor X
  // delta maps to angular velocity (1°/px); release resumes auto-spin
  // from the dragged position. Reduced-motion users skip the spin
  // entirely; drag still works.
  // Section-level pointer handlers for the Harmony scene. Same
  // press-hold-to-freeze / drag-to-rotate / release-to-resume pattern
  // used by ValuesBinary; HarmonyOrbs reads `harmonyControlRef` in
  // its R3F useFrame.
  const onHarmonyPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    harmonyDragRef.current = {
      x: e.clientX,
      y: e.clientY,
      y0: harmonyControlRef.current.yaw,
      p0: harmonyControlRef.current.pitch,
    };
    harmonyControlRef.current.frozen = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.classList.add(styles.harmonyInteractionGrabbing);
  };
  const onHarmonyPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = harmonyDragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    // Yaw: 1°/px, pitch: 0.5°/px (matches the prior CSS-3D feel).
    // Pitch clamped to ±75° so the user can't flip the orbit fully.
    const DEG = Math.PI / 180;
    harmonyControlRef.current.yaw = drag.y0 + dx * 1 * DEG;
    const pitchDeg = Math.max(-75, Math.min(75, drag.p0 / DEG + dy * 0.5));
    harmonyControlRef.current.pitch = pitchDeg * DEG;
  };
  const onHarmonyPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    harmonyControlRef.current.frozen = false;
    harmonyDragRef.current = null;
    e.currentTarget.classList.remove(styles.harmonyInteractionGrabbing);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Pointer capture may already be released — ignore.
    }
  };

  return (
    <main className={styles.page}>
      <SiteHeader links={navLinks} />

      {/* Starry night background — the feathered cloud overlay has been
          removed so only the star layer shows through. */}
      <ParallaxBackground />

      {/* Hero Section — mirrors /for-creators's hero: white-bg parent,
          video positioned inside with a 100 px inset on three sides,
          text/logos in a normal-flow .heroContent stack over it. */}
      <Section className={styles.hero}>
        {/* White hero background — owns the white that forms the
            four-sided frame around the video. Lives as a child (not
            on .hero) so it can be opacity-tweened independently of
            the heroContent text, which has its own fade. */}
        <div
          ref={heroBackgroundRef}
          className={styles.heroBackground}
          aria-hidden="true"
        />
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
            <source src="/images/what-is-this/garden4.webm" type="video/webm" />
            <source src="/images/what-is-this/garden4-optimized.mp4" type="video/mp4" />
          </video>
        </div>
        {/* Cherry blossom overlay — sits on top of the video AND the
            text, extending the video's falling-blossom motif onto the
            whole hero for a layered 3D read. */}
        <HeroBlossoms />
        {/* Headline + subtitle in normal flow over the video. */}
        <div ref={heroTextRef} className={styles.heroContent}>
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
      </Section>

      {/* Globe Background Container */}
      <div className={styles.globeWrapper}>
        {/* Centered decorative bars — now rendered via <BarsRipple>,
           a canvas component running a shallow-water height-field
           simulation. Cursor crossings seed splashes and the result
           refracts the vertical color bars like light through water.
           The wrapping div is what GSAP fades in (in lockstep with the
           video's fade-out); BarsRipple just fills it. */}
        <div ref={barsRef} className={styles.decorativeBars} aria-hidden="true">
          <BarsRipple
            src="/images/what-is-this/color-bars.png"
            className={styles.decorativeBarsCanvas}
          />
        </div>

        {/* Scrolling Content Over Globe */}
        <div className={styles.scrollContent}>
          {/* Section 2: Advertising Harmony */}
          <Section className={styles.harmonySection}>
            {/* Section-spanning interaction layer — captures pointer
                events anywhere over the Harmony animation. Press and
                hold pauses the auto-spin; horizontal drag yaws,
                vertical drag pitches the orbit; release resumes. */}
            <div
              ref={harmonyInteractionRef}
              className={styles.harmonyInteraction}
              onPointerDown={onHarmonyPointerDown}
              onPointerMove={onHarmonyPointerMove}
              onPointerUp={onHarmonyPointerUp}
              onPointerCancel={onHarmonyPointerUp}
              aria-hidden="true"
            />
            {/* Distant nocturnal black-sun — endless 10-second cycle.
                Pure-black disk with a faint amber corona that breathes
                in / out, evoking a total eclipse seen from far away.
                CSS-only (no canvas / WebGL) so the cost is just two
                divs and one keyframe pair. */}
            <div className={styles.harmonySun} aria-hidden="true">
              <div className={styles.harmonySunCorona2} />
              <div className={styles.harmonySunCorona} />
              <div className={styles.harmonySunDisk} />
              {/* Three orbiting dark spheres — R3F scene with real
                  PBR-shaded geometry, so dragging the orbit reveals
                  genuine 3D forms. Different sizes, different speeds,
                  three independent orbital planes. */}
              <div className={styles.harmonyOrbsWrapper}>
                <HarmonyOrbs controlRef={harmonyControlRef} />
              </div>
            </div>
            {/* Headline centered */}
            <div className={styles.headlineBlock}>
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
                  <span>harmony?</span>
                </SplitLinesReveal>
              </h2>
            </div>
            {/* Body text centered on page, left-aligned inside */}
            <div className={styles.bodyBlock}>
              <ScrollFadeUp index={0} duration={1.6}>
                <p className={styles.sectionBody}>
                  We call it Values-Based Advertising, or simply, The Signal&mdash;a new model where partnerships are rooted in shared conviction.
                </p>
              </ScrollFadeUp>
              <ScrollFadeUp index={1} duration={1.6}>
                <p className={styles.sectionBody}>
                  Where a brand&rsquo;s message amplifies a creator&rsquo;s voice, and a creator builds trust for the brand.
                </p>
              </ScrollFadeUp>
              <ScrollFadeUp index={2} duration={1.6}>
                <p className={styles.sectionBody}>
                  When creators and brands share soul, the world is made in the right direction.
                </p>
              </ScrollFadeUp>
              <ScrollFadeUp index={3} duration={1.6}>
                <p className={styles.sectionBody}>
                  What do we mean by shared conviction? Check out our XQ and RQ assessments to find out.
                </p>
              </ScrollFadeUp>
              <ScrollFadeUp index={4} duration={1.6} className={styles.elevatedCtaWrapper}>
                <Link href="/rq-quiz" className={styles.whitepaperButton}>
                  Find my match
                </Link>
              </ScrollFadeUp>
            </div>
          </Section>

          {/* Section 3: Values Create Value - RIGHT */}
          <Section className={`${styles.textSection} ${styles.alignRight}`}>
            {/* Binary-star R3F scene — two PBR spheres lit by their
                own coloured point lights, drag-spin with inertia,
                selective Bloom on emissive cores. Mounts only when
                visible (IntersectionObserver inside the component)
                so it costs nothing while the user is at the top of
                the page. Replaces an earlier CSS-3D placeholder. */}
            <div className={styles.valuesBinaryWrapper}>
              <ValuesBinary controlRef={valuesControlRef} />
            </div>
            {/* Section-spanning interaction layer — captures pointer
                events anywhere over the Values section so the cursor
                reads as a hand and the user can click to freeze the
                scene, then drag to twist it in 3D. Sits above both
                the canvas and the text container. */}
            <div
              className={`${styles.valuesInteraction}${
                valuesGrabbing ? " " + styles.valuesInteractionGrabbing : ""
              }`}
              onPointerDown={onValuesPointerDown}
              onPointerMove={onValuesPointerMove}
              onPointerUp={onValuesPointerUp}
              onPointerCancel={onValuesPointerUp}
              aria-hidden="true"
            />
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
                  And when advertising partnerships share soul?
                </p>
              </ScrollFadeUp>
              <ScrollFadeUp index={1} duration={1.6}>
                <p className={styles.sectionBody}>
                  Creators earn without selling out
                </p>
              </ScrollFadeUp>
              <ScrollFadeUp index={2} duration={1.6}>
                <p className={styles.sectionBody}>
                  Brands are promoted without compromise
                </p>
              </ScrollFadeUp>
              <ScrollFadeUp index={3} duration={1.6}>
                <p className={styles.sectionBody}>
                  Audiences sense harmony instead of interruption
                </p>
              </ScrollFadeUp>
              <ScrollFadeUp index={4} duration={1.6}>
                <p className={styles.sectionBody}>
                  Want to take a deeper dive into the science?
                </p>
              </ScrollFadeUp>
              <ScrollFadeUp index={5} duration={1.6} className={styles.elevatedCtaWrapper}>
                <a
                  href="https://drive.google.com/file/d/1j5eA3-OSEVnx0TP13DoqfsfD-viREGvk/view?usp=sharing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.whitepaperButton}
                >
                  Read our white paper
                </a>
              </ScrollFadeUp>
            </div>
          </Section>

          {/* Final Section: This is the Signal - with globe below */}
          <Section className={styles.finalSection}>
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
          </Section>

          {/* White Paper CTA Section */}
          <Section className={styles.whitepaperSection}>
            <div className={styles.whitepaperContent}>
              <ScrollFadeUp index={0} duration={1.6}>
                <p className={styles.whitepaperText}>
                  Access our white paper and read about how <BrandedGhostSignal /> can help you make the world.
                </p>
              </ScrollFadeUp>
              <ScrollFadeUp index={1} duration={1.6}>
                <a
                  href="https://drive.google.com/file/d/1j5eA3-OSEVnx0TP13DoqfsfD-viREGvk/view?usp=sharing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.whitepaperButton}
                >
                  Read the White Paper
                </a>
              </ScrollFadeUp>
            </div>
          </Section>
        </div>
      </div>

      {/* Platforms — listening platforms row, all-black monochrome marks
          on a white backdrop. Sits above the standardised Get-In-Touch
          contact section. */}
      <Section className={styles.platformsSection}>
        <Container className={styles.platforms}>
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
        </Container>
      </Section>

      <ContactSection />

      <Footer />
    </main>
  );
}

import Image from "next/image";
import Link from "next/link";

import { SiteHeader } from "@/components/SiteHeader";
import { ScrollScenes } from "@/components/ScrollScenes";
import { SpinningLogo3D } from "@/components/SpinningLogo3D";
import { ParallaxBackground } from "@/components/ParallaxBackground";
import { Footer } from "@/components/Footer";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";

import styles from "./page.module.css";

const navLinks = [
  { href: "/what-is-this", label: "What is this" },
  { href: "/for-creators", label: "For Creators" },
  { href: "/for-advertisers", label: "For Advertisers" },
  { href: "/who-are-we", label: "Who Are We" },
  { href: "/snowdrift", label: "SNOWDRIFT" },
  { href: "/get-in-touch", label: "Get In Touch" },
] as const;

export const metadata = {
  title: "What Is This | GhostSignal",
  description: "GhostSignal is the values-based podcast advertising network. We create partnerships that feel good because they are good.",
};

export default function WhatIsThisPage() {
  return (
    <main className={styles.page}>
      <SiteHeader links={navLinks} />

      {/* Parallax background */}
      <ParallaxBackground
        imageSrc="/images/what-is-this/clouds-bg.jpg"
        speed={0.3}
      />

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

        {/* Globe moved to finalSection - keeping wrapper for layout */}

        {/* Scrolling Content Over Globe */}
        <div className={styles.scrollContent}>
          {/* Section 1: Values-Based Network - LEFT with spinning logo */}
          <section className={`${styles.textSection} ${styles.alignLeft}`}>
            <div className={styles.sectionWithLogo}>
              <div className={styles.textContainer}>
                <SplitLinesReveal duration={1.8} stagger={0.25}>
                  <h1 className={styles.sectionHeadline}>
                    The values-based podcast advertising network
                  </h1>
                </SplitLinesReveal>
                <ScrollFadeUp index={0} duration={1.6}>
                  <p className={styles.sectionSubtitle}>
                    We create partnerships that feel good because they are good.
                  </p>
                </ScrollFadeUp>
                <ScrollFadeUp index={1} duration={1.6}>
                  <p className={styles.sectionBody}>
                    Values-based advertising is an approach that evaluates podcasters and brands on a matrix of commitments like lifestyle resonance, tone, aesthetic fit, and mission alignment.
                  </p>
                </ScrollFadeUp>
              </div>
              <SpinningLogo3D className={styles.spinningLogo} />
            </div>
          </section>

          {/* Section 2: Advertising Harmony - RIGHT */}
          <section className={`${styles.textSection} ${styles.alignRight}`}>
            <div className={styles.textContainer}>
              <SplitLinesReveal duration={1.8} stagger={0.25}>
                <h2 className={styles.sectionHeadline}>
                  What if advertising could make harmony
                </h2>
              </SplitLinesReveal>
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
              <SplitLinesReveal duration={1.8} stagger={0.25}>
                <h2 className={styles.sectionHeadline}>
                  Values Create Value
                </h2>
              </SplitLinesReveal>
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
              <SplitLinesReveal duration={1.8} stagger={0.25}>
                <h2 className={styles.sectionHeadline}>
                  Who is GhostSignal?
                </h2>
              </SplitLinesReveal>
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
              <SplitLinesReveal duration={2} stagger={0.3}>
                <h2 className={styles.finalHeadline}>
                  This is the signal
                </h2>
              </SplitLinesReveal>
              <ScrollFadeUp index={2} duration={1.6}>
                <p className={styles.finalTagline}>
                  Everything else is just static.
                </p>
              </ScrollFadeUp>
            </div>
            {/* Globe directly below the headline */}
            <div className={styles.finalGlobeWrapper}>
              <ScrollScenes className={styles.finalGlobe} />
            </div>
          </section>

          {/* White Paper CTA Section */}
          <section className={styles.whitepaperSection}>
            <div className={styles.whitepaperContent}>
              <ScrollFadeUp index={0} duration={1.6}>
                <p className={styles.whitepaperText}>
                  Access our white paper and read about how GhostSignal can help you make the world.
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

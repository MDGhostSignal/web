import Image from "next/image";

import { SiteHeader } from "@/components/SiteHeader";
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
  { href: "/rq-quiz", label: "RQ Quiz" },
  { href: "/get-in-touch", label: "Get In Touch" },
] as const;

export const metadata = {
  title: "SnowDrift | Signals from the Future",
  description: "A monthly transmission for creators and brands building in the new age of value-based advertising — where meaning matters more than reach.",
};

export default function SnowdriftPage() {
  return (
    <main className={styles.page}>
      <SiteHeader links={navLinks} />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroSky} aria-hidden="true" />
        <div className={styles.heroContent}>
          <ScrollFadeUp index={0} duration={1.6}>
            <Image
              src="/images/brand/snowdrift-logo-white.png"
              alt="Snowdrift"
              width={200}
              height={200}
              className={styles.heroLogo}
            />
          </ScrollFadeUp>
          <SplitLinesReveal duration={2.2} stagger={0.3}>
            <h1 className={styles.heroHeadline}>
              Voices from the cultural future
            </h1>
          </SplitLinesReveal>
          <ScrollFadeUp index={1} duration={1.8}>
            <p className={styles.heroTagline}>
              A <strong>GHOST</strong>Signal transmission.
            </p>
          </ScrollFadeUp>
        </div>
      </section>

      {/* Newsletter Signup Section */}
      <section className={styles.signupSection}>
        <div className={styles.signupContainer}>
          <ScrollFadeUp index={0} duration={1.6}>
            <h2 className={styles.signupHeadline}>Welcome to the Snowdrift</h2>
          </ScrollFadeUp>
          <ScrollFadeUp index={1} duration={1.6}>
            <p className={styles.signupSubhead}>
              Subscribe now for the signals shaping what&apos;s next.
            </p>
          </ScrollFadeUp>
          <ScrollFadeUp index={2} duration={1.6}>
            <a
              href="https://snowdriftghostsignal.substack.com/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.formButton}
            >
              Subscribe on Substack
            </a>
          </ScrollFadeUp>
        </div>
      </section>

      {/* Description Section */}
      <section className={styles.descriptionSection}>
        <div className={styles.descriptionContainer}>
          <ScrollFadeUp index={0} duration={1.6}>
            <p className={styles.descriptionTagline}>
              A Monthly Transmission for creators and brands building in the new age of value-based advertising — where meaning matters more than reach.
            </p>
          </ScrollFadeUp>

          <div className={styles.descriptionContent}>
            <ScrollFadeUp index={1} duration={1.6}>
              <p className={styles.descriptionText}>
                Snowdrift is your early-warning system for the cultural shifts reshaping media, meaning, and money. Every month, we surface the sharpest thinking on value-based advertising, podcast storytelling, and staying human in an increasingly tech-full world.
              </p>
            </ScrollFadeUp>
            <ScrollFadeUp index={2} duration={1.6}>
              <p className={styles.descriptionText}>
                For podcasters and creators, it&apos;s a radar for what&apos;s coming — not what&apos;s already viral. For companies, it&apos;s the clearest path toward resonance, not just reach.
              </p>
            </ScrollFadeUp>
            <ScrollFadeUp index={3} duration={1.6}>
              <p className={styles.descriptionText}>
                Stories, distilled insights, and deep dives from the GhostSignal team.
              </p>
            </ScrollFadeUp>
            <ScrollFadeUp index={4} duration={1.6}>
              <p className={styles.descriptionHighlight}>
                The people who believe all of us, for better or worse, are making the world. Let&apos;s make it for the better.
              </p>
            </ScrollFadeUp>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

import Image from "next/image";
import Link from "next/link";

import { SiteHeader } from "@/components/SiteHeader";
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
            <form className={styles.signupForm} action="https://ghostsignal.substack.com/subscribe" method="GET" target="_blank">
              <label htmlFor="email" className={styles.formLabel}>Email Address</label>
              <div className={styles.formRow}>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="you@example.com"
                  required
                  className={styles.formInput}
                />
                <button type="submit" className={styles.formButton}>
                  Sign Up
                </button>
              </div>
            </form>
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

      {/* Second CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContainer}>
          <SplitLinesReveal duration={2} stagger={0.28}>
            <h2 className={styles.ctaHeadline}>
              Subscribe now, and get the signals shaping what&apos;s next.
            </h2>
          </SplitLinesReveal>
          <ScrollFadeUp index={0} duration={1.6}>
            <form className={styles.ctaForm} action="https://ghostsignal.substack.com/subscribe" method="GET" target="_blank">
              <div className={styles.formRow}>
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  required
                  className={styles.formInput}
                />
                <button type="submit" className={styles.formButton}>
                  Sign Up Now
                </button>
              </div>
            </form>
          </ScrollFadeUp>
          <ScrollFadeUp index={1} duration={1.6}>
            <p className={styles.ctaClosing}>Welcome to the Snowdrift</p>
          </ScrollFadeUp>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <Image
            src="/images/home/figma/footer-mark-dark.gif"
            alt="Ghost Signal mark"
            width={155}
            height={145}
            unoptimized
            className={styles.footerMark}
          />
          <div className={styles.footerWordmark}>
            <Image
              src="/images/home/figma/footer-wordmark-ghost.svg"
              alt="Ghost"
              width={289.978}
              height={57.7955}
              className={styles.footerWordmarkLeft}
            />
            <Image
              src="/images/home/figma/footer-wordmark-signal.svg"
              alt="Signal"
              width={219.702}
              height={71.9804}
              className={styles.footerWordmarkRight}
            />
          </div>
        </div>

        <nav className={styles.footerNav} aria-label="Footer">
          <div className={styles.footerCol}>
            <h4 className={styles.footerColTitle}>Discover</h4>
            <ul className={styles.footerColLinks}>
              <li><Link href="/for-creators">FOR CREATORS</Link></li>
              <li><Link href="/for-brands">FOR BRANDS</Link></li>
            </ul>
          </div>
          <div className={styles.footerCol}>
            <h4 className={styles.footerColTitle}>Company</h4>
            <ul className={styles.footerColLinks}>
              <li><Link href="/who-are-we">WHO WE ARE</Link></li>
              <li><Link href="/what-is-this">WHAT IS THIS</Link></li>
            </ul>
          </div>
          <div className={styles.footerCol}>
            <h4 className={styles.footerColTitle}>Learn</h4>
            <ul className={styles.footerColLinks}>
              <li><Link href="/snowdrift">SNOWDRIFT</Link></li>
            </ul>
          </div>
        </nav>

        <div className={styles.footerMorse}>
          <p className={styles.morseCode}>
            -.-. -. - ... - --- .--. - .... . ... .. --. -. .- .-..
          </p>
        </div>

        <div className={styles.footerSocial}>
          <a
            href="https://www.instagram.com/ghostsignal.cloud"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className={styles.socialLink}
          >
            <Image
              src="/images/home/figma/social-instagram.svg"
              alt=""
              width={24}
              height={24}
              className={styles.socialIcon}
            />
          </a>
          <a
            href="https://www.linkedin.com/company/108297128"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className={styles.socialLink}
          >
            <Image
              src="/images/home/figma/social-linkedin-outline.svg"
              alt=""
              width={24}
              height={24}
              className={styles.socialIcon}
            />
          </a>
          <a
            href="https://www.facebook.com/ghostsignal.cloud"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className={styles.socialLink}
          >
            <Image
              src="/images/home/figma/social-facebook.svg"
              alt=""
              width={24}
              height={24}
              className={styles.socialIcon}
            />
          </a>
        </div>
      </footer>
    </main>
  );
}

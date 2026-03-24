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
  title: "What Is This | GhostSignal",
  description: "Access our whitepaper and read about how GhostSignal can help you make the world through values-based advertising.",
};

export default function WhatIsThisPage() {
  return (
    <main className={styles.page}>
      <SiteHeader links={navLinks} />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroSky} aria-hidden="true" />
        <div className={styles.heroContent}>
          <ScrollFadeUp index={0} duration={1.8}>
            <p className={styles.heroEyebrow}>Welcome to the Signal</p>
          </ScrollFadeUp>
          <SplitLinesReveal duration={2} stagger={0.3}>
            <h1 className={styles.heroHeadline}>WHAT IS THIS</h1>
          </SplitLinesReveal>
          <ScrollFadeUp index={1} duration={1.8}>
            <p className={styles.heroSubhead}>
              Access our whitepaper and read about how GhostSignal can help you make the world
            </p>
          </ScrollFadeUp>
          <ScrollFadeUp index={2} duration={1.8}>
            <a
              href="/s/GS-whitepaper-v4.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.heroCta}
            >
              Our Whitepaper
              <Image
                src="/images/home/icon-arrow-right.svg"
                alt=""
                width={24}
                height={24}
                className={styles.ctaArrow}
              />
            </a>
          </ScrollFadeUp>
        </div>
      </section>

      {/* Audience Cards Section */}
      <section className={styles.cardsSection}>
        <div className={styles.cardsGrid}>
          {/* For Creators Card */}
          <ScrollFadeUp index={0} duration={1.6}>
            <Link href="/for-creators" className={styles.card}>
              <div className={styles.cardImageWrap}>
                <Image
                  src="/images/home/figma/mariah.png"
                  alt="Classical sculpture representing creative expression"
                  width={600}
                  height={400}
                  className={styles.cardImage}
                />
                <div className={styles.cardImageOverlay} />
              </div>
              <div className={styles.cardContent}>
                <h2 className={styles.cardTitle}>FOR CREATORS</h2>
                <span className={styles.cardLink}>
                  Learn more
                  <Image
                    src="/images/home/icon-arrow-right.svg"
                    alt=""
                    width={20}
                    height={20}
                    className={styles.cardArrow}
                  />
                </span>
              </div>
            </Link>
          </ScrollFadeUp>

          {/* For Advertisers Card */}
          <ScrollFadeUp index={1} duration={1.6}>
            <Link href="/for-advertisers" className={styles.card}>
              <div className={styles.cardImageWrap}>
                <div className={styles.cardImageGradient} />
              </div>
              <div className={styles.cardContent}>
                <h2 className={styles.cardTitle}>FOR ADVERTISERS</h2>
                <span className={styles.cardLink}>
                  Learn more
                  <Image
                    src="/images/home/icon-arrow-right.svg"
                    alt=""
                    width={20}
                    height={20}
                    className={styles.cardArrow}
                  />
                </span>
              </div>
            </Link>
          </ScrollFadeUp>
        </div>
      </section>

      {/* Contact Section */}
      <section className={styles.contactSection}>
        <div className={styles.contactContent}>
          <div className={styles.contactText}>
            <ScrollFadeUp index={0} duration={1.6}>
              <p className={styles.contactEyebrow}>GET IN TOUCH</p>
            </ScrollFadeUp>
            <SplitLinesReveal duration={1.8} stagger={0.28}>
              <h2 className={styles.contactHeadline}>
                EVERY PARTNERSHIP STARTS WITH A CHAT
              </h2>
            </SplitLinesReveal>
            <ScrollFadeUp index={1} duration={1.6}>
              <p className={styles.contactBody}>
                Podcaster or Advertiser, ready to find your frequency? Schedule a call.
              </p>
            </ScrollFadeUp>
            <ScrollFadeUp index={2} duration={1.6}>
              <Link href="/get-in-touch" className={styles.contactCta}>
                Email Us
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
          <div className={styles.contactVisual}>
            <Image
              src="/images/home/figma/bars.png"
              alt="Colorful horizontal lines representing the signal"
              width={400}
              height={300}
              className={styles.contactBars}
            />
          </div>
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

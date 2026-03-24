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
    description: "We handle the paperwork, contracts, reporting, and payment tracking (including transparent revenue splits) so you are freed up to create.",
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
    description: "We find advertisers who resonate with the world that you're building. Every partnership is curated to feel natural. We have a system called the 'Resonance Index' that helps us learn about you and steward your story. We handle the contracts, ad logistics, reporting, and analysis — ensuring the partnership feels natural and delivers a resonant return.",
  },
] as const;

export const metadata = {
  title: "For Creators | GhostSignal",
  description: "Your podcast is cultural architecture. Monetize while maintaining your voice and values with soul-aligned brand partnerships.",
};

export default function ForCreatorsPage() {
  return (
    <main className={styles.page}>
      <SiteHeader links={navLinks} />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroSky} aria-hidden="true" />
        <div className={styles.heroContent}>
          <SplitLinesReveal duration={2.2} stagger={0.3}>
            <h1 className={styles.heroHeadline}>
              Your podcast is cultural architecture. You are building the future.
            </h1>
          </SplitLinesReveal>
          <ScrollFadeUp index={0} duration={1.8}>
            <p className={styles.heroSubhead}>
              Your voice is not for sale. Your audience is not a data point. Your work is not merely &quot;content.&quot;
            </p>
          </ScrollFadeUp>
          <ScrollFadeUp index={1} duration={1.8}>
            <p className={styles.heroBody}>
              What if you could monetize your podcast while maintaining your voice and values? The traditional ad model forces impossible choices: compromise your voice, risk your audience&apos;s trust, or drown in administrative tasks.
            </p>
          </ScrollFadeUp>
          <ScrollFadeUp index={2} duration={1.8}>
            <p className={styles.heroCta}>
              We are here to protect your voice, honor your audience, and help you find the partners who will make the world alongside you.
            </p>
          </ScrollFadeUp>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.featuresSection}>
        <div className={styles.featuresContainer}>
          <ScrollFadeUp index={0} duration={1.6}>
            <h2 className={styles.sectionTitle}>Why this works</h2>
          </ScrollFadeUp>
          <div className={styles.featuresGrid}>
            {features.map((feature, index) => (
              <ScrollFadeUp key={feature.title} index={index} duration={1.6}>
                <article className={styles.featureCard}>
                  <h3 className={styles.featureTitle}>{feature.title}</h3>
                  <p className={styles.featureDescription}>{feature.description}</p>
                </article>
              </ScrollFadeUp>
            ))}
          </div>
          <ScrollFadeUp index={4} duration={1.6}>
            <Link href="/get-in-touch" className={styles.primaryButton}>
              Get In Touch
            </Link>
          </ScrollFadeUp>
        </div>
      </section>

      {/* Core Concept Section */}
      <section className={styles.conceptSection}>
        <div className={styles.conceptContent}>
          <SplitLinesReveal duration={2} stagger={0.28}>
            <h2 className={styles.conceptHeadline}>
              GHOSTSignal is Advertising-as-Support-System
            </h2>
          </SplitLinesReveal>
          <ScrollFadeUp index={0} duration={1.6}>
            <p className={styles.conceptSubhead}>
              We remove the static, so you can focus on the signal.
            </p>
          </ScrollFadeUp>
        </div>
      </section>

      {/* Membership Journey Section */}
      <section className={styles.journeySection}>
        <div className={styles.journeyContainer}>
          <div className={styles.journeyHeader}>
            <ScrollFadeUp index={0} duration={1.6}>
              <h2 className={styles.journeyTitle}>Your Membership Journey</h2>
            </ScrollFadeUp>
            <ScrollFadeUp index={1} duration={1.6}>
              <p className={styles.journeySubtitle}>how it works</p>
            </ScrollFadeUp>
            <ScrollFadeUp index={2} duration={1.6}>
              <p className={styles.journeyIntro}>
                Our process is simple, unhurried, and sensitive to your voice and mission. Here&apos;s how it goes:
              </p>
            </ScrollFadeUp>
          </div>

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
        </div>
      </section>

      {/* Closing Statement Section */}
      <section className={styles.closingSection}>
        <div className={styles.closingContent}>
          <SplitLinesReveal duration={2.2} stagger={0.3}>
            <h2 className={styles.closingHeadline}>
              You don&apos;t need a million downloads to matter.
            </h2>
          </SplitLinesReveal>
          <ScrollFadeUp index={0} duration={1.6}>
            <p className={styles.closingSubhead}>
              You just need conviction and the right partner to amplify your voice.
            </p>
          </ScrollFadeUp>
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

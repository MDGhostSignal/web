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
    title: "Highly-Attuned Audiences",
    description: "We locate you in front of considered communities where alignment runs deep.",
    gradient: "linear-gradient(135deg, #e8d5c4 0%, #c4a882 100%)",
  },
  {
    title: "Administrative Simplicity",
    description: "We handle invoicing, payments, ensuring efficiency and transparency — without individual podcaster contracts, simplifying your process.",
    gradient: "linear-gradient(135deg, #d4e5f7 0%, #a8c5e0 100%)",
  },
  {
    title: "Real Conversion",
    description: "Audiences who are aligned and feel seen are far more likely to become customers.",
    gradient: "linear-gradient(135deg, #f5d0d0 0%, #e8a8b8 100%)",
  },
  {
    title: "Targeted Spending",
    description: "Every dollar is focused on maximizing impact, not impressions.",
    gradient: "linear-gradient(135deg, #d5e8d4 0%, #a8c4a0 100%)",
  },
] as const;

const journeySteps = [
  {
    number: "01",
    title: "DISCERN FIT",
    description: "We begin with you: we assess your mission and goals to ensure your brand is suitable for our ecosystem of creators.",
  },
  {
    number: "02",
    title: "MEMBERSHIP",
    description: "If we are right for each other, we extend a GHOSTSignal membership offer. This means we formally commit to finding resonant audiences as part of your world building.",
  },
  {
    number: "03",
    title: "RELATIONSHIP",
    description: "We connect you with creators whose audiences are ready to embrace your brand. We have a system called the 'Resonance Index' that helps us learn about you and steward your story. We handle the contracts, ad creation, and transparent reporting — ensuring the partnership feels natural and delivers a resonant return.",
  },
] as const;

export const metadata = {
  title: "For Advertisers | GhostSignal",
  description: "The right audience changes everything. We help you reach aligned audiences by pairing your brand with creators who share your convictions.",
};

export default function ForAdvertisersPage() {
  return (
    <main className={styles.page}>
      <SiteHeader links={navLinks} />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroSky} aria-hidden="true" />
        <div className={styles.heroContent}>
          <SplitLinesReveal duration={2.2} stagger={0.3}>
            <h1 className={styles.heroHeadline}>
              The right audience changes everything.
            </h1>
          </SplitLinesReveal>
          <ScrollFadeUp index={0} duration={1.8}>
            <div className={styles.heroLogoText}>
              <Image
                src="/images/brand/ghostsignal-logo.svg"
                alt="GhostSignal"
                width={48}
                height={48}
                className={styles.heroLogo}
              />
              <p className={styles.heroSubhead}>
                We help you reach the right audience by pairing your brand with creators who share your convictions. When alignment is authentic, trust flows naturally — and <strong>trust is the soil where conversion grows.</strong>
              </p>
            </div>
          </ScrollFadeUp>
        </div>
      </section>

      {/* Why This Works Section */}
      <section className={styles.featuresSection}>
        <div className={styles.featuresContainer}>
          <div className={styles.featuresHeader}>
            <ScrollFadeUp index={0} duration={1.6}>
              <h2 className={styles.sectionTitle}>Why This Works</h2>
            </ScrollFadeUp>
            <ScrollFadeUp index={1} duration={1.6}>
              <Image
                src="/images/home/figma/bars.png"
                alt="Decorative colorful stripes"
                width={200}
                height={80}
                className={styles.decorativeBars}
              />
            </ScrollFadeUp>
          </div>

          <div className={styles.featuresGrid}>
            {features.map((feature, index) => (
              <ScrollFadeUp key={feature.title} index={index} duration={1.6}>
                <article className={styles.featureRow}>
                  <div className={styles.featureText}>
                    <h3 className={styles.featureTitle}>{feature.title}</h3>
                    <p className={styles.featureDescription}>{feature.description}</p>
                  </div>
                  <div
                    className={styles.featureImage}
                    style={{ background: feature.gradient }}
                    aria-hidden="true"
                  />
                </article>
              </ScrollFadeUp>
            ))}
          </div>

          <ScrollFadeUp index={4} duration={1.6}>
            <Link href="/get-in-touch" className={styles.primaryButton}>
              Find Your Frequency
            </Link>
          </ScrollFadeUp>
        </div>
      </section>

      {/* The Pitch Section */}
      <section className={styles.pitchSection}>
        <div className={styles.pitchImageGrid} aria-hidden="true">
          <div className={styles.pitchImageCell} style={{ background: 'linear-gradient(135deg, #2d3436 0%, #636e72 100%)' }} />
          <div className={styles.pitchImageCell} style={{ background: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)' }} />
          <div className={styles.pitchImageCell} style={{ background: 'linear-gradient(135deg, #fd79a8 0%, #e84393 100%)' }} />
          <div className={styles.pitchImageCell} style={{ background: 'linear-gradient(135deg, #55efc4 0%, #00b894 100%)' }} />
          <div className={styles.pitchImageCell} style={{ background: 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)' }} />
          <div className={styles.pitchImageCell} style={{ background: 'linear-gradient(135deg, #dfe6e9 0%, #b2bec3 100%)' }} />
          <div className={styles.pitchImageCell} style={{ background: 'linear-gradient(135deg, #fab1a0 0%, #e17055 100%)' }} />
          <div className={styles.pitchImageCell} style={{ background: 'linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%)' }} />
          <div className={styles.pitchImageCell} style={{ background: 'linear-gradient(135deg, #81ecec 0%, #00cec9 100%)' }} />
          <div className={styles.pitchImageCell} style={{ background: 'linear-gradient(135deg, #ff7675 0%, #d63031 100%)' }} />
          <div className={styles.pitchImageCell} style={{ background: 'linear-gradient(135deg, #ffeaa7 0%, #f39c12 100%)' }} />
          <div className={styles.pitchImageCell} style={{ background: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)' }} />
        </div>
        <div className={styles.pitchContent}>
          <SplitLinesReveal duration={2} stagger={0.28}>
            <h2 className={styles.pitchHeadline}>
              Most ad buys chase impressions. We curate conviction.
            </h2>
          </SplitLinesReveal>
          <ScrollFadeUp index={0} duration={1.6}>
            <p className={styles.pitchBody}>
              When your brand shows up in a podcast community that shares your values, you&apos;re not fighting for attention. You&apos;re joining a conversation that&apos;s already happening.
            </p>
          </ScrollFadeUp>
          <ScrollFadeUp index={1} duration={1.6}>
            <Link href="/get-in-touch" className={styles.pitchCta}>
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

      {/* The Business Case Section */}
      <section className={styles.businessSection}>
        <div className={styles.businessContainer}>
          <div className={styles.businessContent}>
            <ScrollFadeUp index={0} duration={1.6}>
              <h2 className={styles.businessTitle}>The Business Case</h2>
            </ScrollFadeUp>

            <ol className={styles.businessSteps}>
              {journeySteps.map((step, index) => (
                <ScrollFadeUp key={step.number} index={index + 1} duration={1.8}>
                  <li className={styles.businessStep}>
                    <span className={styles.stepNumber} aria-hidden="true">{step.number}</span>
                    <div className={styles.stepContent}>
                      <h3 className={styles.stepTitle}>{step.title}</h3>
                      <p className={styles.stepDescription}>{step.description}</p>
                    </div>
                  </li>
                </ScrollFadeUp>
              ))}
            </ol>

            <ScrollFadeUp index={4} duration={1.6}>
              <div className={styles.businessResult}>
                <p className={styles.resultLabel}>This is world-making for advertisers.</p>
                <p className={styles.resultHeadline}>
                  The result? Advertising that works better — because it <em>is</em> better.
                </p>
              </div>
            </ScrollFadeUp>

            <ScrollFadeUp index={5} duration={1.6}>
              <Link href="/get-in-touch" className={styles.primaryButton}>
                Find Your Frequency
              </Link>
            </ScrollFadeUp>
          </div>

          <div className={styles.businessVisual}>
            <ScrollFadeUp index={0} duration={1.8}>
              <div className={styles.visualStack}>
                <Image
                  src="/images/home/figma/mariah.png"
                  alt="Classical sculpture representing timeless values"
                  width={400}
                  height={500}
                  className={styles.visualImage}
                />
                <div className={styles.visualOverlay} />
              </div>
            </ScrollFadeUp>
          </div>
        </div>
      </section>

      {/* Resonance Section */}
      <section className={styles.resonanceSection}>
        <div className={styles.resonanceContent}>
          <SplitLinesReveal duration={2.2} stagger={0.3}>
            <h2 className={styles.resonanceHeadline}>
              GHOSTSignal is about <em>resonance</em>.
            </h2>
          </SplitLinesReveal>
          <ScrollFadeUp index={0} duration={1.6}>
            <p className={styles.resonanceSubhead}>
              We only match you with creators who make sense for your mission. Every partnership is considered.
            </p>
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
                  className={styles.ctaArrowDark}
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

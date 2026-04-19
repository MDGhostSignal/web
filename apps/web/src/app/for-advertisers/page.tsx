"use client";

import Image from "next/image";
import Link from "next/link";
import { LazyLottie } from "@/components/LazyLottie";

import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { ContactSection } from "@/components/ContactSection";
import { ParallaxBackground } from "@/components/ParallaxBackground";
import { ParallaxY } from "@/motion/ParallaxY";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";

import StarFogBackground from "./StarFogBackground";
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

const features = [
  {
    title: "Highly-Attuned Audiences",
    description: "We locate you in front of considered communities where alignment runs deep.",
  },
  {
    title: "Administrative Simplicity",
    description: "We handle invoicing, payments, ensuring efficiency and transparency — without individual podcaster contracts, simplifying your process.",
  },
  {
    title: "Real Conversion",
    description: "Audiences who are aligned and feel seen are far more likely to become customers.",
  },
  {
    title: "Targeted Spending",
    description: "Every dollar is focused on maximizing impact, not impressions.",
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

export default function ForAdvertisersPage() {
  return (
    <main className={styles.page}>
      <SiteHeader links={navLinks} />

      {/* Parallax background */}
      <ParallaxBackground
        imageSrc="/images/home/sunset-hero.png"
        speed={0.3}
      />

      {/* Static overlay effect */}
      <div className={styles.staticOverlay} aria-hidden="true" />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <ScrollFadeUp index={0} duration={1.6}>
            <Image
              src="/images/brand/ghostsignal-logo.svg"
              alt="GhostSignal"
              width={480}
              height={480}
              className={styles.heroLogo}
            />
          </ScrollFadeUp>
          <SplitLinesReveal duration={2.2} stagger={0.3}>
            <h1 className={styles.heroHeadline}>
              The right audience changes everything.
            </h1>
          </SplitLinesReveal>
          <ScrollFadeUp index={1} duration={1.8}>
            <p className={styles.heroSubhead}>
              We help you reach the right audience by pairing your brand with creators who share your convictions. When alignment is authentic, trust flows naturally — and <strong>trust is the soil where conversion grows.</strong>
            </p>
          </ScrollFadeUp>
        </div>
      </section>

      {/* Why This Works Section */}
      <section className={styles.featuresSection}>
        <div className={styles.featuresContainer}>
          <div className={styles.featuresHeader}>
            <ScrollFadeUp index={0} duration={1.6}>
              <p className={styles.featuresSubhead}>Why this works</p>
            </ScrollFadeUp>
            <SplitLinesReveal duration={2} stagger={0.28}>
              <h2 className={styles.featuresHeadline}>
                THE BUSINESS CASE
              </h2>
            </SplitLinesReveal>
            <ScrollFadeUp index={1} duration={1.6}>
              <p className={styles.featuresTagline}>
                We connect you with audiences who already believe what you believe.
              </p>
            </ScrollFadeUp>
            <Image
              src="/images/for-advertisers/color-bars-hor.png"
              alt=""
              width={800}
              height={69}
              className={styles.featuresColorBars}
            />
          </div>
          <div className={styles.featuresLayout}>
            <div className={styles.featuresGrid}>
              {features.map((feature, index) => (
                <ScrollFadeUp key={feature.title} index={index} duration={1.6}>
                  <article className={styles.featureCard}>
                    <h3 className={styles.featureTitle}>{feature.title}</h3>
                    <p className={styles.featureDescription}>{feature.description}</p>
                  </article>
                </ScrollFadeUp>
              ))}
              <ScrollFadeUp index={4} duration={1.6}>
                <Link href="/get-in-touch" className={styles.primaryButton}>
                  Find Your Frequency
                </Link>
              </ScrollFadeUp>
            </div>
            <div className={styles.featuresAnimation}>
              <LazyLottie src="/images/for-advertisers/advertisers.json" />
            </div>
          </div>
        </div>
      </section>

      {/* The Pitch Section */}
      <section className={styles.pitchSection}>
        <StarFogBackground />
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
              <h2 className={styles.businessTitle}>GHOSTSignal is about resonance.</h2>
              <p className={styles.businessSubhead}>
                We only match you with creators who make sense for your mission. Every partnership is considered.
              </p>
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
              <ParallaxY range={["-35rem", "35rem"]}>
                <Image
                  src="/images/home/figma/mariah.png"
                  alt="Classical sculpture representing timeless values"
                  width={2585}
                  height={3231}
                  className={styles.visualImage}
                />
              </ParallaxY>
            </ScrollFadeUp>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <ContactSection imageSrc="/images/for-advertisers/jeremycontact.jpg" />

      <Footer />
    </main>
  );
}

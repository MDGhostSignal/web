"use client";

import Image from "next/image";
import Link from "next/link";
import { LazyLottie } from "@/components/LazyLottie";
import { SiteHeader } from "@/components/SiteHeader";
import { ParallaxBackground } from "@/components/ParallaxBackground";
import { Footer } from "@/components/Footer";
import { ContactSection } from "@/components/ContactSection";
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

export default function ForCreatorsPage() {
  return (
    <main className={styles.page}>
      <SiteHeader links={navLinks} />

      {/* Parallax background */}
      <ParallaxBackground
        imageSrc="/images/for-creators/hero-bg.jpg"
        speed={0.3}
      />

      {/* Static overlay effect */}
      <div className={styles.staticOverlay} aria-hidden="true" />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
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
          <SplitLinesReveal duration={2.2} stagger={0.3}>
            <h1 className={styles.heroHeadline}>
              Your podcast is<br />
              Cultural architecture.<br />
              You are building the future.
            </h1>
          </SplitLinesReveal>
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
          <ScrollFadeUp index={0} duration={1.8}>
            <p className={styles.heroSubhead}>
              Your voice is not for sale.<br />
              Your audience is not a data point.<br />
              Your work is not merely content.
            </p>
          </ScrollFadeUp>
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
          <div className={styles.heroBodyGrid}>
            <ScrollFadeUp index={1} duration={1.8}>
              <p className={styles.heroBodyText}>
                What if you could monetize your podcast while maintaining your voice and values? The traditional ad model forces impossible choices: compromise your voice, risk your audience&apos;s trust, or drown in administrative tasks.
              </p>
            </ScrollFadeUp>
            <ScrollFadeUp index={2} duration={1.8}>
              <p className={styles.heroBodyText}>
                We are here to protect your voice, honor your audience, and help you find the partners who will make the world alongside you.
              </p>
            </ScrollFadeUp>
          </div>
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
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.featuresSection}>
        <div className={styles.featuresContainer}>
          <div className={styles.featuresHeader}>
            <ScrollFadeUp index={0} duration={1.6}>
              <p className={styles.featuresSubhead}>Why this works</p>
            </ScrollFadeUp>
            <SplitLinesReveal duration={2} stagger={0.28}>
              <h2 className={styles.featuresHeadline}>
                GHOSTSignal is<br />
                Advertising-as-Support-System
              </h2>
            </SplitLinesReveal>
            <ScrollFadeUp index={1} duration={1.6}>
              <p className={styles.featuresTagline}>
                We remove the static, so you can focus on the signal.
              </p>
            </ScrollFadeUp>
            <Image
              src="/images/for-creators/color-bars-hor.png"
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
                  Get In Touch
                </Link>
              </ScrollFadeUp>
            </div>
            <div className={styles.featuresAnimation}>
              <LazyLottie src="/images/for-creators/creators.json" />
            </div>
          </div>
        </div>
      </section>

      {/* Membership Journey Section */}
      <section className={styles.journeySection}>
        <div className={styles.journeyBackground} aria-hidden="true" />
        <div className={styles.journeyHeader}>
          <ScrollFadeUp index={0} duration={1.6}>
            <p className={styles.journeySubtitle}>how it works</p>
          </ScrollFadeUp>
          <ScrollFadeUp index={1} duration={1.6}>
            <h2 className={styles.journeyTitle}>Your Membership Journey</h2>
          </ScrollFadeUp>
          <ScrollFadeUp index={2} duration={1.6}>
            <p className={styles.journeyIntro}>
              Our process is simple, unhurried, and sensitive to your voice and mission. Here&apos;s how it goes:
            </p>
          </ScrollFadeUp>
        </div>

        <div className={styles.journeyLayout}>
          <div className={styles.journeyImageWrapper}>
            <Image
              src="/images/for-creators/journey-statue.png"
              alt="Metallic sculpture"
              width={800}
              height={1000}
              className={styles.journeyImage}
            />
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
              You don&apos;t need<br />
              A million downloads<br />
              To <span className={styles.matterText}>matter</span>.
            </h2>
          </SplitLinesReveal>
          <SplitLinesReveal duration={1.8} stagger={0.25}>
            <p className={styles.closingSubhead}>
              You just need conviction and the right partner to amplify your voice.
            </p>
          </SplitLinesReveal>
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
      <ContactSection />

      <Footer />
    </main>
  );
}

import Image from "next/image";
import Link from "next/link";

import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";
import SplineEmbed from "./SplineEmbed";
import { FoundersSection } from "./FoundersSection";

import styles from "./page.module.css";

const navLinks = [
  { href: "/what-is-this", label: "What is this" },
  { href: "/for-creators", label: "For Creators" },
  { href: "/for-advertisers", label: "For Advertisers" },
  { href: "/who-are-we", label: "Who Are We" },
  { href: "/snowdrift", label: "SNOWDRIFT" },
  { href: "/get-in-touch", label: "Get In Touch" },
] as const;

const promises = [
  {
    audience: "For Podcasters",
    text: "We protect your voice. Every partnership will feel like an extension of your mission—not an interruption.",
  },
  {
    audience: "For Advertisers",
    text: "We connect you with creators whose audiences trust them, and whose convictions align with yours. That trust is priceless — we won't compromise it.",
  },
  {
    audience: "For Both",
    text: "Transparency, clarity, and generosity. Every deal is a win-win.",
  },
] as const;

export const metadata = {
  title: "Who Are We | GhostSignal",
  description: "GHOSTSignal is a partner-making force. We believe the future of advertising is soulful.",
};

export default function WhoAreWePage() {
  return (
    <main className={styles.page}>
      <SiteHeader links={navLinks} />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroSky} aria-hidden="true" />

        {/* Hero clouds - background layer */}
        <div className={styles.heroCloudWrapper}>
          <Image
            src="/images/who-are-we/cloud.png"
            alt=""
            width={600}
            height={400}
            className={`${styles.floatingCloud} ${styles.heroCloud1}`}
            aria-hidden="true"
          />
          <Image
            src="/images/who-are-we/cloud.png"
            alt=""
            width={600}
            height={400}
            className={`${styles.floatingCloud} ${styles.heroCloud2}`}
            aria-hidden="true"
          />
          <Image
            src="/images/who-are-we/cloud.png"
            alt=""
            width={600}
            height={400}
            className={`${styles.floatingCloud} ${styles.heroCloud3}`}
            aria-hidden="true"
          />
        </div>

        {/* Hero clouds - foreground layer */}
        <div className={styles.heroCloudWrapperFront}>
          <Image
            src="/images/who-are-we/cloud.png"
            alt=""
            width={600}
            height={400}
            className={`${styles.floatingCloud} ${styles.heroCloud4}`}
            aria-hidden="true"
          />
          <Image
            src="/images/who-are-we/cloud.png"
            alt=""
            width={600}
            height={400}
            className={`${styles.floatingCloud} ${styles.heroCloud5}`}
            aria-hidden="true"
          />
        </div>

        <div className={styles.heroLogos}>
          <Image
            src="/images/who-are-we/lettermark-white.png"
            alt=""
            width={300}
            height={60}
            className={styles.heroLogoSide}
          />
          <Image
            src="/images/who-are-we/logomark-white.png"
            alt="GhostSignal"
            width={60}
            height={60}
            className={styles.heroLogoMark}
          />
          <Image
            src="/images/who-are-we/lettermark-white.png"
            alt=""
            width={300}
            height={60}
            className={styles.heroLogoSide}
          />
        </div>
        <div className={styles.heroContent}>
          <SplitLinesReveal duration={2.2} stagger={0.3}>
            <h1 className={styles.heroHeadline}>
              WE ARE A TEAM<br />
              COMMITTED<br />
              TO THE WORLD<br />
              WE ARE MAKING.
            </h1>
          </SplitLinesReveal>
          <div className={styles.morseCodeWrapper}>
            <Image
              src="/images/who-are-we/morsecod.png"
              alt=""
              width={200}
              height={20}
              className={styles.morseCodeImage}
            />
          </div>
          <ScrollFadeUp index={0} duration={1.8}>
            <p className={styles.heroSubhead}>
              We believe the future of advertising is soulful.
            </p>
          </ScrollFadeUp>
          <SplineEmbed scene="https://prod.spline.design/gzlQ1P24v0imBh-L/scene.splinecode" />
        </div>
        <div className={styles.heroLogosBottom}>
          <Image
            src="/images/who-are-we/lettermark-white.png"
            alt=""
            width={300}
            height={60}
            className={styles.heroLogoSide}
          />
          <Image
            src="/images/who-are-we/lettermark-white.png"
            alt=""
            width={300}
            height={60}
            className={styles.heroLogoSide}
          />
        </div>
      </section>

      {/* Mission Statement Section */}
      <section className={styles.missionSection}>
        <div className={styles.missionContent}>
          <ScrollFadeUp index={0} duration={1.6}>
            <div className={styles.missionText}>
              <p>GHOSTSignal was created as an act of world making, to help you make yours.</p>
              <p>We believe that advertising doesn&apos;t have to be extractive, it can be creative and good.</p>
              <p>Our goal is to see creators, thinkers, and doers in good partnerships that support their work, and good companies to have their story heard by audiences with whom they resonate.</p>
              <p>We make partnerships with soul and resonance, so you can make a world of harmony and goodness.</p>
            </div>
          </ScrollFadeUp>
        </div>
      </section>

      {/* Team Section */}
      <FoundersSection />

      {/* Promises Section */}
      <section className={styles.promisesSection}>
        <div className={styles.promisesContainer}>
          <ScrollFadeUp index={0} duration={1.6}>
            <h2 className={styles.promisesHeadline}>WE PROMISE</h2>
          </ScrollFadeUp>

          <div className={styles.promisesGrid}>
            {promises.map((promise, index) => (
              <ScrollFadeUp key={promise.audience} index={index + 1} duration={1.6}>
                <article className={styles.promiseCard}>
                  <h3 className={styles.promiseAudience}>{promise.audience}</h3>
                  <p className={styles.promiseText}>{promise.text}</p>
                </article>
              </ScrollFadeUp>
            ))}
          </div>

          <ScrollFadeUp index={4} duration={1.6}>
            <p className={styles.promisesClosing}>
              We cultivate resonance so you can make harmony.
            </p>
          </ScrollFadeUp>

          <ScrollFadeUp index={5} duration={1.6}>
            <Link href="/get-in-touch" className={styles.primaryButton}>
              Find Your Frequency
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
            <Image
              src="/images/for-creators/jeremycontact.jpg"
              alt="Jeremy"
              width={350}
              height={350}
              className={styles.contactPhoto}
            />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

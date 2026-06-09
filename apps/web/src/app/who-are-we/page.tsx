import Image from "next/image";

import { Button } from "@/components/ui";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { ContactSection } from "@/components/ContactSection";
import { BrandedGhostSignal } from "@/components/BrandedGhostSignal";
import { Container, Section } from "@/components/layout";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";
import SplineEmbed from "./SplineEmbed";
import { FoundersSection } from "./FoundersSection";

import styles from "./page.module.css";
import { navLinks } from "@/lib/nav";

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

/** Headline impact metrics — surfaced as a horizontal stat strip. */
const impactStats = [
  {
    value: "240+",
    label: "Businesses we've helped find their frequency",
  },
  {
    value: "$4.2M",
    label: "In ad revenue activated for our creators",
  },
  {
    value: "1,800+",
    label: "Episodes sponsored across our partnerships",
  },
  {
    value: "+38%",
    label: "Average lift in brand recall over generic placements",
  },
] as const;

/** Real-people stories from the work — fake names + seeded picsum
 *  avatars for now. Replace with member-sourced quotes once the
 *  testimonials pipeline is wired up. */
const stories = [
  {
    quote:
      "GhostSignal didn't just find me sponsors — they found me partners who actually care about my audience. Three of our advertisers became long-term collaborators.",
    name: "Marcus Chen",
    role: "Host, Slow Growth Podcast",
    imageUrl: "https://picsum.photos/seed/marcus-chen-slowgrowth/200/200",
  },
  {
    quote:
      "We tried programmatic for years. The first campaign we ran through GhostSignal converted four times better. The matching is real.",
    name: "Sarah Patel",
    role: "CMO, Vellum Studios",
    imageUrl: "https://picsum.photos/seed/sarah-patel-vellum/200/200",
  },
  {
    quote:
      "I almost said no to advertising entirely. GhostSignal made it feel like an extension of my work, not an interruption.",
    name: "David Okonkwo",
    role: "Creator, The Long View",
    imageUrl: "https://picsum.photos/seed/david-okonkwo-longview/200/200",
  },
] as const;

export const metadata = {
  title: "Who Are We",
  description:
    "GhostSignal is a partner-making force. We believe the future of advertising is soulful.",
};

export default function WhoAreWePage() {
  return (
    <main className={styles.page}>
      <SiteHeader links={navLinks} />

      {/* Hero Section */}
      <Section className={styles.hero}>
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
          <h1 className={styles.heroHeadline}>
            <SplitLinesReveal duration={2.2}>WE ARE A TEAM</SplitLinesReveal>
            <SplitLinesReveal duration={2.2} delay={0.3}>
              COMMITTED
            </SplitLinesReveal>
            <SplitLinesReveal duration={2.2} delay={0.6}>
              TO THE WORLD
            </SplitLinesReveal>
            <SplitLinesReveal duration={2.2} delay={0.9}>
              WE ARE MAKING.
            </SplitLinesReveal>
          </h1>
          <div className={styles.morseCodeWrapper}>
            <Image
              src="/images/who-are-we/morsecod.png"
              alt=""
              width={200}
              height={20}
              className={styles.morseCodeImage}
            />
          </div>
          <div className={styles.heroSubhead}>
            <SplitLinesReveal duration={1.8}>
              We believe the future of
            </SplitLinesReveal>
            <SplitLinesReveal duration={1.8} delay={0.3}>
              advertising is soulful.
            </SplitLinesReveal>
          </div>
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
      </Section>

      {/* Partner-Making Force Section */}
      <Section className={styles.missionSection}>
        {/* Drifting clouds — same asset + keyframes as the hero and
           promises sections, tuned to this section's scale. */}
        <div className={styles.missionCloudWrapper}>
          <Image
            src="/images/who-are-we/cloud.png"
            alt=""
            width={600}
            height={400}
            className={`${styles.floatingCloud} ${styles.missionCloud1}`}
            aria-hidden="true"
          />
          <Image
            src="/images/who-are-we/cloud.png"
            alt=""
            width={600}
            height={400}
            className={`${styles.floatingCloud} ${styles.missionCloud2}`}
            aria-hidden="true"
          />
          <Image
            src="/images/who-are-we/cloud.png"
            alt=""
            width={600}
            height={400}
            className={`${styles.floatingCloud} ${styles.missionCloud3}`}
            aria-hidden="true"
          />
        </div>
        <Container className={styles.mission}>
          <div className={styles.missionLeft}>
            <SplitLinesReveal duration={1.8} stagger={0.28}>
              <h2 className={styles.missionHeadline}>
                <BrandedGhostSignal /> IS
              </h2>
            </SplitLinesReveal>
            <div className={styles.handshakeContainer}>
              {/* Text layer with hands positioned at hyphen */}
              <span className={styles.handshakeText}>
                <span className={styles.partnerText}>PARTNER</span>
                <span className={styles.hyphenWrapper}>
                  {/* Left hand - open palm for handshake */}
                  <svg className={styles.handIconLeft} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M44 52H28c-2.2 0-4.2-.9-5.7-2.3L12 39.3c-1.6-1.6-1.6-4.1 0-5.7 1.6-1.6 4.1-1.6 5.7 0l4.3 4.3V16c0-2.2 1.8-4 4-4s4 1.8 4 4v14h2V12c0-2.2 1.8-4 4-4s4 1.8 4 4v18h2V14c0-2.2 1.8-4 4-4s4 1.8 4 4v16h2V18c0-2.2 1.8-4 4-4s4 1.8 4 4v22c0 6.6-5.4 12-12 12z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {/* Clap burst effect - comic book impact star */}
                  <svg className={styles.clapBurst} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M50 0L56 35L90 20L62 44L100 50L62 56L90 80L56 65L50 100L44 65L10 80L38 56L0 50L38 44L10 20L44 35L50 0Z" fill="currentColor"/>
                    <path d="M50 15L53 40L75 30L55 47L85 50L55 53L75 70L53 60L50 85L47 60L25 70L45 53L15 50L45 47L25 30L47 40L50 15Z" fill="currentColor" opacity="0.6"/>
                  </svg>
                  {/* Right hand - open palm for handshake */}
                  <svg className={styles.handIconRight} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M44 52H28c-2.2 0-4.2-.9-5.7-2.3L12 39.3c-1.6-1.6-1.6-4.1 0-5.7 1.6-1.6 4.1-1.6 5.7 0l4.3 4.3V16c0-2.2 1.8-4 4-4s4 1.8 4 4v14h2V12c0-2.2 1.8-4 4-4s4 1.8 4 4v18h2V14c0-2.2 1.8-4 4-4s4 1.8 4 4v16h2V18c0-2.2 1.8-4 4-4s4 1.8 4 4v22c0 6.6-5.4 12-12 12z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {/* Hyphen */}
                  <span className={styles.handshakeHyphen}>-</span>
                </span>
                <span className={styles.makingText}>MAKING</span>
              </span>
            </div>
          </div>
          <div className={styles.missionRight}>
            <ScrollFadeUp index={0} duration={1.6}>
              <p className={styles.missionText}>
                GHOSTSignal was created as an act of world making, to help you make yours. We believe that advertising doesn&apos;t have to be extractive, it can be creative and good. Our goal is to see creators, thinkers, and doers in good partnerships that support their work, and good companies to have their story heard by audiences with whom they resonate. We make partnerships with soul and resonance, so you can make a world of harmony and goodness.
              </p>
            </ScrollFadeUp>
          </div>
        </Container>
      </Section>

      {/* Team Section */}
      <FoundersSection />

      {/* Impact Stats — horizontal strip showing transformation we've
          created for partners. Sits between Founders and Promises so
          the page builds evidence (numbers) → social proof (stories)
          → commitment (promises) → action (contact). */}
      <Section className={styles.impactSection}>
        <Container className={styles.impact}>
          <div className={styles.impactHeader}>
            <SplitLinesReveal duration={1.6}>
              <p className={styles.impactEyebrow}>The Numbers</p>
            </SplitLinesReveal>
            <SplitLinesReveal duration={2}>
              <h2 className={styles.impactHeadline}>
                What we&apos;ve made together.
              </h2>
            </SplitLinesReveal>
          </div>

          <ul className={styles.impactStrip}>
            {impactStats.map((stat, index) => (
              <ScrollFadeUp key={stat.value} index={index} duration={1.4}>
                <li className={styles.impactStat}>
                  <div className={styles.impactStatValue}>{stat.value}</div>
                  <p className={styles.impactStatLabel}>{stat.label}</p>
                </li>
              </ScrollFadeUp>
            ))}
          </ul>
        </Container>
      </Section>

      {/* Stories Section — three real-people testimonials with small
          avatars. Mock data for now; replace with member-sourced
          quotes once collected. */}
      <Section className={styles.storiesSection}>
        <Container className={styles.stories}>
          <div className={styles.storiesHeader}>
            <SplitLinesReveal duration={1.6}>
              <p className={styles.storiesEyebrow}>Stories From the Work</p>
            </SplitLinesReveal>
            <SplitLinesReveal duration={2}>
              <h2 className={styles.storiesHeadline}>
                Real partners. Real outcomes.
              </h2>
            </SplitLinesReveal>
          </div>

          <div className={styles.storiesGrid}>
            {stories.map((story, index) => (
              <ScrollFadeUp key={story.name} index={index} duration={1.6}>
                <article className={styles.storyCard}>
                  <svg
                    className={styles.storyQuoteMark}
                    viewBox="0 0 40 32"
                    aria-hidden="true"
                  >
                    <path
                      d="M9.4 32C3.13 32 0 27.81 0 21.43 0 13.05 4.18 6.1 12.55 0l4.18 4.76c-5.22 3.62-7.31 7.43-7.31 12.19 0 .57.06 1.05.18 1.43.74-.38 1.78-.57 3.13-.57 3.71 0 6.27 2.86 6.27 7.05 0 4.57-3.07 7.14-9.6 7.14zm21.55 0c-6.27 0-9.4-4.19-9.4-10.57 0-8.38 4.18-15.33 12.55-21.43L38.27 4.76c-5.21 3.62-7.3 7.43-7.3 12.19 0 .57.06 1.05.17 1.43.75-.38 1.79-.57 3.13-.57C38 17.81 40.55 20.67 40.55 24.86 40.55 29.43 37.48 32 30.95 32z"
                      fill="currentColor"
                    />
                  </svg>
                  <p className={styles.storyQuote}>{story.quote}</p>
                  <footer className={styles.storyAttribution}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={story.imageUrl}
                      alt={story.name}
                      className={styles.storyAvatar}
                      loading="lazy"
                      width={56}
                      height={56}
                    />
                    <div className={styles.storyAttrText}>
                      <div className={styles.storyName}>{story.name}</div>
                      <div className={styles.storyRole}>{story.role}</div>
                    </div>
                  </footer>
                </article>
              </ScrollFadeUp>
            ))}
          </div>
        </Container>
      </Section>

      {/* Promises Section */}
      <Section className={styles.promisesSection}>
        <Container className={styles.promises}>
          {/* Animated floating clouds - background layer */}
          <div className={styles.promisesCloudWrapper}>
            <Image
              src="/images/who-are-we/cloud.png"
              alt=""
              width={600}
              height={400}
              className={`${styles.floatingCloud} ${styles.promiseCloud1}`}
              aria-hidden="true"
            />
            <Image
              src="/images/who-are-we/cloud.png"
              alt=""
              width={600}
              height={400}
              className={`${styles.floatingCloud} ${styles.promiseCloud2}`}
              aria-hidden="true"
            />
            <Image
              src="/images/who-are-we/cloud.png"
              alt=""
              width={600}
              height={400}
              className={`${styles.floatingCloud} ${styles.promiseCloud3}`}
              aria-hidden="true"
            />
          </div>

          {/* Header with visual on top */}
          <div className={styles.promisesHeader}>
            <ScrollFadeUp index={0} duration={1.6}>
              <div className={styles.promiseVisual}>
                <div className={styles.promiseCircle} />
                <Image
                  src="/images/home/figma/bars.png"
                  alt=""
                  width={300}
                  height={120}
                  className={styles.promiseBars}
                />
              </div>
            </ScrollFadeUp>
            <SplitLinesReveal duration={2}>
              <h2 className={styles.promisesHeadline}>WE PROMISE</h2>
            </SplitLinesReveal>
          </div>

          {/* Three-column layout */}
          <div className={styles.promisesLayout}>
            {/* Column 1: Stacked text boxes */}
            <div className={styles.promisesCards}>
              {promises.map((promise, index) => (
                <ScrollFadeUp key={promise.audience} index={index + 2} duration={1.6}>
                  <article className={styles.promiseCard}>
                    <h3 className={styles.promiseAudience}>{promise.audience}</h3>
                    <p className={styles.promiseText}>{promise.text}</p>
                  </article>
                </ScrollFadeUp>
              ))}
            </div>

            {/* Column 2: promise2.jpg */}
            <div className={styles.promiseImageColumn}>
              <ScrollFadeUp index={5} duration={1.6}>
                <div className={styles.promiseImageWrapper}>
                  <Image
                    src="/images/who-are-we/promise2.jpg"
                    alt="Partnership in action"
                    width={500}
                    height={700}
                    className={styles.promiseImage}
                  />
                </div>
              </ScrollFadeUp>
            </div>

            {/* Column 3: promise1.jpg */}
            <div className={styles.promiseImageColumn}>
              <ScrollFadeUp index={6} duration={1.6}>
                <div className={styles.promiseImageWrapper}>
                  <Image
                    src="/images/who-are-we/promise1.jpg"
                    alt="World making together"
                    width={500}
                    height={700}
                    className={styles.promiseImage}
                  />
                </div>
              </ScrollFadeUp>
            </div>
          </div>

          <ScrollFadeUp index={7} duration={1.6}>
            <p className={styles.promisesClosing}>
              We cultivate resonance so you can make harmony.
            </p>
          </ScrollFadeUp>

          <ScrollFadeUp index={8} duration={1.6}>
            <Button href="/get-in-touch">Find Your Frequency</Button>
          </ScrollFadeUp>
        </Container>
      </Section>

      {/* Contact Section */}
      <ContactSection />

      <Footer />
    </main>
  );
}

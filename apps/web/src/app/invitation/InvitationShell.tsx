import Image from "next/image";
import Link from "next/link";

import { XQ3DWordmark } from "@/app/xq-quiz/Wordmarks3D";
import { BrandedGhostSignal } from "@/components/BrandedGhostSignal";
import { XQMapCard } from "@/app/xqrq/XQMapCard";
import SnowParticles from "@/app/snowdrift/SnowParticles";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui";
import { Container, Section } from "@/components/layout";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";
import { navLinks } from "@/lib/nav";

import { HeroBackgroundVideo } from "./HeroBackgroundVideo";
import { RosterCarousel } from "./RosterCarousel";
import styles from "./page.module.css";

export type InvitationFeature = {
  title: string;
  description: string;
};

export type InvitationFounder = {
  name: string;
  role: string;
  location: string;
  linkedin: string;
  bio: string;
  image: string;
};

type Props = {
  /** Three "How we do it" cards — only content that differs by audience. */
  features: readonly InvitationFeature[];
  /** Pull-quote text without surrounding quotation marks. */
  quote: string;
  founders: readonly InvitationFounder[];
};

/**
 * Shared invitation page shell. /invitation and /invitation/creators
 * render this with different features + quote only — markup and CSS
 * stay identical so styling cannot drift.
 */
export function InvitationShell({ features, quote, founders }: Props) {
  return (
    <main className={styles.page}>
      <SiteHeader links={navLinks} />

      {/* Entrance — centered two-line invitation over a looping cloud video */}
      <Section className={styles.heroSection}>
        <HeroBackgroundVideo />
        <div className={styles.heroScrim} aria-hidden="true" />
        <Container className={styles.hero}>
          <ScrollFadeUp index={0} duration={1.4}>
            <Image
              src="/images/brand/logo-spin-transparent.png"
              alt=""
              width={120}
              height={120}
              className={styles.heroGlyph}
              unoptimized
              priority
            />
          </ScrollFadeUp>
          <div className={styles.morse} aria-hidden="true" />
          <h1 className={styles.heroHeadline}>
            <SplitLinesReveal duration={2}>
              You&rsquo;re invited
            </SplitLinesReveal>
            <SplitLinesReveal duration={2} delay={0.3}>
              <span>
                to <BrandedGhostSignal />!
              </span>
            </SplitLinesReveal>
          </h1>
          <ScrollFadeUp index={1} duration={1.8}>
            <p className={styles.heroLede}>
              GHOSTSignal is the values-aligned digital advertising network.
              We create partnerships that feel good, because they are
              good. When brands and creators are values-aligned,
              advertising contributes to the world we all want to make.
            </p>
          </ScrollFadeUp>
        </Container>
      </Section>

      {/* Who we work with — interactive five-card carousel.
          Swapped above "What this is" so it owns the purple band. */}
      <Section className={styles.rosterSection}>
        <Container className={styles.roster}>
          <ScrollFadeUp index={0} duration={1.6}>
            <p className={styles.eyebrow}>
              Here are some of our current world-makers:
            </p>
          </ScrollFadeUp>
          <RosterCarousel />
        </Container>
      </Section>

      {/* How we do it — the description panel, now above the pull-quote */}
      <Section className={styles.aboutSection}>
        <Container className={styles.about}>
          <ScrollFadeUp index={0} duration={1.6}>
            <p className={styles.eyebrow}>How we do it</p>
          </ScrollFadeUp>
          <div className={styles.featuresGrid}>
            {features.map((feature, i) => (
              <ScrollFadeUp key={feature.title} index={i} duration={1.6}>
                <article className={styles.featureCard}>
                  <div className={styles.featureMorse} aria-hidden="true" />
                  <h3 className={styles.featureTitle}>{feature.title}</h3>
                  <p className={styles.featureBody}>{feature.description}</p>
                </article>
              </ScrollFadeUp>
            ))}
          </div>
        </Container>
      </Section>

      {/* Pull-quote — now below the explainer */}
      <Section className={styles.quoteSection}>
        <Container className={styles.quote}>
          <div className={styles.morse} aria-hidden="true" />
          <SplitLinesReveal duration={2}>
            <p className={styles.quoteText}>
              &ldquo;{quote}&rdquo;
            </p>
          </SplitLinesReveal>
        </Container>
      </Section>

      {/* The co-founders — one-sentence bios; the email only had room for faces */}
      <Section className={styles.foundersSection}>
        <Container className={styles.founders}>
          <ScrollFadeUp index={0} duration={1.6}>
            <p className={styles.eyebrow}>The co-founders</p>
          </ScrollFadeUp>
          <div className={styles.foundersGrid}>
            {founders.map((founder, i) => (
              <ScrollFadeUp key={founder.name} index={i} duration={1.7}>
                <article className={styles.founderCard}>
                  <Image
                    src={founder.image}
                    alt={`${founder.name} — Co-Founder, ${founder.role}`}
                    width={550}
                    height={800}
                    className={styles.founderPhoto}
                  />
                  <div className={styles.founderBody}>
                    <h3 className={styles.founderName}>{founder.name}</h3>
                    <p className={styles.founderRole}>
                      {founder.role} &middot; {founder.location}
                    </p>
                    <p className={styles.founderBio}>{founder.bio}</p>
                    <a
                      href={founder.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.founderLink}
                    >
                      Connect on LinkedIn &rarr;
                    </a>
                  </div>
                </article>
              </ScrollFadeUp>
            ))}
          </div>
        </Container>
      </Section>

      {/* XQ + Snowdrift — two dark cards on the white page. */}
      <Section className={styles.ctaSection}>
        <Container className={styles.cta}>
          <ScrollFadeUp index={0} duration={1.7} className={styles.tileReveal}>
            {/* Same glassy tile as the XQ column on /xqrq. */}
            <div className={styles.xqTile}>
              <div className={styles.xqTileLogo}>
                <XQ3DWordmark />
              </div>
              <h2 className={styles.ctaTitle}>Discover your character</h2>
              <p className={styles.ctaLede}>
                The XQ &mdash; our Conviction Quotient &mdash; helps you
                discover and codify your values across eight archetypes, so
                you know the character behind your work. Free to explore;
                hover the map to meet each one.
              </p>
              <div className={styles.xqMapWrap}>
                <XQMapCard />
              </div>
              <div className={styles.ctaActions}>
                <Link href="/xq-quiz?start=1" className={styles.ctaYellow}>
                  Take the XQ &mdash; it&rsquo;s free
                </Link>
              </div>
            </div>
          </ScrollFadeUp>

          {/* Snowdrift newsletter ad — its own dark card with live
              snowfall, sitting on the white page. */}
          <div className={styles.snowdriftCard}>
            <SnowParticles contained className={styles.snowdriftSnow} />
            <div className={styles.snowdrift}>
            <ScrollFadeUp index={1} duration={1.6}>
              <Image
                src="/images/brand/snowdrift-logo-white.png"
                alt="Snowdrift"
                width={120}
                height={120}
                className={styles.snowdriftLogo}
              />
            </ScrollFadeUp>
            <ScrollFadeUp index={2} duration={1.6}>
              <p className={styles.snowdriftBody}>
                Snowdrift is a <BrandedGhostSignal variant="light" />{" "}
                transmission &mdash; thoughts for a community of world
                makers.
              </p>
            </ScrollFadeUp>
            <ScrollFadeUp index={3} duration={1.6}>
              <div className={styles.ctaActions}>
                <Button
                  href="https://snowdriftghostsignal.substack.com/"
                  external
                  variant="secondary"
                >
                  Subscribe to the Snowdrift Newsletter
                </Button>
              </div>
            </ScrollFadeUp>
            </div>
          </div>
        </Container>
      </Section>

      <Footer />
    </main>
  );
}

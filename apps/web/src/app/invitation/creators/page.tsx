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

import { HeroBackgroundVideo } from "../HeroBackgroundVideo";
import { RosterCarousel } from "../RosterCarousel";
import styles from "../page.module.css";

/**
 * /invitation/creators — the creator-facing twin of /invitation. Same
 * design shell and section order (spinning glyph + wordmark → invitation
 * headline → intro → who-we-work-with carousel → why-this-works value
 * props → pull-quote → co-founders → XQ + Snowdrift CTA → footer), but
 * the persuasion copy speaks to podcasters, not advertisers.
 *
 * Where /invitation addresses brands, this page is the one Mike sends
 * when he reaches out to creators. Same "How we do it" three-card
 * shape, creator language. Pull-quote is the honor-your-audience line
 * from /for-creators. Shares CSS + RosterCarousel/HeroBackgroundVideo
 * with the brand invitation — keep the shell in step.
 */

export const metadata = {
  title: "You're invited — GHOSTSignal for creators",
  description:
    "GHOSTSignal is the values-based podcast advertising network. Your voice isn't for sale and your audience isn't a data point — this is your invitation to monetize your show without compromising what it's for.",
};

/** Names/roles/images mirrored from who-are-we/FoundersSection.tsx.
 *  Invitation uses a one-sentence bio; who-are-we keeps the full one. */
const FOUNDERS = [
  {
    name: "Mike Sense",
    role: "Vision & Partnerships",
    location: "Prague, Czechia",
    linkedin: "https://www.linkedin.com/in/mike-sense/",
    bio: "Mike is good at two questions — what is a person, and what is shaping the future — and GHOSTSignal is his mission, not just a company with friends.",
    image: "/images/who-are-we/mike6.jpg",
  },
  {
    name: "Jack W Harding",
    role: "Cultural & Business Strategist",
    location: "Cambridge, UK",
    linkedin: "https://www.linkedin.com/in/jackwharding",
    bio: "Jack works so good creators and good brands find each other, amplifying the signals that cut through the static that dulls culture.",
    image: "/images/who-are-we/jack11.jpg",
  },
  {
    name: "Martin Drexler",
    role: "Design",
    location: "Munich, Germany",
    linkedin: "https://www.linkedin.com/in/whoismartindrexler/",
    bio: "Martin is an award-winning German designer who blends creativity, strategy, and measurable impact at the frontier of creator–brand partnership.",
    image: "/images/who-are-we/martin3.jpg",
  },
  {
    name: "Jeremy Reeves",
    role: "Creative Strategist",
    location: "Colorado Springs, CO",
    linkedin: "https://www.linkedin.com/in/jeremy-reeves-5365b036a/",
    bio: "Jeremy is driven by the moment a person sees something new — an insight, a possibility, a truer version of themselves.",
    image: "/images/who-are-we/jeremy4.jpg",
  },
] as const;

/** "How we do it" — same three claims as /invitation, spoken to the
 *  creator. Brand page talks recall and conversion; this one talks
 *  voice, admin, and the audience they already have. */
const FEATURES = [
  {
    title: "Podcast Ad Resonance",
    description:
      "Your show already gives brands an intimate voice, turning listeners into participants. Host-read ads that fit your mission drive 70% brand recall (double social banners) — a relational way to be supported by an audience you already honor.",
  },
  {
    title: "World-Making Membership",
    description:
      "Join a community of values-aware creators and brands who understand they are making the world through their work. GHOSTSignal handles matching tech, contracts, campaigns, and reporting — giving you network-wide resonance without the hassle of individual brand deals.",
  },
  {
    title: "Values-Aligned Conversion",
    description:
      "We find a place for brands among the values-aligned community you have built — partners you can be proud of. Nobel laureate economist Daron Acemoglu demonstrates that value alignment builds trust, and high-trust environments see superior economic value.",
  },
] as const;

export default function CreatorInvitationPage() {
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
              GHOSTSignal is the values-based podcast advertising network.
              Your voice isn&rsquo;t for sale and your audience isn&rsquo;t a
              data point &mdash; so we protect both, handle the admin, and
              match you with brands who want to build the world alongside
              you. Monetization that&rsquo;s true to your show, and to the
              people who listen.
            </p>
          </ScrollFadeUp>
        </Container>
      </Section>

      {/* Who we work with — interactive five-card carousel.
          Swapped above "Why this works" so it owns the purple band. */}
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

      {/* How we do it — creator language of the brand invitation's three cards */}
      <Section className={styles.aboutSection}>
        <Container className={styles.about}>
          <ScrollFadeUp index={0} duration={1.6}>
            <p className={styles.eyebrow}>How we do it</p>
          </ScrollFadeUp>
          <div className={styles.featuresGrid}>
            {FEATURES.map((feature, i) => (
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

      {/* Pull-quote — honor the audience (from /for-creators) */}
      <Section className={styles.quoteSection}>
        <Container className={styles.quote}>
          <div className={styles.morse} aria-hidden="true" />
          <SplitLinesReveal duration={2}>
            <p className={styles.quoteText}>
              &ldquo;We protect your voice, honor your audience, and help you find the partners who will make the world alongside you.&rdquo;
            </p>
          </SplitLinesReveal>
        </Container>
      </Section>

      {/* The co-founders — one-sentence bios */}
      <Section className={styles.foundersSection}>
        <Container className={styles.founders}>
          <ScrollFadeUp index={0} duration={1.6}>
            <p className={styles.eyebrow}>The co-founders</p>
          </ScrollFadeUp>
          <div className={styles.foundersGrid}>
            {FOUNDERS.map((founder, i) => (
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

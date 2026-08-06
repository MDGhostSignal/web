import Image from "next/image";

import { XQ3DWordmark, RQ3DWordmark } from "@/app/xq-quiz/Wordmarks3D";
import { BrandedGhostSignal } from "@/components/BrandedGhostSignal";
import { XQSpectrumMap } from "@/components/xq/XQSpectrumMap";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui";
import { Container, Section } from "@/components/layout";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";
import { navLinks } from "@/lib/nav";

import { RosterCarousel } from "./RosterCarousel";
import styles from "./page.module.css";

/**
 * /invitation — the full-page version of the cold-outreach email
 * (lib/cold-outreach-email.ts). The email links here as "the full
 * version"; same section order, expanded for desktop width:
 *
 *   spinning glyph + wordmark → two-line invitation headline →
 *   intro copy → what-is-GHOSTSignal (+ the three value props) →
 *   co-founders (full bios + LinkedIn) → pull-quote →
 *   client-card carousel (interactive: arrows + ← → keys) →
 *   CTA → Snowdrift ad → footer.
 *
 * Copy is kept in lockstep with the email template by hand — when the
 * email's constants change, mirror them here.
 */

export const metadata = {
  title: "You're invited — GHOSTSignal Studio",
  description:
    "GHOSTSignal is a podcast network that pairs brands with shows whose audiences already share their values. This is your invitation to the Studio.",
};

/** Mirrored from who-are-we/FoundersSection.tsx — update together. */
const FOUNDERS = [
  {
    name: "Mike Sense",
    role: "Vision & Partnerships",
    location: "Prague, Czechia",
    linkedin: "https://www.linkedin.com/in/mike-sense/",
    bio: "Mike is good at understanding two important questions: What is a person? And what is shaping the future? He has an appetite for risk-taking adventures, which has resulted in starting two companies that solve real problems that real people encounter in the real world. For him, GHOSTSignal is not just a fun company with friends, but a mission fuelled by curiosity and conviction.",
    image: "/images/who-are-we/mike6.jpg",
  },
  {
    name: "Jack W Harding",
    role: "Cultural & Business Strategist",
    location: "Cambridge, UK",
    linkedin: "https://www.linkedin.com/in/jackwharding",
    bio: "Jack is animated by the belief that the world changes when good creators and good brands find each other. With a background in business strategy, research, and podcasting, he loves to help meaningful ideas reach their audience. His aim is to amplify good signals that cut through static that dulls culture.",
    image: "/images/who-are-we/jack11.jpg",
  },
  {
    name: "Martin Drexler",
    role: "Design",
    location: "Munich, Germany",
    linkedin: "https://www.linkedin.com/in/whoismartindrexler/",
    bio: "Martin is an award-winning German designer known for blending creativity, strategy, and measurable impact. With more than 25 international honors, he has led branding and digital experience projects across Europe and the U.S. He brings his passion for shaping meaningful experiences to a new frontier of creator–brand partnership.",
    image: "/images/who-are-we/martin3.jpg",
  },
  {
    name: "Jeremy Reeves",
    role: "Creative Strategist",
    location: "Colorado Springs, CO",
    linkedin: "https://www.linkedin.com/in/jeremy-reeves-5365b036a/",
    bio: "Jeremy is driven by the moment a person sees something new — an insight, a possibility, a truer version of themselves — and by helping them reach it. His motivation is to help build a future where good creators and good companies meet in alignment and make the kind of world we all want.",
    image: "/images/who-are-we/jeremy4.jpg",
  },
] as const;

/** The email's pitch, given room — value props from /for-advertisers. */
const FEATURES = [
  {
    title: "Highly-attuned audiences",
    description:
      "We place you in front of considered communities where alignment runs deep — listeners who already share your values.",
  },
  {
    title: "Zero admin overhead",
    description:
      "Contracts, ad creation, transparent reporting — handled under one membership, without individual podcaster deals.",
  },
  {
    title: "Real conversion",
    description:
      "Audiences who are aligned and feel seen are far more likely to become customers. Resonance beats reach.",
  },
] as const;

export default function InvitationPage() {
  return (
    <main className={styles.page}>
      <SiteHeader links={navLinks} />

      {/* Entrance — spinning glyph, wordmark, two-line invitation */}
      <Section className={styles.heroSection}>
        <Container className={styles.hero}>
          <ScrollFadeUp index={0} duration={1.4}>
            <Image
              src="/images/email/logo-spin.gif"
              alt=""
              width={120}
              height={120}
              className={styles.heroGlyph}
              unoptimized
              priority
            />
          </ScrollFadeUp>
          <ScrollFadeUp index={1} duration={1.4}>
            <p className={styles.heroWordmark}>
              <BrandedGhostSignal />
            </p>
          </ScrollFadeUp>
          <div className={styles.morse} aria-hidden="true" />
          <h1 className={styles.heroHeadline}>
            <SplitLinesReveal duration={2}>
              You&rsquo;re invited
            </SplitLinesReveal>
            <SplitLinesReveal duration={2} delay={0.3}>
              <span>
                to the <BrandedGhostSignal /> Studio.
              </span>
            </SplitLinesReveal>
          </h1>
          <ScrollFadeUp index={2} duration={1.8}>
            <p className={styles.heroLede}>
              This is the full version of our introduction — the one the
              email could only hint at. We came across your brand and a
              few shows on our network came to mind right away. No pitch
              deck, just a look at how podcast partnerships work when the
              audience already fits.
            </p>
          </ScrollFadeUp>
        </Container>
      </Section>

      {/* What this is — the description panel, given room */}
      <Section className={styles.aboutSection}>
        <Container className={styles.about}>
          <ScrollFadeUp index={0} duration={1.6}>
            <p className={styles.eyebrow}>What this is</p>
          </ScrollFadeUp>
          <SplitLinesReveal duration={1.9}>
            <h2 className={styles.sectionTitle}>
              <BrandedGhostSignal /> is a podcast network that pairs
              brands with shows whose audiences already share their
              values.
            </h2>
          </SplitLinesReveal>
          <ScrollFadeUp index={1} duration={1.6}>
            <p className={styles.sectionLede}>
              We handle the whole partnership &mdash; contracts, ad
              creation, transparent reporting &mdash; under one
              membership.
            </p>
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

      {/* Pull-quote on top of the roster, same as the email */}
      <Section className={styles.quoteSection}>
        <Container className={styles.quote}>
          <div className={styles.morse} aria-hidden="true" />
          <SplitLinesReveal duration={2}>
            <p className={styles.quoteText}>
              &ldquo;We help brands zoom in on the right people.&rdquo;
            </p>
          </SplitLinesReveal>
        </Container>
      </Section>

      {/* Who we work with — interactive five-card carousel */}
      <Section className={styles.rosterSection}>
        <Container className={styles.roster}>
          <ScrollFadeUp index={0} duration={1.6}>
            <p className={styles.eyebrow}>Who we work with</p>
          </ScrollFadeUp>
          <RosterCarousel />
        </Container>
      </Section>

      {/* The co-founders — full bios, the email only had room for faces */}
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

      {/* CTA — the two assessments + an example spectrum read */}
      <Section className={styles.ctaSection}>
        <Container className={styles.cta}>
          <SplitLinesReveal duration={1.9}>
            <h2 className={styles.ctaTitle}>
              Find out what your RQ and XQ are.
            </h2>
          </SplitLinesReveal>
          {/* Two-up assessment columns — the heavy-visual XQ/RQ ad
              from what-is-this: extruded 3D wordmarks crowning glassy
              prose cards. Copy kept in lockstep with that page. */}
          <div className={styles.assessmentPair}>
            <ScrollFadeUp
              index={0}
              duration={1.6}
              className={styles.assessmentColumn}
            >
              <div className={styles.assessmentWordmark}>
                <XQ3DWordmark />
              </div>
              <article className={styles.assessmentCard}>
                <p className={styles.assessmentLabel}>Conviction Quotient</p>
                <p className={styles.assessmentAvailability}>
                  Free &middot; Open to everyone
                </p>
                <p className={styles.assessmentBody}>
                  A brief-but-thorough audit that uncovers the internal
                  compass of your business. Codify your non-negotiables
                  and your operating style across eight archetypes
                  &mdash; and gain a Values Blueprint that will give
                  you, brand or creator, absolute clarity on who they
                  are.
                </p>
                <div className={styles.assessmentAction}>
                  <Button href="/xq-quiz" variant="secondary">
                    Take the XQ &mdash; it&rsquo;s free
                  </Button>
                </div>
              </article>
            </ScrollFadeUp>
            <ScrollFadeUp
              index={1}
              duration={1.6}
              className={styles.assessmentColumn}
            >
              <div className={styles.assessmentWordmark}>
                <RQ3DWordmark />
              </div>
              <article className={styles.assessmentCard}>
                <p className={styles.assessmentLabel}>Resonance Quotient</p>
                <p className={styles.assessmentAvailability}>
                  Members only &middot; The matching engine
                </p>
                <p className={styles.assessmentBody}>
                  Reserved for full <BrandedGhostSignal /> members, the
                  RQ translates your XQ blueprint into aligned
                  partnerships. It&rsquo;s the bridge that matches
                  brands with the right podcasts for revenue you can be
                  proud of &mdash; and creators with the right brands
                  for campaigns that don&rsquo;t cost them their
                  audience.
                </p>
                <div className={styles.assessmentAction}>
                  <Button href="/rq-quiz" variant="secondary">
                    Take the RQ
                  </Button>
                </div>
              </article>
            </ScrollFadeUp>
          </div>
          <ScrollFadeUp
            index={2}
            duration={1.7}
            className={styles.mapReveal}
          >
            <div className={styles.mapPanel}>
              <p className={styles.mapPanelTitle}>Where a company lands</p>
              <XQSpectrumMap
                position={{ axis1: 0.6, axis2: 0.5, axis3: 0.7 }}
                highlight="C-P-C"
                pointLabel="YOUR BRAND"
              />
              <p className={styles.mapCaption}>
                An example read &mdash; a brand like Meridian Coffee lands
                with The Steward. The XQ places you; the RQ tells us who
                resonates with you.
              </p>
            </div>
          </ScrollFadeUp>
          <ScrollFadeUp index={3} duration={1.6}>
            <div className={styles.ctaActions}>
              <Button href="/for-advertisers" variant="secondary">
                See how we work with brands
              </Button>
            </div>
          </ScrollFadeUp>
        </Container>
      </Section>

      {/* Snowdrift — the starry ad unit from the email, full width */}
      <Section className={styles.snowdriftSection}>
        <Container className={styles.snowdrift}>
          <ScrollFadeUp index={0} duration={1.6}>
            <Image
              src="/images/brand/snowdrift-logo-white.png"
              alt="Snowdrift"
              width={120}
              height={120}
              className={styles.snowdriftLogo}
            />
          </ScrollFadeUp>
          <ScrollFadeUp index={1} duration={1.6}>
            <p className={styles.snowdriftBody}>
              Snowdrift is a <BrandedGhostSignal variant="light" />{" "}
              transmission &mdash; thoughts for a community of world
              makers.
            </p>
          </ScrollFadeUp>
          <ScrollFadeUp index={2} duration={1.6}>
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
        </Container>
      </Section>

      <Footer />
    </main>
  );
}

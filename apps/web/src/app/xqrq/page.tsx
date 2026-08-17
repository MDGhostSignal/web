"use client";

import Link from "next/link";

import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { ContactSection } from "@/components/ContactSection";
import { BrandedGhostSignal } from "@/components/BrandedGhostSignal";
import { Section } from "@/components/layout";
import { XQ3DWordmark, RQ3DWordmark } from "@/app/xq-quiz/Wordmarks3D";
import { XQMapCard } from "./XQMapCard";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";

import { RQExplorer } from "./RQExplorer";
import styles from "./page.module.css";
import { navLinks } from "@/lib/nav";

export default function XqRqPage() {
  return (
    <main className={styles.page}>
      <SiteHeader links={navLinks} />

      {/* One continuous cosmic backdrop (nebula drift + starfield) behind
          the entire page — fixed, so every section shares it. */}
      <div className={styles.cosmicBg} aria-hidden="true" />

      {/* ---------------------------------------------------------------
          HERO — the central question. Line-by-line reveal on the
          headline, softer fade on the sub-line beneath it.
          --------------------------------------------------------------- */}
      <Section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <ScrollFadeUp index={0} duration={1.4}>
            <p className={styles.eyebrow}>XQ &middot; RQ</p>
          </ScrollFadeUp>
          <h1 className={styles.heroHeadline}>
            <SplitLinesReveal duration={1.8} className={styles.headlineLine}>
              <span>With Whom</span>
            </SplitLinesReveal>
            <SplitLinesReveal
              duration={1.8}
              delay={0.4}
              className={styles.headlineLine}
            >
              <span>Do You Belong?</span>
            </SplitLinesReveal>
          </h1>
          <ScrollFadeUp index={1} duration={1.6}>
            <p className={styles.heroSubhead}>
              Discover Your Values to Find Your Perfect Partner.
            </p>
          </ScrollFadeUp>
        </div>
      </Section>

      {/* THE QUESTION — sets up the assessments; sits just above the
          maps. Two questions pulled out as distinct cards for clarity. */}
      <Section className={styles.narrativeSection}>
        <div className={styles.narrativeContent}>
          <ScrollFadeUp index={0} duration={1.6}>
            <p className={styles.eyebrow}>The question</p>
          </ScrollFadeUp>
          <ScrollFadeUp index={1} duration={1.6}>
            <p className={styles.questionLead}>
              The best future is a world where we work together to multiply
              our world-making effort.
            </p>
          </ScrollFadeUp>
          <ScrollFadeUp index={2} duration={1.6}>
            <div className={styles.questionCards}>
              <div className={styles.questionCard}>
                <span className={styles.questionNum}>01</span>
                <p className={styles.questionCardText}>
                  How do we ensure the right partnerships?
                </p>
              </div>
              <div className={styles.questionCard}>
                <span className={styles.questionNum}>02</span>
                <p className={styles.questionCardText}>
                  How do we make sure we are aligned?
                </p>
              </div>
            </div>
          </ScrollFadeUp>
        </div>
      </Section>

      {/* ---------------------------------------------------------------
          THE TWO MAPS — RQ resonance explorer + XQ character map, side
          by side.
          --------------------------------------------------------------- */}
      <Section className={styles.mapsSection}>
        <div className={styles.mapsContent}>
          <ScrollFadeUp index={0} duration={1.6}>
            <p className={styles.eyebrow}>Explore the maps</p>
          </ScrollFadeUp>
          <ScrollFadeUp index={1} duration={1.6}>
            <h2 className={styles.rqMapHeadline}>
              Two assessments for values-alignment.
            </h2>
          </ScrollFadeUp>
          <div className={styles.mapsGrid}>
            {/* XQ — left, free character map */}
            <div className={styles.mapCol}>
              <div className={styles.mapLogo}>
                <XQ3DWordmark />
              </div>
              <h3 className={styles.mapHeadline}>Discover your character</h3>
              <div className={`${styles.mapBox} ${styles.xqBox}`}>
                <XQMapCard />
              </div>
              <div className={styles.mapCta}>
                <p className={styles.assessmentLabel}>Conviction Quotient</p>
                <p className={styles.assessmentAvailability}>
                  Free &middot; Open to everyone
                </p>
                <p className={styles.assessmentBody}>
                  The XQ helps you discover and codify your business values,
                  so you know your company&rsquo;s moral framework.
                </p>
                <Link href="/xq-quiz?start=1" className={styles.assessmentCta}>
                  Take the XQ
                </Link>
              </div>
            </div>

            {/* RQ — right, members' resonance map */}
            <div className={styles.mapCol}>
              <div className={styles.mapLogo}>
                <RQ3DWordmark />
              </div>
              <h3 className={styles.mapHeadline}>See how you resonate</h3>
              <div className={`${styles.mapBox} ${styles.rqBox}`}>
                <RQExplorer />
              </div>
              <div className={styles.mapCta}>
                <p className={styles.assessmentLabel}>Resonance Quotient</p>
                <p className={styles.assessmentAvailability}>
                  Members only &middot; The matching engine
                </p>
                <p className={styles.assessmentBody}>
                  The RQ helps you discern what kind of partner you are, so
                  that you can connect with the most aligned partners for
                  your objectives.
                  <br />
                  Reserved for members of <BrandedGhostSignal />.
                </p>
                <span
                  className={styles.assessmentCtaLocked}
                  aria-disabled="true"
                >
                  Only accessible to members
                </span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ---------------------------------------------------------------
          THE WHY — world-making copy, now below the maps.
          --------------------------------------------------------------- */}
      <Section className={styles.narrativeSection}>
        <div className={styles.narrativeContent}>
          <ScrollFadeUp index={0} duration={1.6}>
            <p className={styles.narrativeLead}>
              Everyone is making the world &mdash; creating the future in
              the work we do today.
            </p>
          </ScrollFadeUp>
          <ScrollFadeUp index={1} duration={1.6}>
            <ul className={styles.makerChips} aria-label="World-makers">
              <li className={styles.makerChip}>Businesses</li>
              <li className={styles.makerChip}>Non-profits</li>
              <li className={styles.makerChip}>Podcasters</li>
              <li className={styles.makerChip}>Artists</li>
              <li className={styles.makerChip}>Musicians</li>
              <li className={styles.makerChip}>Creators</li>
            </ul>
          </ScrollFadeUp>
        </div>
      </Section>

      <ContactSection />

      <Footer />
    </main>
  );
}

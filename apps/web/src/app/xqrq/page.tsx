"use client";

import Link from "next/link";

import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { ContactSection } from "@/components/ContactSection";
import { ParallaxBackground } from "@/components/ParallaxBackground";
import { BrandedGhostSignal } from "@/components/BrandedGhostSignal";
import { Section } from "@/components/layout";
import { XQ3DWordmark, RQ3DWordmark } from "@/app/xq-quiz/Wordmarks3D";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";

import styles from "./page.module.css";
import { navLinks } from "@/lib/nav";

export default function XqRqPage() {
  return (
    <main className={styles.page}>
      <SiteHeader links={navLinks} />

      {/* Starry night background — same dark canvas the rest of the
          public storytelling pages sit on. */}
      <ParallaxBackground />

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
              Discover your values to find your perfect partner.
            </p>
          </ScrollFadeUp>
        </div>
      </Section>

      {/* ---------------------------------------------------------------
          THE WHY — world-making body copy that sets up why alignment
          matters before introducing the two assessments.
          --------------------------------------------------------------- */}
      <Section className={styles.narrativeSection}>
        <div className={styles.narrativeContent}>
          <ScrollFadeUp index={0} duration={1.6}>
            <p className={styles.narrativeLead}>
              Every business, podcaster, artist, musician, and creator is
              making the world &mdash; creating the future in the work we
              do today.
            </p>
          </ScrollFadeUp>
          <ScrollFadeUp index={1} duration={1.6}>
            <p className={styles.narrativeBody}>
              The best future is a world where we work together to multiply
              our world-making effort. But how do we ensure the right
              partnerships? How do we make sure we are aligned?
            </p>
          </ScrollFadeUp>
        </div>
      </Section>

      {/* ---------------------------------------------------------------
          THE TWO ASSESSMENTS — XQ (free, open) and RQ (members only).
          Each column stacks its extruded wordmark above a prose card
          and its own CTA.
          --------------------------------------------------------------- */}
      <Section className={styles.assessmentsSection}>
        <div className={styles.assessmentsContent}>
          <ScrollFadeUp index={0} duration={1.6}>
            <h2 className={styles.assessmentsHeadline}>
              Two quotients. One aligned partnership.
            </h2>
          </ScrollFadeUp>

          <div className={styles.assessmentPair}>
            {/* XQ — free, open to everyone */}
            <ScrollFadeUp
              index={1}
              duration={1.6}
              className={styles.assessmentColumn}
            >
              <div className={styles.assessmentWordmark}>
                <XQ3DWordmark />
              </div>
              <article className={styles.assessmentCard}>
                <p className={styles.assessmentLabel}>
                  Conviction Quotient
                </p>
                <p className={styles.assessmentAvailability}>
                  Free &middot; Open to everyone
                </p>
                <p className={styles.assessmentBody}>
                  The XQ helps you discover and codify your business
                  values, so you know your company&rsquo;s moral
                  framework.
                </p>
                <Link href="/xq-quiz" className={styles.assessmentCta}>
                  Take the XQ
                </Link>
              </article>
            </ScrollFadeUp>

            {/* RQ — members only, the matching engine */}
            <ScrollFadeUp
              index={2}
              duration={1.6}
              className={styles.assessmentColumn}
            >
              <div className={styles.assessmentWordmark}>
                <RQ3DWordmark />
              </div>
              <article className={styles.assessmentCard}>
                <p className={styles.assessmentLabel}>
                  Resonance Quotient
                </p>
                <p className={styles.assessmentAvailability}>
                  Members only &middot; The matching engine
                </p>
                <p className={styles.assessmentBody}>
                  The RQ helps you discern what kind of partner you are, so
                  that you can connect with the most aligned partners for
                  your objectives. Reserved for members of{" "}
                  <BrandedGhostSignal />.
                </p>
                <Link href="/rq-quiz" className={styles.assessmentCta}>
                  Take the RQ
                </Link>
              </article>
            </ScrollFadeUp>
          </div>

          <ScrollFadeUp index={3} duration={1.6}>
            <p className={styles.assessmentsFooternote}>
              Start with the XQ &mdash; it&rsquo;s free, and it&rsquo;s the
              first step toward finding whom you belong with.
            </p>
          </ScrollFadeUp>
        </div>
      </Section>

      <ContactSection />

      <Footer />
    </main>
  );
}

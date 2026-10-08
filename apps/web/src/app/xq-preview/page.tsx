import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { Section, Container } from "@/components/layout";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";
import { navLinks } from "@/lib/nav";
import styles from "./page.module.css";

export default function XqPreviewPage() {
  return (
    <main className={styles.page}>
      <SiteHeader links={navLinks} />

      <Section className={styles.hero}>
        <img
          className={styles.heroImage}
          src="/images/xq-preview/hero-homestead-2x.jpg"
          alt=""
        />
        <div className={styles.heroContent}>
          <h1 className={styles.heroHeadline}>
            <SplitLinesReveal duration={2.2}>With whom</SplitLinesReveal>
            <SplitLinesReveal duration={2.2} delay={0.3}>
              do you
            </SplitLinesReveal>
            <SplitLinesReveal duration={2.2} delay={0.6}>
              belong?
            </SplitLinesReveal>
          </h1>
          <ScrollFadeUp index={1} duration={1.8}>
            <p className={styles.heroSubhead}>
              Discover your values to find your perfect partner.
            </p>
          </ScrollFadeUp>
        </div>
      </Section>

      <Section className={styles.partsSection}>
        <Container>
          <h2 className={styles.partsTitle}>One analysis, in two parts.</h2>
          <div className={styles.parts}>
            <article className={styles.part}>
              <img
                className={styles.partImage}
                src="/images/xq-preview/part-one.jpg"
                alt=""
              />
              <p className={styles.label}>XQ · Part One</p>
              <p className={styles.availability}>Free · Open to everyone</p>
              <p className={styles.body}>
                Part One names the values your company already holds.
              </p>
              <Link href="/xq-quiz?start=1" className={styles.cta}>
                Begin Part One
              </Link>
            </article>

            <article className={styles.part}>
              <img
                className={styles.partImage}
                src="/images/xq-preview/part-two.jpg"
                alt=""
              />
              <p className={styles.label}>XQ · Part Two</p>
              <p className={styles.availability}>Members only</p>
              <p className={styles.body}>
                Part Two shows the kind of partner you are, so the match can
                be specific.
              </p>
              <span className={styles.ctaLocked} aria-disabled="true">
                Only accessible to members
              </span>
            </article>
          </div>
        </Container>
      </Section>

      <Section className={styles.questionSection}>
        <img
          className={styles.questionImage}
          src="/images/xq-preview/question.jpg"
          alt=""
        />
        <Container className={styles.questionCopy}>
          <p className={styles.eyebrow}>The question</p>
          <p className={styles.question}>
            How do we ensure the right partnerships?
          </p>
        </Container>
      </Section>

      <Footer />
    </main>
  );
}

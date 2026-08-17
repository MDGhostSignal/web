"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

import { SiteHeader } from "@/components/SiteHeader";
import { Footer } from "@/components/Footer";
import { ContactSection } from "@/components/ContactSection";
import { Container, Section } from "@/components/layout";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";

import styles from "./page.module.css";
import { navLinks } from "@/lib/nav";

type Term = {
  title: string;
  body: ReactNode;
};

type Category = {
  id: string;
  label: string;
  intro: string;
  terms: Term[];
};

const categories: Category[] = [
  {
    id: "philosophical-anchors",
    label: "Philosophical Anchors",
    intro:
      "The framing ideas that orient every partnership we take on — the vocabulary for the kind of world we want to help make.",
    terms: [
      {
        title: "World-Making",
        body: (
          <>
            The recognition that every story told, every ad placed, and every
            partnership formed is an intentional act of shaping the future. The
            best world-making, in the GHOSTSignal sense, occurs when good
            brands partner with good creators and their good communities to
            support and point one another in the right direction.
          </>
        ),
      },
      {
        title: "Membership Doorway",
        body: (
          <>
            While we are all making the world one way or another, not all are
            “world-makers.” We discern each potential member along three
            dimensions: <strong>Values</strong>, <strong>Authenticity</strong>,
            and <strong>Flourishing Impact</strong>. These are the thresholds
            into the GHOSTSignal ecosystem.
          </>
        ),
      },
      {
        title: "The Signal",
        body: (
          <>
            The integrated relationship between good brands, good creators, and
            their good communities — where values, authenticity, and
            flourishing harmonize.
          </>
        ),
      },
      {
        title: "The Static",
        body: (
          <>
            A state where secondary goods — profits, raw listen counts, and
            hype — are prioritized over primary mission. Static is the
            cacophony of disruptive, misaligned messaging.
          </>
        ),
      },
      {
        title: "Flourishing vs. Restlessness",
        body: (
          <>
            Flourishing is the state of being built up, encouraged, and
            furthered. Restlessness is a state of constant consumption driven
            by scarcity and FOMO. We appeal to what is good rather than merely
            running from what is bad.
          </>
        ),
      },
      {
        title: "Ad Copy Guidelines",
        body: (
          <>
            Our moral and stylistic guardrails for ad scriptwriting. They
            ensure every brand partnership speaks to flourishing, not
            restlessness.
          </>
        ),
      },
      {
        title: "SnowDrift",
        body: (
          <>
            The name of our journal newsletter —{" "}
            <Link href="/snowdrift" className={styles.inlineLink}>
              read the latest entries
            </Link>
            .
          </>
        ),
      },
    ],
  },
  {
    id: "technical-terms",
    label: "Technical Terms",
    intro:
      "The infrastructure that carries the signal — the pieces that need to work cleanly so the human part of the work can show through.",
    terms: [
      {
        title: "Resonance Quotient (RQ™)",
        body: (
          <>
            Like a personality assessment for your podcast or brand, the RQ
            summarizes your partnership values so you match with partners you’d
            be proud to work with. Podcasters: advertisements on your show
            deepen audience trust. Brands: you’ll be paired with podcasters
            whose audience is already tuned to what you are doing. Resonance is
            the new reach.{" "}
            <Link href="/xqrq" className={styles.inlineLink}>
              See how the RQ works
            </Link>
            .
          </>
        ),
      },
      {
        title: "RSS Feed",
        body: (
          <>
            The fundamental spine of podcasting — the protocol that lets shows
            be syndicated and owned by the creator, independent of any single
            platform, so the signal can flow freely to listeners on whatever
            app they prefer.
          </>
        ),
      },
      {
        title: "Listening Platform",
        body: (
          <>
            Spotify, Apple Podcasts, Overcast — the environments where
            listeners access our work. While these services amplify reach, we
            remember that our true relationship is with the listener, not the
            interface.
          </>
        ),
      },
      {
        title: "Host",
        body: (
          <>
            The technical infrastructure providers — ART19, Megaphone and the
            like — that store and distribute our media. They are silent
            partners that enable transformative impact by handling the
            mechanics so we can focus on the mission.
          </>
        ),
      },
      {
        title: "Dynamic Ad Insertion (DAI)",
        body: (
          <>
            Technology that serves audio in real time, swapping fresh ads into
            older episodes. It turns static audio into a living ecosystem —
            content stays evergreen and ad messages remain relevant to the
            episode’s mission.
          </>
        ),
      },
    ],
  },
  {
    id: "adverts",
    label: "Adverts",
    intro:
      "The working language of ad buying — plotted on a single plane so the relationships between formats, formats, and trust come through at a glance.",
    terms: [
      {
        title: "CPM (Cost Per Mille)",
        body: (
          <>
            The shorthand for the cost of reaching 1,000 listeners. This
            measure helps to cost an advert. Depending on the historic moment,
            length, position, or kind of ad, whether the host reads it or not
            — at GHOSTSignal we believe high-resonance and signal = high CPMs.
          </>
        ),
      },
      {
        title: "Pre-Roll / Mid-Roll / Post-Roll",
        body: (
          <>
            The temporal placement of a message within a podcast episode
            (Pre = Start, Mid = Middle, or Post = End).
          </>
        ),
      },
      {
        title: "Baked-In",
        body: <>Ads permanently recorded into the original audio file (non-swappable).</>,
      },
      {
        title: "Programmatic",
        body: (
          <>
            An automated, algorithm-driven marketplace for ad space. While
            efficient, it often lacks signal fidelity; GHOSTSignal views it as
            a tool to be carefully curated so it never overwhelms the listener
            with &ldquo;Static.&rdquo;
          </>
        ),
      },
      {
        title: "Host Read",
        body: (
          <>
            An ad voiced by the creator themselves. This is the highest form
            of endorsement because it relies on the pre-existing, hard-won
            trust between host and listener, often resulting in 3–7× higher
            conversion than standard ads.
          </>
        ),
      },
      {
        title: "Signal Pool / Spot Ad",
        body: (
          <>
            Our dedicated, hand-curated collective of values-based creators
            and brands. This is at the heart of our value-driven revenue,
            where partnerships are matched for mutual flourishing rather than
            mere reach. These are pre-produced ads.
          </>
        ),
      },
      {
        title: "Excess Inventory",
        body: (
          <>
            Open ad slots within an episode not currently occupied by a
            &ldquo;Signal&rdquo; partner. We steward this space redemptively,
            using automated systems only where the creator is happy, and even
            then, we filter out static.
          </>
        ),
      },
      {
        title: "Revenue Share",
        body: (
          <>
            Our model of partnership where the creator and GHOSTSignal share
            ad revenue in order to keep making the world.
          </>
        ),
      },
      {
        title: "Promo Swap",
        body: (
          <>
            A mutual, mostly free, agreement between two shows, often on the
            same network, to promote one another. This fosters fraternity and
            grows our collective reach through a sacrificial exchange of
            airtime.
          </>
        ),
      },
    ],
  },
];

export default function SignalSheetPage() {
  const [activeId, setActiveId] = useState<string>(categories[0].id);
  const [navVisible, setNavVisible] = useState<boolean>(true);
  const endSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Track which section is currently in the middle band of the viewport
    // so the sticky category nav can highlight it.
    const observer = new IntersectionObserver(
      (entries) => {
        // Prefer the most-intersecting section if multiple are in view.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveId(visible.target.id);
      },
      {
        rootMargin: "-35% 0px -45% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    categories.forEach((cat) => {
      const el = document.getElementById(cat.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Hide the bottom nav once the user has scrolled past the glossary so
    // it doesn't sit on top of the ContactSection or the Footer.
    const el = endSentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setNavVisible(!entry.isIntersecting),
      { rootMargin: "0px 0px -15% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <main className={styles.page}>
      <SiteHeader links={navLinks} />

      <div className={styles.staticOverlay} aria-hidden="true" />

      {/* Hero */}
      <Section className={styles.hero}>
        <Container className={styles.heroContainer}>
          <ScrollFadeUp duration={1.4} distance={16}>
            <p className={styles.eyebrow}>Resources</p>
          </ScrollFadeUp>
          <h1 className={styles.headline}>
            <SplitLinesReveal duration={2.2}>The Signal Sheet</SplitLinesReveal>
          </h1>
          <ScrollFadeUp duration={1.6} delay={0.35}>
            <p className={styles.lead}>
              A working glossary of the terms that shape GhostSignal&apos;s
              world — the philosophical anchors, technical grammar, and
              advertising vocabulary that keep the signal coherent.
            </p>
          </ScrollFadeUp>
          <ScrollFadeUp duration={1.6} delay={0.55}>
            <div className={styles.heroMeta}>
              <span className={styles.metaLabel}>Version 01</span>
              <span className={styles.metaDot} aria-hidden="true" />
              <span className={styles.metaLabel}>
                {categories.reduce((n, c) => n + c.terms.length, 0)} entries
              </span>
              <span className={styles.metaDot} aria-hidden="true" />
              <span className={styles.metaLabel}>
                {categories.length} categories
              </span>
            </div>
          </ScrollFadeUp>
          <ScrollFadeUp duration={1.6} delay={0.7}>
            <ul className={styles.heroJumpNav} aria-label="Jump to section">
              {categories.map((cat, i) => (
                <li key={cat.id}>
                  <a href={`#${cat.id}`} className={styles.heroJumpLink}>
                    <span className={styles.heroJumpIndex}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className={styles.heroJumpLabel}>{cat.label}</span>
                    <span className={styles.heroJumpArrow} aria-hidden="true">
                      ↓
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </ScrollFadeUp>
        </Container>
      </Section>

      {/* Bottom-fixed category navigation */}
      <nav
        className={`${styles.categoryNav} ${navVisible ? "" : styles.categoryNavHidden}`}
        aria-label="Glossary categories"
      >
        <ul className={styles.categoryList}>
          {categories.map((cat, i) => (
            <li key={cat.id}>
              <a
                href={`#${cat.id}`}
                className={`${styles.categoryLink} ${activeId === cat.id ? styles.categoryLinkActive : ""}`}
              >
                <span className={styles.categoryIndex}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={styles.categoryLabel}>{cat.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Glossary sections */}
      {categories.map((cat, catIndex) => {
        const isGraph = cat.id === "adverts";
        return (
          <Section
            key={cat.id}
            id={cat.id}
            className={`${styles.section} ${isGraph ? styles.sectionGraph : ""}`}
          >
            <Container className={styles.sectionContainer}>
              <header className={styles.sectionHeader}>
                <ScrollFadeUp duration={1.4} distance={16}>
                  <p className={styles.sectionNumber}>
                    {String(catIndex + 1).padStart(2, "0")} / {" "}
                    {String(categories.length).padStart(2, "0")}
                  </p>
                </ScrollFadeUp>
                <h2 className={styles.sectionTitle}>
                  <SplitLinesReveal duration={2}>{cat.label}</SplitLinesReveal>
                </h2>
                <ScrollFadeUp duration={1.6} delay={0.3}>
                  <p className={styles.sectionIntro}>{cat.intro}</p>
                </ScrollFadeUp>
              </header>

              {isGraph ? (
                <ScrollFadeUp duration={1.6} delay={0.35}>
                  <figure
                    className={styles.graph}
                    role="group"
                    aria-label="Advertising terms plotted on a coordinate plane"
                  >
                    {/* Axis labels — technical schematic feel. */}
                    <span className={`${styles.axisLabel} ${styles.axisLabelY}`}>
                      Y · Resonance ↑
                    </span>
                    <span className={`${styles.axisLabel} ${styles.axisLabelX}`}>
                      X · Format → Reach
                    </span>

                    {/* Tick labels sit along each axis — tabular 01-03. */}
                    <ul className={styles.yTicks} aria-hidden="true">
                      <li>03</li>
                      <li>02</li>
                      <li>01</li>
                    </ul>
                    <ul className={styles.xTicks} aria-hidden="true">
                      <li>01</li>
                      <li>02</li>
                      <li>03</li>
                    </ul>

                    {/* 3×3 plot grid. Each term is a data-point cell. */}
                    <ol className={styles.graphGrid}>
                      {cat.terms.map((term, i) => {
                        const col = (i % 3) + 1;
                        const row = 3 - Math.floor(i / 3);
                        return (
                          <li key={term.title} className={styles.graphCell}>
                            <span className={styles.cellPlot} aria-hidden="true">
                              +
                            </span>
                            <span className={styles.cellCoord} aria-hidden="true">
                              ({col}, {row})
                            </span>
                            <span className={styles.cellNumber}>
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <h3 className={styles.cellTitle}>{term.title}</h3>
                            <div className={styles.cellBody}>{term.body}</div>
                          </li>
                        );
                      })}
                    </ol>
                  </figure>
                </ScrollFadeUp>
              ) : (
                <ol className={styles.termList}>
                  {cat.terms.map((term, i) => (
                    <ScrollFadeUp
                      key={term.title}
                      duration={1.5}
                      delay={Math.min(i * 0.06, 0.36)}
                      className={styles.termItem}
                    >
                      <article className={styles.termCard}>
                        <div className={styles.termCardInner}>
                          <span className={styles.termNumber} aria-hidden="true">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <h3 className={styles.termTitle}>{term.title}</h3>
                          <div className={styles.termBody}>{term.body}</div>
                        </div>
                      </article>
                    </ScrollFadeUp>
                  ))}
                </ol>
              )}
            </Container>
          </Section>
        );
      })}

      {/* Sentinel: once this enters the viewport the bottom nav retracts. */}
      <div ref={endSentinelRef} aria-hidden="true" />

      {/* Contact */}
      <ContactSection />

      <Footer />
    </main>
  );
}

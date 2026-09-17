"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import styles from "./page.module.css";

const STATIC_SLIDES = [
  {
    src: "/images/proposals/holly-mackle/slide-04.png",
    label: "Timeline",
    title: "About two weeks",
  },
  {
    src: "/images/proposals/holly-mackle/slide-05.png",
    label: "Scope",
    title: "Scope of work + investment",
  },
  {
    src: "/images/proposals/holly-mackle/slide-06.png",
    label: "Next Steps",
    title: "Ready when you are",
  },
] as const;

const SLIDE_LABELS = ["Cover", "Opportunity", "The Work", ...STATIC_SLIDES.map((s) => s.label)] as const;
const SLIDE_COUNT = SLIDE_LABELS.length;

const WORK_STEPS = [
  {
    num: "01",
    titleLines: ["Discovery"],
    accent: "green",
    body: "Guided conversation to surface hopes and aspirations for the brand’s future.",
  },
  {
    num: "02",
    titleLines: ["Brand", "Strategy"],
    accent: "wine",
    body: "A Brand Strategy report: platforms, voice, and recommended growth steps.",
  },
  {
    num: "03",
    titleLines: ["Visual", "Identity"],
    accent: "terracotta",
    body: "Logo, color palette, and fonts — the full visual environment.",
  },
  {
    num: "04",
    titleLines: ["Website +", "Platform Assets"],
    accent: "saffron",
    body: "A website hub for your offerings, plus assets for cross-platform consistency.",
  },
] as const;

const OPPORTUNITY_LEAD =
  "Holly Mackle is a writer, podcaster, former-librarian book-recommender, and all-around force for joy in the world. Holly is at an important inflection point: having built a strong following and collection of products, Holly deserves a clear brand strategy to organize all her efforts, giving her audience a singular hub and touchpoint.";

const OPPORTUNITY_SUPPORT =
  "GHOSTSignal loves to help people clarify themselves through strategy and visuals that generate real connection. Through deep listening and targeted design, we help clients map a path to their brand’s future. We are honored to offer this proposal, and appreciate the opportunity.";

function CoverSlide() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <div className={styles.cover}>
      {reduced ? (
        // eslint-disable-next-line @next/next/no-img-element -- decorative poster; same pattern as /invitation
        <img
          src="/videos/invitation-hero-poster.jpg"
          alt=""
          aria-hidden="true"
          className={`${styles.coverVideo} ${styles.coverVideoMedia}`}
        />
      ) : (
        <video
          className={`${styles.coverVideo} ${styles.coverVideoMedia}`}
          autoPlay
          muted
          loop
          playsInline
          poster="/videos/invitation-hero-poster.jpg"
          aria-hidden="true"
          tabIndex={-1}
        >
          <source src="/videos/invitation-hero.webm" type="video/webm" />
          <source src="/videos/invitation-hero.mp4" type="video/mp4" />
        </video>
      )}
      <div className={styles.coverScrim} aria-hidden="true" />
      <div className={styles.coverChrome}>
        {/* eslint-disable-next-line @next/next/no-img-element -- animated GIF; next/image freezes frames */}
        <img
          src="/images/email/logo-spin.gif"
          alt="GHOSTSignal"
          width={96}
          height={96}
          className={styles.coverLogo}
        />
      </div>
      <div className={styles.coverContent}>
        <p className={styles.coverEyebrow}>Brand Proposal</p>
        <p className={styles.coverSeriously}>Holly Mackle</p>
        <p className={styles.coverSub}>Brand Strategy &amp; Visual Identity</p>
      </div>
    </div>
  );
}

function DeckLogo() {
  return (
    <Image
      src="/images/brand/brandmark-hor-black.png"
      alt="GHOSTSignal"
      width={480}
      height={96}
      className={styles.deckLogo}
      priority
    />
  );
}

function OpportunitySlide() {
  return (
    <div className={styles.opportunity}>
      <div className={styles.oppCopy}>
        <DeckLogo />
        <div className={styles.oppTextStack}>
          <h1 className={styles.oppTitle}>The Opportunity</h1>
          <div className={styles.oppRule} aria-hidden="true" />
          <p className={styles.oppLead}>{OPPORTUNITY_LEAD}</p>
          <div className={styles.oppQuote}>
            <span className={styles.oppBar} aria-hidden="true" />
            <p className={styles.oppSupport}>{OPPORTUNITY_SUPPORT}</p>
          </div>
        </div>
      </div>
      <div className={styles.oppPortrait}>
        <Image
          src="/images/proposals/holly-mackle/holly-mackle-headshot.jpg"
          alt="Holly Mackle"
          width={1080}
          height={1350}
          className={styles.oppPortraitImage}
          priority
          sizes="(max-width: 1099px) 40vw, 28vw"
        />
      </div>
    </div>
  );
}

function WorkSlide() {
  return (
    <div className={styles.work}>
      <DeckLogo />
      <header className={styles.workHeader}>
        <h1 className={styles.workTitle}>The Work</h1>
        <p className={styles.workSub}>Four connected steps</p>
      </header>
      <div className={styles.workGrid}>
        {WORK_STEPS.map((step) => (
          <article
            key={step.num}
            className={`${styles.workCard} ${styles[`workAccent_${step.accent}`]}`}
          >
            <p className={styles.workCardNum}>{step.num}</p>
            <h2 className={styles.workCardTitle}>
              {step.titleLines.map((line) => (
                <span key={line} className={styles.workCardTitleLine}>
                  {line}
                </span>
              ))}
            </h2>
            <p className={styles.workCardBody}>{step.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function HollyMackleProposalPage() {
  const [active, setActive] = useState(0);
  const stageRef = useRef<HTMLElement | null>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);

  const scrollToSlide = useCallback((index: number) => {
    const el = slideRefs.current[index];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    setActive(index);
  }, []);

  useEffect(() => {
    const root = stageRef.current;
    if (!root) return;
    const nodes = slideRefs.current.filter(Boolean) as HTMLElement[];
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const idx = nodes.indexOf(visible.target as HTMLElement);
        if (idx >= 0) setActive(idx);
      },
      { root, threshold: 0.55 }
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "j" || e.key === " ") {
        e.preventDefault();
        scrollToSlide(Math.min(active + 1, SLIDE_COUNT - 1));
      }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "k") {
        e.preventDefault();
        scrollToSlide(Math.max(active - 1, 0));
      }
      if (e.key === "Home") {
        e.preventDefault();
        scrollToSlide(0);
      }
      if (e.key === "End") {
        e.preventDefault();
        scrollToSlide(SLIDE_COUNT - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, scrollToSlide]);

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <Image
            src="/images/brand/gs-brandmark-hor-white.png"
            alt="GHOSTSignal"
            width={320}
            height={64}
            className={styles.topLogo}
            priority
          />
        </div>
        <p className={styles.topTitle}>Holly Mackle Proposal V1</p>
        <span className={styles.counter} aria-live="polite">
          {String(active + 1).padStart(2, "0")} / {String(SLIDE_COUNT).padStart(2, "0")}
        </span>
      </header>

      <aside className={styles.rail} aria-label="Slide navigation">
        <p className={styles.railLabel}>Slides</p>
        <ol className={styles.railList}>
          {SLIDE_LABELS.map((label, i) => (
            <li key={label}>
              <button
                type="button"
                className={i === active ? styles.railItemActive : styles.railItem}
                onClick={() => scrollToSlide(i)}
                aria-current={i === active ? "true" : undefined}
              >
                <span className={styles.railNum}>{String(i + 1).padStart(2, "0")}</span>
                <span className={styles.railTitle}>{label}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className={styles.railHint}>← → · Space · J / K</p>
      </aside>

      <main
        className={styles.stage}
        ref={stageRef}
        tabIndex={0}
        aria-label="Proposal slides"
      >
        <section
          id="slide-1"
          className={styles.slideViewport}
          ref={(el) => {
            slideRefs.current[0] = el;
          }}
          aria-label="Slide 1: Brand Proposal"
        >
          <div className={styles.slideCanvas}>
            <CoverSlide />
          </div>
        </section>

        <section
          id="slide-2"
          className={styles.slideViewport}
          ref={(el) => {
            slideRefs.current[1] = el;
          }}
          aria-label="Slide 2: The opportunity"
        >
          <div className={styles.slideCanvas}>
            <OpportunitySlide />
          </div>
        </section>

        <section
          id="slide-3"
          className={styles.slideViewport}
          ref={(el) => {
            slideRefs.current[2] = el;
          }}
          aria-label="Slide 3: Four connected steps"
        >
          <div className={styles.slideCanvas}>
            <WorkSlide />
          </div>
        </section>

        {STATIC_SLIDES.map((slide, i) => {
          const index = i + 3;
          return (
            <section
              key={slide.src}
              id={`slide-${index + 1}`}
              className={styles.slideViewport}
              ref={(el) => {
                slideRefs.current[index] = el;
              }}
              aria-label={`Slide ${index + 1}: ${slide.title}`}
            >
              <div className={styles.slideCanvas}>
                <Image
                  src={slide.src}
                  alt={`Slide ${index + 1}: ${slide.title}`}
                  width={1920}
                  height={1080}
                  className={styles.slideImage}
                  priority={i < 1}
                  sizes="100vw"
                />
              </div>
            </section>
          );
        })}
      </main>

      <nav className={styles.mobileNav} aria-label="Slide controls">
        <button
          type="button"
          className={styles.mobileBtn}
          onClick={() => scrollToSlide(Math.max(active - 1, 0))}
          disabled={active === 0}
        >
          Prev
        </button>
        <span className={styles.mobileCounter}>
          {active + 1} / {SLIDE_COUNT}
        </span>
        <button
          type="button"
          className={styles.mobileBtn}
          onClick={() => scrollToSlide(Math.min(active + 1, SLIDE_COUNT - 1))}
          disabled={active === SLIDE_COUNT - 1}
        >
          Next
        </button>
      </nav>
    </div>
  );
}

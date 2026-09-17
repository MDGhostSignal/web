"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import styles from "./page.module.css";

const SLIDE_DESIGN_W = 1920;
const SLIDE_DESIGN_H = 1080;

const SLIDE_LABELS = [
  "Cover",
  "Opportunity",
  "The Work",
  "Timeline",
  "Scope",
  "Next Steps",
] as const;

type ScopeDeliverable = {
  text: string;
  children?: readonly string[];
};

const SCOPE_STEPS: {
  num: string;
  titleLines: readonly string[];
  accent: "green" | "wine" | "terracotta" | "saffron";
  body: string;
  deliverables: readonly ScopeDeliverable[];
}[] = [
  {
    num: "01",
    titleLines: ["Discovery"],
    accent: "green",
    body: "This project begins with understanding: through a guided conversation we discover your hopes and aspirations for the future of your brand. This step forms the foundation for the steps that follow, ensuring we stay authentic to who you are.",
    deliverables: [
      {
        text: "Discovery Report: Who is the Holly Mackle Brand and Where is it Going",
      },
    ],
  },
  {
    num: "02",
    titleLines: ["Brand", "Strategy"],
    accent: "wine",
    body: "Building on the Discovery step, we develop a Brand Strategy report, detailing the direction and aims of the brand. Here, we codify the role of each of the brand’s current platforms, describe the voice of the brand, and recommend steps for future growth.",
    deliverables: [
      {
        text: "Brand Strategy Report: A Map of the future of the brand, a description of the Holly Mackle brand voice to guide writing and messaging across all platforms, recommendations for the role of each platform within the brand.",
      },
    ],
  },
  {
    num: "03",
    titleLines: ["Visual", "Identity"],
    accent: "terracotta",
    body: "Based on the Discovery and Strategy steps, we develop a cohesive Visual Identity for the overall brand. Including logo, color palette, and fonts, this step develops the entire visual environment for the brand.",
    deliverables: [
      { text: "Personal Brand Logo and any submarks" },
      { text: "Color Palette" },
      { text: "Fonts" },
      { text: "Patterns/visual ecosystem" },
    ],
  },
  {
    num: "04",
    titleLines: ["Website +", "Platform Assets"],
    accent: "saffron",
    body: "Finally, we apply all the previous work to a new website for the brand. Serving as a hub for all of your offerings, the website gives your audience the ease of a singular gathering place from which you communicate. This step also includes visual assets necessary for creating brand consistency across all of your current platforms.",
    deliverables: [
      {
        text: "Five page website, on Squarespace with the following pages",
        children: ["Home", "About", "Podcast", "Writing", "Speaking"],
      },
      { text: "Digital Brand Asset for each existing platform" },
    ],
  },
];

/** Eight weeks · four phases · two weeks each */
const TIMELINE_WEEKS = [
  {
    label: "Week 1",
    accent: "green",
    title: "Discovery",
    focus: "Listen & surface hopes for the brand’s future.",
    phaseStart: true,
  },
  {
    label: "Week 2",
    accent: "green",
    title: "Discovery",
    focus: "Listen & surface hopes for the brand’s future.",
    phaseStart: false,
  },
  {
    label: "Week 3",
    accent: "wine",
    title: "Brand Strategy",
    focus: "Platforms, voice, and the growth path.",
    phaseStart: true,
  },
  {
    label: "Week 4",
    accent: "wine",
    title: "Brand Strategy",
    focus: "Platforms, voice, and the growth path.",
    phaseStart: false,
  },
  {
    label: "Week 5",
    accent: "terracotta",
    title: "Visual Identity",
    focus: "Logo, color, and the full visual environment.",
    phaseStart: true,
  },
  {
    label: "Week 6",
    accent: "terracotta",
    title: "Visual Identity",
    focus: "Logo, color, and the full visual environment.",
    phaseStart: false,
  },
  {
    label: "Week 7",
    accent: "saffron",
    title: "Website + Platform Assets",
    focus: "The hub plus assets for every channel.",
    phaseStart: true,
  },
  {
    label: "Week 8",
    accent: "saffron",
    title: "Website + Platform Assets",
    focus: "The hub plus assets for every channel.",
    phaseStart: false,
  },
] as const;

const BRAND_BAR_COLORS = ["terracotta", "wine", "green", "pink", "saffron"] as const;
const CALENDAR_DAYS = ["M", "T", "W", "T", "F"] as const;
const SLIDE_COUNT = SLIDE_LABELS.length;

const WORK_STEPS = [
  {
    num: "01",
    titleLines: ["Discovery"],
    accent: "green",
    // Community listening — same photography language as /who-are-we promises
    image: "/images/who-are-we/promise2.jpg",
    imageAlt: "People gathered in conversation",
    imageFit: "cover" as const,
  },
  {
    num: "02",
    titleLines: ["Brand", "Strategy"],
    accent: "wine",
    // Brand system palette — strategy made visible as a coded system
    image: "/images/what-is-this/color-bars.png",
    imageAlt: "GhostSignal brand color system",
    imageFit: "contain" as const,
  },
  {
    num: "03",
    titleLines: ["Visual", "Identity"],
    accent: "terracotta",
    // Form and craft — same classical identity language as /for-creators
    image: "/images/for-creators/journey-statue.png",
    imageAlt: "Classical sculpture study",
    imageFit: "cover" as const,
  },
  {
    num: "04",
    titleLines: ["Website +", "Platform Assets"],
    accent: "saffron",
    // Expansive branded field — hub / digital presence
    image: "/images/for-creators/hero-bg.jpg",
    imageAlt: "Cloud field digital landscape",
    imageFit: "cover" as const,
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
        // eslint-disable-next-line @next/next/no-img-element -- decorative poster
        <img
          src="/videos/invitation-hero-prev-poster.jpg"
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
          poster="/videos/invitation-hero-prev-poster.jpg"
          aria-hidden="true"
          tabIndex={-1}
        >
          {/* Pre-sunny invitation cloud plate (no light rays) */}
          <source src="/videos/invitation-hero-prev.webm" type="video/webm" />
          <source src="/videos/invitation-hero-prev.mp4" type="video/mp4" />
        </video>
      )}
      <div className={styles.coverScrim} aria-hidden="true" />
      <div className={styles.coverChrome}>
        {/* eslint-disable-next-line @next/next/no-img-element -- animated APNG; next/image freezes frames */}
        <img
          src="/images/brand/logo-spin-transparent.png"
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

function DeckCloudMark() {
  return (
    <Image
      src="/images/brand/logo-black.png"
      alt=""
      width={96}
      height={96}
      className={styles.deckCloud}
      priority
      aria-hidden="true"
    />
  );
}

function BrandBars() {
  return (
    <div className={styles.brandBars} aria-hidden="true">
      {BRAND_BAR_COLORS.map((color) => (
        <span
          key={color}
          className={`${styles.brandBar} ${styles[`brandBar_${color}`]}`}
        />
      ))}
    </div>
  );
}

/** Fixed 1920×1080 artboard scaled to fit any desktop stage. */
function SlideFrame({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      setScale(Math.min(width / SLIDE_DESIGN_W, height / SLIDE_DESIGN_H));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={styles.slideCanvas} ref={canvasRef}>
      <div
        className={styles.slideInner}
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        {children}
      </div>
    </div>
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
      <DeckCloudMark />
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
            <div className={styles.workCardTop}>
              <p className={styles.workCardNum}>{step.num}</p>
              <h2 className={styles.workCardTitle}>
                {step.titleLines.map((line) => (
                  <span key={line} className={styles.workCardTitleLine}>
                    {line}
                  </span>
                ))}
              </h2>
            </div>
            <div
              className={
                step.imageFit === "contain"
                  ? `${styles.workCardMedia} ${styles.workCardMediaContain}`
                  : styles.workCardMedia
              }
            >
              <Image
                src={step.image}
                alt={step.imageAlt}
                width={800}
                height={1000}
                className={styles.workCardImage}
                sizes="20vw"
              />
            </div>
          </article>
        ))}
      </div>
      <BrandBars />
    </div>
  );
}

const NEXT_FOUNDERS = [
  {
    fullName: "Mike Sense",
    image: "/images/who-are-we/mike6.jpg",
  },
  {
    fullName: "Jack W Harding",
    image: "/images/who-are-we/jack11.jpg",
  },
  {
    fullName: "Martin Drexler",
    image: "/images/who-are-we/martin3.jpg",
  },
  {
    fullName: "Jeremy Reeves",
    image: "/images/who-are-we/jeremy4.jpg",
  },
] as const;

function NextStepsSlide() {
  return (
    <div className={styles.next}>
      <DeckCloudMark />
      <header className={styles.nextHeader}>
        <h1 className={styles.nextTitle}>Next Steps</h1>
        <p className={styles.nextSub}>Ready when you are.</p>
      </header>

      <p className={styles.nextLead}>
        Thank you for the opportunity. We’re usually somewhere between a coffee
        shop and a cloud — if you’d like to talk, you know where to find us.
      </p>

      <div className={styles.nextFounders}>
        <ul className={styles.nextFoundersList}>
          {NEXT_FOUNDERS.map((founder) => (
            <li key={founder.fullName} className={styles.nextFounder}>
              <div className={styles.nextFounderFrame}>
                <Image
                  src={founder.image}
                  alt={founder.fullName}
                  width={240}
                  height={240}
                  className={styles.nextFounderImage}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className={styles.nextSignoff}>Welcome to the Signal.</p>
    </div>
  );
}

function ScopeSlide() {
  return (
    <div className={styles.scope}>
      <DeckCloudMark />
      <header className={styles.scopeHeader}>
        <h1 className={styles.scopeTitle}>The Scope</h1>
        <p className={styles.scopeSub}>What we will do together</p>
      </header>

      <div className={styles.scopeGrid}>
        {SCOPE_STEPS.map((step) => (
          <article
            key={step.num}
            className={`${styles.scopeCard} ${styles[`scopeAccent_${step.accent}`]}`}
          >
            <div className={styles.scopeCardTop}>
              <p className={styles.scopeCardNum}>{step.num}</p>
              <h2 className={styles.scopeCardTitle}>
                {step.titleLines.map((line) => (
                  <span key={line} className={styles.scopeCardTitleLine}>
                    {line}
                  </span>
                ))}
              </h2>
            </div>
            <p className={styles.scopeCardBody}>{step.body}</p>
            <div className={styles.scopeDeliverables}>
              <p className={styles.scopeDeliverablesLabel}>Deliverables</p>
              <ul className={styles.scopeDeliverablesList}>
                {step.deliverables.map((item) => (
                  <li key={item.text} className={styles.scopeDeliverableItem}>
                    <span>{item.text}</span>
                    {item.children ? (
                      <ul className={styles.scopeDeliverablesSublist}>
                        {item.children.map((child) => (
                          <li key={child}>{child}</li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>

      <div className={styles.scopeInvestment}>
        <p className={styles.scopeInvestmentLabel}>
          Project investment · Total for all four steps
        </p>
        <p className={styles.scopeInvestmentValue}>$4,850</p>
      </div>
    </div>
  );
}

function TimelineSlide() {
  return (
    <div className={styles.timeline}>
      <DeckCloudMark />
      <header className={styles.timelineHeader}>
        <h1 className={styles.timelineTitle}>The Timeline</h1>
        <p className={styles.timelineSub}>About eight weeks, end to end</p>
        <p className={styles.timelineNote}>
          Four phases · two weeks each — exact dates lock once we kick off
          together.
        </p>
      </header>

      <div className={styles.timelineMonth}>
        <div className={styles.timelineMonthHead} aria-hidden="true">
          <span className={styles.timelineMonthCorner} />
          {CALENDAR_DAYS.map((day, i) => (
            <span key={`month-day-${day}-${i}`} className={styles.timelineMonthDay}>
              {day}
            </span>
          ))}
        </div>

        <ol className={styles.timelineMonthBody}>
          {TIMELINE_WEEKS.map((week) => (
            <li
              key={week.label}
              className={`${styles.timelineMonthWeek} ${styles[`timelineMonthWeek_${week.accent}`]} ${
                week.phaseStart ? styles.timelineMonthWeekStart : styles.timelineMonthWeekContinue
              }`}
            >
              <p className={styles.timelineMonthWeekLabel}>{week.label}</p>
              <div className={styles.timelineMonthWeekGrid}>
                {CALENDAR_DAYS.map((day, i) =>
                  i === 0 ? (
                    <div
                      key={`${week.label}-mon`}
                      className={styles.timelineMonthEvent}
                    >
                      <h2 className={styles.timelineMonthEventTitle}>{week.title}</h2>
                      <p className={styles.timelineMonthEventFocus}>
                        {week.phaseStart ? week.focus : "Continues"}
                      </p>
                    </div>
                  ) : (
                    <span
                      key={`${week.label}-cell-${day}-${i}`}
                      className={styles.timelineMonthCell}
                      aria-hidden="true"
                    >
                      <span className={styles.timelineMonthDot} />
                    </span>
                  )
                )}
              </div>
            </li>
          ))}
        </ol>
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
          <SlideFrame>
            <CoverSlide />
          </SlideFrame>
        </section>

        <section
          id="slide-2"
          className={styles.slideViewport}
          ref={(el) => {
            slideRefs.current[1] = el;
          }}
          aria-label="Slide 2: The opportunity"
        >
          <SlideFrame>
            <OpportunitySlide />
          </SlideFrame>
        </section>

        <section
          id="slide-3"
          className={styles.slideViewport}
          ref={(el) => {
            slideRefs.current[2] = el;
          }}
          aria-label="Slide 3: Four connected steps"
        >
          <SlideFrame>
            <WorkSlide />
          </SlideFrame>
        </section>

        <section
          id="slide-4"
          className={styles.slideViewport}
          ref={(el) => {
            slideRefs.current[3] = el;
          }}
          aria-label="Slide 4: About two weeks"
        >
          <SlideFrame>
            <TimelineSlide />
          </SlideFrame>
        </section>

        <section
          id="slide-5"
          className={styles.slideViewport}
          ref={(el) => {
            slideRefs.current[4] = el;
          }}
          aria-label="Slide 5: Scope of work + investment"
        >
          <SlideFrame>
            <ScopeSlide />
          </SlideFrame>
        </section>

        <section
          id="slide-6"
          className={styles.slideViewport}
          ref={(el) => {
            slideRefs.current[5] = el;
          }}
          aria-label="Slide 6: Ready when you are"
        >
          <SlideFrame>
            <NextStepsSlide />
          </SlideFrame>
        </section>
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

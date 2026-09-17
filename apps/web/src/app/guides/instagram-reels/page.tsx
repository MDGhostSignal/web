"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";

import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
import { Container, Section } from "@/components/layout";
import { ScrollFadeUp } from "@/motion/ScrollFadeUp";
import { SplitLinesReveal } from "@/motion/SplitLinesReveal";
import { navLinks } from "@/lib/nav";

import styles from "./page.module.css";

type Step = {
  id: string;
  number: string;
  title: string;
  shortLabel: string;
  summary: string;
  what: string;
  why: string;
  how: string[];
};

const steps: Step[] = [
  {
    id: "hook",
    number: "01",
    title: "Nail the first 1–3 seconds",
    shortLabel: "Hook",
    summary: "Win the scroll or lose the Reel.",
    what: "Open with a pattern interrupt — motion, a bold claim, a result, or a specific problem — not a logo or “hey guys.”",
    why: "Viewers decide whether to stay in roughly the first 1–3 seconds. Instagram seeds each Reel to a small first audience; early skips stall distribution.",
    how: [
      "Put the promise on screen in second 0–1 (spoken + bold on-screen text).",
      "Start mid-action: already talking, hand entering frame, before/after flash, or a number that demands explanation.",
      "Write 2–3 alternate hooks and pick the strongest — never lead with branding or slow context.",
      "Design the hook to work with sound off; text must carry the promise alone.",
    ],
  },
  {
    id: "structure",
    number: "02",
    title: "Use a fixed Reel spine",
    shortLabel: "Structure",
    summary: "Hook → value beats → payoff → one CTA.",
    what: "Build every Reel on the same spine: stop the scroll, deliver 2–3 clear value beats, land the payoff, then ask for one action.",
    why: "Most Reels fail in the middle from dead air or meandering. Retention and completion drive reach; a clear structure keeps watch time high.",
    how: [
      "0–3s: Hook (problem, promise, or result-first).",
      "Middle: 2–3 short beats — one idea and one visual change every few seconds.",
      "Near end: Proof or a concrete example.",
      "Last 2–3s: A single CTA. One idea per Reel — if it doesn’t fit, split it.",
    ],
  },
  {
    id: "length",
    number: "03",
    title: "Match length to the job",
    shortLabel: "Length",
    summary: "Shortest cut that fully delivers the point.",
    what: "Choose duration by intent — not a single magic number — and cut anything that doesn’t earn the next second of watch time.",
    why: "The algorithm rewards completion, replays, and total watch time — not raw length. Wrong length causes mid-video drop-off and weaker distribution.",
    how: [
      "Reach / quick tip: about 7–15 seconds.",
      "Brand story / product punch: about 15–30 seconds.",
      "Tutorial / education / conversion with proof: about 30–60 seconds.",
      "Shoot vertical 9:16 (1080×1920). Do not crop horizontal footage into the frame.",
    ],
  },
  {
    id: "audio-text",
    number: "04",
    title: "Design for sound-off first",
    shortLabel: "Sound-off",
    summary: "Text carries the story; audio supports it.",
    what: "Make the story readable with captions and on-screen text first, then layer voiceover and audio that supports the message.",
    why: "A large share of viewers start muted. On-screen text also helps Instagram categorize the Reel for the right audience.",
    how: [
      "Add native Instagram captions/subtitles for accessibility and retention.",
      "Keep on-screen text large, high-contrast, and synced to what you say.",
      "Prefer original voiceover plus a relevant track over random viral sounds.",
      "Never rely on audio alone for the hook or the CTA.",
    ],
  },
  {
    id: "caption",
    number: "05",
    title: "Write the caption for keywords",
    shortLabel: "Caption",
    summary: "Front-load the topic. One ask. Few tags.",
    what: "Lead the caption with the topic/keyword and a reason to engage. Keep Reels captions short. End with one CTA. Use a few niche hashtags — not a dump.",
    why: "Hashtags are a minor categorization tool now. Caption keywords, on-screen text, and early engagement matter more for discovery.",
    how: [
      "Line 1: keyword + hook (example: “3 Reels mistakes killing your reach”).",
      "Keep it to 2–4 short sentences; put extra detail below a line break if needed.",
      "One CTA only: Save this, Send to a teammate, or Comment [KEYWORD] for a resource.",
      "Use 3–5 niche hashtags. Choose a clear, readable cover frame for the grid.",
    ],
  },
  {
    id: "timing",
    number: "06",
    title: "Post when people are actually online",
    shortLabel: "Timing",
    summary: "Audience Insights beat generic clocks.",
    what: "Publish when followers are active so the first 30–60 minutes get real engagement, and ship 3–4 Reels per week consistently.",
    why: "Early engagement helps Instagram decide whether to expand reach. Consistency beats sporadic bursts — the system learns your niche from a steady stream.",
    how: [
      "Starting windows (audience local time): roughly 7–9 AM, 11 AM–1 PM, and 7–9 PM.",
      "After 2–4 weeks, use Insights → Audience → Most active times and post into your peaks.",
      "Cadence target: 3–4 Reels per week. Quality held constant beats daily burnout posting.",
      "Batch film when you can. Stay available for the first hour to reply to comments.",
    ],
  },
  {
    id: "cta-measure",
    number: "07",
    title: "One CTA, then learn from Insights",
    shortLabel: "CTA",
    summary: "Ask once. Measure watch time and shares.",
    what: "End every Reel with a single, specific next step. Then review Insights and fix the weakest step next time.",
    why: "Attention without a next step wastes reach. Multiple CTAs confuse viewers. The right metrics tell you whether the hook, middle, or ask failed.",
    how: [
      "Prefer one of: save, share/send, follow for [topic], or comment-keyword → DM resource.",
      "Place the CTA verbally in the last 2–3 seconds and as on-screen text.",
      "Reply to comments quickly after publish; pin a useful reply when it helps.",
      "Weekly: double down on formats with the best watch time, completion, saves, and shares.",
    ],
  },
];

const STORAGE_KEY = "gs-reels-guide-checks-v1";

type CheckMap = Record<string, boolean>;

function actionKey(stepId: string, index: number) {
  return `${stepId}:${index}`;
}

const checkListeners = new Set<() => void>();
const EMPTY_CHECKS: CheckMap = {};
let cachedChecksRaw: string | null = null;
let cachedChecks: CheckMap = EMPTY_CHECKS;

function subscribeChecks(cb: () => void) {
  checkListeners.add(cb);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cachedChecksRaw = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    checkListeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function getChecksSnapshot(): CheckMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? "";
    if (raw === cachedChecksRaw) return cachedChecks;
    cachedChecksRaw = raw;
    if (!raw) {
      cachedChecks = EMPTY_CHECKS;
      return cachedChecks;
    }
    const parsed = JSON.parse(raw) as CheckMap;
    cachedChecks = parsed && typeof parsed === "object" ? parsed : EMPTY_CHECKS;
    return cachedChecks;
  } catch {
    return cachedChecks;
  }
}

function getChecksServerSnapshot(): CheckMap {
  return EMPTY_CHECKS;
}

function writeChecks(next: CheckMap) {
  const raw = JSON.stringify(next);
  cachedChecksRaw = raw;
  cachedChecks = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // private mode / quota — still notify so the UI updates in-session
  }
  for (const cb of checkListeners) cb();
}

export default function InstagramReelsGuidePage() {
  const [openStepId, setOpenStepId] = useState<string | null>(null);
  const checks = useSyncExternalStore(
    subscribeChecks,
    getChecksSnapshot,
    getChecksServerSnapshot,
  );
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastTileRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();

  const openStep = useMemo(
    () => steps.find((step) => step.id === openStepId) ?? null,
    [openStepId],
  );

  const closeModal = useCallback(() => {
    setOpenStepId(null);
    lastTileRef.current?.focus();
  }, []);

  const openModal = useCallback((stepId: string, tile: HTMLButtonElement) => {
    lastTileRef.current = tile;
    setOpenStepId(stepId);
  }, []);

  useEffect(() => {
    if (!openStep) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [openStep, closeModal]);

  function toggleCheck(stepId: string, index: number) {
    const key = actionKey(stepId, index);
    writeChecks({ ...checks, [key]: !checks[key] });
  }

  function stepProgress(step: Step) {
    const done = step.how.filter((_, index) => checks[actionKey(step.id, index)]).length;
    return { done, total: step.how.length };
  }

  function onTileKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % steps.length
        : (index - 1 + steps.length) % steps.length;
    const buttons = event.currentTarget.parentElement?.parentElement?.querySelectorAll<HTMLButtonElement>(
      'button[data-step-tile="true"]',
    );
    buttons?.[next]?.focus();
  }

  return (
    <main className={styles.page}>
      <SiteHeader links={navLinks} />
      <div className={styles.staticOverlay} aria-hidden="true" />

      <Section className={styles.heroSection}>
        <div className={styles.heroRays} aria-hidden="true">
          <span className={`${styles.heroRay} ${styles.heroRayA}`} />
          <span className={`${styles.heroRay} ${styles.heroRayB}`} />
          <span className={`${styles.heroRay} ${styles.heroRayC}`} />
          <span className={`${styles.heroRay} ${styles.heroRayD}`} />
        </div>
        <Container className={styles.hero}>
          <ScrollFadeUp duration={1.3} distance={16}>
            <p className={styles.eyebrow}>Partner playbook</p>
          </ScrollFadeUp>

          <h1 className={styles.headline}>
            <SplitLinesReveal duration={2}>
              <span className={styles.headlineLine}>Instagram Reels</span>
            </SplitLinesReveal>
            <SplitLinesReveal duration={2} delay={0.2}>
              <span className={`${styles.headlineLine} ${styles.headlineAccent}`}>
                basics
              </span>
            </SplitLinesReveal>
          </h1>

          <ScrollFadeUp duration={1.5} delay={0.35}>
            <p className={styles.lead}>
              <span className={styles.leadLine}>
                You do not need to be a social media expert.
              </span>
              <span className={styles.leadLine}>
                You just need to avoid the big mistakes.
              </span>
            </p>
          </ScrollFadeUp>

          <ScrollFadeUp duration={1.4} delay={0.5}>
            <div className={styles.heroMeta}>
              <span className={styles.metaPill}>7 steps</span>
              <a className={styles.heroJumpCta} href="#steps">
                Open the checklist
                <span aria-hidden="true">↓</span>
              </a>
            </div>
          </ScrollFadeUp>
        </Container>
      </Section>

      <Section className={styles.boardSection} id="steps">
        <Container className={styles.board}>
          <ScrollFadeUp duration={1.2}>
            <header className={styles.boardHeader}>
              <p className={styles.contextEyebrow}>Seven steps</p>
              <h2 className={styles.boardTitle}>Click a tile to work the checklist</h2>
              <p className={styles.boardLead}>
                Each step opens a popup with What, Why, and checkable How
                actions. Progress stays on this device.
              </p>
            </header>
          </ScrollFadeUp>

          <ScrollFadeUp duration={1.2} delay={0.08}>
            <ol className={styles.tileRow} aria-label="Instagram Reels checklist steps">
              {steps.map((step, index) => {
                const { done, total } = stepProgress(step);
                const complete = done === total && total > 0;
                return (
                  <li key={step.id} className={styles.tileItem}>
                    <button
                      type="button"
                      data-step-tile="true"
                      className={`${styles.tile} ${complete ? styles.tileComplete : ""}`}
                      onClick={(event) => openModal(step.id, event.currentTarget)}
                      onKeyDown={(event) => onTileKeyDown(event, index)}
                      aria-haspopup="dialog"
                    >
                      <span className={styles.tileNumber}>{step.number}</span>
                      <span className={styles.tileLabel}>{step.shortLabel}</span>
                      <span className={styles.tileSummary}>{step.summary}</span>
                      <span className={styles.tileProgress}>
                        {done}/{total}
                      </span>
                      <span className={styles.tileHint}>Open</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </ScrollFadeUp>
        </Container>
      </Section>

      <Footer />

      {openStep ? (
        <div
          className={styles.modalRoot}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <header className={styles.modalHeader}>
              <div className={styles.modalHeading}>
                <p className={styles.modalNumber}>{openStep.number}</p>
                <div>
                  <p className={styles.modalEyebrow}>{openStep.shortLabel}</p>
                  <h2 id={titleId} className={styles.modalTitle}>
                    {openStep.title}
                  </h2>
                  <p className={styles.modalSummary}>{openStep.summary}</p>
                </div>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className={styles.modalClose}
                onClick={closeModal}
                aria-label="Close step"
              >
                ×
              </button>
            </header>

            <div className={styles.modalBody}>
              <section className={styles.modalBlock}>
                <h3 className={styles.modalBlockLabel}>What</h3>
                <p className={styles.modalBlockText}>{openStep.what}</p>
              </section>

              <section className={styles.modalBlock}>
                <h3 className={styles.modalBlockLabel}>Why</h3>
                <p className={styles.modalBlockText}>{openStep.why}</p>
              </section>

              <section className={`${styles.modalBlock} ${styles.modalBlockHow}`}>
                <div className={styles.modalHowHeader}>
                  <h3 className={styles.modalBlockLabel}>How — check as you go</h3>
                  <p className={styles.modalHowCount}>
                    {
                      openStep.how.filter(
                        (_, index) => checks[actionKey(openStep.id, index)],
                      ).length
                    }
                    /{openStep.how.length} done
                  </p>
                </div>
                <ul className={styles.checkList}>
                  {openStep.how.map((item, index) => {
                    const key = actionKey(openStep.id, index);
                    const checked = Boolean(checks[key]);
                    const inputId = `${openStep.id}-action-${index}`;
                    return (
                      <li key={key}>
                        <label
                          htmlFor={inputId}
                          className={`${styles.checkItem} ${
                            checked ? styles.checkItemDone : ""
                          }`}
                        >
                          <input
                            id={inputId}
                            type="checkbox"
                            className={styles.checkInput}
                            checked={checked}
                            onChange={() => toggleCheck(openStep.id, index)}
                          />
                          <span className={styles.checkBox} aria-hidden="true" />
                          <span className={styles.checkText}>{item}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>

            <footer className={styles.modalFooter}>
              <button type="button" className={styles.modalDone} onClick={closeModal}>
                Done
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </main>
  );
}

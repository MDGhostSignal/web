"use client";

import Image from "next/image";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import styles from "./migration.module.css";

/**
 * Three chapters, in this order:
 *
 * 1. The video guide — watch first.
 * 2. The four-step move checklist (same 4-up board the video shows).
 * 3. Once you've moved in: publishing on ART19 (three screenshots).
 *
 * The 4-column board stays: that's the map in the video. It no longer
 * fills the viewport, so chapter 3 isn't trapped below a full-screen
 * board. Checkmarks persist in localStorage.
 */

type StepItem = {
  /** Stable id for localStorage — never renumber existing ids. */
  id: string;
  text: React.ReactNode;
};

type Step = {
  n: number;
  title: string;
  timing: string[];
  lede: string;
  big?: boolean;
  items: StepItem[];
  note?: string;
};

const STEPS: Step[] = [
  {
    n: 1,
    title: "Pre-move Cataloging",
    timing: ["Your time: 30–60 min"],
    lede: "Before the move, we preserve the story so far.",
    items: [
      {
        id: "1-analytics",
        text: (
          <>
            <strong>Download your historical analytics</strong> from your
            current host. These stats are part of your story — they don&apos;t
            transfer between platforms.
          </>
        ),
      },
      {
        id: "1-ads-off",
        text: (
          <>
            Running dynamic ads? <strong>Turn them off</strong>, or provide an
            ad-free feed, so old &ldquo;static&rdquo; isn&apos;t baked into
            your clean migration.
          </>
        ),
      },
      {
        id: "1-players",
        text: (
          <>
            <strong>Note down where your embedded players live</strong> (your
            website, newsletters, …) — you&apos;ll replace them with ART19
            players later.
          </>
        ),
      },
    ],
    note: "FYI: ART19 measures with the IAB v2.2 industry standard. Slight variations in numbers are normal when switching platforms, and typically settle.",
  },
  {
    n: 2,
    title: "Keys To New Gallery",
    timing: ["Your time: ~30 min", "Import completes in: 24–72 h"],
    lede: "We bring your show into the GHOSTSignal network, hosted on ART19.",
    items: [
      {
        id: "2-rss",
        text: (
          <>
            <strong>Send your RSS feed URL to the team.</strong> We import the
            show and invite you to your new ART19 profile.
          </>
        ),
      },
      {
        id: "2-review",
        text: (
          <>
            <strong>Review your imported episodes</strong> — show notes,
            formatting, and episode numbering should all look right.
          </>
        ),
      },
      {
        id: "2-aips",
        text: (
          <>
            If you ran dynamic ads, <strong>bulk-import your Ad Insertion
            Points</strong> (AIPs).
          </>
        ),
      },
    ],
  },
  {
    n: 3,
    title: "Changing Addresses",
    timing: ["Your time: ~15 min", "Apps learn the address in: 24–72 h"],
    lede: "The big step — your existing feed starts pointing to its new address.",
    big: true,
    items: [
      {
        id: "3-episodes",
        text: (
          <>
            <strong>Confirm every episode is present.</strong> Published a new
            one during the import? Tell us so we can refresh.
          </>
        ),
      },
      {
        id: "3-active",
        text: (
          <>
            Make sure your <strong>ART19 profile is set to active</strong>.
          </>
        ),
      },
      {
        id: "3-redirect",
        text: (
          <>
            <strong>Set a permanent &ldquo;301 redirect&rdquo;</strong> on your
            old host, pointing directly to your new ART19 RSS feed. Do it a few
            days before your next episode release — that gives you space to
            breathe and get familiar with the system before a hard deadline.
          </>
        ),
      },
    ],
  },
  {
    n: 4,
    title: "Opening Day",
    timing: ["Allow 24 h for full signal fidelity"],
    lede: "Once your address is changed, your new home is with GHOSTSignal on ART19!",
    items: [
      {
        id: "4-apps",
        text: (
          <>
            Give listening apps (Apple, Spotify, …) <strong>up to 24
            hours</strong> to catch the new signal, then check your show in
            each once your first new episode goes live.
          </>
        ),
      },
      {
        id: "4-players",
        text: (
          <>
            <strong>Replace your old embeddable web players</strong> with the
            new ART19 embedded players.
          </>
        ),
      },
      {
        id: "4-cancel",
        text: (
          <>
            Only once everything works perfectly and your players are updated:{" "}
            <strong>cancel your old hosting account</strong>.
          </>
        ),
      },
    ],
  },
];

/** The ART19 platform tutorial — publishing in three screens.
 *  Screenshots are real platform captures (GHOSTSignal Test Series);
 *  width/height are each file's true pixel size so the frames keep
 *  the right aspect ratio before the image loads. */
const TUTORIAL_STEPS: Array<{
  n: number;
  title: string;
  body: React.ReactNode;
  image: string;
  width: number;
  height: number;
  alt: string;
}> = [
  {
    n: 1,
    title: "Log in",
    body: (
      <>
        From the platform landing page, hit{" "}
        <strong>&ldquo;New Episode&rdquo;</strong> in the top-right corner.
      </>
    ),
    image: "/images/studio/art19-tutorial/step-1-login.webp",
    width: 1801,
    height: 911,
    alt: "ART19 Content dashboard after login, with the New Episode button in the top-right corner.",
  },
  {
    n: 2,
    title: "Publish your episode",
    body: (
      <>
        <strong>Upload your audio file</strong>, give the episode its name,
        fill in the details — and publish.
      </>
    ),
    image: "/images/studio/art19-tutorial/step-2-publish.webp",
    width: 1804,
    height: 911,
    alt: "ART19 New Episode form with the audio upload dropzone and the title and description fields.",
  },
  {
    n: 3,
    title: "Insert ad markers",
    body: (
      <>
        Insert <strong>6 markers</strong>: 2 pre-roll at the beginning, 2
        mid-roll at a convenient break, and 2 post-roll at the end.{" "}
        (We insert the pre &amp; post roll ad markers as default, you
        place 2 mid roll markers of 120s each at a natural break in the
        episode).
      </>
    ),
    image: "/images/studio/art19-tutorial/step-3-ad-markers.webp",
    width: 1107,
    height: 907,
    alt: "ART19 Audio & Ad Insertion editor with the episode waveform and pre-roll, mid-roll, and post-roll markers.",
  },
];

const STORAGE_KEY = "studio-art19-migration-v1";
const CHANGE_EVENT = "studio-migration-checks";
const TOTAL_ITEMS = STEPS.reduce((sum, s) => sum + s.items.length, 0);

/* localStorage as an external store (useSyncExternalStore) — the
 * checklist state lives in storage itself, so it survives reloads,
 * stays hydration-safe (server snapshot = empty), and even syncs
 * across two open tabs via the native `storage` event. */
function subscribeToChecks(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function getChecksSnapshot(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function getChecksServerSnapshot(): string {
  return "[]";
}

function ExplainerPlayer() {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const play = useCallback(() => {
    void ref.current?.play();
  }, []);

  return (
    <div className={styles.playerShell}>
      <video
        ref={ref}
        className={styles.player}
        controls
        playsInline
        preload="metadata"
        poster="/videos/art19-explainer-poster.jpg"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      >
        <source src="/videos/art19-explainer.mp4" type="video/mp4" />
        <track
          kind="captions"
          src="/videos/art19-explainer.vtt"
          srcLang="en"
          label="English"
        />
      </video>
      {!playing ? (
        <button
          type="button"
          className={styles.playButton}
          onClick={play}
          aria-label="Play video"
        >
          <span className={styles.playIcon} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

export function MigrationGuide({ firstName }: { firstName: string | null }) {
  const rawChecked = useSyncExternalStore(
    subscribeToChecks,
    getChecksSnapshot,
    getChecksServerSnapshot,
  );
  const checked = useMemo(() => {
    try {
      return new Set(JSON.parse(rawChecked) as string[]);
    } catch {
      return new Set<string>();
    }
  }, [rawChecked]);

  const toggle = useCallback(
    (id: string) => {
      const next = new Set(checked);
      if (!next.delete(id)) next.add(id);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
        window.dispatchEvent(new Event(CHANGE_EVENT));
      } catch {
        // Storage unavailable (private mode) — the guide still reads
        // fine, checkmarks just won't stick.
      }
    },
    [checked],
  );

  const doneCount = checked.size;

  return (
    <div className={styles.guide}>
      <nav className={styles.chapters} aria-label="On this page">
        <a className={styles.chapter} href="#watch">
          <span className={styles.chapterNum}>1</span>
          <span className={styles.chapterText}>
            <span className={styles.chapterLabel}>Watch</span>
            <span className={styles.chapterName}>Video guide</span>
          </span>
        </a>
        <a className={styles.chapter} href="#move">
          <span className={styles.chapterNum}>2</span>
          <span className={styles.chapterText}>
            <span className={styles.chapterLabel}>Move</span>
            <span className={styles.chapterName}>Checklist to ART19</span>
          </span>
        </a>
        <a className={styles.chapter} href="#publish">
          <span className={styles.chapterNum}>3</span>
          <span className={styles.chapterText}>
            <span className={styles.chapterLabel}>Then</span>
            <span className={styles.chapterName}>Once you&apos;ve moved in</span>
          </span>
        </a>
      </nav>

      <section
        id="watch"
        className={styles.watch}
        aria-labelledby="art19-watch-title"
      >
        <div className={styles.watchCopy}>
          <p className={styles.eyebrow}>1 · Video guide</p>
          <h1 id="art19-watch-title" className={styles.title}>
            Moving your show to ART19{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className={styles.lede}>
            Start here. Two and a half minutes — then use the checklist
            on this page to tick the move off, and the publishing
            screens further down once you&apos;re in.
          </p>
        </div>
        <div className={styles.watchStage}>
          <ExplainerPlayer />
          <ol className={styles.watchToc} aria-label="What follows the video">
            <li>
              <a href="#move">
                <span className={styles.watchTocNum}>2</span>
                <strong>Move your show</strong>
                <span>Migration checklist</span>
              </a>
            </li>
            <li>
              <a href="#publish">
                <span className={styles.watchTocNum}>3</span>
                <strong>How to publish</strong>
                <span>Once you&apos;ve moved in — three screens</span>
              </a>
            </li>
          </ol>
        </div>
      </section>

      <section
        id="move"
        className={styles.move}
        aria-labelledby="art19-move-title"
      >
      <header className={styles.intro}>
        <div className={styles.introText}>
          <p className={styles.eyebrow}>2 · Move your show</p>
          <h2 id="art19-move-title" className={styles.title}>
            Checklist: moving you to ART19.
          </h2>
          <p className={styles.lede}>
            Same four steps as the video. Keep this tab open next to
            your current host and tick things off as you go —
            checkmarks save on this device.
          </p>
        </div>

        <div className={styles.sideCards}>
          <div className={styles.progressCard} aria-live="polite">
            <span className={styles.progressCount}>
              {doneCount}
              <span className={styles.progressTotal}>/{TOTAL_ITEMS}</span>
            </span>
            <span className={styles.progressLabel}>
              {doneCount === 0
                ? "steps to your new home"
                : doneCount === TOTAL_ITEMS
                  ? "all done — welcome home 🎉"
                  : "checked off"}
            </span>
            <div
              className={styles.progressBar}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={TOTAL_ITEMS}
              aria-valuenow={doneCount}
            >
              <div
                className={styles.progressFill}
                style={{ width: `${(doneCount / TOTAL_ITEMS) * 100}%` }}
              />
            </div>
          </div>

          <div className={styles.helpCard}>
            <span className={styles.helpTitle}>Stuck at any step?</span>
            <p className={styles.helpBody}>
              A human from the team walks you through it — or does the fiddly
              bits with you.
            </p>
            <a className={styles.helpCta} href="mailto:hello@ghostsignal.cloud">
              Email the team
            </a>
          </div>
        </div>
      </header>

      {/* --- The four steps, side by side ------------------------- */}
      <ol className={styles.steps}>
        {STEPS.map((step) => {
          const stepDone = step.items.every((i) => checked.has(i.id));
          return (
            <li
              key={step.n}
              className={styles.step}
              data-done={stepDone ? "true" : "false"}
            >
              <div className={styles.stepHead}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {step.n}
                </span>
                <div className={styles.stepHeadText}>
                  <h2 className={styles.stepTitle}>
                    {step.title}
                    {stepDone && (
                      <span className={styles.stepDoneMark} aria-label="Step complete">
                        ✓
                      </span>
                    )}
                  </h2>
                  <div className={styles.stepTiming}>
                    {step.timing.map((t) => (
                      <span key={t} className={styles.timeChip}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <p className={step.big ? styles.stepLedeBig : styles.stepLede}>
                {step.lede}
              </p>

              <ul className={styles.checklist}>
                {step.items.map((item) => {
                  const isChecked = checked.has(item.id);
                  return (
                    <li key={item.id}>
                      <label
                        className={`${styles.check} ${isChecked ? styles.checkDone : ""}`}
                      >
                        <input
                          type="checkbox"
                          className={styles.checkInput}
                          checked={isChecked}
                          onChange={() => toggle(item.id)}
                        />
                        <span className={styles.checkBox} aria-hidden="true">
                          {isChecked ? "✓" : ""}
                        </span>
                        <span className={styles.checkText}>{item.text}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>

              {step.note && <p className={styles.stepNote}>{step.note}</p>}
            </li>
          );
        })}
      </ol>

      <a className={styles.nextChapter} href="#publish">
        <span className={styles.nextChapterKicker}>Still on this page</span>
        <span className={styles.nextChapterTitle}>
          Next: once you&apos;ve moved in — publishing on ART19
        </span>
        <span className={styles.nextChapterHint}>
          Three real screens. Jump here when the move above is done.
        </span>
      </a>
      </section>

      {/* --- Part 3: the platform tutorial ------------------------ */}
      <section
        id="publish"
        className={styles.tutorial}
        aria-labelledby="art19-tutorial-title"
      >
        <header className={styles.tutorialHead}>
          <p className={styles.eyebrow}>3 · Once you&apos;ve moved in</p>
          <h2 id="art19-tutorial-title" className={styles.tutorialTitle}>
            Publishing on ART19.
          </h2>
          <p className={styles.lede}>
            The whole routine is three screens. These are actual screenshots
            from the platform, so you know exactly where to click.
          </p>
        </header>

        <ol className={styles.tutorialSteps}>
          {TUTORIAL_STEPS.map((step) => (
            <li key={step.n} className={styles.tutorialStep}>
              <div className={styles.tutorialStepText}>
                <span className={styles.tutorialStepNumber} aria-hidden="true">
                  {step.n}
                </span>
                <h3 className={styles.tutorialStepTitle}>{step.title}</h3>
                <p className={styles.tutorialStepBody}>{step.body}</p>
              </div>
              <figure className={styles.tutorialShot}>
                <Image
                  src={step.image}
                  alt={step.alt}
                  width={step.width}
                  height={step.height}
                  className={styles.tutorialShotImg}
                  sizes="(max-width: 900px) 100vw, 780px"
                />
              </figure>
            </li>
          ))}
        </ol>

        <p className={styles.tutorialOutro}>
          And that&apos;s good to go — <strong>we handle everything else.</strong>
        </p>
      </section>
    </div>
  );
}

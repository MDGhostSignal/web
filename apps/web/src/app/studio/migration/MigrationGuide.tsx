"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";

import styles from "./migration.module.css";

/**
 * Two chapters, in this order:
 *
 * 1. The two-step move checklist (Pre-Move Cataloging, then Making
 *    the Switch). Checkmarks persist in localStorage.
 * 2. Inserting ad markers on ART19 — select the episode, then place
 *    two 120s mid-rolls.
 */

type StepItem = {
  /** Stable id for localStorage — never renumber existing ids. */
  id: string;
  text: React.ReactNode;
  /** Visual heading rendered immediately before this item. */
  groupLabel?: string;
  afterNote?: string;
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
    title: "Pre-Move Cataloging",
    timing: ["Your Time: 30–60 Mins", "Import Time: 24–48 Hrs"],
    lede: "Preserving the story so far, and importing your show to ART19",
    items: [
      {
        id: "1-analytics",
        text: (
          <>
            <strong>Download your historical analytics</strong> from your
            current host. These stats are part of your story and they
            don&apos;t transfer between platforms.
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
      {
        id: "1-rss",
        text: (
          <>
            <strong>Send your RSS feed URL to the team</strong> (using the{" "}
            <Link href="/studio/profile" onClick={(e) => e.stopPropagation()}>
              text box on this platform
            </Link>
            ).
          </>
        ),
      },
    ],
  },
  {
    n: 2,
    title: "Making the Switch",
    timing: ["Your Time: 30–60 Mins", "Signal Refresh: 24–48 Hrs"],
    lede: "The Big Step! Changing your address to the new ART19 RSS Feed URL",
    items: [
      {
        id: "2-review",
        text: (
          <>
            You should have received a login from ART19 —{" "}
            <strong>review how it&apos;s looking</strong> — formatting and
            episode numbering should all look right. Your show is still
            active on your old platform, pending the &lsquo;redirect&rsquo;
            below. There&apos;s no rush to make the full switch.
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
      {
        id: "2-active",
        groupLabel: "When you are ready:",
        text: (
          <>
            Make sure your ART19 series is{" "}
            <strong>&ldquo;Active&rdquo;</strong> (found at: Content &gt;
            Series &gt; Settings &gt; &ldquo;Series Active&rdquo;).
          </>
        ),
      },
      {
        id: "2-redirect",
        text: (
          <>
            Set a permanent <strong>&ldquo;301 redirect&rdquo;</strong> on
            your old host, pointing directly to your new ART19 RSS (found
            at: Content &gt; Series &gt; Settings).
          </>
        ),
        afterNote:
          "Do this a few days before your next episode release — that gives you space to breathe and get familiar with the system before your episode deadline.",
      },
      {
        id: "2-apps",
        text: (
          <>
            When you publish a new episode, give listening apps (Apple,
            Spotify, …) <strong>up to 24 hours</strong> to catch the new
            signal, then check the ep in each one once your episode goes
            live.
          </>
        ),
      },
      {
        id: "2-players",
        text: (
          <>
            <strong>Replace your old embeddable web players</strong> with
            the new ART19 embedded players.
          </>
        ),
      },
      {
        id: "2-cancel",
        text: (
          <>
            Only once everything works perfectly and your players are
            updated: <strong>cancel your old hosting account</strong>.
          </>
        ),
      },
    ],
    note: "ART19 measures with the IAB v2.2 industry standard. Slight variations in numbers are normal when switching platforms, and typically settle.",
  },
];

type TutorialShot = {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption?: string;
};

type TutorialPath = {
  label: string;
  body: React.ReactNode;
  image: string;
  width: number;
  height: number;
  alt: string;
};

type TutorialStep = {
  n: number;
  title: string;
  body?: React.ReactNode;
  reminder?: string;
  images?: TutorialShot[];
  paths?: TutorialPath[];
};

/** Ad-marker tutorial — two steps. Screenshots are real platform
 *  captures (GHOSTSignal Test Series); width/height are each file's
 *  true pixel size so the frames keep the right aspect ratio. */
const TUTORIAL_STEPS: TutorialStep[] = [
  {
    n: 1,
    title: "Select Episode",
    paths: [
      {
        label: "New Ep",
        body: (
          <>
            If a new episode, click <strong>&ldquo;New Episode&rdquo;</strong>{" "}
            in the top-right corner and upload the file.
          </>
        ),
        image: "/images/studio/art19-tutorial/step-1-new-ep.webp",
        width: 828,
        height: 419,
        alt: "ART19 Content dashboard with the New Episode button in the top-right corner.",
      },
      {
        label: "Existing Ep",
        body: (
          <>
            If an existing episode, click{" "}
            <strong>&lsquo;Episodes&rsquo;</strong> in the left column,
            select the episode, and click <strong>&lsquo;edit&rsquo;</strong>{" "}
            in the top-right corner.
          </>
        ),
        image: "/images/studio/art19-tutorial/step-1-existing-ep.webp",
        width: 1899,
        height: 931,
        alt: "An existing ART19 episode open, with Edit in the top-right corner and Episodes in the left column.",
      },
    ],
  },
  {
    n: 2,
    title: "Insert Marker",
    body: (
      <>
        Insert <strong>2 × mid-rolls, 120 seconds</strong> at a natural
        break in the episode (you can drag the green tab, pictured).
        Please do this for all recent episodes, and any further back that
        get regular listens!
      </>
    ),
    reminder:
      "These ad markers aren't necessarily all filled, but are potential places that ads could go. We add pre & post roll markers as default (these don't need discernment in placing in the same way).",
    images: [
      {
        src: "/images/studio/art19-tutorial/step-2-green-tab.webp",
        width: 957,
        height: 555,
        alt: "ART19 Audio & Ad Insertion waveform with the green marker tab on the timeline.",
        caption: "Drag the green tab to a natural break, then New Marker.",
      },
      {
        src: "/images/studio/art19-tutorial/step-2-midroll.webp",
        width: 932,
        height: 514,
        alt: "ART19 Mid-Roll marker settings with AIP Type set to Mid-Roll and Maximum Total Time 120 seconds.",
        caption: "Set AIP Type to Mid-Roll, 120 seconds, 2 positions.",
      },
    ],
  },
];

const STORAGE_KEY = "studio-art19-migration-v2";
const CHANGE_EVENT = "studio-migration-checks";
const ALL_ITEM_IDS = STEPS.flatMap((s) => s.items.map((i) => i.id));
const TOTAL_ITEMS = ALL_ITEM_IDS.length;

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

export function MigrationGuide({
  firstName,
}: {
  firstName: string | null;
}) {
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

  const doneCount = ALL_ITEM_IDS.filter((id) => checked.has(id)).length;

  return (
    <div className={styles.guide}>
      <nav className={styles.chapters} aria-label="On this page">
        <a className={styles.chapter} href="#move">
          <span className={styles.chapterNum}>1</span>
          <span className={styles.chapterText}>
            <span className={styles.chapterLabel}>Move</span>
            <span className={styles.chapterName}>Migration Checklist</span>
            <span className={styles.chapterNameShort}>Checklist</span>
          </span>
        </a>
        <a className={styles.chapter} href="#markers">
          <span className={styles.chapterNum}>2</span>
          <span className={styles.chapterText}>
            <span className={styles.chapterLabel}>Then</span>
            <span className={styles.chapterName}>Inserting Ad Markers</span>
            <span className={styles.chapterNameShort}>Markers</span>
          </span>
        </a>
      </nav>

      <section
        id="move"
        className={styles.move}
        aria-labelledby="art19-move-title"
      >
        <header className={styles.intro}>
          <div className={styles.introText}>
            <p className={styles.eyebrow}>1 · Migration Checklist</p>
            <h1 id="art19-move-title" className={styles.title}>
              Moving your show to ART19{firstName ? `, ${firstName}` : ""}.
            </h1>
            <p className={styles.lede}>
              Two steps. Keep this tab open next to your current host and
              tick things off as you go — checkmarks save on this device.
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
                A human from the team walks you through it — or does the
                fiddly bits with you.
              </p>
              <a
                className={styles.helpCta}
                href="mailto:hello@ghostsignal.cloud"
              >
                Email the team
              </a>
            </div>
          </div>
        </header>

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
                        <span
                          className={styles.stepDoneMark}
                          aria-label="Step complete"
                        >
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
                        {item.groupLabel ? (
                          <p className={styles.checkGroup}>{item.groupLabel}</p>
                        ) : null}
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
                        {item.afterNote ? (
                          <p className={styles.itemNote}>{item.afterNote}</p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>

                {step.note && <p className={styles.stepNote}>{step.note}</p>}
              </li>
            );
          })}
        </ol>

        <a className={styles.nextChapter} href="#markers">
          <span className={styles.nextChapterKicker}>Still on this page</span>
          <span className={styles.nextChapterTitle}>
            Next: inserting ad markers on ART19
          </span>
          <span className={styles.nextChapterHint}>
            Two screens — pick the episode, then place the mid-rolls.
          </span>
        </a>
      </section>

      <section
        id="markers"
        className={styles.tutorial}
        aria-labelledby="art19-tutorial-title"
      >
        <header className={styles.tutorialHead}>
          <p className={styles.eyebrow}>2 · Ad markers</p>
          <h2 id="art19-tutorial-title" className={styles.tutorialTitle}>
            Inserting Ad Markers on ART19
          </h2>
          <p className={styles.lede}>
            Two screens. These are actual screenshots from the platform,
            so you know exactly where to click.
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
                {step.body ? (
                  <p className={styles.tutorialStepBody}>{step.body}</p>
                ) : null}
              </div>

              {step.paths ? (
                <div className={styles.tutorialPaths}>
                  {step.paths.map((path) => (
                    <div key={path.label} className={styles.tutorialPath}>
                      <p className={styles.pathLabel}>{path.label}</p>
                      <p className={styles.tutorialStepBody}>{path.body}</p>
                      <figure className={styles.tutorialShot}>
                        <Image
                          src={path.image}
                          alt={path.alt}
                          width={path.width}
                          height={path.height}
                          className={styles.tutorialShotImg}
                          sizes="(max-width: 900px) 100vw, 50vw"
                          priority
                        />
                      </figure>
                    </div>
                  ))}
                </div>
              ) : null}

              {step.images ? (
                <div className={styles.tutorialShots}>
                  {step.images.map((shot) => (
                    <figure key={shot.src} className={styles.tutorialShot}>
                      <Image
                        src={shot.src}
                        alt={shot.alt}
                        width={shot.width}
                        height={shot.height}
                        className={styles.tutorialShotImg}
                        sizes="(max-width: 900px) 100vw, 1100px"
                        priority
                      />
                      {shot.caption ? (
                        <figcaption className={styles.tutorialShotCaption}>
                          {shot.caption}
                        </figcaption>
                      ) : null}
                    </figure>
                  ))}
                </div>
              ) : null}

              {step.reminder ? (
                <p className={styles.tutorialReminder}>{step.reminder}</p>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

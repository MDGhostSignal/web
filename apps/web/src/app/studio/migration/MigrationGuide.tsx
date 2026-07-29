"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import styles from "./migration.module.css";

/**
 * The four-step ART19 migration map from the GS-RSS-Migration PDF,
 * rendered as a wide working checklist. Steps sit side by side on a
 * big screen so the whole move is visible at once; checkmarks persist
 * in localStorage so the page survives tab-switching to the old host
 * mid-migration.
 */

type StepItem = {
  /** Stable id for localStorage — never renumber existing ids. */
  id: string;
  text: React.ReactNode;
};

type Step = {
  n: number;
  title: string;
  /** Per-step accent, echoing the PDF's colored rules. */
  accent: string;
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
    accent: "#e8a33d",
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
    accent: "#ef5da8",
    timing: ["Your time: ~30 min", "Import completes in: 24–72 h"],
    lede: "We bring your show into the GhostSignal network, hosted on ART19.",
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
    accent: "#26a69a",
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
    accent: "#9575cd",
    timing: ["Allow 24 h for full signal fidelity"],
    lede: "Once your address is changed, your new home is with GhostSignal on ART19!",
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
      {/* --- Compact header row ----------------------------------- */}
      <header className={styles.intro}>
        <div className={styles.introText}>
          <p className={styles.eyebrow}>Member guide · RSS migration</p>
          <h1 className={styles.title}>
            Moving your show to ART19{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className={styles.lede}>
            Like moving artwork between galleries — everything protected, us
            on hand throughout. ART19 (an Amazon company) is where your show
            and its ads will live. Keep this tab open next to your current
            host and tick things off as you go — checkmarks save on this
            device.
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
              style={{ "--step-accent": step.accent } as React.CSSProperties}
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

    </div>
  );
}

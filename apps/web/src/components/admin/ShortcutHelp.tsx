"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { IconHelp } from "./icons";
import styles from "./ShortcutHelp.module.css";

/**
 * Linear-style two-key navigation chords: press `g`, then a letter
 * within ~1.5 seconds to jump to that tab. Conflicts resolved
 * deliberately:
 *   - C → Contacts (high-frequency), O → cOntracts.
 *   - K → marKeting so it doesn't fight `g m` (Marketplace).
 *   - A → Campaigns (formerly "ART19", top-priority dashboard), N → Alerts.
 *
 * Defined as a single array so the chord listener and the help popover
 * read from the same source — the popover can't drift from what
 * actually works.
 */
type NavShortcut = { trigger: string; label: string; href: string };

const NAV_SHORTCUTS: NavShortcut[] = [
  { trigger: "d", label: "Dashboard", href: "/hq" },
  { trigger: "c", label: "Contacts", href: "/hq/contacts" },
  { trigger: "m", label: "Marketplace", href: "/hq/marketplace" },
  { trigger: "r", label: "RQ Responses", href: "/hq/rq-responses" },
  { trigger: "x", label: "XQ Responses", href: "/hq/xq-responses" },
  { trigger: "t", label: "Tasks", href: "/hq/tasks" },
  { trigger: "k", label: "Marketing", href: "/hq/marketing/social" },
  { trigger: "f", label: "Finance", href: "/hq/finance" },
  { trigger: "a", label: "Campaigns", href: "/hq/art19" },
  { trigger: "o", label: "Contracts", href: "/hq/contracts" },
  { trigger: "n", label: "Alerts", href: "/hq/alerts" },
];

/** Global (non-navigation) shortcuts surfaced in the help popover.
 *  These are owned by other components (sidebar toggle lives in
 *  AdminShell, `?` is owned here), but listed here so the user sees
 *  a single canonical key map. */
type GlobalShortcut = { keys: string[]; label: string };

const GLOBAL_SHORTCUTS: GlobalShortcut[] = [
  { keys: ["Ctrl/⌘", "B"], label: "Toggle sidebar (collapse / expand)" },
  { keys: ["?"], label: "Show this shortcuts dialog" },
  { keys: ["Esc"], label: "Close dialog / drawer" },
];

const CHORD_TIMEOUT_MS = 1500;

/** True when the keyboard event should be ignored — the user is typing
 *  into a text field and shortcuts should NOT hijack their keystrokes.
 *  Mirrors the gate the sidebar toggle uses so behaviour stays
 *  consistent across shortcut surfaces. */
function isTypingInField(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

/**
 * Help button + popover combo that lives in the AdminShell's topbar
 * trail. Three responsibilities:
 *
 *   1. Renders the `?` icon button (hover → native tooltip via title,
 *      click → opens the popover).
 *   2. Hosts the popover panel listing every available shortcut so the
 *      user has a single source-of-truth reference.
 *   3. Registers the global keyboard listeners that make the chord
 *      navigation and the `?`-to-open behaviour work.
 *
 * Self-contained — adding it to a layout's `trail` slot is all that's
 * required; no provider, no portal, no parent state.
 */
export function ShortcutHelp() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  /* --- Keyboard listeners ------------------------------------------- */

  // Chord state lives in refs (not useState) so the listener doesn't
  // need to re-bind on every keystroke. The handler is a stable
  // closure that reads the mutable ref values directly.
  const chordActiveRef = useRef(false);
  const chordTimerRef = useRef<number | null>(null);

  const clearChord = useCallback(() => {
    chordActiveRef.current = false;
    if (chordTimerRef.current !== null) {
      window.clearTimeout(chordTimerRef.current);
      chordTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Modifier-only events (Ctrl, Shift on their own) — ignore.
      if (e.key === "Control" || e.key === "Meta" || e.key === "Alt") return;
      // Don't hijack normal typing.
      if (isTypingInField(e.target)) return;
      // Anything with a non-shift modifier is somebody else's binding
      // (Ctrl+B = sidebar, Cmd+R = browser refresh, etc.). Bail early.
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // `?` opens the help popover from anywhere. Shift+/ on most US
      // layouts produces "?" already, so checking the key character
      // works across keyboard layouts that punt the question mark to a
      // different physical key.
      if (e.key === "?") {
        e.preventDefault();
        clearChord();
        setOpen(true);
        return;
      }

      // Escape closes the popover when it's open.
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
        return;
      }

      // First key of a chord: `g` opens the navigation chord window.
      if (!chordActiveRef.current) {
        if (e.key === "g" || e.key === "G") {
          e.preventDefault();
          chordActiveRef.current = true;
          chordTimerRef.current = window.setTimeout(
            clearChord,
            CHORD_TIMEOUT_MS,
          );
        }
        return;
      }

      // Chord window is open — interpret the next key as a navigation
      // target. Esc cancels without navigating.
      if (e.key === "Escape") {
        clearChord();
        return;
      }

      const match = NAV_SHORTCUTS.find(
        (s) => s.trigger === e.key.toLowerCase(),
      );
      if (match) {
        e.preventDefault();
        router.push(match.href);
      }
      // Either way, the chord window ends after the second key — no
      // dangling state if the user pressed something unmapped.
      clearChord();
    }

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearChord();
    };
  }, [router, clearChord, open]);

  /* --- Click-outside + Escape (popover-only) ------------------------ */

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  /* --- Rendering ---------------------------------------------------- */

  // Render shortcuts in a stable order — useMemo only to keep the
  // render output reference-stable across re-renders, the values are
  // module-level constants so there's no real compute here.
  const navItems = useMemo(() => NAV_SHORTCUTS, []);
  const globalItems = useMemo(() => GLOBAL_SHORTCUTS, []);

  return (
    <div className={styles.wrap}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-label="Keyboard shortcuts"
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Keyboard shortcuts (?)"
      >
        <IconHelp className={styles.triggerIcon} />
      </button>

      {open && (
        <div
          ref={panelRef}
          className={styles.panel}
          role="dialog"
          aria-label="Keyboard shortcuts"
        >
          <header className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Keyboard shortcuts</h2>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
          </header>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Navigation</h3>
            <p className={styles.sectionHint}>
              Press <Kbd>g</Kbd> then the letter below.
            </p>
            <ul className={styles.list}>
              {navItems.map((item) => (
                <li key={item.href} className={styles.row}>
                  <span className={styles.rowLabel}>{item.label}</span>
                  <span className={styles.rowKeys}>
                    <Kbd>g</Kbd>
                    <span className={styles.rowKeysGap}>then</span>
                    <Kbd>{item.trigger.toUpperCase()}</Kbd>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Global</h3>
            <ul className={styles.list}>
              {globalItems.map((item) => (
                <li key={item.label} className={styles.row}>
                  <span className={styles.rowLabel}>{item.label}</span>
                  <span className={styles.rowKeys}>
                    {item.keys.map((k, i) => (
                      <Kbd key={`${k}-${i}`}>{k}</Kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className={styles.kbd}>{children}</kbd>;
}

"use client";

import { useEffect, useSyncExternalStore } from "react";

import styles from "./ThemeToggle.module.css";

export type AdminTheme = "dark" | "light";

const STORAGE_KEY = "gs.admin.theme";

/* =====================================================================
 * Theme store
 * =====================================================================
 * Backed by localStorage. The store exposes a subscribe / getSnapshot
 * pair compatible with `useSyncExternalStore`, plus a setter that
 * notifies same-tab subscribers (the native `storage` event only
 * fires cross-tab, so subscribers in the same tab need a manual
 * notification path).
 * ===================================================================== */

const listeners = new Set<() => void>();

function subscribeTheme(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function getThemeSnapshot(): AdminTheme {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "light"
      ? "light"
      : "dark";
  } catch {
    return "dark";
  }
}

/**
 * Server snapshot — used during SSR and the first client render after
 * hydration to guarantee the server-rendered HTML and the client's
 * first render match. Once hydration completes, useSyncExternalStore
 * schedules a re-render with the live snapshot if it differs (e.g.
 * a user with `light` saved sees a brief sun → moon flip after the
 * page loads, but no hydration mismatch).
 */
function getThemeServerSnapshot(): AdminTheme {
  return "dark";
}

function setStoredTheme(next: AdminTheme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* private mode / quota — silently no-op */
  }
  // Notify same-tab subscribers (storage event only fires cross-tab).
  for (const cb of listeners) cb();
}

/* =====================================================================
 * Component
 * ===================================================================== */

/**
 * Sun-and-moon toggle that flips the admin theme between dark
 * (default) and light. Persists to localStorage under
 * `gs.admin.theme` and writes `data-theme="light"` onto every
 * `.admin-root` element (and `<html>`) so the light overrides in
 * `tokens.css` take effect at the right scope.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot,
  );

  // Apply the data-theme attribute as a side-effect of theme changes.
  // The token rules are declared at BOTH `:root` and `.admin-root`
  // selectors, so just setting the attribute on `<html>` isn't enough
  // — `.admin-root` re-declares the dark variables at its own scope
  // and would still win there. Setting the attribute on every
  // `.admin-root` element makes the `.admin-root[data-theme="light"]`
  // selector match at that scope.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const targets: Element[] = [
      document.documentElement,
      ...Array.from(document.querySelectorAll(".admin-root")),
    ];
    for (const el of targets) {
      if (theme === "light") {
        el.setAttribute("data-theme", "light");
      } else {
        el.removeAttribute("data-theme");
      }
    }
  }, [theme]);

  const next: AdminTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={() => setStoredTheme(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

/* Inline SVG icons. */

function SunIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M6.34 17.66l-1.41 1.41" />
      <path d="M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

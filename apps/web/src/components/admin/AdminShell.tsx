"use client";

import Link from "next/link";
import {
  Suspense,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { AdminSidebar, type AdminNavItem } from "./AdminSidebar";
import { AlertsBell } from "./AlertsBell";
import { IconHamburger } from "./icons";
import { ShortcutHelp } from "./ShortcutHelp";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./AdminShell.module.css";

/** localStorage key for the persistent sidebar-collapsed preference.
 *  Hydrated once post-mount — first paint always renders expanded to
 *  match SSR output, then snaps to the user's stored choice. */
const SIDEBAR_COLLAPSED_KEY = "gs-admin-sidebar-collapsed";

type Props = {
  /** Hierarchical sidebar nav. */
  nav: AdminNavItem[];
  /** Content of the current page. */
  children: ReactNode;
  /** Optional right-side trail content (default: ThemeToggle + Logout). */
  trail?: ReactNode;
  /** Called when the Logout button is clicked. When omitted, no button renders. */
  onLogout?: () => void;
};

/**
 * Admin hub shell. The top bar keeps only the brand, theme toggle and
 * sign-out — primary navigation now lives in the persistent left
 * `AdminSidebar`. Below 768 px the sidebar collapses off-canvas and a
 * hamburger trigger in the top bar opens it as a drawer.
 *
 * The wrapping div carries `.admin-root` so admin tokens scope every
 * descendant (including portaled modals inside it).
 */
export function AdminShell({ nav, children, trail, onLogout }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  // Transient hover-peek: when the sidebar is collapsed, hovering
  // anywhere on the rail temporarily reveals the full width (overlaying
  // content, not reflowing it). Cleared when the pointer leaves the
  // sidebar.
  const [peek, setPeek] = useState(false);
  // Transitions stay off until after first paint so the SSR-expanded →
  // stored-collapsed snap on hard nav is instant (no 200ms width animation
  // that would otherwise show a wide rail with icons only).
  const [ready, setReady] = useState(false);

  // Apply the stored collapsed preference AFTER mount. The first client
  // render deliberately matches the server (expanded), so there is no
  // hydration mismatch; this effect then flips to the stored value. The
  // `ready` gate keeps transitions off until the next frame, so the flip
  // is an instant snap rather than a visible animation.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true") {
        // Deliberate: applying a persisted preference exactly once on
        // mount. It must NOT run during render (that would desync from the
        // server's expanded HTML and re-introduce the hydration mismatch).
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time post-mount preference application; see comment above.
        setCollapsed(true);
      }
    } catch {
      /* localStorage unavailable (private mode, etc) — keep the default */
    }
  }, []);

  // Persist on change. Skipping the initial false write is fine; we
  // only need to remember explicit user choices.
  const toggleCollapsed = useCallback(() => {
    setPeek(false);
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // Enable transitions one frame after mount — see `ready` above.
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Ctrl/Cmd + B — power-user toggle. Matches VS Code's binding so it
  // feels native. Only fires when the focus isn't trapped in an
  // editable field (the modifier alone rules out most accidents).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "b" && e.key !== "B") return;
      if (!(e.ctrlKey || e.metaKey)) return;
      // Don't hijack the browser's bold shortcut inside text inputs.
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
      toggleCollapsed();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCollapsed]);

  const defaultTrail = (
    <>
      <ShortcutHelp />
      <AlertsBell />
      <ThemeToggle />
      {onLogout ? (
        <button
          type="button"
          className={styles.logoutBtn}
          onClick={onLogout}
          aria-label="Sign out"
        >
          Sign out
        </button>
      ) : null}
    </>
  );

  return (
    <div
      className={`${styles.shell} admin-root`}
      data-sidebar-collapsed={collapsed ? "true" : "false"}
      data-ready={ready ? "true" : "false"}
    >
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.hamburger}
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
        >
          <IconHamburger className={styles.hamburgerIcon} />
        </button>

        <Link
          href="/admin"
          className={styles.brand}
          aria-label="GhostSignal Admin"
        >
          {/* Theme-aware logo swap. Two <img>s mount, CSS hides the
              inactive one based on the `data-theme` attribute the
              ThemeToggle stamps onto every .admin-root. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/brand/ghostsiggnal-admin-white-4c.svg"
            alt="GhostSignal Admin"
            className={`${styles.brandLogo} ${styles.brandLogoDark}`}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/brand/ghostsiggnal-admin-hor-4c.svg"
            alt=""
            aria-hidden="true"
            className={`${styles.brandLogo} ${styles.brandLogoLight}`}
          />
        </Link>

        <div className={styles.trail}>{trail ?? defaultTrail}</div>
      </header>

      <div className={styles.body}>
        {/* AdminSidebar uses useSearchParams() to deep-link sub-items
            (e.g. /admin/marketplace?view=pool). Wrap it in Suspense
            so static prerendering of admin pages doesn't bail to
            dynamic rendering across the whole route tree. */}
        <Suspense fallback={null}>
          <AdminSidebar
            nav={nav}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            collapsed={collapsed}
            onToggleCollapsed={toggleCollapsed}
            peek={peek}
            ready={ready}
            onPeekStart={() => setPeek(true)}
            onPeekEnd={() => setPeek(false)}
          />
        </Suspense>
        {/* Mirror Suspense around the main content so any admin page
            that calls useSearchParams (e.g. /admin/marketplace using
            ?view=pool|match|map) doesn't bail static prerendering of
            the route tree. Empty fallback — pages render fast enough
            that a brief blank is cheaper than a skeleton. */}
        <main className={styles.content}>
          <Suspense fallback={null}>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}

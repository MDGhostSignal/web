"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { ThemeToggle } from "./ThemeToggle";
import styles from "./AdminShell.module.css";

export type AdminTab = {
  /** Sub-route under /admin, e.g. "/admin/members". Rendered as an <a>. */
  href: string;
  /** Short display label. */
  label: string;
  /** Optional count badge (e.g. unread submissions). */
  count?: number | string;
};

type Props = {
  /** Ordered tab list shown in the top bar. */
  tabs: AdminTab[];
  /** Content of the current tab. */
  children: ReactNode;
  /** Optional right-side trail content (default: Logout button). */
  trail?: ReactNode;
  /** Called when the Logout button is clicked. When omitted, no button
      renders. */
  onLogout?: () => void;
};

/**
 * Admin hub shell. Sticky top bar with brand + tab nav + logout; a
 * centred content column beneath. The wrapping div carries the
 * `.admin-root` class so the admin token scope is active for every
 * descendant (including portaled modals inside it).
 *
 * The shell uses `usePathname()` to mark the active tab. Tabs match
 * greedily via `startsWith` so nested routes (e.g. /admin/members/123)
 * keep the parent tab lit.
 */
export function AdminShell({ tabs, children, trail, onLogout }: Props) {
  const pathname = usePathname() ?? "";

  const isActive = (href: string) => {
    if (href === pathname) return true;
    // Sub-route match: /admin/members should light /admin/members, but
    // the top-level /admin shouldn't steal the highlight from every
    // deeper tab — require at least a trailing '/' for the prefix match.
    return pathname.startsWith(`${href}/`);
  };

  const defaultTrail = (
    <>
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
    <div className={`${styles.shell} admin-root`}>
      <header className={styles.topbar}>
        <Link
          href="/admin"
          className={styles.brand}
          aria-label="GhostSignal Admin"
        >
          {/* Plain <img> rather than next/image — SVG doesn't benefit
              from the image pipeline, and next/image's enforced
              `width`/`height` attributes were clipping the bottom of
              the glyph artwork against my CSS overrides. eslint-disable
              for the no-img-element rule below is intentional and
              local. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/brand/ghostsiggnal-admin-hor-4c.svg"
            alt="GhostSignal Admin"
            className={styles.brandLogo}
          />
        </Link>

        <nav className={styles.tabs} aria-label="Admin sections">
          {tabs.map((tab) => {
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`${styles.tab} ${active ? styles.tabActive : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
                {tab.count !== undefined && tab.count !== null && (
                  <span className={styles.tabCount}>{tab.count}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className={styles.trail}>{trail ?? defaultTrail}</div>
      </header>

      <main className={styles.content}>{children}</main>
    </div>
  );
}

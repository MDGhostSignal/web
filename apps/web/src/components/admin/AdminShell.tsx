"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { AdminSidebar, type AdminNavItem } from "./AdminSidebar";
import { IconHamburger } from "./icons";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./AdminShell.module.css";

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
        <AdminSidebar
          nav={nav}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

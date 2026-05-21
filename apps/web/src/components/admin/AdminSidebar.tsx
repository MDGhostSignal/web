"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, type ReactNode } from "react";

import { IconChevron, IconClose } from "./icons";
import styles from "./AdminSidebar.module.css";

export interface AdminNavSubItem {
  href: string;
  label: string;
}

export interface AdminNavItem {
  href: string;
  label: string;
  icon: ReactNode;
  children?: AdminNavSubItem[];
}

type Props = {
  nav: AdminNavItem[];
  /** Mobile drawer open state. Ignored at ≥768 px (sidebar always visible). */
  open: boolean;
  onClose: () => void;
};

/**
 * Persistent left sidebar for the admin shell.
 *
 *  - Desktop (≥768 px): always visible, 256 px wide, fixed-left.
 *  - Mobile (<768 px): hidden off-canvas, slides in when `open=true`.
 *
 * Active highlighting + expansion are pure functions of the URL via
 * `usePathname`. No localStorage, no manual toggle state — when you
 * navigate into Marketing, Marketing expands; everywhere else it's
 * collapsed.
 */
export function AdminSidebar({ nav, open, onClose }: Props) {
  const pathname = usePathname() ?? "";

  // Escape closes the drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Auto-close on route change.
  useEffect(() => {
    if (open) onClose();
    // Intentionally only depends on pathname — we want the auto-close to
    // fire whenever the user navigates, regardless of how `open` got there.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* Backdrop — visible only when the mobile drawer is open. */}
      <div
        className={[
          styles.backdrop,
          open ? styles.backdropOpen : "",
        ].join(" ")}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={styles.sidebar}
        data-open={open ? "true" : "false"}
        aria-label="Admin sections"
      >
        <div className={styles.mobileHeader}>
          <span className={styles.mobileHeaderLabel}>Navigate</span>
          <button
            type="button"
            className={styles.mobileClose}
            onClick={onClose}
            aria-label="Close navigation"
          >
            <IconClose className={styles.iconSm} />
          </button>
        </div>

        <nav className={styles.nav}>
          <ul className={styles.list}>
            {nav.map((item) => (
              <NavRow key={item.href} item={item} pathname={pathname} />
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}

/* --- Single row ------------------------------------------------------ */

function NavRow({
  item,
  pathname,
}: {
  item: AdminNavItem;
  pathname: string;
}) {
  const isExactActive = pathname === item.href;
  const isInsideSection =
    pathname === item.href || pathname.startsWith(item.href + "/");
  const childActiveHref = item.children?.find((c) => {
    return pathname === c.href || pathname.startsWith(c.href + "/");
  })?.href;

  // Expansion is purely URL-derived: when we're inside this section,
  // children are visible. Otherwise they're folded.
  const expanded = Boolean(item.children && isInsideSection);
  const groupId = useId();

  // The PARENT row is "active" only when its exact route matches (the
  // dashboard / non-child case) OR when no child is currently active
  // but we're inside this section (rare — only happens for the root
  // marketing redirect mid-flight). When a child is active, the
  // parent gets the softer "parent of active" tint instead.
  const parentIsActive = isExactActive && !childActiveHref;
  const parentIsAncestor = isInsideSection && !parentIsActive;

  return (
    <li className={styles.item}>
      <Link
        href={item.href}
        className={[
          styles.row,
          parentIsActive ? styles.rowActive : "",
          parentIsAncestor ? styles.rowAncestor : "",
        ].join(" ")}
        aria-current={parentIsActive ? "page" : undefined}
        aria-expanded={item.children ? expanded : undefined}
        aria-controls={item.children ? groupId : undefined}
      >
        <span className={styles.icon} aria-hidden="true">
          {item.icon}
        </span>
        <span className={styles.label}>{item.label}</span>
        {item.children && (
          <span
            className={[
              styles.chevron,
              expanded ? styles.chevronExpanded : "",
            ].join(" ")}
            aria-hidden="true"
          >
            <IconChevron className={styles.iconSm} />
          </span>
        )}
      </Link>

      {item.children && expanded && (
        <ul
          id={groupId}
          role="group"
          className={styles.subList}
        >
          {item.children.map((sub) => {
            const subActive =
              pathname === sub.href || pathname.startsWith(sub.href + "/");
            return (
              <li key={sub.href}>
                <Link
                  href={sub.href}
                  className={[
                    styles.subRow,
                    subActive ? styles.subRowActive : "",
                  ].join(" ")}
                  aria-current={subActive ? "page" : undefined}
                >
                  <span className={styles.subDot} aria-hidden="true" />
                  <span className={styles.subLabel}>{sub.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

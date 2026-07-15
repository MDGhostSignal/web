"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useId, type ReactNode } from "react";

import { IconChevron, IconClose } from "./icons";
import styles from "./AdminSidebar.module.css";

export interface AdminNavSubItem {
  /** May include a query string, e.g. `/admin/marketplace?view=pool`. */
  href: string;
  label: string;
  /** When true, this sub-item is active even when the URL is missing
   *  the query params declared in `href`. Used for the "default" view
   *  on query-param-driven pages so the sidebar still highlights it
   *  when the user lands on the bare route. */
  isDefault?: boolean;
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
  /** Desktop collapsed state (icon-rail mode). Ignored at ≤768 px
   *  where the sidebar is a full-width drawer regardless. This is the
   *  PERSISTED preference; the visual state is `collapsed && !peek`. */
  collapsed: boolean;
  /** Toggle handler for the collapse/expand footer button. */
  onToggleCollapsed: () => void;
  /** Transient hover-peek — expand the rail without changing the
   *  persisted `collapsed` preference. Only meaningful while collapsed. */
  peek: boolean;
  /** Whether the shell has finished first paint — gates CSS transitions
   *  so the initial collapsed snap doesn't animate. */
  ready: boolean;
  /** Fired when the pointer enters the expand button (start hover-peek). */
  onPeekStart: () => void;
  /** Fired when the pointer leaves the sidebar (end hover-peek). */
  onPeekEnd: () => void;
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
export function AdminSidebar({
  nav,
  open,
  onClose,
  collapsed,
  onToggleCollapsed,
  peek,
  ready,
  onPeekStart,
  onPeekEnd,
}: Props) {
  const pathname = usePathname() ?? "";
  // What the sidebar actually shows: the persisted collapsed preference,
  // overridden to expanded while the user is hover-peeking.
  const visualCollapsed = collapsed && !peek;
  const searchParams = useSearchParams();
  const searchParamsString = searchParams ? searchParams.toString() : "";

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
        data-collapsed={visualCollapsed ? "true" : "false"}
        data-peek={collapsed && peek ? "true" : "false"}
        data-ready={ready ? "true" : "false"}
        onMouseLeave={onPeekEnd}
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

        {/* Desktop-only collapse/expand toggle, pinned to the top of
            the sidebar above the nav list. Hidden on mobile (the drawer
            has its own close button in the header). Keyboard shortcut:
            Ctrl/Cmd + B. */}
        <div className={styles.toggleBar}>
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={onToggleCollapsed}
            onMouseEnter={collapsed ? onPeekStart : undefined}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={
              collapsed
                ? "Expand sidebar (Ctrl/⌘+B)"
                : "Collapse sidebar (Ctrl/⌘+B)"
            }
          >
            <span
              className={[
                styles.collapseGlyph,
                visualCollapsed ? styles.collapseGlyphExpand : "",
              ].join(" ")}
              aria-hidden="true"
            >
              <IconChevron className={styles.iconSm} />
            </span>
            <span className={styles.collapseLabel}>Collapse</span>
          </button>
        </div>

        <nav className={styles.nav}>
          <ul className={styles.list}>
            {nav.map((item) => (
              <NavRow
                key={item.href}
                item={item}
                pathname={pathname}
                searchParams={searchParamsString}
                collapsed={visualCollapsed}
              />
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}

/* --- Active-detection helpers ----------------------------------------
 *
 * Sub-items may carry a query string in their href (e.g.
 * `/admin/marketplace?view=pool`). The active check needs to compare
 * pathname + query for those — `usePathname` alone won't differentiate
 * between Pool / Match / Map.
 */

function parseHref(href: string): { path: string; params: URLSearchParams } {
  const [path, qs = ""] = href.split("?");
  return { path, params: new URLSearchParams(qs) };
}

function subItemActive(
  sub: AdminNavSubItem,
  pathname: string,
  currentSearch: URLSearchParams,
): boolean {
  const { path, params } = parseHref(sub.href);
  const pathMatches = pathname === path || pathname.startsWith(path + "/");
  if (!pathMatches) return false;
  if ([...params.keys()].length === 0) return true;
  // Every declared param either matches the current URL, OR (when sub
  // is the default view) is absent from the current URL.
  for (const [k, v] of params) {
    const curr = currentSearch.get(k);
    if (curr === null) {
      if (sub.isDefault) continue;
      return false;
    }
    if (curr !== v) return false;
  }
  return true;
}

/* --- Single row ------------------------------------------------------ */

function NavRow({
  item,
  pathname,
  searchParams,
  collapsed,
}: {
  item: AdminNavItem;
  pathname: string;
  searchParams: string;
  collapsed: boolean;
}) {
  const currentSearch = new URLSearchParams(searchParams);
  const isExactActive = pathname === item.href;
  // "Inside section" matches both the parent's own href AND any of
  // its children's paths. Lets the parent link point straight at the
  // default sub-page (e.g. Marketing → /admin/marketing/social) while
  // still expanding + highlighting itself when the user is on a
  // sibling sub-page (e.g. /admin/marketing/assets).
  const isInsideSection =
    pathname === item.href ||
    pathname.startsWith(item.href + "/") ||
    Boolean(
      item.children?.some((c) => {
        const childPath = parseHref(c.href).path;
        return pathname === childPath || pathname.startsWith(childPath + "/");
      }),
    );
  const childActiveHref = item.children?.find((c) =>
    subItemActive(c, pathname, currentSearch),
  )?.href;

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
        title={collapsed ? item.label : undefined}
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
            const subActive = subItemActive(sub, pathname, currentSearch);
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

/**
 * Inline SVG icon set for the admin sidebar.
 *
 * Pattern matches the existing inline-SVG convention in Modal.tsx,
 * SearchInput.tsx, and ThemeToggle.tsx — `stroke="currentColor"`,
 * `aria-hidden="true"`, size driven by CSS class so the parent
 * controls dimensions and the icon inherits text color.
 *
 * All eight icons use the same 24×24 viewBox + strokeWidth 1.8 +
 * round caps/joins so they sit consistently in the sidebar row.
 */

import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

function base(props: Props) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    ...props,
  };
}

/** Dashboard — 4-pane grid (rooms). */
export function IconDashboard(props: Props) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

/** Leads — silhouette + plus (people / contacts). */
export function IconLeads(props: Props) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <line x1="18" y1="8" x2="18" y2="14" />
      <line x1="15" y1="11" x2="21" y2="11" />
    </svg>
  );
}

/** Marketplace — storefront / two-column display. */
export function IconMarketplace(props: Props) {
  return (
    <svg {...base(props)}>
      <path d="M3 7l1.5-3h15L21 7" />
      <path d="M3 7v13h18V7" />
      <path d="M3 7c0 2 1.6 3.5 3.5 3.5S10 9 10 7" />
      <path d="M10 7c0 2 1.6 3.5 3.5 3.5S17 9 17 7" />
      <path d="M17 7c0 2 1.6 3.5 3.5 3.5S24 9 24 7" />
      <rect x="9" y="13" width="6" height="7" />
    </svg>
  );
}

/** RQ Responses — speech/quiz bubble with a question mark dot. */
export function IconRQ(props: Props) {
  return (
    <svg {...base(props)}>
      <path d="M21 12c0 4.4-4 8-9 8a10 10 0 0 1-3.5-.6L4 21l1-3.5A7.4 7.4 0 0 1 3 12c0-4.4 4-8 9-8s9 3.6 9 8z" />
      <path d="M9.5 10.5a2.5 2.5 0 1 1 4 2c-.8.6-1.5 1.1-1.5 2" />
      <line x1="12" y1="16" x2="12" y2="16.01" />
    </svg>
  );
}

/** XQ Responses — same speech-bubble silhouette as RQ to signal the
 *  pairing, with an "x" mark inside instead of the question-mark
 *  hook. */
export function IconXQ(props: Props) {
  return (
    <svg {...base(props)}>
      <path d="M21 12c0 4.4-4 8-9 8a10 10 0 0 1-3.5-.6L4 21l1-3.5A7.4 7.4 0 0 1 3 12c0-4.4 4-8 9-8s9 3.6 9 8z" />
      <line x1="9.5" y1="9.5" x2="14.5" y2="14.5" />
      <line x1="14.5" y1="9.5" x2="9.5" y2="14.5" />
    </svg>
  );
}

/** Tasks — checked list. */
export function IconTasks(props: Props) {
  return (
    <svg {...base(props)}>
      <polyline points="3 6 5 8 9 4" />
      <line x1="12" y1="6" x2="21" y2="6" />
      <polyline points="3 13 5 15 9 11" />
      <line x1="12" y1="13" x2="21" y2="13" />
      <polyline points="3 20 5 22 9 18" />
      <line x1="12" y1="20" x2="21" y2="20" />
    </svg>
  );
}

/** Marketing — broadcast (megaphone). */
export function IconMarketing(props: Props) {
  return (
    <svg {...base(props)}>
      <path d="M4 11v2a2 2 0 0 0 2 2h2l4 4V5l-4 4H6a2 2 0 0 0-2 2z" />
      <path d="M16 8a5 5 0 0 1 0 8" />
      <path d="M19 5a9 9 0 0 1 0 14" />
    </svg>
  );
}

/** Finance — chart bars + trend line. */
export function IconFinance(props: Props) {
  return (
    <svg {...base(props)}>
      <line x1="3" y1="20" x2="21" y2="20" />
      <rect x="5" y="13" width="3" height="7" />
      <rect x="11" y="9" width="3" height="11" />
      <rect x="17" y="5" width="3" height="15" />
      <polyline points="4 11 9 6 13 9 20 4" />
    </svg>
  );
}

/** Chevron — used for sidebar expand/collapse indicator. */
export function IconChevron(props: Props) {
  return (
    <svg {...base(props)}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

/** Hamburger — three lines, used by the mobile trigger in the top bar. */
export function IconHamburger(props: Props) {
  return (
    <svg {...base(props)}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

/** Close X — used by the mobile drawer header. */
export function IconClose(props: Props) {
  return (
    <svg {...base(props)}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

/** Contracts — sheet of paper with a signature flourish at the bottom. */
export function IconContracts(props: Props) {
  return (
    <svg {...base(props)}>
      <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M15 3v4h4" />
      <line x1="8" y1="11" x2="14" y2="11" />
      <line x1="8" y1="14" x2="16" y2="14" />
      {/* signature flourish */}
      <path d="M8 18c1-1.4 2-1.4 3 0s2 1.4 3 0" />
    </svg>
  );
}

/** External link — outward arrow + box. Signals "this opens off-site". */
export function IconExternal(props: Props) {
  return (
    <svg {...base(props)}>
      <path d="M14 4h6v6" />
      <line x1="20" y1="4" x2="11" y2="13" />
      <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

/** Info — lowercase "i" in a circle. Signals "click for an explanation". */
export function IconInfo(props: Props) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16" />
      <circle cx="12" cy="7.75" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

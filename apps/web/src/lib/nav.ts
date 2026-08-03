/**
 * Canonical top-nav link list. Shared by every public-facing page's
 * `<SiteHeader>` so the set of visible routes and their labels live in
 * exactly one place. If a page needs to hide or reorder links, keep
 * that override local to the page instead of forking this list.
 */
export const navLinks = [
  { href: "/what-is-this", label: "What is this" },
  { href: "/for-creators", label: "For Creators" },
  { href: "/for-advertisers", label: "For Advertisers" },
  { href: "/who-are-we", label: "Who Are We" },
  { href: "/snowdrift", label: "SNOWDRIFT" },
  { href: "/xq-quiz", label: "XQ Quiz" },
  // `cta: true` → rendered as the primary call-to-action button (solid
  // pill) rather than a plain nav link. Keep these as the last entries
  // so they sit at the right edge of the nav row; CTA pills also stay
  // visible when the header collapses on scroll.
  { href: "/get-in-touch", label: "Get In Touch", cta: true },
  { href: "/studio", label: "Sign In", cta: true },
] as const;

export type NavLink = (typeof navLinks)[number];

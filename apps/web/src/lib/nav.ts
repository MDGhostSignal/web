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
  { href: "/rq-quiz", label: "RQ Quiz" },
  { href: "/get-in-touch", label: "Get In Touch" },
] as const;

export type NavLink = (typeof navLinks)[number];

import { redirect } from "next/navigation";

/**
 * /admin/marketing redirects to the Social Planner — most-used
 * Marketing sub-page, so landing there saves a click. The three real
 * sections live as their own routes:
 *
 *   /admin/marketing/assets
 *   /admin/marketing/copy
 *   /admin/marketing/social
 *
 * The persistent left sidebar (see `AdminSidebar`) is the single
 * source of navigation for Marketing — the old in-page chip strip
 * is gone.
 */
export default function MarketingPage() {
  redirect("/hq/marketing/social");
}

import { redirect } from "next/navigation";

/**
 * /admin/marketing redirects to the Assets sub-tab. The three real
 * sections now live as their own routes:
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
  redirect("/admin/marketing/assets");
}

import { redirect } from "next/navigation";

/**
 * /admin — redirects to the first tab. Members is the primary surface
 * (the CRM) so it's the default landing view. Change here if the tab
 * order ever changes in AdminLayout.
 */
export default function AdminIndex() {
  redirect("/admin/members");
}

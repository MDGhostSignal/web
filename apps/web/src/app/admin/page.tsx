import { redirect } from "next/navigation";

/**
 * /admin — redirects to the first tab. Leads is the primary surface
 * (the outreach + onboarding CRM) so it's the default landing view.
 * Change here if the tab order ever changes in AdminLayout.
 */
export default function AdminIndex() {
  redirect("/admin/leads");
}

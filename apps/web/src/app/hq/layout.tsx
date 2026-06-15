"use client";

import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

import { AdminShell } from "@/components/admin";
// Load admin tokens once for every /admin/* route, including /admin/login.
// Leaf pages don't need to import this again.
import "@/components/admin/tokens.css";
import {
  IconAlerts,
  IconArt19,
  IconContracts,
  IconDashboard,
  IconFinance,
  IconLeads,
  IconMarketing,
  IconMarketplace,
  IconRQ,
  IconTasks,
  IconXQ,
} from "@/components/admin/icons";

/**
 * Shared chrome for all /admin/* routes (not /admin/login).
 *
 * The login sub-route has its own layout that bypasses the shell; see
 * /admin/login/page.tsx which renders standalone. This layout returns
 * `children` untouched whenever it detects it's rendering on /login
 * so the shell doesn't try to wrap the sign-in form.
 *
 * Primary navigation lives in the persistent left sidebar. Marketing
 * carries three children (Assets / Copy / Social) that the sidebar
 * exposes as expandable sub-items.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() ?? "";

  // /admin/login sits inside this layout tree but opts out of the
  // shell chrome (it's the unauthenticated entry point).
  if (pathname === "/hq/login" || pathname.startsWith("/hq/login/")) {
    return <>{children}</>;
  }

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // If the call fails the cookie clear won't land; middleware
      // will redirect again next request. Nothing actionable here.
    }
    router.replace("/hq/login");
    router.refresh();
  }

  return (
    <AdminShell
      nav={[
        { href: "/hq", label: "Dashboard", icon: <IconDashboard /> },
        { href: "/hq/contacts", label: "Contacts", icon: <IconLeads /> },
        {
          href: "/hq/marketplace",
          label: "Marketplace",
          icon: <IconMarketplace />,
          children: [
            {
              href: "/hq/marketplace?view=pool",
              label: "Pool",
              isDefault: true,
            },
            { href: "/hq/marketplace?view=match", label: "Match" },
          ],
        },
        {
          href: "/hq/rq-responses",
          label: "RQ Responses",
          icon: <IconRQ />,
        },
        {
          href: "/hq/xq-responses",
          label: "XQ Responses",
          icon: <IconXQ />,
        },
        { href: "/hq/tasks", label: "Tasks", icon: <IconTasks /> },
        {
          // Parent links directly to the Social Planner sub-page —
          // most-used Marketing surface, so clicking the tab lands
          // there without a redirect hop. The section-match logic in
          // AdminSidebar still expands + highlights the Marketing
          // group when the user is on Assets or Copy.
          href: "/hq/marketing/social",
          label: "Marketing",
          icon: <IconMarketing />,
          children: [
            { href: "/hq/marketing/assets", label: "Assets" },
            { href: "/hq/marketing/copy", label: "Copy" },
            { href: "/hq/marketing/social", label: "Social Planner" },
          ],
        },
        { href: "/hq/finance", label: "Finance", icon: <IconFinance /> },
        { href: "/hq/art19", label: "Campaigns", icon: <IconArt19 /> },
        {
          href: "/hq/contracts",
          label: "Contracts",
          icon: <IconContracts />,
        },
        { href: "/hq/alerts", label: "Alerts", icon: <IconAlerts /> },
        {
          href: "/hq/studio-approvals",
          label: "Studio Approvals",
          icon: <IconLeads />,
        },
      ]}
      onLogout={handleLogout}
    >
      {children}
    </AdminShell>
  );
}

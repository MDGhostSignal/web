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
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return <>{children}</>;
  }

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // If the call fails the cookie clear won't land; middleware
      // will redirect again next request. Nothing actionable here.
    }
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <AdminShell
      nav={[
        { href: "/admin", label: "Dashboard", icon: <IconDashboard /> },
        { href: "/admin/contacts", label: "Contacts", icon: <IconLeads /> },
        {
          href: "/admin/marketplace",
          label: "Marketplace",
          icon: <IconMarketplace />,
          children: [
            {
              href: "/admin/marketplace?view=pool",
              label: "Pool",
              isDefault: true,
            },
            { href: "/admin/marketplace?view=match", label: "Match" },
          ],
        },
        {
          href: "/admin/rq-responses",
          label: "RQ Responses",
          icon: <IconRQ />,
        },
        {
          href: "/admin/xq-responses",
          label: "XQ Responses",
          icon: <IconXQ />,
        },
        { href: "/admin/tasks", label: "Tasks", icon: <IconTasks /> },
        {
          // Parent links directly to the Social Planner sub-page —
          // most-used Marketing surface, so clicking the tab lands
          // there without a redirect hop. The section-match logic in
          // AdminSidebar still expands + highlights the Marketing
          // group when the user is on Assets or Copy.
          href: "/admin/marketing/social",
          label: "Marketing",
          icon: <IconMarketing />,
          children: [
            { href: "/admin/marketing/assets", label: "Assets" },
            { href: "/admin/marketing/copy", label: "Copy" },
            { href: "/admin/marketing/social", label: "Social Planner" },
          ],
        },
        { href: "/admin/finance", label: "Finance", icon: <IconFinance /> },
        { href: "/admin/art19", label: "Campaigns", icon: <IconArt19 /> },
        {
          href: "/admin/contracts",
          label: "Contracts",
          icon: <IconContracts />,
        },
        { href: "/admin/alerts", label: "Alerts", icon: <IconAlerts /> },
      ]}
      onLogout={handleLogout}
    >
      {children}
    </AdminShell>
  );
}

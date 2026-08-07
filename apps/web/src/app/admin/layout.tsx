"use client";

import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

import { AdminShell } from "@/components/admin";
// Load admin tokens once for every /admin/* route, including /admin/login.
// Leaf pages don't need to import this again.
import "@/components/admin/tokens.css";
import {
  IconAdmin,
  IconDashboard,
  IconLeads,
  IconMarketing,
  IconMarketplace,
  IconOperations,
  IconPages,
  IconTasks,
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
        // Navigation V3 — task-clustered hierarchy. Each parent links to
        // its first child; the sidebar expands + highlights a group via
        // path-prefix / query matching (see AdminSidebar). Dashboard is
        // the first item; the brand logo also links to /admin.
        { href: "/admin", label: "Dashboard", icon: <IconDashboard /> },
        { href: "/admin/contacts", label: "Contacts", icon: <IconLeads /> },
        {
          // Members = the marketplace (the member pool + matching).
          href: "/admin/marketplace?view=pool",
          label: "Members",
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
        { href: "/admin/tasks", label: "Tasks", icon: <IconTasks /> },
        {
          href: "/admin/art19",
          label: "Operations",
          icon: <IconOperations />,
          children: [
            { href: "/admin/art19", label: "Campaigns" },
            {
              href: "/admin/studio-members",
              label: "Studio Members",
              isDefault: true,
            },
            { href: "/admin/xq-responses", label: "XQ Responses" },
            { href: "/admin/rq-responses", label: "RQ Responses" },
          ],
        },
        {
          href: "/admin/finance",
          label: "Admin",
          icon: <IconAdmin />,
          children: [
            { href: "/admin/finance", label: "Finance" },
            { href: "/admin/contracts", label: "Contracts" },
          ],
        },
        {
          href: "/admin/outreach",
          label: "Marketing",
          icon: <IconMarketing />,
          children: [
            { href: "/admin/outreach", label: "Outreach" },
            { href: "/admin/marketing/assets", label: "Assets" },
            { href: "/admin/marketing/copy", label: "Copy" },
            { href: "/admin/marketing/social", label: "Social Planner" },
          ],
        },
        {
          href: "/admin/pages",
          label: "Pages",
          icon: <IconPages />,
          children: [
            { href: "/admin/pages", label: "Pages" },
            { href: "/admin/studio-approvals", label: "Approvals" },
            { href: "/admin/studio-picks", label: "GS Picks" },
          ],
        },
      ]}
      onLogout={handleLogout}
    >
      {children}
    </AdminShell>
  );
}

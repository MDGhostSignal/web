"use client";

import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

import { AdminShell } from "@/components/admin";
// Load admin tokens once for every /admin/* route, including /admin/login.
// Leaf pages don't need to import this again.
import "@/components/admin/tokens.css";

/**
 * Shared chrome for all /admin/* routes (not /admin/login).
 *
 * The login sub-route has its own layout that bypasses the shell; see
 * /admin/login/page.tsx which renders standalone. This layout returns
 * `children` untouched whenever it detects it's rendering on /login
 * so the shell doesn't try to wrap the sign-in form.
 *
 * Tabs surface the admin sections: Leads (CRM outreach + onboarding),
 * Marketplace, RQ Responses, Design Tasks.
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
      tabs={[
        { href: "/admin/leads", label: "Leads" },
        { href: "/admin/marketplace", label: "Marketplace" },
        { href: "/admin/rq-responses", label: "RQ Responses" },
        { href: "/admin/tasks", label: "Tasks" },
      ]}
      onLogout={handleLogout}
    >
      {children}
    </AdminShell>
  );
}

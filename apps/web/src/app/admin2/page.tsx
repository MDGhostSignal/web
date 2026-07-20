"use client";

import { useRouter } from "next/navigation";

import { AdminShell, PageHeader } from "@/components/admin";
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

import styles from "./page.module.css";

/**
 * Nav V2 preview — /admin2.
 *
 * Renders the real AdminShell with the PROPOSED sidebar order so the
 * team can feel the reorganisation before we commit to it: clusters
 * made contiguous (monitor → revenue → people → matching → content),
 * revenue block moved up, and Campaigns given sub-items so the CPM
 * Calculator has a visible entry point.
 *
 * The sidebar links are live and navigate into the real admin — which
 * still runs the current (V1) order. This page is a preview shell, not
 * a parallel admin. If V2 is adopted, port the nav array below into
 * admin/layout.tsx and delete this route.
 *
 * Auth: gated by the same shared-password cookie as /admin/* — see the
 * "/admin2" entry in proxy.ts.
 */
export default function AdminNavV2Preview() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // Cookie clear didn't land; proxy will redirect next request.
    }
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <AdminShell
      nav={[
        // — Monitor —
        { href: "/admin", label: "Dashboard", icon: <IconDashboard /> },
        { href: "/admin/alerts", label: "Alerts", icon: <IconAlerts /> },
        // — Revenue —
        {
          href: "/admin/art19",
          label: "Campaigns",
          icon: <IconArt19 />,
          children: [
            { href: "/admin/art19", label: "Overview", isDefault: true },
            { href: "/admin/art19/cpm", label: "CPM Calculator" },
          ],
        },
        { href: "/admin/finance", label: "Finance", icon: <IconFinance /> },
        {
          href: "/admin/contracts",
          label: "Contracts",
          icon: <IconContracts />,
        },
        // — People —
        { href: "/admin/contacts", label: "Contacts", icon: <IconLeads /> },
        { href: "/admin/tasks", label: "Tasks", icon: <IconTasks /> },
        {
          href: "/admin/studio-approvals",
          label: "Studio Approvals",
          icon: <IconLeads />,
        },
        // — Matching —
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
          href: "/admin/xq-responses",
          label: "XQ Responses",
          icon: <IconXQ />,
        },
        {
          href: "/admin/rq-responses",
          label: "RQ Responses",
          icon: <IconRQ />,
        },
        // — Content · Meta —
        {
          href: "/admin/marketing/social",
          label: "Marketing",
          icon: <IconMarketing />,
          children: [
            { href: "/admin/marketing/assets", label: "Assets" },
            { href: "/admin/marketing/copy", label: "Copy" },
            { href: "/admin/marketing/social", label: "Social Planner" },
          ],
        },
        { href: "/admin/pages", label: "Pages", icon: <IconDashboard /> },
      ]}
      onLogout={handleLogout}
    >
      <div className={styles.page}>
        <PageHeader
          title="Navigation V2 — preview"
          subtitle="The sidebar on the left shows the proposed order. Same thirteen destinations, no renames, no route changes — just re-sorted into task clusters."
        />

        <div className={styles.cards}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>What changed</h3>
            <ul className={styles.cardList}>
              <li>
                <strong>Campaigns has sub-items</strong> — expand it to see
                Overview + CPM Calculator. The calculator finally gets a
                visible entry point instead of hiding behind a card on the
                Campaigns dashboard.
              </li>
              <li>
                <strong>Revenue moved up</strong> — Campaigns, Finance, and
                Contracts now sit right after the monitoring pair
                (Dashboard + Alerts) instead of positions 8–10.
              </li>
              <li>
                <strong>Clusters are contiguous</strong> — Tasks rejoins
                Contacts, Studio Approvals joins the people block, Alerts
                pairs with Dashboard, and XQ now precedes RQ (free hook →
                premium engine).
              </li>
            </ul>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>How to evaluate</h3>
            <p className={styles.cardText}>
              Every sidebar link is live — click through your normal
              morning routine and notice how far your pointer travels.
              Heads up: the rest of the admin still runs the current nav,
              so navigating away exits this preview. Come back to{" "}
              <code className={styles.code}>/admin2</code> to see the V2
              order again, or compare side-by-side with the mockup page
              shared in the team thread.
            </p>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

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
// === Side-by-side nav comparison (annotation mock, not live nav) ===

type Cluster =
  | "monitor"
  | "revenue"
  | "people"
  | "matching"
  | "content"
  | "meta";

type MockEntry = {
  label: string;
  cluster: Cluster;
  /** Has children in the real nav (renders a chevron). */
  expandable?: boolean;
  /** Annotation pill, e.g. "stranded" / "CPM buried". */
  flag?: "stranded" | "buried" | "new";
  /** Rendered as indented sub-rows (V2's Campaigns). */
  subItems?: Array<{ label: string; flag?: "new" }>;
};

const CLUSTER_LABELS: Record<Cluster, string> = {
  monitor: "Monitor",
  revenue: "Revenue",
  people: "People",
  matching: "Matching",
  content: "Content",
  meta: "Meta",
};

const NAV_CURRENT: MockEntry[] = [
  { label: "Dashboard", cluster: "monitor" },
  { label: "Contacts", cluster: "people" },
  { label: "Marketplace", cluster: "matching", expandable: true },
  { label: "RQ Responses", cluster: "matching" },
  { label: "XQ Responses", cluster: "matching" },
  { label: "Tasks", cluster: "people", flag: "stranded" },
  { label: "Marketing", cluster: "content", expandable: true },
  { label: "Finance", cluster: "revenue" },
  { label: "Campaigns", cluster: "revenue", flag: "buried" },
  { label: "Contracts", cluster: "revenue" },
  { label: "Alerts", cluster: "monitor", flag: "stranded" },
  { label: "Studio Approvals", cluster: "people", flag: "stranded" },
  { label: "Pages", cluster: "meta" },
];

/** V2 groups render with a cluster tag + separator between groups. */
const NAV_V2_GROUPS: Array<{ tag: string; items: MockEntry[] }> = [
  {
    tag: "Monitor",
    items: [
      { label: "Dashboard", cluster: "monitor" },
      { label: "Alerts", cluster: "monitor" },
    ],
  },
  {
    tag: "Revenue",
    items: [
      {
        label: "Campaigns",
        cluster: "revenue",
        expandable: true,
        subItems: [
          { label: "Overview" },
          { label: "CPM Calculator", flag: "new" },
        ],
      },
      { label: "Finance", cluster: "revenue" },
      { label: "Contracts", cluster: "revenue" },
    ],
  },
  {
    tag: "People",
    items: [
      { label: "Contacts", cluster: "people" },
      { label: "Tasks", cluster: "people" },
      { label: "Studio Approvals", cluster: "people" },
    ],
  },
  {
    tag: "Matching",
    items: [
      { label: "Marketplace", cluster: "matching", expandable: true },
      { label: "XQ Responses", cluster: "matching" },
      { label: "RQ Responses", cluster: "matching" },
    ],
  },
  {
    tag: "Content · Meta",
    items: [
      { label: "Marketing", cluster: "content", expandable: true },
      { label: "Pages", cluster: "meta" },
    ],
  },
];

const FLAG_TEXT = {
  stranded: "stranded",
  buried: "CPM buried",
  new: "now visible",
} as const;

function MockRow({ entry }: { entry: MockEntry }) {
  return (
    <>
      <div className={styles.mockRow}>
        <span
          className={`${styles.clusterDot} ${styles[`cluster_${entry.cluster}`]}`}
        />
        <span className={styles.mockLabel}>{entry.label}</span>
        {entry.flag ? (
          <span
            className={`${styles.mockFlag} ${entry.flag === "new" ? styles.mockFlagNew : ""}`}
          >
            {FLAG_TEXT[entry.flag]}
          </span>
        ) : null}
        {entry.expandable ? (
          <span className={styles.mockChevron} aria-hidden="true">
            {entry.subItems ? "▴" : "▾"}
          </span>
        ) : null}
      </div>
      {entry.subItems?.map((sub) => (
        <div key={sub.label} className={styles.mockSubRow}>
          <span className={styles.mockSubDot} />
          <span className={styles.mockLabel}>{sub.label}</span>
          {sub.flag ? (
            <span className={`${styles.mockFlag} ${styles.mockFlagNew}`}>
              {FLAG_TEXT[sub.flag]}
            </span>
          ) : null}
        </div>
      ))}
    </>
  );
}

function NavComparison() {
  return (
    <section aria-label="Current vs proposed navigation order">
      <div className={styles.legend}>
        {(Object.keys(CLUSTER_LABELS) as Cluster[]).map((c) => (
          <span key={c} className={styles.legendItem}>
            <span className={`${styles.clusterDot} ${styles[`cluster_${c}`]}`} />
            {CLUSTER_LABELS[c]}
          </span>
        ))}
      </div>

      <div className={styles.compare}>
        <div>
          <h3 className={styles.compareTitle}>
            Current <span className={styles.compareHint}>— clusters interleaved</span>
          </h3>
          <div className={styles.mockRail}>
            {NAV_CURRENT.map((entry) => (
              <MockRow key={entry.label} entry={entry} />
            ))}
          </div>
        </div>
        <div>
          <h3 className={styles.compareTitle}>
            Proposed V2{" "}
            <span className={styles.compareHint}>— clusters contiguous</span>
          </h3>
          <div className={styles.mockRail}>
            {NAV_V2_GROUPS.map((group) => (
              <div key={group.tag} className={styles.mockGroup}>
                <div className={styles.mockGroupTag}>{group.tag}</div>
                {group.items.map((entry) => (
                  <MockRow key={entry.label} entry={entry} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className={styles.compareNote}>
        Colored dots mark each item&apos;s task cluster — they annotate this
        comparison and are not part of the proposed UI.
      </p>
    </section>
  );
}

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
          subtitle="The sidebar on the left shows the proposed order. Same thirteen destinations, no renames, no route changes — just re-sorted into task clusters. Below: both orders side by side."
        />

        <NavComparison />

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
              order again, or scan the side-by-side comparison above.
            </p>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

import Link from "next/link";

import { Badge, PageHeader } from "@/components/admin";

import styles from "./page.module.css";

/**
 * /hq/pages — overview of every route in the project.
 *
 * Inventoried by hand so each entry can carry a short description
 * + tags. Refresh this file when a page is added or renamed.
 * Categories are ordered by audience: public marketing first,
 * then assessments, then internal surfaces.
 */

type Tag = "public" | "auth-gated" | "client" | "internal" | "dev";

type PageEntry = {
  path: string;
  name: string;
  description: string;
  tags: Tag[];
};

type Category = {
  title: string;
  blurb: string;
  pages: PageEntry[];
};

const CATEGORIES: Category[] = [
  {
    title: "Public marketing",
    blurb: "The customer-facing website. SEO-indexed.",
    pages: [
      {
        path: "/",
        name: "Home",
        description: "Long-form landing page with the deep scroll motion choreography.",
        tags: ["public"],
      },
      {
        path: "/for-advertisers",
        name: "For Brands / Advertisers",
        description: "Pitch surface for brands looking for podcast partnerships.",
        tags: ["public"],
      },
      {
        path: "/for-creators",
        name: "For Creators",
        description: "Pitch surface for podcasters considering joining the network.",
        tags: ["public"],
      },
      {
        path: "/what-is-this",
        name: "What Is This",
        description: "Explanation of GhostSignal's matching engine + values-DNA thesis.",
        tags: ["public"],
      },
      {
        path: "/who-are-we",
        name: "Who Are We",
        description: "Founders + company story.",
        tags: ["public"],
      },
      {
        path: "/get-in-touch",
        name: "Contact",
        description: "Inquiry form. Routes to the team.",
        tags: ["public"],
      },
      {
        path: "/snowdrift",
        name: "Snowdrift",
        description: "Hidden / micro-campaign landing surface.",
        tags: ["public"],
      },
      {
        path: "/signal-sheet",
        name: "Signal Sheet",
        description: "Newsletter / sheet-style content surface.",
        tags: ["public"],
      },
    ],
  },
  {
    title: "Assessments + previews",
    blurb: "The XQ and RQ quiz flows + the deck experiences they feed into.",
    pages: [
      {
        path: "/xq-quiz",
        name: "XQ Quiz",
        description: "The Conviction Quotient quiz — three-phase diagnostic flow.",
        tags: ["public"],
      },
      {
        path: "/rq-quiz",
        name: "RQ Quiz",
        description: "The Resonance Quotient quiz — partnership matching profile.",
        tags: ["public"],
      },
      {
        path: "/xq-characters",
        name: "XQ Characters (v1)",
        description: "Gallery of all 8 archetype characters.",
        tags: ["public"],
      },
      {
        path: "/xq-characters/[code]",
        name: "XQ Character Detail (v1)",
        description: "Per-archetype detail page. Open via /xq-characters first.",
        tags: ["public"],
      },
      {
        path: "/xq-characters2",
        name: "XQ Characters (v2)",
        description: "Updated 3D-illustration variant of the archetype gallery.",
        tags: ["public"],
      },
      {
        path: "/xq-characters2/[code]",
        name: "XQ Character Detail (v2)",
        description: "Per-archetype detail. v2 visual.",
        tags: ["public"],
      },
      {
        path: "/x-deck",
        name: "X-Deck",
        description: "Trading-card preview surface with the coverflow carousel. Powers the marketplace deck.",
        tags: ["public"],
      },
    ],
  },
  {
    title: "World (multiplayer RPG)",
    blurb: "The Phaser + Colyseus world replacing the admin marketplace map.",
    pages: [
      {
        path: "/world",
        name: "GhostSignal World",
        description: "Phaser canvas + Colyseus realtime room. Walk around, interact with NPCs, mount horses, etc.",
        tags: ["public"],
      },
    ],
  },
  {
    title: "Studio (client portal)",
    blurb: "Per-user authenticated surface for brands + creators.",
    pages: [
      {
        path: "/studio",
        name: "Studio Dashboard",
        description: "Scoped dashboard — creators see their show's ART19 numbers, brands see campaign performance.",
        tags: ["client", "auth-gated"],
      },
      {
        path: "/studio/login",
        name: "Studio Login",
        description: "Supabase email/password sign-in.",
        tags: ["public"],
      },
      {
        path: "/studio/register",
        name: "Studio Registration",
        description: "Open self-serve sign-up. Co-founder approves before access.",
        tags: ["public"],
      },
      {
        path: "/studio/pending",
        name: "Studio Pending",
        description: "Holding screen for registered-but-not-yet-approved users.",
        tags: ["client", "auth-gated"],
      },
      {
        path: "/studio/marketplace",
        name: "Studio Marketplace",
        description: "Cross-side discovery deck. Brands flick through creators; creators flick through brands.",
        tags: ["client", "auth-gated"],
      },
    ],
  },
  {
    title: "HQ — core CRM",
    blurb: "Internal co-founder workspace (you're here).",
    pages: [
      {
        path: "/admin",
        name: "HQ Dashboard",
        description: "Co-founder home: cash trend, alerts, recent activity, KPI rollups.",
        tags: ["internal", "auth-gated"],
      },
      {
        path: "/admin/contacts",
        name: "Contacts",
        description: "Members CRM: every person GhostSignal knows. Pipeline phase + outreach tracking.",
        tags: ["internal", "auth-gated"],
      },
      {
        path: "/admin/marketplace",
        name: "Marketplace (HQ)",
        description: "Internal view of the matching pool. Distinct from Studio's marketplace.",
        tags: ["internal", "auth-gated"],
      },
      {
        path: "/admin/studio-approvals",
        name: "Studio Approvals",
        description: "Pending Studio registrations to approve / deny.",
        tags: ["internal", "auth-gated"],
      },
      {
        path: "/admin/studio-picks",
        name: "Studio GS Picks",
        description: "Curate the GhostSignal Pick brands leading each member's roster deck.",
        tags: ["internal", "auth-gated"],
      },
      {
        path: "/admin/studio-requests",
        name: "Studio Intro Requests",
        description: "Triage queue for member → brand brokered-intro requests.",
        tags: ["internal", "auth-gated"],
      },
      {
        path: "/admin/tasks",
        name: "Tasks",
        description: "Shared task queue for the four co-founders.",
        tags: ["internal", "auth-gated"],
      },
      {
        path: "/admin/alerts",
        name: "Alerts",
        description: "CRM signals across the funnel (stale leads, late contracts, milestones).",
        tags: ["internal", "auth-gated"],
      },
    ],
  },
  {
    title: "HQ — quiz responses",
    blurb: "Per-submission detail for the XQ + RQ pipelines.",
    pages: [
      {
        path: "/admin/xq-responses",
        name: "XQ Responses",
        description: "List + detail for every XQ submission. Status, archetype code, payload.",
        tags: ["internal", "auth-gated"],
      },
      {
        path: "/admin/rq-responses",
        name: "RQ Responses",
        description: "List + detail for every RQ submission.",
        tags: ["internal", "auth-gated"],
      },
    ],
  },
  {
    title: "HQ — campaigns + finance + ops",
    blurb: "The revenue and operational dashboards.",
    pages: [
      {
        path: "/admin/art19",
        name: "Campaigns",
        description: "ART19 podcast network sync: shows, episodes, listen counts, campaign list.",
        tags: ["internal", "auth-gated"],
      },
      {
        path: "/admin/art19/cpm",
        name: "Signal Fidelity CPM Calculator",
        description: "Ballpark-CPM estimation from benchmark, position, type & length (Jack's spec).",
        tags: ["internal", "auth-gated"],
      },
      {
        path: "/admin/finance",
        name: "Finance",
        description: "Mercury sync — accounts, transactions, cash trend chart.",
        tags: ["internal", "auth-gated"],
      },
      {
        path: "/admin/contracts",
        name: "Contracts",
        description: "esignatures.com integration: contract list, status, signers.",
        tags: ["internal", "auth-gated"],
      },
      {
        path: "/admin/contracts/[id]",
        name: "Contract Detail",
        description: "Per-contract drill-down. PDF embed, signer roster, member link.",
        tags: ["internal", "auth-gated"],
      },
    ],
  },
  {
    title: "HQ — marketing",
    blurb: "Asset, copy, and social-post management.",
    pages: [
      {
        path: "/admin/marketing",
        name: "Marketing Home",
        description: "Marketing tree landing page.",
        tags: ["internal", "auth-gated"],
      },
      {
        path: "/admin/marketing/assets",
        name: "Marketing Assets",
        description: "Visual asset library + file tracking.",
        tags: ["internal", "auth-gated"],
      },
      {
        path: "/admin/marketing/copy",
        name: "Marketing Copy",
        description: "Canonical phrase library (taglines, social snippets).",
        tags: ["internal", "auth-gated"],
      },
      {
        path: "/admin/marketing/social",
        name: "Social Planner",
        description: "Scheduled social posts + image attachments + daily digest.",
        tags: ["internal", "auth-gated"],
      },
    ],
  },
  {
    title: "HQ — utilities",
    blurb: "Auth + meta surfaces.",
    pages: [
      {
        path: "/admin/login",
        name: "HQ Login",
        description: "Shared-password gate for the four co-founders.",
        tags: ["public"],
      },
      {
        path: "/admin/pages",
        name: "Pages (this page)",
        description: "Overview of every route in the project.",
        tags: ["internal", "auth-gated"],
      },
    ],
  },
  {
    title: "Developer / reference",
    blurb: "Internal showcase + design-system pages.",
    pages: [
      {
        path: "/design-system",
        name: "Design System",
        description: "Visual reference for --gs-* tokens (colors, typography, spacing).",
        tags: ["dev"],
      },
    ],
  },
];

const TAG_VARIANT: Record<Tag, "info" | "accent" | "neutral" | "warn"> = {
  public: "info",
  client: "accent",
  internal: "warn",
  "auth-gated": "neutral",
  dev: "neutral",
};

export default function PagesOverviewPage() {
  const total = CATEGORIES.reduce((sum, c) => sum + c.pages.length, 0);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Pages"
        subtitle="Every route in the project. Refresh this list when a page is added or renamed (page.tsx files only; API routes are documented elsewhere)."
        count={<Badge variant="neutral">{total} pages</Badge>}
      />

      {CATEGORIES.map((cat) => (
        <section key={cat.title} className={styles.category}>
          <header className={styles.categoryHeader}>
            <h2 className={styles.categoryTitle}>{cat.title}</h2>
            <p className={styles.categoryBlurb}>{cat.blurb}</p>
            <span className={styles.categoryCount}>{cat.pages.length}</span>
          </header>
          <div className={styles.grid}>
            {cat.pages.map((p) => (
              <PageCard key={p.path} entry={p} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function PageCard({ entry }: { entry: PageEntry }) {
  const isDynamic = entry.path.includes("[");
  const Wrapper = isDynamic ? "div" : (Link as unknown as "div");
  const linkProps = isDynamic ? {} : { href: entry.path };

  return (
    <Wrapper className={styles.card} {...linkProps}>
      <div className={styles.cardHead}>
        <span className={styles.cardName}>{entry.name}</span>
        <code className={styles.cardPath}>{entry.path}</code>
      </div>
      <p className={styles.cardDesc}>{entry.description}</p>
      <div className={styles.cardTags}>
        {entry.tags.map((t) => (
          <Badge key={t} variant={TAG_VARIANT[t]}>
            {t}
          </Badge>
        ))}
      </div>
    </Wrapper>
  );
}

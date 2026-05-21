"use client";

import { useState } from "react";

import { PageHeader } from "@/components/admin";

import { DueBanner } from "./components/social/DueBanner";
import { SubTabNav, type MarketingSection } from "./components/SubTabNav";
import { AssetsSection } from "./sections/AssetsSection";
import { CopySection } from "./sections/CopySection";
import { SocialSection } from "./sections/SocialSection";
import styles from "./marketing.module.css";

/**
 * /admin/marketing — three sub-sections behind a single page header:
 *
 *   Assets — the Marketing Asset Library (logos, brand guide, etc.)
 *   Copy   — the Copy Library (headlines, taglines, CTAs, social hooks)
 *   Social — the Social Media Scheduler (FB / IG / Substack calendar)
 *
 * Local state, no route segments. Matches the existing
 * single-page-with-local-state pattern used everywhere else in
 * admin (CategoryTabs, the leads phase filters, etc.).
 *
 * Default tab on first load is "assets" — preserves muscle memory for
 * anyone who learned the old single-section URL.
 */
export default function MarketingPage() {
  const [section, setSection] = useState<MarketingSection>("assets");

  return (
    <div className={styles.page}>
      <PageHeader
        title="Marketing"
        subtitle="Brand assets, canonical copy, and scheduled social posts."
        toolbar={<SubTabNav value={section} onChange={setSection} />}
      />

      <DueBanner onOpenSocial={() => setSection("social")} />

      {section === "assets" && <AssetsSection />}
      {section === "copy" && <CopySection />}
      {section === "social" && <SocialSection />}
    </div>
  );
}

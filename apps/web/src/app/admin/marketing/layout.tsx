"use client";

import { type ReactNode } from "react";

import { PageHeader } from "@/components/admin";

import { DueBanner } from "./components/social/DueBanner";
import styles from "./marketing.module.css";

/**
 * Shared parent for the three Marketing sub-routes
 * (/admin/marketing/{assets,copy,social}).
 *
 * Owns the title row + the due-social-posts banner so all three
 * sub-sections present a consistent header. Sub-tab navigation now
 * lives in the persistent left sidebar (see `AdminSidebar`), so the
 * old in-page chip strip is gone — `{children}` renders the section
 * directly.
 *
 * The banner's `onOpenSocial` originally switched a local-state sub-
 * tab. After the sub-routes refactor, it just navigates to the Social
 * page — keeps the same "jump to the scheduler" UX.
 */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <PageHeader
        title="Marketing"
        subtitle="Brand assets, canonical copy, and scheduled social posts."
      />

      <DueBanner />

      {children}
    </div>
  );
}

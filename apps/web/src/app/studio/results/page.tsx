import { redirect } from "next/navigation";

/** Per-user page — needs the request's auth context, so never
 *  statically prerendered. */
export const dynamic = "force-dynamic";

import { loadCurrentStudioMember } from "@/lib/studio-auth";
import { loadStudioRqSummary, loadStudioXqSummary } from "@/lib/studio-data";

import { StudioHeader } from "../StudioHeader";
import { RqProfileCard } from "../RqProfileCard";
import { XqProfileCard } from "../XqProfileCard";

import styles from "../studio.module.css";

/**
 * /studio/results — the member's XQ + RQ reveal, so they can revisit the
 * full breakdown they only saw once (right after each quiz). Reuses the
 * same reveal cards + loaders the legacy dashboard used; every account
 * type gets them since they read the member's own submission rows.
 */
export default async function StudioResultsPage() {
  const member = await loadCurrentStudioMember();
  if (!member) redirect("/studio/login");
  if (!member.isApproved) redirect("/studio/pending");

  const [xqSummary, rqSummary] = await Promise.all([
    loadStudioXqSummary(member.xqSubmissionId),
    loadStudioRqSummary(member.rqSubmissionId),
  ]);

  return (
    <>
      <StudioHeader
        activeTab="results"
        profile={{
          initial: member.displayName.trim().charAt(0).toUpperCase() || "?",
          imageUrl: null,
          attention: !member.xqSubmissionId || !member.rqSubmissionId,
        }}
      />
      <main className={styles.dashMain}>
        <h1 className={styles.dashWelcome}>Your results</h1>
        <p className={styles.dashSubtitle}>
          Your XQ Conviction and RQ Resonance profiles — the same reveal you
          saw right after each quiz. Come back any time.
        </p>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Your conviction profile</h3>
          <div className={styles.profileGrid}>
            <XqProfileCard
              summary={xqSummary}
              fallbackCode={member.xqArchetype}
            />
            <RqProfileCard summary={rqSummary} fallbackCode={member.rqCode} />
          </div>
        </section>
      </main>
    </>
  );
}

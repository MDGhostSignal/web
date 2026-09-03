import { redirect } from "next/navigation";

/** Per-user page — needs the request's auth context, so never
 *  statically prerendered. */
export const dynamic = "force-dynamic";

import { loadCurrentStudioMember } from "@/lib/studio-auth";
import { loadStudioOrgProfile } from "@/lib/studio-data";

import { StudioHeader } from "../StudioHeader";
import { MigrationGuide } from "./MigrationGuide";

import styles from "./migration.module.css";

/**
 * /studio/migration — ART19 Tutorial. Two chapters: the move
 * checklist, then inserting ad markers. Checklist state persists per
 * device (localStorage) inside MigrationGuide.
 */
export default async function StudioMigrationPage() {
  const member = await loadCurrentStudioMember();
  if (!member) redirect("/studio/login");
  if (!member.isApproved) redirect("/studio/pending");

  const org = await loadStudioOrgProfile(member);

  return (
    <>
      <StudioHeader
        activeTab="migration"
        profile={{
          initial: member.displayName.trim().charAt(0).toUpperCase() || "?",
          imageUrl: org?.imageUrl ?? null,
          attention: !member.xqSubmissionId || !member.rqSubmissionId,
        }}
      />
      {/* Own main wrapper (not .dashMain): two chapters, so the
          page is allowed to scroll. */}
      <main className={styles.main}>
        <MigrationGuide firstName={member.firstName} />
      </main>
    </>
  );
}

import { redirect } from "next/navigation";

/** Per-user page — needs the request's auth context, so never
 *  statically prerendered. */
export const dynamic = "force-dynamic";

import { loadCurrentStudioMember } from "@/lib/studio-auth";
import { loadStudioOrgProfile } from "@/lib/studio-data";

import { StudioHeader } from "../StudioHeader";
import { MigrationGuide } from "./MigrationGuide";

import styles from "../studio.module.css";

/**
 * /studio/migration — the ART19 RSS-migration guide, browser edition
 * of docs' GS-RSS-Migration PDF (v1 04.29). One wide page laid out so
 * a podcaster can keep it open in one tab while working through the
 * actual move on their current host in another. Checklist state
 * persists per device (localStorage) inside MigrationGuide.
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
      <main className={styles.dashMain}>
        <MigrationGuide firstName={member.firstName} />
      </main>
    </>
  );
}

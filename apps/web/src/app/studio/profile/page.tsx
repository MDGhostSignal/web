import { redirect } from "next/navigation";

/** Per-user page — needs the request's auth context, so never
 *  statically prerendered. */
export const dynamic = "force-dynamic";

import { loadCurrentStudioMember } from "@/lib/studio-auth";
import { loadStudioOrgProfile } from "@/lib/studio-data";

import { StudioHeader } from "../StudioHeader";
import { ProfileForm } from "./ProfileForm";

import styles from "../studio.module.css";

/** /studio/profile — member-editable profile. Contact name lives on
 *  the members row; description + URLs live on the linked brand or
 *  creator row. Org *name* is deliberately read-only here — it's the
 *  identity other members see in the marketplace, so changes go
 *  through the team. */
export default async function StudioProfilePage() {
  const member = await loadCurrentStudioMember();
  if (!member) redirect("/studio/login");
  if (!member.isApproved) redirect("/studio/pending");

  const org = await loadStudioOrgProfile(member);

  return (
    <>
      <StudioHeader activeTab="profile" />
      <main className={styles.dashMain}>
        <h1 className={styles.dashWelcome}>Your profile</h1>
        <p className={styles.dashSubtitle}>
          {member.kind === "creator"
            ? "How your show presents to brands across the marketplace."
            : member.kind === "brand"
            ? "How your brand presents to creators across the marketplace."
            : "Your contact details."}
        </p>
        <ProfileForm
          member={{
            kind: member.kind,
            firstName: member.firstName,
            lastName: member.lastName,
          }}
          org={org}
        />
      </main>
    </>
  );
}

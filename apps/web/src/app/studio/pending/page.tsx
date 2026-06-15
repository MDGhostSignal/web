import { redirect } from "next/navigation";

import { loadCurrentStudioMember } from "@/lib/studio-auth";

import styles from "../studio.module.css";

/** Shown after registration (or login while still unapproved).
 *  Approved members are redirected to the dashboard so the URL
 *  doesn't get bookmarked as a holding pen. */
export default async function StudioPendingPage() {
  const member = await loadCurrentStudioMember();
  if (member?.isApproved) redirect("/studio");

  return (
    <main className={styles.authPage}>
      <div className={styles.authCard} style={{ textAlign: "center" }}>
        <div className={styles.pendingIcon} aria-hidden="true">⏳</div>
        <h1 className={styles.title}>Waiting for approval</h1>
        <p className={styles.subtitle}>
          Thanks for registering. A GhostSignal co-founder will review
          your account shortly. You&apos;ll receive an email once
          you&apos;re approved — usually within a business day.
        </p>
        {member && (
          <p className={styles.subtitle}>
            Signed in as <strong>{member.email}</strong>.
          </p>
        )}
      </div>
    </main>
  );
}

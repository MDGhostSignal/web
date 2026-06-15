import { redirect } from "next/navigation";

import { loadCurrentStudioMember } from "@/lib/studio-auth";

import styles from "./studio.module.css";
import { SignOutButton } from "./SignOutButton";

/** Studio dashboard — landing page after login.
 *  MVP shows a name + role greeting and a few KPI placeholders. The
 *  real ART19 data wiring lands in chunk 20c with scoped queries
 *  (creator-only for creators, brand-only for brands). */
export default async function StudioDashboardPage() {
  const member = await loadCurrentStudioMember();
  if (!member) redirect("/studio/login");
  if (!member.isApproved) redirect("/studio/pending");

  return (
    <>
      <header className={styles.dashHeader}>
        <div className={styles.dashHeaderBrand}>
          <span className={styles.brandName}>GhostSignal</span>
          <span className={styles.brandTag}>Studio</span>
        </div>
        <SignOutButton />
      </header>
      <main className={styles.dashMain}>
        <h1 className={styles.dashWelcome}>
          Welcome, {member.firstName ?? member.displayName}.
        </h1>
        <p className={styles.dashSubtitle}>
          {member.kind === "creator"
            ? "Your show's performance, partnership signals, and the brands looking for creators like you."
            : member.kind === "brand"
            ? "Your campaigns, audience reach, and the podcasts that match your brand values."
            : "Your GhostSignal workspace."}
        </p>

        <div className={styles.dashGrid}>
          <div className={styles.dashCard}>
            <div className={styles.dashCardLabel}>Profile</div>
            <div className={styles.dashCardValue}>{member.displayName}</div>
            <div className={styles.dashCardHint}>
              {member.kind === "creator" ? "Creator" : member.kind === "brand" ? "Brand" : "—"}
              {member.xqArchetype ? ` · XQ ${member.xqArchetype}` : ""}
            </div>
          </div>
          <div className={styles.dashCard}>
            <div className={styles.dashCardLabel}>
              {member.kind === "creator" ? "Show performance" : "Campaign performance"}
            </div>
            <div className={styles.dashCardValue}>—</div>
            <div className={styles.dashCardHint}>
              Wires up in the next release. {member.kind === "creator"
                ? "Your show's ART19 listen numbers will appear here."
                : "Your campaign reach will appear here."}
            </div>
          </div>
          <div className={styles.dashCard}>
            <div className={styles.dashCardLabel}>Marketplace</div>
            <div className={styles.dashCardValue}>Coming soon</div>
            <div className={styles.dashCardHint}>
              Browse {member.kind === "creator" ? "brands looking for creators" : "podcasts looking for brands"} that align with your XQ.
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

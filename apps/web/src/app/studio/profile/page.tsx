import { redirect } from "next/navigation";

/** Per-user page — needs the request's auth context, so never
 *  statically prerendered. */
export const dynamic = "force-dynamic";

import {
  bounceUnlinkedStudioSession,
  loadCurrentStudioMember,
} from "@/lib/studio-auth";
import {
  loadMemberIntake,
  loadStudioOrgProfile,
  loadStudioRqSummary,
  loadStudioXqSummary,
} from "@/lib/studio-data";

import { StudioHeader } from "../StudioHeader";
import { StudioNotices } from "../StudioNotices";
import { BrandCardFace } from "../roster/BrandDeck";
import { ProfileForm } from "./ProfileForm";
import { RqTile, XqTile } from "./QuizTiles";

import styles from "../studio.module.css";

/** /studio/profile — member-editable profile. Contact name lives on
 *  the members row; description + URLs live on the linked brand or
 *  creator row. Org *name* is deliberately read-only here — it's the
 *  identity other members see in the marketplace, so changes go
 *  through the team. */
export default async function StudioProfilePage() {
  const member = await loadCurrentStudioMember();
  await bounceUnlinkedStudioSession(member);
  if (!member) redirect("/studio/login");
  if (!member.isApproved) redirect("/studio/pending");

  const [org, xqSummary, rqSummary, intake] = await Promise.all([
    loadStudioOrgProfile(member),
    loadStudioXqSummary(member.xqSubmissionId),
    loadStudioRqSummary(member.rqSubmissionId),
    loadMemberIntake(member.id),
  ]);

  return (
    <>
      <StudioHeader
        activeTab="profile"
        profile={{
          initial: member.displayName.trim().charAt(0).toUpperCase() || "?",
          imageUrl: org?.imageUrl ?? null,
          attention: !member.xqSubmissionId || !member.rqSubmissionId,
        }}
      />
      <main className={styles.dashMain}>
        <StudioNotices member={member} org={org} />
        <p className={styles.dashGreeting}>
          Welcome back, {member.firstName?.trim() || member.displayName}.
        </p>
        <h1 className={styles.dashWelcome}>Your profile</h1>
        <p className={styles.dashSubtitle}>
          {member.kind === "creator"
            ? "How your show presents to brands across the marketplace."
            : member.kind === "brand"
            ? "How your brand presents to creators across the marketplace."
            : "Your personal card on the network, and your contact details."}
        </p>

        {/* Two visually distinct panels: the read-only profile summary
            (roster-card preview + assessment tiles) and the editable
            form. */}
        <div className={styles.profileLayout}>
          <section
            className={styles.summaryPanel}
            aria-label="Profile summary"
          >
            <div className={styles.panelHeading}>
              <h2 className={styles.panelTitle}>Profile summary</h2>
              <p className={styles.panelHint}>
                Preview — how the network sees you. Updates when you
                save.
              </p>
            </div>

            {org && (
              <div className={styles.cardPreviewWrap}>
                <BrandCardFace
                  standalone
                  brand={{
                    id: "preview",
                    name: org.name,
                    tagline: org.tagline,
                    description: org.description,
                    website: org.website,
                    logoUrl: org.imageUrl,
                    sinceYear: org.sinceYear,
                    archetype: member.xqArchetype,
                    matchScore: null,
                    recommended: false,
                  }}
                />
              </div>
            )}

            {/* XQ / RQ tiles — persistent fill-me reminders until each
                assessment exists, then compact result summaries. */}
            <XqTile summary={xqSummary} />
            <RqTile summary={rqSummary} />
          </section>

          <section className={styles.editPanel} aria-label="Edit your profile">
            <div className={styles.panelHeading}>
              <h2 className={styles.panelTitle}>Edit your details</h2>
              <p className={styles.panelHint}>
                Fill out the fields and save — your card and the roster
                update immediately.
              </p>
            </div>
            <ProfileForm
              member={{
                kind: member.kind,
                firstName: member.firstName,
                lastName: member.lastName,
              }}
              org={org}
              intake={intake}
            />
          </section>
        </div>
      </main>
    </>
  );
}

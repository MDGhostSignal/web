import { redirect } from "next/navigation";

/** Per-user page — needs the request's auth context, so never
 *  statically prerendered. */
export const dynamic = "force-dynamic";

import { loadCurrentStudioMember } from "@/lib/studio-auth";
import {
  loadStudioOrgProfile,
  loadStudioRqSummary,
  loadStudioXqSummary,
} from "@/lib/studio-data";

import { StudioHeader } from "../StudioHeader";
import { StudioNotices } from "../StudioNotices";
import { RosterCardFace } from "../roster/BrandCardBrowser";
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
  if (!member) redirect("/studio/login");
  if (!member.isApproved) redirect("/studio/pending");

  const [org, xqSummary, rqSummary] = await Promise.all([
    loadStudioOrgProfile(member),
    loadStudioXqSummary(member.xqSubmissionId),
    loadStudioRqSummary(member.rqSubmissionId),
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
        <h1 className={styles.dashWelcome}>Your profile</h1>
        <p className={styles.dashSubtitle}>
          {member.kind === "creator"
            ? "How your show presents to brands across the marketplace."
            : member.kind === "brand"
            ? "How your brand presents to creators across the marketplace."
            : "Your personal card on the network, and your contact details."}
        </p>

        {/* Two-column layout: card preview + XQ/RQ tiles on the left,
            the profile questionnaire filling the remaining width. */}
        <div className={styles.profileLayout}>
          <div className={styles.profileSide}>
            {/* Live preview of the member's own roster card — exactly
                the face other members see. Server-rendered, so it
                refreshes after every profile save / image upload. */}
            {org && (
              <section>
                <h3 className={styles.sectionTitle}>Your roster card</h3>
                <div className={styles.cardPreviewWrap}>
                  <RosterCardFace
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
                <p className={styles.fieldHint}>
                  This is how your card appears on the network roster —
                  edits update it once saved.
                </p>
              </section>
            )}

            {/* XQ / RQ tiles — persistent fill-me reminders until each
                assessment exists, then compact result summaries. */}
            <XqTile summary={xqSummary} />
            <RqTile summary={rqSummary} />
          </div>

          <div className={styles.profileMain}>
            <ProfileForm
              member={{
                kind: member.kind,
                firstName: member.firstName,
                lastName: member.lastName,
              }}
              org={org}
            />
          </div>
        </div>
      </main>
    </>
  );
}

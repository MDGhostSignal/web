import { redirect } from "next/navigation";

/** Onboarding state is per-user — render every request. */
export const dynamic = "force-dynamic";

import { loadCurrentStudioMember } from "@/lib/studio-auth";
import {
  loadStudioOrgProfile,
  studioOnboardingStatus,
} from "@/lib/studio-data";

import { StudioHeader } from "../StudioHeader";
import { WelcomeSplash } from "./WelcomeSplash";

import styles from "./welcome.module.css";

/**
 * /studio/welcome — first-login onboarding splash. The roster (the
 * signed-in home) redirects here while the member's setup is
 * incomplete: XQ + RQ quizzes, a logo/image, the card description,
 * and — creators only — the show's RSS feed URL (the team needs it
 * for the ART19 import). Once everything is done (or on any visit
 * when it already is), this page bounces straight to the roster, so
 * completing the last item on the splash naturally opens the studio.
 * "Skip for now" sets a 7-day cookie the roster honors.
 *
 * ?preview=1 skips the completeness redirect so the team can inspect
 * the splash with a fully-set-up account (still auth-gated).
 */
export default async function StudioWelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const member = await loadCurrentStudioMember();
  if (!member) redirect("/studio/login");
  if (!member.isApproved) redirect("/studio/pending");

  const { preview } = await searchParams;
  const org = await loadStudioOrgProfile(member);
  const status = studioOnboardingStatus(member, org);
  if (status.complete && preview !== "1") redirect("/studio/roster");

  return (
    <>
      <StudioHeader
        activeTab="welcome"
        profile={{
          initial: member.displayName.trim().charAt(0).toUpperCase() || "?",
          imageUrl: org?.imageUrl ?? null,
          attention: !status.complete,
        }}
      />
      <main className={styles.main}>
        <WelcomeSplash
          firstName={member.firstName}
          kind={member.kind}
          orgName={org?.name ?? member.displayName}
          imageUrl={org?.imageUrl ?? null}
          description={org?.description ?? null}
          rssUrl={org?.rssUrl ?? null}
          xqDone={status.xqDone}
          rqDone={status.rqDone}
          xqLabel={member.xqArchetype}
          rqLabel={member.rqCode}
        />
      </main>
    </>
  );
}

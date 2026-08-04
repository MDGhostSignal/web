import Image from "next/image";
import { redirect } from "next/navigation";

/** Studio dashboard is per-user; static prerender would just throw
 *  on the missing auth context. Render every request. */
export const dynamic = "force-dynamic";

import { loadCurrentStudioMember } from "@/lib/studio-auth";
import {
  formatDuration,
  formatListens,
  formatRelativeDate,
  loadBrandCampaignsData,
  loadCreatorShowData,
  loadStudioRqSummary,
  loadStudioXqSummary,
  type BrandCampaignsData,
  type CreatorShowData,
} from "@/lib/studio-data";

import { STUDIO_LITE_ONLY, STUDIO_ROSTER_HIDDEN } from "@/lib/studio-lite";

import { RqProfileCard } from "./RqProfileCard";
import { XqProfileCard } from "./XqProfileCard";
import { StudioLanding } from "./StudioLanding";
import { StudioLiteLanding } from "./StudioLiteLanding";

import styles from "./studio.module.css";
import { StudioHeader } from "./StudioHeader";

/** Studio dashboard — landing page after login. Data is scoped to
 *  the logged-in member's brand_id or creator_id so they only see
 *  their own performance numbers. */
export default async function StudioDashboardPage() {
  const member = await loadCurrentStudioMember();
  // Public landing page — visitors without an authenticated member
  // (i.e. prospective brands or creators who land at /studio cold)
  // see the marketing front door. The "Sign in" CTA in the landing
  // routes them on to /studio/login when they're actually a member.
  if (!member) {
    return STUDIO_LITE_ONLY ? <StudioLiteLanding /> : <StudioLanding />;
  }
  if (!member.isApproved) redirect("/studio/pending");
  // Lite mode: the legacy dashboard below (show stats + XQ/RQ cards)
  // is unrouted — the Roster is the workspace's standard view, unless
  // the roster is paused, in which case Profile is home.
  if (STUDIO_LITE_ONLY)
    redirect(STUDIO_ROSTER_HIDDEN ? "/studio/profile" : "/studio/roster");

  // Load the right slice of data based on what kind of member they are.
  // Both queries scope by id; no cross-tenant data is reachable.
  // XQ + RQ summaries are loaded in parallel — both come from the
  // signed-in member's own submission rows, so every account type
  // gets them regardless of kind.
  const [creatorData, brandData, xqSummary, rqSummary] = await Promise.all([
    member.kind === "creator" && member.creatorId
      ? loadCreatorShowData(member.creatorId)
      : Promise.resolve<CreatorShowData | null>(null),
    member.kind === "brand" && member.brandId
      ? loadBrandCampaignsData(member.brandId)
      : Promise.resolve<BrandCampaignsData | null>(null),
    loadStudioXqSummary(member.xqSubmissionId),
    loadStudioRqSummary(member.rqSubmissionId),
  ]);

  return (
    <>
      <StudioHeader activeTab="dashboard" />
      <main className={styles.dashMain}>
        <h1 className={styles.dashWelcome}>
          Welcome, {member.firstName ?? member.displayName}.
        </h1>
        <p className={styles.dashSubtitle}>
          {member.kind === "creator"
            ? "Your show's performance and the partnership signals shaped by your XQ archetype."
            : member.kind === "brand"
            ? "Your campaigns, audience reach, and podcasts that align with your brand values."
            : "Your GHOSTSignal workspace."}
        </p>

        {/* Creator dashboard */}
        {member.kind === "creator" && (
          <CreatorView data={creatorData} memberXq={member.xqArchetype} />
        )}

        {/* Brand dashboard (placeholder until brand-side scoping ships) */}
        {member.kind === "brand" && (
          <BrandView data={brandData} memberXq={member.xqArchetype} />
        )}

        {/* Fallback for member_type='other' */}
        {member.kind === "other" && (
          <div className={styles.dashGrid}>
            <div className={styles.dashCard}>
              <div className={styles.dashCardLabel}>Account type</div>
              <div className={styles.dashCardValue}>Other</div>
              <div className={styles.dashCardHint}>
                Get in touch with the team to clarify your account type and
                unlock the right dashboard.
              </div>
            </div>
          </div>
        )}

        {/* Conviction (XQ) + Resonance (RQ) profile — shown for every
            member type. Reveal-style: 3D portrait + value buckets for
            XQ; radar/axis-bar graph + signal clarity + per-axis blocks
            for RQ. Empty rendering nudges the user to take the quiz. */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Your conviction profile</h3>
          <div className={styles.profileGrid}>
            <XqProfileCard
              summary={xqSummary}
              fallbackCode={member.xqArchetype}
            />
            <RqProfileCard
              summary={rqSummary}
              fallbackCode={member.rqCode}
            />
          </div>
        </section>
      </main>
    </>
  );
}

/* ============================================================
 * Creator view
 * ============================================================ */

function CreatorView({
  data,
  memberXq,
}: {
  data: CreatorShowData | null;
  memberXq: string | null;
}) {
  if (!data?.show) {
    return (
      <div className={styles.dashGrid}>
        <div className={styles.dashCard}>
          <div className={styles.dashCardLabel}>Show performance</div>
          <div className={styles.dashCardValue}>Not connected</div>
          <div className={styles.dashCardHint}>
            We don&apos;t have your show linked to its ART19 record yet. The
            team will wire it up; you&apos;ll see your listen numbers here
            once it&apos;s connected.
          </div>
        </div>
      </div>
    );
  }

  const show = data.show;
  return (
    <>
      {/* Show header */}
      <div className={styles.showHeader}>
        {show.imageUrl && (
          <Image
            src={show.imageUrl}
            alt={show.title}
            width={88}
            height={88}
            className={styles.showImage}
            unoptimized
          />
        )}
        <div>
          <div className={styles.dashCardLabel}>Your show</div>
          <h2 className={styles.showTitle}>{show.title}</h2>
        </div>
      </div>

      {/* KPI grid */}
      <div className={styles.dashGrid}>
        <div className={styles.dashCard}>
          <div className={styles.dashCardLabel}>Total listens</div>
          <div className={styles.dashCardValue}>
            {formatListens(show.listenCount)}
          </div>
          <div className={styles.dashCardHint}>Across all episodes on ART19.</div>
        </div>
        <div className={styles.dashCard}>
          <div className={styles.dashCardLabel}>Episodes</div>
          <div className={styles.dashCardValue}>{show.episodeCount}</div>
          <div className={styles.dashCardHint}>Published on ART19.</div>
        </div>
      </div>

      {/* Recent episodes */}
      {data.recentEpisodes.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Recent episodes</h3>
          <div className={styles.episodeList}>
            {data.recentEpisodes.map((ep) => (
              <div key={ep.id} className={styles.episodeRow}>
                <div className={styles.episodeBody}>
                  <div className={styles.episodeTitle}>{ep.title}</div>
                  <div className={styles.episodeMeta}>
                    {formatRelativeDate(ep.publishedAt)} ·{" "}
                    {formatDuration(ep.durationSeconds)}
                  </div>
                </div>
                <div className={styles.episodeListens}>
                  <strong>{formatListens(ep.listenCount)}</strong>
                  <span>listens</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

/* ============================================================
 * Brand view (placeholder)
 * ============================================================ */

function BrandView({
  data,
  memberXq,
}: {
  data: BrandCampaignsData | null;
  memberXq: string | null;
}) {
  if (!data || data.campaigns.length === 0) {
    return (
      <div className={styles.dashGrid}>
        <div className={styles.dashCard}>
          <div className={styles.dashCardLabel}>Campaign performance</div>
          <div className={styles.dashCardValue}>—</div>
          <div className={styles.dashCardHint}>
            We&apos;re wiring your brand to your active campaigns on ART19.
            You&apos;ll see impressions, reach, and per-podcast breakdowns
            here once the link lands.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashGrid}>
      {data.campaigns.map((c) => (
        <div key={c.id} className={styles.dashCard}>
          <div className={styles.dashCardLabel}>Campaign</div>
          <div className={styles.dashCardValue}>{c.name}</div>
          <div className={styles.dashCardHint}>
            {formatListens(c.impressions)} impressions
          </div>
        </div>
      ))}
    </div>
  );
}


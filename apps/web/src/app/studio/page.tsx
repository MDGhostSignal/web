import Image from "next/image";
import { redirect } from "next/navigation";

import { loadCurrentStudioMember } from "@/lib/studio-auth";
import {
  formatDuration,
  formatListens,
  formatRelativeDate,
  loadBrandCampaignsData,
  loadCreatorShowData,
  type BrandCampaignsData,
  type CreatorShowData,
} from "@/lib/studio-data";

import styles from "./studio.module.css";
import { StudioHeader } from "./StudioHeader";

/** Studio dashboard — landing page after login. Data is scoped to
 *  the logged-in member's brand_id or creator_id so they only see
 *  their own performance numbers. */
export default async function StudioDashboardPage() {
  const member = await loadCurrentStudioMember();
  if (!member) redirect("/studio/login");
  if (!member.isApproved) redirect("/studio/pending");

  // Load the right slice of data based on what kind of member they are.
  // Both queries scope by id; no cross-tenant data is reachable.
  const creatorData: CreatorShowData | null =
    member.kind === "creator" && member.creatorId
      ? await loadCreatorShowData(member.creatorId)
      : null;
  const brandData: BrandCampaignsData | null =
    member.kind === "brand" && member.brandId
      ? await loadBrandCampaignsData(member.brandId)
      : null;

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
            : "Your GhostSignal workspace."}
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
        <ProfileCard memberXq={memberXq} />
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
        <ProfileCard memberXq={memberXq} />
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
        <ProfileCard memberXq={memberXq} />
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
      <ProfileCard memberXq={memberXq} />
    </div>
  );
}

/* ============================================================
 * Shared profile card
 * ============================================================ */

function ProfileCard({ memberXq }: { memberXq: string | null }) {
  return (
    <div className={styles.dashCard}>
      <div className={styles.dashCardLabel}>Your XQ</div>
      <div className={styles.dashCardValue}>{memberXq ?? "Not yet taken"}</div>
      <div className={styles.dashCardHint}>
        {memberXq
          ? "This archetype shapes the matching profile in the marketplace."
          : "Take the XQ assessment to surface your values-DNA. It powers the matching engine."}
      </div>
    </div>
  );
}

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
  type StudioRqSummary,
  type StudioXqSummary,
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

        {/* Conviction (XQ) + Resonance (RQ) profile — shown for every
            member type. Real data from the linked submission rows;
            empty rendering nudges the user to take the quiz. */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Your conviction profile</h3>
          <div className={styles.profileGrid}>
            <XqProfileCard summary={xqSummary} fallbackCode={member.xqArchetype} />
            <RqProfileCard summary={rqSummary} fallbackCode={member.rqCode} />
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

/* ============================================================
 * XQ + RQ profile cards (shown for every member type)
 * ============================================================
 *
 * Real data from the linked submission rows. Empty states nudge the
 * user toward taking the quiz. Visual style mirrors the dashGrid
 * cards but the chip layout matches the in-world CharacterCard
 * value-pill convention so the two surfaces feel like siblings.
 */

function XqProfileCard({
  summary,
  fallbackCode,
}: {
  summary: StudioXqSummary | null;
  fallbackCode: string | null;
}) {
  // Show the empty state if the user hasn't taken the XQ. Surface
  // a clear CTA so the dashboard doesn't dead-end on a placeholder.
  if (!summary && !fallbackCode) {
    return (
      <div className={styles.profileCard}>
        <div className={styles.profileTag}>XQ · Conviction Quotient</div>
        <div className={styles.profileEmpty}>
          You haven&apos;t taken the XQ yet. It surfaces your values DNA
          and powers the matching engine — under 5 minutes.{" "}
          <a href="/xq-quiz">Take the XQ →</a>
        </div>
      </div>
    );
  }
  const code = summary?.code ?? fallbackCode;
  const name = summary?.archetypeName ?? null;
  return (
    <div className={styles.profileCard}>
      <div className={styles.profileTag}>XQ · Conviction Quotient</div>
      <div className={styles.profileHeader}>
        <div className={styles.profileCode}>{code}</div>
        {name && <div className={styles.profileName}>{name}</div>}
      </div>
      {summary?.tagline && (
        <p className={styles.profileTagline}>&ldquo;{summary.tagline}&rdquo;</p>
      )}
      {summary &&
        (summary.values.nonNegotiables.length > 0 ||
          summary.values.core.length > 0 ||
          summary.values.aspirational.length > 0) && (
          <div className={styles.profileValues}>
            {summary.values.nonNegotiables.length > 0 && (
              <ValueRow label="Non-negotiables" items={summary.values.nonNegotiables} />
            )}
            {summary.values.core.length > 0 && (
              <ValueRow label="Core" items={summary.values.core} />
            )}
            {summary.values.aspirational.length > 0 && (
              <ValueRow label="Aspirational" items={summary.values.aspirational} />
            )}
          </div>
        )}
      {!summary && fallbackCode && (
        <p className={styles.profileHint}>
          Your archetype is set, but we don&apos;t have your full XQ
          dossier on file. <a href="/xq-quiz">Re-take the XQ</a> to
          surface your value chips.
        </p>
      )}
    </div>
  );
}

function RqProfileCard({
  summary,
  fallbackCode,
}: {
  summary: StudioRqSummary | null;
  fallbackCode: string | null;
}) {
  if (!summary && !fallbackCode) {
    return (
      <div className={styles.profileCard}>
        <div className={styles.profileTag}>RQ · Resonance Quotient</div>
        <div className={styles.profileEmpty}>
          You haven&apos;t taken the RQ yet. It reads how your brand or
          show actually lands — clarity, authenticity, undertone.{" "}
          <a href="/rq-quiz">Take the RQ →</a>
        </div>
      </div>
    );
  }
  const code = summary?.code ?? fallbackCode;
  return (
    <div className={styles.profileCard}>
      <div className={styles.profileTag}>RQ · Resonance Quotient</div>
      <div className={styles.profileHeader}>
        <div className={styles.profileCode}>{code}</div>
        {summary?.name && <div className={styles.profileName}>{summary.name}</div>}
      </div>
      {summary?.clarityLabel && (
        <div className={styles.profileRow}>
          <span className={styles.profileRowLabel}>Signal clarity</span>
          <span className={styles.profileRowValue}>{summary.clarityLabel}</span>
        </div>
      )}
      {summary?.clarityNote && (
        <p className={styles.profileTagline}>{summary.clarityNote}</p>
      )}
      {summary?.undertone && (
        <div className={styles.profileRow}>
          <span className={styles.profileRowLabel}>Undertone</span>
          <span className={styles.profileRowValue}>{summary.undertone}</span>
        </div>
      )}
      {!summary && fallbackCode && (
        <p className={styles.profileHint}>
          Your RQ code is set, but we don&apos;t have your full RQ
          dossier on file. <a href="/rq-quiz">Re-take the RQ</a> to
          surface clarity + undertone.
        </p>
      )}
    </div>
  );
}

function ValueRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div className={styles.valueRow}>
      <span className={styles.valueRowLabel}>{label}</span>
      <div className={styles.valuePills}>
        {items.map((v) => (
          <span key={v} className={styles.valuePill}>
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}


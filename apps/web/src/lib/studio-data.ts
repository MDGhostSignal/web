/**
 * Studio data loaders — server-side, scoped to the calling member's
 * brand_id or creator_id. Service-role reads are safe because the
 * scope is derived from the authenticated session, not user input.
 */

import { supabaseRest } from "@/lib/supabase-admin";

export type CreatorShowData = {
  show: {
    id: string;
    title: string;
    listenCount: number;
    episodeCount: number;
    imageUrl: string | null;
    description: string | null;
  } | null;
  recentEpisodes: Array<{
    id: string;
    title: string;
    publishedAt: string | null;
    listenCount: number;
    durationSeconds: number | null;
  }>;
};

type ShowRow = {
  id: string;
  title: string | null;
  listen_count: number | null;
  episode_count: number | null;
  image_url: string | null;
  description: string | null;
};

type EpisodeRow = {
  id: string;
  title: string | null;
  published_at: string | null;
  listen_count: number | null;
  duration_seconds: number | null;
};

/** Resolve a creator's ART19 show + their most recent episodes.
 *  Returns nulls/empties when the creator isn't linked to an
 *  art19_show_id yet (= they exist in the CRM but their show isn't
 *  on ART19 in the system). */
export async function loadCreatorShowData(
  creatorId: string,
): Promise<CreatorShowData> {
  const creatorRes = await supabaseRest<Array<{ art19_show_id: string | null }>>(
    `creators?select=art19_show_id&id=eq.${encodeURIComponent(creatorId)}`,
  );
  if (!creatorRes.ok || !creatorRes.data?.length) {
    return { show: null, recentEpisodes: [] };
  }
  const showId = creatorRes.data[0].art19_show_id;
  if (!showId) {
    return { show: null, recentEpisodes: [] };
  }

  const [showRes, episodesRes] = await Promise.all([
    supabaseRest<ShowRow[]>(
      `art19_shows?select=id,title,listen_count,episode_count,image_url,description&id=eq.${encodeURIComponent(showId)}`,
    ),
    supabaseRest<EpisodeRow[]>(
      `art19_episodes?select=id,title,published_at,listen_count,duration_seconds&show_id=eq.${encodeURIComponent(showId)}&order=published_at.desc.nullslast&limit=5`,
    ),
  ]);

  const showRow = showRes.ok && showRes.data?.length ? showRes.data[0] : null;
  const episodeRows = episodesRes.ok && episodesRes.data ? episodesRes.data : [];

  return {
    show: showRow
      ? {
          id: showRow.id,
          title: showRow.title ?? "(Untitled show)",
          listenCount: Number(showRow.listen_count ?? 0),
          episodeCount: Number(showRow.episode_count ?? 0),
          imageUrl: showRow.image_url,
          description: showRow.description,
        }
      : null,
    recentEpisodes: episodeRows.map((e) => ({
      id: e.id,
      title: e.title ?? "(Untitled episode)",
      publishedAt: e.published_at,
      listenCount: Number(e.listen_count ?? 0),
      durationSeconds: e.duration_seconds,
    })),
  };
}

/** Brand-side data is wired in a follow-up chunk — we don't have a
 *  brand_id on art19_campaigns yet, so scoping requires either a
 *  schema migration (adding the link) or a name-based join. Either
 *  way it's its own scope of work. Stub returns nothing for now. */
export type BrandCampaignsData = {
  campaigns: Array<{
    id: string;
    name: string;
    impressions: number;
  }>;
};

export async function loadBrandCampaignsData(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _brandId: string,
): Promise<BrandCampaignsData> {
  return { campaigns: [] };
}

/* ============================================================
 * Org profile (member-editable via /studio/profile)
 * ============================================================ */

export type StudioOrgProfile = {
  /** "member" = personal card from the members row — used by
   *  private-person accounts and org members whose link isn't made. */
  kind: "brand" | "creator" | "member";
  name: string;
  /** Card-face one-liner (docs/STUDIO_LITE_TAGLINE.sql). */
  tagline: string | null;
  /** Year the org row was created — "Member Since" on the card. */
  sinceYear: number | null;
  description: string | null;
  /** Brand logo_url / creator avatar_url — set via the studio image
   *  upload route, served from the public Storage bucket. */
  imageUrl: string | null;
  /** Brand only. */
  website: string | null;
  /** Creator only — requires docs/STUDIO_LITE_PROFILE.sql. */
  podcastUrl: string | null;
  newsletterUrl: string | null;
  /** Creator only — show RSS feed for the ART19 import (internal;
   *  requires docs/STUDIO_LITE_RSS.sql). */
  rssUrl: string | null;
};

/** Load the card profile the member edits on /studio/profile: their
 *  linked brand/creator row, or — for private-person accounts and
 *  org members whose link isn't made yet — a personal card from
 *  their own members row (kind "member"). Returns null only when
 *  even the members-row read fails. */
export async function loadStudioOrgProfile(member: {
  id: string;
  kind: "brand" | "creator" | "other";
  brandId: string | null;
  creatorId: string | null;
}): Promise<StudioOrgProfile | null> {
  if (member.kind === "brand" && member.brandId) {
    type Row = {
      name: string | null;
      description: string | null;
      tagline?: string | null;
      logo_url: string | null;
      website: string | null;
      created_at: string | null;
    };
    // Tagline-less fallback until STUDIO_LITE_TAGLINE.sql runs.
    let res = await supabaseRest<Row[]>(
      `brands?select=name,description,tagline,logo_url,website,created_at&id=eq.${encodeURIComponent(member.brandId)}`,
    );
    if (!res.ok) {
      res = await supabaseRest<Row[]>(
        `brands?select=name,description,logo_url,website,created_at&id=eq.${encodeURIComponent(member.brandId)}`,
      );
    }
    const row = res.ok && res.data?.length ? res.data[0] : null;
    if (!row) return null;
    const since = row.created_at ? new Date(row.created_at).getFullYear() : NaN;
    return {
      kind: "brand",
      name: row.name ?? "(Unnamed brand)",
      tagline: row.tagline ?? null,
      sinceYear: Number.isFinite(since) ? since : null,
      description: row.description,
      imageUrl: row.logo_url,
      website: row.website,
      podcastUrl: null,
      newsletterUrl: null,
      rssUrl: null,
    };
  }
  if (member.kind === "creator" && member.creatorId) {
    type Row = {
      name: string | null;
      description: string | null;
      tagline?: string | null;
      avatar_url: string | null;
      podcast_url: string | null;
      newsletter_url: string | null;
      rss_url?: string | null;
      created_at: string | null;
    };
    // Fallback chain: full select → without rss_url (until
    // STUDIO_LITE_RSS.sql runs) → without tagline either (until
    // STUDIO_LITE_TAGLINE.sql runs).
    let res = await supabaseRest<Row[]>(
      `creators?select=name,description,tagline,avatar_url,podcast_url,newsletter_url,rss_url,created_at&id=eq.${encodeURIComponent(member.creatorId)}`,
    );
    if (!res.ok) {
      res = await supabaseRest<Row[]>(
        `creators?select=name,description,tagline,avatar_url,podcast_url,newsletter_url,created_at&id=eq.${encodeURIComponent(member.creatorId)}`,
      );
    }
    if (!res.ok) {
      res = await supabaseRest<Row[]>(
        `creators?select=name,description,avatar_url,podcast_url,newsletter_url,created_at&id=eq.${encodeURIComponent(member.creatorId)}`,
      );
    }
    const row = res.ok && res.data?.length ? res.data[0] : null;
    if (!row) return null;
    const since = row.created_at ? new Date(row.created_at).getFullYear() : NaN;
    return {
      kind: "creator",
      name: row.name ?? "(Unnamed creator)",
      tagline: row.tagline ?? null,
      sinceYear: Number.isFinite(since) ? since : null,
      description: row.description,
      imageUrl: row.avatar_url,
      website: null,
      podcastUrl: row.podcast_url,
      newsletterUrl: row.newsletter_url,
      rssUrl: row.rss_url ?? null,
    };
  }

  // Personal card from the members row. Fallback select until
  // STUDIO_LITE_MEMBER_CARD.sql adds tagline/bio.
  type MemberRow = {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    tagline?: string | null;
    bio?: string | null;
    avatar_url: string | null;
    created_at: string | null;
  };
  let res = await supabaseRest<MemberRow[]>(
    `members?select=first_name,last_name,email,tagline,bio,avatar_url,created_at&id=eq.${encodeURIComponent(member.id)}`,
  );
  if (!res.ok) {
    res = await supabaseRest<MemberRow[]>(
      `members?select=first_name,last_name,email,avatar_url,created_at&id=eq.${encodeURIComponent(member.id)}`,
    );
  }
  const row = res.ok && res.data?.length ? res.data[0] : null;
  if (!row) return null;
  const name =
    `${row.first_name?.trim() ?? ""} ${row.last_name?.trim() ?? ""}`.trim() ||
    row.email ||
    "Studio member";
  const since = row.created_at ? new Date(row.created_at).getFullYear() : NaN;
  return {
    kind: "member",
    name,
    tagline: row.tagline ?? null,
    sinceYear: Number.isFinite(since) ? since : null,
    description: row.bio ?? null,
    imageUrl: row.avatar_url,
    website: null,
    podcastUrl: null,
    newsletterUrl: null,
    rssUrl: null,
  };
}

/* ============================================================
 * Newsletter-advertising fields (docs/STUDIO_NL_ADVERTISING.sql)
 * ============================================================ */

export type MemberNlAds = {
  interest: boolean;
  provider: string | null;
  openRate: string | null;
  frequency: string | null;
  subscribers: string | null;
};

/** The member's newsletter-ads opt-in + details from the members row.
 *  Null when the migration hasn't run (or the read fails) — callers
 *  render the block with empty defaults. */
export async function loadMemberNlAds(
  memberId: string,
): Promise<MemberNlAds | null> {
  const res = await supabaseRest<
    Array<{
      nl_ads_interest: boolean | null;
      nl_provider: string | null;
      nl_open_rate: string | null;
      nl_frequency: string | null;
      nl_subscribers: string | null;
    }>
  >(
    `members?select=nl_ads_interest,nl_provider,nl_open_rate,nl_frequency,nl_subscribers&id=eq.${encodeURIComponent(memberId)}`,
  );
  if (!res.ok || !res.data?.[0]) return null;
  const r = res.data[0];
  return {
    interest: r.nl_ads_interest === true,
    provider: r.nl_provider,
    openRate: r.nl_open_rate,
    frequency: r.nl_frequency,
    subscribers: r.nl_subscribers,
  };
}

/* ============================================================
 * Onboarding status (/studio/welcome)
 * ============================================================ */

export type StudioOnboarding = {
  xqDone: boolean;
  rqDone: boolean;
  hasImage: boolean;
  hasDescription: boolean;
  /** RSS is only asked of creators. */
  needsRss: boolean;
  hasRss: boolean;
  complete: boolean;
};

/** What's still missing before this member's studio profile is set
 *  up — drives the /studio/welcome splash and the roster's redirect
 *  into it. A null org (transient read failure) reports complete so
 *  a DB hiccup never traps anyone in onboarding. */
export function studioOnboardingStatus(
  member: {
    kind: "brand" | "creator" | "other";
    xqSubmissionId: string | null;
    rqSubmissionId: string | null;
  },
  org: StudioOrgProfile | null,
): StudioOnboarding {
  const xqDone = member.xqSubmissionId !== null;
  const rqDone = member.rqSubmissionId !== null;
  if (!org) {
    return {
      xqDone,
      rqDone,
      hasImage: true,
      hasDescription: true,
      needsRss: false,
      hasRss: true,
      complete: true,
    };
  }
  const hasImage = org.imageUrl !== null;
  const hasDescription = (org.description ?? "").trim().length > 0;
  const needsRss = member.kind === "creator";
  const hasRss = !needsRss || (org.rssUrl ?? "").trim().length > 0;
  return {
    xqDone,
    rqDone,
    hasImage,
    hasDescription,
    needsRss,
    hasRss,
    complete: xqDone && rqDone && hasImage && hasDescription && hasRss,
  };
}

/* ============================================================
 * Marketplace browse
 * ============================================================
 *
 * The marketplace is cross-side: a logged-in creator browses brands;
 * a logged-in brand browses creators. Cards show the company/show
 * identity plus a primary contact's XQ archetype (used to compute
 * a rough match score against the viewer's own archetype).
 *
 * Mike's per-side field spec (budget, ad type, CPM, slot count for
 * creators; copy outline, match thresholds for brands) needs columns
 * we haven't added yet. They'll arrive in a follow-up chunk; the
 * card UI is laid out with placeholders so adding them is a CSS-free
 * data drop. */

export type MarketplaceBrand = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  /** Short one-liner shown on the card face (docs/STUDIO_LITE_TAGLINE.sql). */
  tagline: string | null;
  logoUrl: string | null;
  website: string | null;
  /** Year the brand row was created — "Member Since" on the card. */
  sinceYear: number | null;
  /** Primary contact's XQ archetype, when known. */
  contactArchetype: string | null;
  matchScore: number | null;
};

export type MarketplaceCreator = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  avatarUrl: string | null;
  /** ART19 show stats, when the creator's art19_show_id is linked. */
  showTitle: string | null;
  showListenCount: number | null;
  showEpisodeCount: number | null;
  contactArchetype: string | null;
  matchScore: number | null;
};

type BrandRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  tagline?: string | null;
  logo_url: string | null;
  website: string | null;
  created_at: string | null;
  members: Array<{ xq_archetype: string | null }>;
};

type CreatorRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  avatar_url: string | null;
  art19_shows: {
    title: string | null;
    listen_count: number | null;
    episode_count: number | null;
  } | null;
  members: Array<{ xq_archetype: string | null }>;
};

/** Count of XQ axes the two archetypes share (0-3). Returns null
 *  when either side is missing an archetype. */
function archetypeAxisMatch(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const [a1, a2, a3] = a.split("-");
  const [b1, b2, b3] = b.split("-");
  return (a1 === b1 ? 1 : 0) + (a2 === b2 ? 1 : 0) + (a3 === b3 ? 1 : 0);
}

/** Pick the first non-null archetype from the embedded members list. */
function firstArchetype(rows: Array<{ xq_archetype: string | null }>): string | null {
  return rows.find((r) => r.xq_archetype !== null)?.xq_archetype ?? null;
}

export async function loadMarketplaceBrands(
  viewerArchetype: string | null,
): Promise<MarketplaceBrand[]> {
  // Try the full select first; fall back without `tagline` when the
  // STUDIO_LITE_TAGLINE.sql migration hasn't run yet.
  let res = await supabaseRest<BrandRow[]>(
    "brands?" +
      "select=id,name,slug,description,tagline,logo_url,website,created_at,members(xq_archetype)&" +
      "order=name.asc",
  );
  if (!res.ok) {
    res = await supabaseRest<BrandRow[]>(
      "brands?" +
        "select=id,name,slug,description,logo_url,website,created_at,members(xq_archetype)&" +
        "order=name.asc",
    );
  }
  if (!res.ok || !res.data) return [];
  return res.data.map((b) => {
    const contactArchetype = firstArchetype(b.members ?? []);
    const since = b.created_at ? new Date(b.created_at).getFullYear() : NaN;
    return {
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description,
      tagline: b.tagline ?? null,
      logoUrl: b.logo_url,
      website: b.website,
      sinceYear: Number.isFinite(since) ? since : null,
      contactArchetype,
      matchScore: archetypeAxisMatch(viewerArchetype, contactArchetype),
    };
  });
}

export async function loadMarketplaceCreators(
  viewerArchetype: string | null,
): Promise<MarketplaceCreator[]> {
  const res = await supabaseRest<CreatorRow[]>(
    "creators?" +
      "select=id,name,slug,description,avatar_url,art19_shows(title,listen_count,episode_count),members(xq_archetype)&" +
      "order=name.asc",
  );
  if (!res.ok || !res.data) return [];
  return res.data.map((c) => {
    const contactArchetype = firstArchetype(c.members ?? []);
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      avatarUrl: c.avatar_url,
      showTitle: c.art19_shows?.title ?? null,
      showListenCount:
        c.art19_shows?.listen_count != null
          ? Number(c.art19_shows.listen_count)
          : null,
      showEpisodeCount:
        c.art19_shows?.episode_count != null
          ? Number(c.art19_shows.episode_count)
          : null,
      contactArchetype,
      matchScore: archetypeAxisMatch(viewerArchetype, contactArchetype),
    };
  });
}

/* ============================================================
 * Team-curated brand recommendations
 * ============================================================ */

export type BrandRecommendation = {
  brandId: string;
  position: number;
  note: string | null;
};

/** The GhostSignal team's hand-picked brands for this member, best
 *  first, capped at 4. Tolerant by design: if the table doesn't exist
 *  yet (migration not run) or the query fails, returns [] and the
 *  roster simply renders without picks. */
export async function loadBrandRecommendations(
  memberId: string,
): Promise<BrandRecommendation[]> {
  const res = await supabaseRest<
    Array<{ brand_id: string; position: number | null; note: string | null }>
  >(
    `studio_brand_recommendations?select=brand_id,position,note&member_id=eq.${encodeURIComponent(memberId)}&order=position.asc&limit=4`,
  );
  if (!res.ok || !res.data) return [];
  return res.data.map((r) => ({
    brandId: r.brand_id,
    position: Number(r.position ?? 1),
    note: r.note,
  }));
}

/** Format helpers — used by the Studio dashboard. */
export function formatListens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function formatDuration(seconds: number | null): string {
  if (!seconds || seconds < 0) return "—";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest > 0 ? `${h}h ${rest}m` : `${h}h`;
}

export function formatRelativeDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const day = Math.floor(diffMs / 86_400_000);
  if (day < 1) return "today";
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  if (day < 30) return `${Math.floor(day / 7)} wk ago`;
  return d.toLocaleDateString();
}

/* ============================================================
 * XQ + RQ summary loaders
 * ============================================================
 *
 * Surface the signed-in member's full conviction (XQ) and resonance
 * (RQ) profiles on the /studio dashboard. Each loader takes the
 * relevant `*_submission_id` from the members row and returns a
 * compact shape ready for the dashboard card. Null IDs short-circuit
 * to null returns so the caller can render a "not taken yet" prompt.
 */

export type StudioXqSummary = {
  code: string | null;
  archetypeName: string | null;
  tagline: string | null;
  axes: {
    continuityChange: string | null;
    personSystem: string | null;
    craftLeverage: string | null;
  };
  values: {
    nonNegotiables: string[];
    core: string[];
    aspirational: string[];
  };
  submittedAt: string | null;
};

export type StudioRqSummary = {
  code: string | null;
  name: string | null;
  clarityLabel: string | null;
  clarityNote: string | null;
  undertone: string | null;
  /** Per-axis letter + score + band, hydrated from rq_submissions.details_json.
   *  Drives the RQResultsGraph rendering on the dashboard card — same
   *  shape the quiz reveal screen consumes. Null axes fall back to a
   *  graphic-less render. */
  details: {
    values: { letter: string; score: number; band: string } | null;
    authenticity: { letter: string; score: number; band: string } | null;
    horizon: { letter: string; score: number; band: string } | null;
  };
  /** Per-axis prose explanation from profile_json. */
  profile: {
    values: string | null;
    authenticity: string | null;
    horizon: string | null;
  };
  submittedAt: string | null;
};

type XqRow = {
  xq_code: string | null;
  xq_archetype_name: string | null;
  xq_archetype_tagline: string | null;
  axis_continuity_change: string | null;
  axis_person_system: string | null;
  axis_craft_leverage: string | null;
  non_negotiables_json: string[] | null;
  core_values_json: string[] | null;
  aspirational_values_json: string[] | null;
  submitted_at: string | null;
};

type RqAxisDetailRow = {
  letter?: string | null;
  score?: number | null;
  band?: string | null;
};

type RqRow = {
  rq_code: string | null;
  rq_name: string | null;
  signal_clarity_label: string | null;
  signal_clarity_note: string | null;
  undertone: string | null;
  submitted_at: string | null;
  details_json: {
    values?: RqAxisDetailRow;
    authenticity?: RqAxisDetailRow;
    horizon?: RqAxisDetailRow;
  } | null;
  profile_json: {
    values?: string;
    authenticity?: string;
    horizon?: string;
  } | null;
};

function normalizeAxisDetail(
  raw: RqAxisDetailRow | undefined,
): { letter: string; score: number; band: string } | null {
  if (!raw || !raw.letter || typeof raw.score !== "number") return null;
  return {
    letter: raw.letter,
    score: raw.score,
    band: raw.band ?? "",
  };
}

export async function loadStudioXqSummary(
  submissionId: string | null,
): Promise<StudioXqSummary | null> {
  if (!submissionId) return null;
  const res = await supabaseRest<XqRow[]>(
    `xq_submissions?select=xq_code,xq_archetype_name,xq_archetype_tagline,axis_continuity_change,axis_person_system,axis_craft_leverage,non_negotiables_json,core_values_json,aspirational_values_json,submitted_at&id=eq.${encodeURIComponent(submissionId)}&limit=1`,
  );
  if (!res.ok || !res.data?.length) return null;
  const r = res.data[0];
  return {
    code: r.xq_code,
    archetypeName: r.xq_archetype_name,
    tagline: r.xq_archetype_tagline,
    axes: {
      continuityChange: r.axis_continuity_change,
      personSystem: r.axis_person_system,
      craftLeverage: r.axis_craft_leverage,
    },
    values: {
      nonNegotiables: r.non_negotiables_json ?? [],
      core: r.core_values_json ?? [],
      aspirational: r.aspirational_values_json ?? [],
    },
    submittedAt: r.submitted_at,
  };
}

export async function loadStudioRqSummary(
  submissionId: string | null,
): Promise<StudioRqSummary | null> {
  if (!submissionId) return null;
  const res = await supabaseRest<RqRow[]>(
    `rq_submissions?select=rq_code,rq_name,signal_clarity_label,signal_clarity_note,undertone,submitted_at,details_json,profile_json&id=eq.${encodeURIComponent(submissionId)}&limit=1`,
  );
  if (!res.ok || !res.data?.length) return null;
  const r = res.data[0];
  return {
    code: r.rq_code,
    name: r.rq_name,
    clarityLabel: r.signal_clarity_label,
    clarityNote: r.signal_clarity_note,
    undertone: r.undertone,
    details: {
      values: normalizeAxisDetail(r.details_json?.values),
      authenticity: normalizeAxisDetail(r.details_json?.authenticity),
      horizon: normalizeAxisDetail(r.details_json?.horizon),
    },
    profile: {
      values: r.profile_json?.values ?? null,
      authenticity: r.profile_json?.authenticity ?? null,
      horizon: r.profile_json?.horizon ?? null,
    },
    submittedAt: r.submitted_at,
  };
}

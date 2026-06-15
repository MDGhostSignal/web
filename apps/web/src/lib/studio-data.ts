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
  logoUrl: string | null;
  website: string | null;
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
  logo_url: string | null;
  website: string | null;
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
  const res = await supabaseRest<BrandRow[]>(
    "brands?" +
      "select=id,name,slug,description,logo_url,website,members(xq_archetype)&" +
      "order=name.asc",
  );
  if (!res.ok || !res.data) return [];
  return res.data.map((b) => {
    const contactArchetype = firstArchetype(b.members ?? []);
    return {
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description,
      logoUrl: b.logo_url,
      website: b.website,
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

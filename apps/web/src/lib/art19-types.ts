/**
 * Types + helpers for the ART19 integration.
 *
 * ART19 serves a JSON:API spec at https://art19.com/{resource}. Auth is
 * a paired header:
 *   Authorization: Token token="<shared-secret>", credential="<uuid>"
 *
 * Endpoints we actually call (the spec lists JSON:API page[size]
 * pagination but the server rejects it — see art19.ts for the workaround):
 *   GET /networks/{id}
 *   GET /networks/{id}/relationships/series       — returns refs
 *   GET /series/{id}
 *   GET /series/{id}/relationships/episodes       — returns refs
 *   GET /episodes/{id}
 *
 * The credential issued by ART19 Support has global read across ART19's
 * platform (filter[network_id] is silently ignored), so we never pull
 * /series or /episodes unscoped — every walk starts from the configured
 * ART19_NETWORK_ID and traverses relationship endpoints.
 *
 * listen_count is exposed directly on every level (network, series,
 * episode) as a lifetime IABv2.2-certified download total. Episodes
 * additionally expose downloads_first_24_hours.
 */

/* =====================================================================
 * JSON:API envelope shapes
 * ===================================================================== */

export type JsonApiResource<TAttrs = Record<string, unknown>> = {
  id: string;
  type: string;
  attributes: TAttrs;
  relationships?: Record<string, { data: JsonApiRef | JsonApiRef[] | null }>;
  links?: Record<string, string>;
};

export type JsonApiRef = {
  id: string;
  type: string;
};

export type JsonApiList<TAttrs = Record<string, unknown>> = {
  data: JsonApiResource<TAttrs>[];
  meta?: {
    total_count?: number;
    current_page?: number;
    total_pages?: number;
    [k: string]: unknown;
  };
  links?: {
    next?: string;
    prev?: string;
    last?: string;
    self?: string;
  };
  included?: JsonApiResource[];
};

export type JsonApiSingle<TAttrs = Record<string, unknown>> = {
  data: JsonApiResource<TAttrs>;
  included?: JsonApiResource[];
};

/** Relationship-link payload: just `{ id, type }` refs, no attributes. */
export type JsonApiRefList = {
  data: JsonApiRef[];
  meta?: Record<string, unknown>;
  links?: { next?: string; self?: string };
};

/* =====================================================================
 * Attribute shapes — only the fields we care about. ART19 returns more.
 * Everything else lives in the `raw` jsonb column for future use.
 * ===================================================================== */

export type Art19NetworkAttrs = {
  name?: string;
  slug?: string;
  status?: string;
  listen_count?: number;
  series_count?: number;
  description?: string;
  description_plain?: string;
  created_at?: string;
  updated_at?: string;
};

export type Art19SeriesAttrs = {
  title?: string;
  slug?: string;
  status?: string;
  listen_count?: number;
  description?: string;
  description_plain?: string;
  released_episode_count?: number;
  latest_feed_item_released_at?: string;
  created_at?: string;
  updated_at?: string;
};

export type Art19EpisodeAttrs = {
  title?: string;
  status?: string;
  listen_count?: number;
  downloads_first_24_hours?: number;
  description?: string;
  description_plain?: string;
  released_at?: string;
  episode_number?: number;
  rss_guid?: string;
  created_at?: string;
  updated_at?: string;
};

/* --- Ad-trafficking resources ----------------------------------- */

export type Art19CampaignAttrs = {
  name?: string;
  campaign_type?: string;
  ad_source?: "external" | "internal" | string;
  status?: string;
  default_cpm?: string;
  current_spend?: string;
  listen_count?: number;
  maximum_impressions?: number | null;
  fill_rate?: number;
  active_campaign_series_count?: number;
  advertisements_count?: number;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Art19CampaignSeriesAttrs = {
  cpm?: string;
  current_spend?: string;
  listen_count?: number;
  maximum_impressions?: number | null;
  status?: string;
  brand_approval_status?: string | null;
  weight?: number | null;
  api_enabled?: boolean;
  live_reads_enabled?: boolean;
  spots_enabled?: boolean;
  rss_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
};

/* =====================================================================
 * Cached row shapes (what we store in Supabase)
 * ===================================================================== */

export type Art19NetworkRow = {
  id: string;
  name: string | null;
  slug: string | null;
  status: string | null;
  listen_count: number | null;
  series_count: number | null;
  raw: unknown;
  updated_at: string;
};

export type Art19ShowRow = {
  id: string;
  network_id: string | null;
  title: string;
  slug: string | null;
  status: string | null;
  description: string | null;
  image_url: string | null;
  episode_count: number | null;
  listen_count: number | null;
  art19_created_at: string | null;
  art19_updated_at: string | null;
  raw: unknown;
  updated_at: string;
};

export type Art19EpisodeRow = {
  id: string;
  show_id: string;
  title: string;
  slug: string | null;
  description: string | null;
  duration_seconds: number | null;
  published_at: string | null;
  status: string | null;
  listen_count: number | null;
  downloads_first_24_hours: number | null;
  episode_number: number | null;
  season_number: number | null;
  art19_created_at: string | null;
  art19_updated_at: string | null;
  raw: unknown;
  updated_at: string;
};

export type Art19SyncRunRow = {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: "ok" | "error" | "running";
  show_count: number | null;
  episode_count: number | null;
  listen_row_count: number | null;
  campaign_count: number | null;
  campaign_series_count: number | null;
  error_message: string | null;
};

export type Art19CampaignRow = {
  id: string;
  name: string | null;
  campaign_type: string | null;
  ad_source: string | null;
  status: string | null;
  default_cpm: number | null;
  current_spend: number | null;
  listen_count: number | null;
  maximum_impressions: number | null;
  fill_rate: number | null;
  active_campaign_series_count: number | null;
  advertisements_count: number | null;
  start_date: string | null;
  end_date: string | null;
  art19_created_at: string | null;
  art19_updated_at: string | null;
  raw: unknown;
  updated_at: string;
};

export type Art19CampaignSeriesRow = {
  id: string;
  campaign_id: string;
  show_id: string;
  cpm: number | null;
  current_spend: number | null;
  listen_count: number | null;
  maximum_impressions: number | null;
  status: string | null;
  brand_approval_status: string | null;
  weight: number | null;
  api_enabled: boolean | null;
  live_reads_enabled: boolean | null;
  spots_enabled: boolean | null;
  rss_enabled: boolean | null;
  art19_created_at: string | null;
  art19_updated_at: string | null;
  raw: unknown;
  updated_at: string;
};

/* =====================================================================
 * Mapping helpers — JSON:API resource → DB row
 * ===================================================================== */

/** Extract the first relationship id of the given type from a JSON:API
 *  resource. Returns null when missing or empty. */
export function firstRelId(
  res: JsonApiResource | undefined,
  relName: string,
): string | null {
  const rel = res?.relationships?.[relName]?.data;
  if (!rel) return null;
  if (Array.isArray(rel)) return rel[0]?.id ?? null;
  return rel.id ?? null;
}

export function networkRowFromResource(
  res: JsonApiResource<Art19NetworkAttrs>,
): Art19NetworkRow {
  return {
    id: res.id,
    name: res.attributes.name ?? null,
    slug: res.attributes.slug ?? null,
    status: res.attributes.status ?? null,
    listen_count: res.attributes.listen_count ?? null,
    series_count: res.attributes.series_count ?? null,
    raw: res,
    updated_at: new Date().toISOString(),
  };
}

export function showRowFromResource(
  res: JsonApiResource<Art19SeriesAttrs>,
  networkId: string | null,
): Art19ShowRow {
  return {
    id: res.id,
    network_id: networkId ?? firstRelId(res, "network"),
    title: res.attributes.title ?? "(untitled series)",
    slug: res.attributes.slug ?? null,
    status: res.attributes.status ?? null,
    description:
      res.attributes.description_plain ?? res.attributes.description ?? null,
    image_url: null,
    episode_count: res.attributes.released_episode_count ?? null,
    listen_count: res.attributes.listen_count ?? null,
    art19_created_at: res.attributes.created_at ?? null,
    art19_updated_at: res.attributes.updated_at ?? null,
    raw: res,
    updated_at: new Date().toISOString(),
  };
}

/** ART19 returns monetary fields as strings ("5.0", "0.0"). Parse to
 *  number, treating empty / non-numeric input as null. */
function parseMoney(v: string | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function campaignRowFromResource(
  res: JsonApiResource<Art19CampaignAttrs>,
): Art19CampaignRow {
  return {
    id: res.id,
    name: res.attributes.name ?? null,
    campaign_type: res.attributes.campaign_type ?? null,
    ad_source: res.attributes.ad_source ?? null,
    status: res.attributes.status ?? null,
    default_cpm: parseMoney(res.attributes.default_cpm),
    current_spend: parseMoney(res.attributes.current_spend),
    listen_count: res.attributes.listen_count ?? null,
    maximum_impressions: res.attributes.maximum_impressions ?? null,
    fill_rate: res.attributes.fill_rate ?? null,
    active_campaign_series_count:
      res.attributes.active_campaign_series_count ?? null,
    advertisements_count: res.attributes.advertisements_count ?? null,
    start_date: res.attributes.start_date ?? null,
    end_date: res.attributes.end_date ?? null,
    art19_created_at: res.attributes.created_at ?? null,
    art19_updated_at: res.attributes.updated_at ?? null,
    raw: res,
    updated_at: new Date().toISOString(),
  };
}

export function campaignSeriesRowFromResource(
  res: JsonApiResource<Art19CampaignSeriesAttrs>,
  campaignId: string | null,
  showId: string | null,
): Art19CampaignSeriesRow | null {
  const cid = campaignId ?? firstRelId(res, "campaign");
  const sid = showId ?? firstRelId(res, "series");
  if (!cid || !sid) return null;
  return {
    id: res.id,
    campaign_id: cid,
    show_id: sid,
    cpm: parseMoney(res.attributes.cpm),
    current_spend: parseMoney(res.attributes.current_spend),
    listen_count: res.attributes.listen_count ?? null,
    maximum_impressions: res.attributes.maximum_impressions ?? null,
    status: res.attributes.status ?? null,
    brand_approval_status: res.attributes.brand_approval_status ?? null,
    weight: res.attributes.weight ?? null,
    api_enabled: res.attributes.api_enabled ?? null,
    live_reads_enabled: res.attributes.live_reads_enabled ?? null,
    spots_enabled: res.attributes.spots_enabled ?? null,
    rss_enabled: res.attributes.rss_enabled ?? null,
    art19_created_at: res.attributes.created_at ?? null,
    art19_updated_at: res.attributes.updated_at ?? null,
    raw: res,
    updated_at: new Date().toISOString(),
  };
}

export function episodeRowFromResource(
  res: JsonApiResource<Art19EpisodeAttrs>,
  showId: string | null,
): Art19EpisodeRow | null {
  const sid = showId ?? firstRelId(res, "series");
  if (!sid) return null;
  return {
    id: res.id,
    show_id: sid,
    title: res.attributes.title ?? "(untitled episode)",
    slug: null,
    description:
      res.attributes.description_plain ?? res.attributes.description ?? null,
    duration_seconds: null,
    published_at: res.attributes.released_at ?? null,
    status: res.attributes.status ?? null,
    listen_count: res.attributes.listen_count ?? null,
    downloads_first_24_hours: res.attributes.downloads_first_24_hours ?? null,
    episode_number: res.attributes.episode_number ?? null,
    season_number: null,
    art19_created_at: res.attributes.created_at ?? null,
    art19_updated_at: res.attributes.updated_at ?? null,
    raw: res,
    updated_at: new Date().toISOString(),
  };
}

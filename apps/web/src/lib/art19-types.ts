/**
 * Types + helpers for the ART19 integration.
 *
 * ART19 serves a JSON:API spec at https://art19.com/{resource}. Auth is
 * a paired header:
 *   Authorization: Token token="<shared-secret>", credential="<uuid>"
 *
 * Endpoints exposed on the public/external scope (confirmed via OpenAPI
 * inspection of https://art19.com/swagger_json/external/content.json):
 *   GET /series       — list shows
 *   GET /series/{id}
 *   GET /episodes     — list episodes
 *   GET /episodes/{id}
 *   GET /networks     — list networks (typically one for our account)
 *   GET /networks/{id}
 *
 * Listen/download metrics are NOT in the external or internal scopes.
 * They'll be wired into the schema (art19_listens_daily) once ART19
 * Support confirms which scope or export surfaces them.
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

/* =====================================================================
 * Attribute shapes — only the fields we care about. ART19 returns more.
 * Everything else lives in the `raw` jsonb column for future use.
 * ===================================================================== */

export type Art19NetworkAttrs = {
  name?: string;
  created_at?: string;
  updated_at?: string;
};

export type Art19SeriesAttrs = {
  title?: string;
  slug?: string;
  description?: string;
  image_url?: string;
  episode_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type Art19EpisodeAttrs = {
  title?: string;
  slug?: string;
  description?: string;
  duration?: number;
  published_at?: string;
  status?: string;
  episode_number?: number;
  season_number?: number;
  created_at?: string;
  updated_at?: string;
};

/* =====================================================================
 * Cached row shapes (what we store in Supabase)
 * ===================================================================== */

export type Art19NetworkRow = {
  id: string;
  name: string | null;
  raw: unknown;
  updated_at: string;
};

export type Art19ShowRow = {
  id: string;
  network_id: string | null;
  title: string;
  slug: string | null;
  description: string | null;
  image_url: string | null;
  episode_count: number | null;
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
  error_message: string | null;
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
    description: res.attributes.description ?? null,
    image_url: res.attributes.image_url ?? null,
    episode_count: res.attributes.episode_count ?? null,
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
  if (!sid) return null; // skip orphan episodes
  return {
    id: res.id,
    show_id: sid,
    title: res.attributes.title ?? "(untitled episode)",
    slug: res.attributes.slug ?? null,
    description: res.attributes.description ?? null,
    duration_seconds: res.attributes.duration ?? null,
    published_at: res.attributes.published_at ?? null,
    status: res.attributes.status ?? null,
    episode_number: res.attributes.episode_number ?? null,
    season_number: res.attributes.season_number ?? null,
    art19_created_at: res.attributes.created_at ?? null,
    art19_updated_at: res.attributes.updated_at ?? null,
    raw: res,
    updated_at: new Date().toISOString(),
  };
}

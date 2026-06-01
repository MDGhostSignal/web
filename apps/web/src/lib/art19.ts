/**
 * REST client for ART19.
 *
 * Auth: paired header — `Authorization: Token token="<secret>", credential="<uuid>"`.
 * Base: https://art19.com (NO /api prefix despite the docs' folder layout).
 * Accept: application/vnd.api+json (JSON:API).
 *
 * Two important deviations from the JSON:API spec, learned the hard way
 * by hitting the live API with a real credential:
 *
 *   1. Pagination uses Rails-style `page=N&per_page=M`. The JSON:API
 *      `page[size]=N` form returns HTTP 400 ("Bad Request"). Even
 *      stranger, the server's own `links.next` URLs use `page[number]` /
 *      `page[size]` — which the server then rejects. So we ignore
 *      `links.next` and manually walk pages.
 *
 *   2. Collection endpoints (`/series`, `/episodes`) are essentially
 *      unusable for a single-account sync: the credential has global read
 *      across ART19's platform (hundreds of unrelated podcasts), and the
 *      `filter[network_id]` / `filter[series_id]` params are silently
 *      ignored. The supported pattern is to walk relationship endpoints
 *      starting from a known network ID.
 *
 * Listen counts are exposed on every level (network.listen_count,
 * series.listen_count, episode.listen_count) as a lifetime IABv2.2-
 * certified download total. Daily breakdowns are only available via
 * the S3 export, not the API.
 */

import type {
  Art19EpisodeAttrs,
  Art19NetworkAttrs,
  Art19SeriesAttrs,
  JsonApiRef,
  JsonApiRefList,
  JsonApiSingle,
} from "./art19-types";

const DEFAULT_BASE = "https://art19.com";
const REL_PAGE_SIZE = 100;
const MAX_REL_PAGES = 50;

export class Art19Error extends Error {
  public readonly status: number;
  public readonly body: string;
  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = "Art19Error";
    this.status = status;
    this.body = body;
  }
}

export type Art19Config = {
  token: string;
  credentialId: string;
  baseUrl?: string;
  networkId?: string;
};

function authHeader(cfg: Art19Config): string {
  return `Token token="${cfg.token}", credential="${cfg.credentialId}"`;
}

/** Read env config. Returns null when either of the two required pieces
 *  (token, credentialId) is missing. networkId is optional but the sync
 *  orchestrator surfaces a clear error when it's not set. */
export function art19ConfigFromEnv(): Art19Config | null {
  const token = process.env.ART19_API_TOKEN;
  const credentialId = process.env.ART19_API_CREDENTIAL_ID;
  if (!token || !credentialId) return null;
  return {
    token,
    credentialId,
    baseUrl: process.env.ART19_API_BASE_URL ?? DEFAULT_BASE,
    networkId: process.env.ART19_NETWORK_ID,
  };
}

async function get<T>(cfg: Art19Config, pathOrUrl: string): Promise<T> {
  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : `${cfg.baseUrl ?? DEFAULT_BASE}${pathOrUrl}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: authHeader(cfg),
      Accept: "application/vnd.api+json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Art19Error(`ART19 ${res.status} on ${pathOrUrl}`, res.status, body);
  }
  return (await res.json()) as T;
}

/** Walk a relationship endpoint that returns `JsonApiRef[]` until empty. */
async function paginateRefs(
  cfg: Art19Config,
  basePath: string,
): Promise<JsonApiRef[]> {
  const out: JsonApiRef[] = [];
  const sep = basePath.includes("?") ? "&" : "?";
  for (let page = 1; page <= MAX_REL_PAGES; page++) {
    const url = `${basePath}${sep}page=${page}&per_page=${REL_PAGE_SIZE}`;
    const body = await get<JsonApiRefList>(cfg, url);
    const data = body.data ?? [];
    if (data.length === 0) break;
    out.push(...data);
    if (data.length < REL_PAGE_SIZE) break;
  }
  return out;
}

/** Fetch a single network record (includes listen_count, series_count). */
export async function getNetwork(
  cfg: Art19Config,
  id: string,
): Promise<JsonApiSingle<Art19NetworkAttrs>> {
  return get<JsonApiSingle<Art19NetworkAttrs>>(cfg, `/networks/${id}`);
}

/** Fetch a single series record (includes listen_count). */
export async function getSeries(
  cfg: Art19Config,
  id: string,
): Promise<JsonApiSingle<Art19SeriesAttrs>> {
  return get<JsonApiSingle<Art19SeriesAttrs>>(cfg, `/series/${id}`);
}

/** Fetch a single episode record (includes listen_count, downloads_first_24_hours). */
export async function getEpisode(
  cfg: Art19Config,
  id: string,
): Promise<JsonApiSingle<Art19EpisodeAttrs>> {
  return get<JsonApiSingle<Art19EpisodeAttrs>>(cfg, `/episodes/${id}`);
}

/** List series IDs belonging to a network, via the relationship endpoint.
 *  Returns refs only — call getSeries(id) for each to get attributes. */
export async function listSeriesRefsForNetwork(
  cfg: Art19Config,
  networkId: string,
): Promise<JsonApiRef[]> {
  return paginateRefs(cfg, `/networks/${networkId}/relationships/series`);
}

/** List episode IDs belonging to a series, via the relationship endpoint.
 *  Returns refs only — call getEpisode(id) for each to get attributes. */
export async function listEpisodeRefsForSeries(
  cfg: Art19Config,
  seriesId: string,
): Promise<JsonApiRef[]> {
  return paginateRefs(cfg, `/series/${seriesId}/relationships/episodes`);
}

/** Quick health/auth check. Returns the HTTP status so the sync route
 *  can surface "not configured" vs "401" vs "200 ok" distinctly.
 *  Hits `/networks/{id}` if networkId is set (validates both auth and
 *  the configured network), else falls back to bare `/networks`. */
export async function pingArt19(cfg: Art19Config): Promise<{
  ok: boolean;
  status: number;
  detail?: string;
}> {
  const path = cfg.networkId ? `/networks/${cfg.networkId}` : "/networks";
  const url = `${cfg.baseUrl ?? DEFAULT_BASE}${path}`;
  try {
    const r = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: authHeader(cfg),
        Accept: "application/vnd.api+json",
      },
      cache: "no-store",
    });
    if (r.ok) return { ok: true, status: r.status };
    return {
      ok: false,
      status: r.status,
      detail: (await r.text()).slice(0, 300),
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

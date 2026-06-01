/**
 * Minimal REST client for ART19.
 *
 * Auth: paired header — `Authorization: Token token="<secret>", credential="<uuid>"`.
 * Base: https://art19.com (NO /api prefix despite the docs' folder layout).
 * Accept: application/vnd.api+json (JSON:API).
 *
 * Client surface kept small on purpose: list shows, list episodes,
 * list networks, single-resource fetches. Pagination follows JSON:API
 * `page[number]` / `page[size]` query params and the `links.next` URL
 * from each response.
 */

import type {
  Art19EpisodeAttrs,
  Art19NetworkAttrs,
  Art19SeriesAttrs,
  JsonApiList,
  JsonApiResource,
} from "./art19-types";

const DEFAULT_BASE = "https://art19.com";
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGES = 50; // safety: 50 * 50 = 2500 records per resource per sync

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
};

/** Build the paired-token Authorization header per the ART19 spec. */
function authHeader(cfg: Art19Config): string {
  return `Token token="${cfg.token}", credential="${cfg.credentialId}"`;
}

/** Read env config. Returns null when either piece is missing so the
 *  caller can short-circuit gracefully (no throws on misconfigured
 *  dev environments — matches the Mercury client pattern). */
export function art19ConfigFromEnv(): Art19Config | null {
  const token = process.env.ART19_API_TOKEN;
  const credentialId = process.env.ART19_API_CREDENTIAL_ID;
  if (!token || !credentialId) return null;
  return {
    token,
    credentialId,
    baseUrl: process.env.ART19_API_BASE_URL ?? DEFAULT_BASE,
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
    throw new Art19Error(
      `ART19 ${res.status} on ${pathOrUrl}`,
      res.status,
      body,
    );
  }
  return (await res.json()) as T;
}

/**
 * Walk a JSON:API paginated collection. Yields the data array from each
 * page; stops when there's no `links.next` or we hit the safety ceiling.
 * Includes any `included` resources from each page for downstream relationship
 * resolution.
 */
export async function* paginate<TAttrs>(
  cfg: Art19Config,
  path: string,
  options: { pageSize?: number; include?: string } = {},
): AsyncGenerator<JsonApiList<TAttrs>> {
  const sep = path.includes("?") ? "&" : "?";
  const ps = options.pageSize ?? DEFAULT_PAGE_SIZE;
  let nextUrl: string | null =
    `${cfg.baseUrl ?? DEFAULT_BASE}${path}${sep}page%5Bsize%5D=${ps}` +
    (options.include ? `&include=${encodeURIComponent(options.include)}` : "");

  let page = 0;
  while (nextUrl && page < MAX_PAGES) {
    const body: JsonApiList<TAttrs> = await get<JsonApiList<TAttrs>>(
      cfg,
      nextUrl,
    );
    yield body;
    nextUrl = body.links?.next ?? null;
    page += 1;
  }
}

/** List all series for the network. JSON:API pagination handled inside. */
export async function listAllSeries(
  cfg: Art19Config,
): Promise<{
  series: JsonApiResource<Art19SeriesAttrs>[];
  included: JsonApiResource[];
}> {
  const series: JsonApiResource<Art19SeriesAttrs>[] = [];
  const included: JsonApiResource[] = [];
  for await (const page of paginate<Art19SeriesAttrs>(cfg, "/series")) {
    series.push(...page.data);
    if (page.included) included.push(...page.included);
  }
  return { series, included };
}

/** List all episodes. Optionally filter by series id when ART19 supports
 *  the `filter[series_id]` query — verified against the spec, the API
 *  accepts JSON:API filter params. */
export async function listAllEpisodes(
  cfg: Art19Config,
  options: { seriesId?: string } = {},
): Promise<{
  episodes: JsonApiResource<Art19EpisodeAttrs>[];
  included: JsonApiResource[];
}> {
  const episodes: JsonApiResource<Art19EpisodeAttrs>[] = [];
  const included: JsonApiResource[] = [];
  const path = options.seriesId
    ? `/episodes?filter%5Bseries_id%5D=${encodeURIComponent(options.seriesId)}`
    : "/episodes";
  for await (const page of paginate<Art19EpisodeAttrs>(cfg, path)) {
    episodes.push(...page.data);
    if (page.included) included.push(...page.included);
  }
  return { episodes, included };
}

/** List networks. Most accounts have exactly one. */
export async function listAllNetworks(
  cfg: Art19Config,
): Promise<JsonApiResource<Art19NetworkAttrs>[]> {
  const all: JsonApiResource<Art19NetworkAttrs>[] = [];
  for await (const page of paginate<Art19NetworkAttrs>(cfg, "/networks")) {
    all.push(...page.data);
  }
  return all;
}

/** Quick health/auth check. Returns the HTTP status so the sync route
 *  can surface "not configured" vs "401" vs "200 ok" distinctly. */
export async function pingArt19(cfg: Art19Config): Promise<{
  ok: boolean;
  status: number;
  detail?: string;
}> {
  const url = `${cfg.baseUrl ?? DEFAULT_BASE}/networks?page%5Bsize%5D=1`;
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
    return { ok: false, status: r.status, detail: (await r.text()).slice(0, 300) };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

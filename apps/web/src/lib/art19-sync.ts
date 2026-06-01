/**
 * ART19 → Supabase sync orchestrator.
 *
 * Idempotent end-to-end:
 *   1. Insert a row in `art19_sync_runs` with status=running.
 *   2. Fetch the configured network (ART19_NETWORK_ID) and upsert.
 *   3. Walk /networks/{id}/relationships/series → for each, fetch the
 *      full series record and upsert.
 *   4. For each series, walk /series/{id}/relationships/episodes →
 *      for each, fetch the full episode record and upsert.
 *   5. Patch the sync_runs row with finished_at + counts + status=ok,
 *      or status=error + message if anything blew up.
 *
 * listen_count is captured at every level. The network/series/episode
 * records each carry their own lifetime IABv2.2 download total directly
 * from the ART19 API (no daily export required).
 *
 * Why scoped to a single network: see the docstring in art19.ts — the
 * credential has global platform read, but filter[network_id] is silently
 * ignored, so the only way to keep the sync GhostSignal-only is to walk
 * relationship endpoints starting from a known network ID.
 */

import {
  Art19Error,
  art19ConfigFromEnv,
  getEpisode,
  getNetwork,
  getSeries,
  listEpisodeRefsForSeries,
  listSeriesRefsForNetwork,
} from "./art19";
import {
  episodeRowFromResource,
  networkRowFromResource,
  showRowFromResource,
  type Art19EpisodeRow,
  type Art19NetworkRow,
  type Art19ShowRow,
} from "./art19-types";
import { supabaseRest } from "./supabase-admin";

export type Art19SyncResult = {
  ok: boolean;
  showCount?: number;
  episodeCount?: number;
  totalListens?: number;
  durationMs: number;
  error?: string;
};

const EPISODE_UPSERT_CHUNK = 200;

/** Top-level entry point hit by the sync route + the GitHub Actions cron. */
export async function runArt19Sync(): Promise<Art19SyncResult> {
  const started = Date.now();
  const cfg = art19ConfigFromEnv();
  if (!cfg) {
    return {
      ok: false,
      durationMs: 0,
      error: "ART19 is not configured (ART19_API_TOKEN / ART19_API_CREDENTIAL_ID).",
    };
  }
  if (!cfg.networkId) {
    return {
      ok: false,
      durationMs: 0,
      error:
        "ART19 is not configured (ART19_NETWORK_ID missing — set this to the network UUID you want to sync).",
    };
  }

  const runStart = await supabaseRest<{ id: string }[]>("art19_sync_runs", {
    method: "POST",
    body: JSON.stringify({ status: "running" }),
    prefer: "return=representation",
  });
  const runId = runStart.ok ? runStart.data?.[0]?.id ?? null : null;

  try {
    // --- Network ----------------------------------------------------
    const networkRes = await getNetwork(cfg, cfg.networkId);
    const networkRow: Art19NetworkRow = networkRowFromResource(networkRes.data);
    {
      const r = await supabaseRest("art19_network?on_conflict=id", {
        method: "POST",
        body: JSON.stringify([networkRow]),
        prefer: "resolution=merge-duplicates,return=minimal",
      });
      if (!r.ok) throw new Error(`Failed to upsert network: ${r.detail}`);
    }

    // --- Series (shows) --------------------------------------------
    const seriesRefs = await listSeriesRefsForNetwork(cfg, cfg.networkId);
    const showRows: Art19ShowRow[] = [];
    for (const ref of seriesRefs) {
      const s = await getSeries(cfg, ref.id);
      showRows.push(showRowFromResource(s.data, networkRow.id));
    }
    if (showRows.length > 0) {
      const r = await supabaseRest("art19_shows?on_conflict=id", {
        method: "POST",
        body: JSON.stringify(showRows),
        prefer: "resolution=merge-duplicates,return=minimal",
      });
      if (!r.ok) throw new Error(`Failed to upsert shows: ${r.detail}`);
    }

    // --- Episodes --------------------------------------------------
    const episodeRows: Art19EpisodeRow[] = [];
    for (const show of showRows) {
      const epRefs = await listEpisodeRefsForSeries(cfg, show.id);
      for (const ref of epRefs) {
        const e = await getEpisode(cfg, ref.id);
        const row = episodeRowFromResource(e.data, show.id);
        if (row) episodeRows.push(row);
      }
    }

    for (let i = 0; i < episodeRows.length; i += EPISODE_UPSERT_CHUNK) {
      const chunk = episodeRows.slice(i, i + EPISODE_UPSERT_CHUNK);
      const r = await supabaseRest("art19_episodes?on_conflict=id", {
        method: "POST",
        body: JSON.stringify(chunk),
        prefer: "resolution=merge-duplicates,return=minimal",
      });
      if (!r.ok) {
        throw new Error(
          `Failed to upsert episodes chunk ${i}-${i + chunk.length}: ${r.detail}`,
        );
      }
    }

    const totalListens = networkRow.listen_count ?? 0;

    if (runId) {
      await supabaseRest(`art19_sync_runs?id=eq.${runId}`, {
        method: "PATCH",
        body: JSON.stringify({
          finished_at: new Date().toISOString(),
          status: "ok",
          show_count: showRows.length,
          episode_count: episodeRows.length,
          listen_row_count: 0,
        }),
      });
    }

    return {
      ok: true,
      showCount: showRows.length,
      episodeCount: episodeRows.length,
      totalListens,
      durationMs: Date.now() - started,
    };
  } catch (err) {
    const message =
      err instanceof Art19Error
        ? `${err.message} :: ${err.body.slice(0, 300)}`
        : err instanceof Error
          ? err.message
          : String(err);
    if (runId) {
      await supabaseRest(`art19_sync_runs?id=eq.${runId}`, {
        method: "PATCH",
        body: JSON.stringify({
          finished_at: new Date().toISOString(),
          status: "error",
          error_message: message.slice(0, 2000),
        }),
      });
    }
    return { ok: false, durationMs: Date.now() - started, error: message };
  }
}

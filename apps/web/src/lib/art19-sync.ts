/**
 * ART19 → Supabase sync orchestrator.
 *
 * Idempotent end-to-end:
 *   1. Insert a row in `art19_sync_runs` with status=running.
 *   2. Pull networks, upsert into art19_network.
 *   3. Pull all series, upsert into art19_shows (each linked to its
 *      network when the relationship is present).
 *   4. Pull all episodes, upsert into art19_episodes (linked to its
 *      show via the JSON:API `series` relationship).
 *   5. Patch the sync_runs row with finished_at + counts + status=ok,
 *      or status=error + message if anything blew up.
 *
 * Listen / download metrics are NOT pulled here yet — the ART19 public
 * API spec doesn't expose them. Once Support confirms the right scope
 * or export channel, a follow-up step will populate art19_listens_daily.
 */

import {
  art19ConfigFromEnv,
  Art19Error,
  listAllEpisodes,
  listAllNetworks,
  listAllSeries,
} from "./art19";
import {
  episodeRowFromResource,
  firstRelId,
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
  durationMs: number;
  error?: string;
};

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

  // Open a sync_runs row up front so a hard crash still leaves a trace.
  const runStart = await supabaseRest<{ id: string }[]>("art19_sync_runs", {
    method: "POST",
    body: JSON.stringify({ status: "running" }),
    prefer: "return=representation",
  });
  const runId = runStart.ok ? runStart.data?.[0]?.id ?? null : null;

  try {
    // --- Networks ---------------------------------------------------
    const networks = await listAllNetworks(cfg);
    const networkRows: Art19NetworkRow[] = networks.map(networkRowFromResource);
    if (networkRows.length > 0) {
      const r = await supabaseRest("art19_network?on_conflict=id", {
        method: "POST",
        body: JSON.stringify(networkRows),
        prefer: "resolution=merge-duplicates,return=minimal",
      });
      if (!r.ok) throw new Error(`Failed to upsert networks: ${r.detail}`);
    }
    const primaryNetworkId = networkRows[0]?.id ?? null;

    // --- Series (shows) --------------------------------------------
    const { series } = await listAllSeries(cfg);
    const showRows: Art19ShowRow[] = series.map((s) =>
      showRowFromResource(s, primaryNetworkId),
    );
    if (showRows.length > 0) {
      const r = await supabaseRest("art19_shows?on_conflict=id", {
        method: "POST",
        body: JSON.stringify(showRows),
        prefer: "resolution=merge-duplicates,return=minimal",
      });
      if (!r.ok) throw new Error(`Failed to upsert shows: ${r.detail}`);
    }

    // --- Episodes --------------------------------------------------
    // One sweep across the whole account. ART19 supports filter by
    // series_id but a single /episodes pull (paginated) is fewer calls.
    const { episodes } = await listAllEpisodes(cfg);
    const episodeRows: Art19EpisodeRow[] = [];
    for (const e of episodes) {
      const showId = firstRelId(e, "series");
      const row = episodeRowFromResource(e, showId);
      if (row) episodeRows.push(row);
    }

    // Batch upsert in chunks — Postgres has limits on payload size and
    // upserting 5000+ rows in one POST can blow PostgREST's body cap.
    const CHUNK = 200;
    for (let i = 0; i < episodeRows.length; i += CHUNK) {
      const chunk = episodeRows.slice(i, i + CHUNK);
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

    const finishedAt = new Date().toISOString();
    if (runId) {
      await supabaseRest(`art19_sync_runs?id=eq.${runId}`, {
        method: "PATCH",
        body: JSON.stringify({
          finished_at: finishedAt,
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

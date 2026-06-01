import { NextResponse } from "next/server";

import { supabaseRest } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SyncRun = {
  status: "ok" | "error" | "running";
  started_at: string;
  finished_at: string | null;
  show_count: number | null;
  episode_count: number | null;
  error_message: string | null;
};

type Network = {
  id: string;
  name: string | null;
  listen_count: number | null;
  series_count: number | null;
};

type ShowLite = { id: string; listen_count: number | null };
type EpisodeLite = { id: string; listen_count: number | null };

/**
 * GET /api/admin/art19/summary — hero stats for the dashboard.
 *
 * Reads cached Supabase rows (never ART19 directly). Returns:
 *   - showCount / episodeCount
 *   - lastSync (status + counts + error)
 *   - networks (id, name, listen_count, series_count)
 *   - totalListens — lifetime IABv2.2 download total across all
 *     synced shows. Always populated (no Phase D dependency).
 */
export async function GET() {
  const [shows, episodes, runs, networks] = await Promise.all([
    supabaseRest<ShowLite[]>("art19_shows?select=id,listen_count"),
    supabaseRest<EpisodeLite[]>("art19_episodes?select=id,listen_count"),
    supabaseRest<SyncRun[]>(
      "art19_sync_runs?select=status,started_at,finished_at,show_count,episode_count,error_message&order=started_at.desc&limit=1",
    ),
    supabaseRest<Network[]>(
      "art19_network?select=id,name,listen_count,series_count&limit=10",
    ),
  ]);

  const showRows = shows.ok ? (shows.data ?? []) : [];
  const episodeRows = episodes.ok ? (episodes.data ?? []) : [];

  // Prefer the network's reported listen_count (single source of truth from
  // ART19). If we only have shows, fall back to summing them.
  const networkTotal = (networks.ok ? (networks.data ?? []) : []).reduce(
    (acc, n) => acc + (n.listen_count ?? 0),
    0,
  );
  const showTotal = showRows.reduce((acc, s) => acc + (s.listen_count ?? 0), 0);
  const totalListens = networkTotal > 0 ? networkTotal : showTotal;

  return NextResponse.json({
    ok: true,
    showCount: showRows.length,
    episodeCount: episodeRows.length,
    totalListens,
    lastSync: runs.ok ? (runs.data?.[0] ?? null) : null,
    networks: networks.ok ? (networks.data ?? []) : [],
  });
}

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

type Network = { id: string; name: string | null };

/**
 * GET /api/admin/art19/summary — hero stats for the dashboard.
 *
 * Returns counts read from Supabase (never from ART19 directly).
 * Includes the most recent sync run so the UI can render a freshness
 * badge + the last error message if the sync is broken.
 */
export async function GET() {
  const [shows, episodes, runs, networks] = await Promise.all([
    supabaseRest<{ id: string }[]>("art19_shows?select=id"),
    supabaseRest<{ id: string }[]>("art19_episodes?select=id"),
    supabaseRest<SyncRun[]>(
      "art19_sync_runs?select=status,started_at,finished_at,show_count,episode_count,error_message&order=started_at.desc&limit=1",
    ),
    supabaseRest<Network[]>("art19_network?select=id,name&limit=10"),
  ]);

  return NextResponse.json({
    ok: true,
    showCount: shows.ok ? (shows.data ?? []).length : 0,
    episodeCount: episodes.ok ? (episodes.data ?? []).length : 0,
    lastSync: runs.ok ? (runs.data?.[0] ?? null) : null,
    networks: networks.ok ? (networks.data ?? []) : [],
  });
}

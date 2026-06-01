import { NextResponse } from "next/server";

import { supabaseRest } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EpisodeRow = {
  id: string;
  show_id: string;
  title: string;
  duration_seconds: number | null;
  published_at: string | null;
  status: string | null;
  episode_number: number | null;
  season_number: number | null;
};

/**
 * GET /api/admin/art19/episodes — list episodes.
 *
 * Optional ?show_id=<id> narrows to one show (used by the show
 * detail expand). Default: returns the 100 most-recently-published
 * episodes across the whole network.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const showId = searchParams.get("show_id");
  const limit = Math.min(
    500,
    Math.max(1, Number(searchParams.get("limit") ?? 100)),
  );

  const filter = showId ? `&show_id=eq.${showId}` : "";
  const path =
    "art19_episodes" +
    `?select=id,show_id,title,duration_seconds,published_at,status,episode_number,season_number` +
    `${filter}&order=published_at.desc.nullslast&limit=${limit}`;

  const res = await supabaseRest<EpisodeRow[]>(path);
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: res.detail },
      { status: res.status },
    );
  }
  return NextResponse.json({ ok: true, episodes: res.data ?? [] });
}

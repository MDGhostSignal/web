import { NextResponse } from "next/server";

import { supabaseRest } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ShowRow = {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  image_url: string | null;
  episode_count: number | null;
  art19_updated_at: string | null;
};

/**
 * GET /api/admin/art19/shows — list every cached show, ordered by
 * the most recently active first (proxy: ART19's `updated_at`).
 *
 * Also returns the latest episode per show so the table can show
 * "last published" without a second query per row.
 */
export async function GET() {
  const showsRes = await supabaseRest<ShowRow[]>(
    "art19_shows?select=id,title,slug,description,image_url,episode_count,art19_updated_at&order=art19_updated_at.desc.nullslast",
  );
  if (!showsRes.ok) {
    return NextResponse.json(
      { ok: false, error: showsRes.detail },
      { status: showsRes.status },
    );
  }

  const shows = showsRes.data ?? [];
  const ids = shows.map((s) => s.id);
  const latestByShow = new Map<string, string>();

  if (ids.length > 0) {
    const idsFilter = ids.join(",");
    const epRes = await supabaseRest<
      { show_id: string; published_at: string | null }[]
    >(
      `art19_episodes?select=show_id,published_at&show_id=in.(${idsFilter})&order=published_at.desc.nullslast`,
    );
    if (epRes.ok) {
      for (const e of epRes.data ?? []) {
        if (!e.published_at) continue;
        const prev = latestByShow.get(e.show_id);
        if (!prev || e.published_at > prev) {
          latestByShow.set(e.show_id, e.published_at);
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    shows: shows.map((s) => ({
      ...s,
      latest_episode_at: latestByShow.get(s.id) ?? null,
    })),
  });
}

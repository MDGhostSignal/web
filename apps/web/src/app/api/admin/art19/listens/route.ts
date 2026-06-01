import { NextResponse } from "next/server";

import { supabaseRest } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DailyRow = {
  show_id: string;
  date: string;
  listens: number | null;
};

type ShowRow = { id: string; title: string };

/**
 * GET /api/admin/art19/listens — listen aggregations.
 *
 * Query params:
 *   range=30d (default) | 7d | 90d   — window
 *
 * Response shape (stable so the dashboard can adopt before listens
 * data actually exists; returns empty totals + empty arrays until
 * art19_listens_daily is populated):
 *
 *   {
 *     ok: true,
 *     range: "30d",
 *     total: 1234567,
 *     hasData: false,
 *     byShow: [{ show_id, title, listens }],
 *     daily:  [{ date, listens }]
 *   }
 *
 * When `hasData` is false the UI keeps showing the "pending metrics
 * access" placeholder; when true, it swaps in the real number.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rangeRaw = searchParams.get("range") ?? "30d";
  const days = rangeRaw === "7d" ? 7 : rangeRaw === "90d" ? 90 : 30;
  const sinceIso = new Date(Date.now() - days * 86_400_000)
    .toISOString()
    .slice(0, 10); // YYYY-MM-DD for the date column

  const dailyRes = await supabaseRest<DailyRow[]>(
    `art19_listens_daily?select=show_id,date,listens&date=gte.${sinceIso}&order=date.asc`,
  );

  if (!dailyRes.ok) {
    return NextResponse.json(
      { ok: false, error: dailyRes.detail },
      { status: dailyRes.status },
    );
  }

  const rows = dailyRes.data ?? [];
  const hasData = rows.length > 0;

  // Roll up totals.
  let total = 0;
  const byShowMap = new Map<string, number>();
  const byDateMap = new Map<string, number>();
  for (const r of rows) {
    const n = r.listens ?? 0;
    total += n;
    byShowMap.set(r.show_id, (byShowMap.get(r.show_id) ?? 0) + n);
    byDateMap.set(r.date, (byDateMap.get(r.date) ?? 0) + n);
  }

  // Hydrate show titles for the byShow list (skip when no data).
  let byShow: Array<{ show_id: string; title: string; listens: number }> = [];
  if (hasData) {
    const ids = [...byShowMap.keys()];
    const showsRes = await supabaseRest<ShowRow[]>(
      `art19_shows?select=id,title&id=in.(${ids.join(",")})`,
    );
    const titleById = new Map<string, string>(
      (showsRes.ok ? (showsRes.data ?? []) : []).map((s) => [s.id, s.title]),
    );
    byShow = ids
      .map((id) => ({
        show_id: id,
        title: titleById.get(id) ?? "(unknown show)",
        listens: byShowMap.get(id) ?? 0,
      }))
      .sort((a, b) => b.listens - a.listens);
  }

  const daily = [...byDateMap.entries()]
    .map(([date, listens]) => ({ date, listens }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  return NextResponse.json({
    ok: true,
    range: `${days}d`,
    total,
    hasData,
    byShow,
    daily,
  });
}

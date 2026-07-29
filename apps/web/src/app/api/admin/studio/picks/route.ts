import { NextResponse, type NextRequest } from "next/server";

import { supabaseRest } from "@/lib/supabase-admin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Editorial convention is 4 picks; allow a little headroom without
 *  letting a stray payload flood the table. */
const MAX_PICKS = 8;

/**
 * PUT /api/admin/studio/picks
 * Body: { memberId: string, picks: Array<{ brandId: string, note?: string }> }
 *
 * Replace-all save of a member's GhostSignal Picks: the array order IS
 * the deck order (position = index + 1). Delete-then-insert keeps the
 * route trivial — the table is tiny (≤ MAX_PICKS rows per member) and
 * only co-founders write here. The proxy gates /api/admin/studio/*
 * via the admin cookie.
 */
export async function PUT(req: NextRequest) {
  let body: {
    memberId?: string;
    picks?: Array<{ brandId?: string; note?: string | null }>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const memberId = body.memberId?.trim() ?? "";
  if (!UUID_RE.test(memberId)) {
    return NextResponse.json({ error: "Invalid member id." }, { status: 400 });
  }
  if (!Array.isArray(body.picks) || body.picks.length > MAX_PICKS) {
    return NextResponse.json(
      { error: `picks must be an array of at most ${MAX_PICKS}.` },
      { status: 400 },
    );
  }

  const seen = new Set<string>();
  const rows: Array<{
    member_id: string;
    brand_id: string;
    position: number;
    note: string | null;
  }> = [];
  for (const pick of body.picks) {
    const brandId = pick.brandId?.trim() ?? "";
    if (!UUID_RE.test(brandId)) {
      return NextResponse.json({ error: "Invalid brand id." }, { status: 400 });
    }
    if (seen.has(brandId)) continue; // silently dedupe
    seen.add(brandId);
    rows.push({
      member_id: memberId,
      brand_id: brandId,
      position: rows.length + 1,
      note:
        typeof pick.note === "string"
          ? pick.note.trim().slice(0, 300) || null
          : null,
    });
  }

  const del = await supabaseRest(
    `studio_brand_recommendations?member_id=eq.${encodeURIComponent(memberId)}`,
    { method: "DELETE" },
  );
  if (!del.ok) {
    if (del.status === 404) {
      return NextResponse.json(
        {
          error:
            "The picks table doesn't exist yet — run docs/STUDIO_LITE_RECOMMENDATIONS.sql in the Supabase SQL editor first.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: `Save failed (${del.status}): ${del.detail.slice(0, 200)}` },
      { status: 500 },
    );
  }

  if (rows.length > 0) {
    const ins = await supabaseRest("studio_brand_recommendations", {
      method: "POST",
      body: JSON.stringify(rows),
      prefer: "return=minimal",
    });
    if (!ins.ok) {
      return NextResponse.json(
        { error: `Save failed (${ins.status}): ${ins.detail.slice(0, 200)}` },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true, count: rows.length });
}

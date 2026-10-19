import { NextResponse } from "next/server";

import { supabaseRest } from "@/lib/supabase-admin";

import { HORIZONS, isMissingTable, missingTableResponse } from "../goals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { items: [{ id, horizon, sort_order }] }
 * Writes the new band and order after a drag. Parent links stay put.
 */
export async function POST(req: Request) {
  let payload: { items?: unknown };
  try {
    payload = (await req.json()) as { items?: unknown };
  } catch {
    return NextResponse.json(
      { ok: false, error: "Expected a JSON body." },
      { status: 400 },
    );
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Nothing to reorder." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  for (const item of payload.items) {
    if (!item || typeof item !== "object") continue;
    const row = item as { id?: unknown; horizon?: unknown; sort_order?: unknown };
    if (typeof row.id !== "string") continue;
    if (typeof row.horizon !== "string" || !HORIZONS.has(row.horizon)) continue;
    if (typeof row.sort_order !== "number") continue;
    const res = await supabaseRest(
      `company_goals?id=eq.${encodeURIComponent(row.id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          horizon: row.horizon,
          sort_order: row.sort_order,
          updated_at: now,
        }),
      },
    );
    if (!res.ok) {
      if (isMissingTable(res.detail)) return missingTableResponse();
      return NextResponse.json(
        { ok: false, error: res.detail },
        { status: res.status },
      );
    }
  }

  return NextResponse.json({ ok: true });
}

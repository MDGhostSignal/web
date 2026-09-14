import { NextResponse } from "next/server";

import { supabaseRest } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Substack metrics API — manual snapshots shown on the /admin home
 * dashboard. Auth: the /api/admin/substack-metrics matcher in proxy.ts
 * gates this behind the shared admin cookie.
 *
 *   GET → { ok, tableMissing, metrics: row | null }
 *   PUT → insert snapshot: body { subscriber_count, total_views, note? }
 *         → { ok, metrics }
 *
 * Storage: docs/SUBSTACK_METRICS_SCHEMA.sql (substack_metrics). Until
 * that runs, GET returns `tableMissing: true` and writes 503 cleanly.
 */

export type SubstackMetricsRow = {
  id: string;
  subscriber_count: number;
  total_views: number;
  note: string | null;
  recorded_at: string;
};

function isMissingTable(detail: string): boolean {
  return (
    detail.includes("42P01") ||
    detail.includes("PGRST205") ||
    detail.includes("does not exist") ||
    detail.includes("Could not find the table") ||
    detail.includes("schema cache")
  );
}

function missingTableResponse() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Substack metrics storage isn't set up yet — run docs/SUBSTACK_METRICS_SCHEMA.sql.",
    },
    { status: 503 },
  );
}

function parseNonNegInt(value: unknown, field: string): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.trim().replace(/,/g, ""));
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  void field;
  return null;
}

export async function GET() {
  const res = await supabaseRest<SubstackMetricsRow[]>(
    "substack_metrics?select=id,subscriber_count,total_views,note,recorded_at&order=recorded_at.desc&limit=1",
  );

  if (!res.ok) {
    if (isMissingTable(res.detail)) {
      return NextResponse.json({
        ok: true,
        tableMissing: true,
        metrics: null,
      });
    }
    return NextResponse.json(
      { ok: false, error: res.detail },
      { status: res.status },
    );
  }

  return NextResponse.json({
    ok: true,
    tableMissing: false,
    metrics: res.data?.[0] ?? null,
  });
}

export async function PUT(req: Request) {
  let payload: {
    subscriber_count?: unknown;
    total_views?: unknown;
    note?: unknown;
  };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const subscriberCount = parseNonNegInt(
    payload.subscriber_count,
    "subscriber_count",
  );
  const totalViews = parseNonNegInt(payload.total_views, "total_views");
  if (subscriberCount === null || totalViews === null) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "subscriber_count and total_views are required non-negative integers.",
      },
      { status: 400 },
    );
  }

  const note =
    typeof payload.note === "string" && payload.note.trim()
      ? payload.note.trim().slice(0, 500)
      : null;

  const res = await supabaseRest<SubstackMetricsRow[]>(
    "substack_metrics",
    {
      method: "POST",
      prefer: "return=representation",
      body: JSON.stringify({
        subscriber_count: subscriberCount,
        total_views: totalViews,
        note,
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

  const row = res.data?.[0];
  if (!row) {
    return NextResponse.json(
      { ok: false, error: "Insert succeeded but no row was returned." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, metrics: row });
}

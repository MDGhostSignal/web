import { NextResponse } from "next/server";

import { supabaseRest } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Substack analytics API for the /admin home tile.
 *
 *   GET ?metric=subscribers|views&range=30d|90d|all
 *     → { ok, tableMissing, metric, range, summary, delta, series }
 *
 *   PUT { subscriber_count, views?, note?, day? }
 *     → upserts substack_daily for `day` (default today) and optionally
 *       appends a substack_metrics snapshot when note is provided.
 *
 * Storage: docs/SUBSTACK_METRICS_SCHEMA.sql + docs/SUBSTACK_DAILY_SEED.sql
 */

export type SubstackDailyRow = {
  day: string;
  subscriber_count: number;
  views: number;
  updated_at?: string;
};

/** @deprecated kept for modal typing compatibility */
export type SubstackMetricsRow = {
  id: string;
  subscriber_count: number;
  total_views: number;
  note: string | null;
  recorded_at: string;
};

export type SubstackMetric = "subscribers" | "views";
export type SubstackRange = "30d" | "90d" | "all";

type SeriesPoint = { day: string; value: number };

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
        "Substack daily storage isn't set up yet — run docs/SUBSTACK_DAILY_SEED.sql.",
    },
    { status: 503 },
  );
}

function parseNonNegInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.trim().replace(/,/g, ""));
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  return null;
}

function parseMetric(raw: string | null): SubstackMetric {
  return raw === "views" ? "views" : "subscribers";
}

function parseRange(raw: string | null): SubstackRange {
  if (raw === "90d" || raw === "all") return raw;
  return "30d";
}

function rangeStartIso(range: SubstackRange, endDay: string): string | null {
  if (range === "all") return null;
  const end = new Date(`${endDay}T00:00:00Z`);
  const days = range === "90d" ? 90 : 30;
  end.setUTCDate(end.getUTCDate() - (days - 1));
  return end.toISOString().slice(0, 10);
}

function buildSeries(
  rows: SubstackDailyRow[],
  metric: SubstackMetric,
): SeriesPoint[] {
  return rows.map((r) => ({
    day: r.day.slice(0, 10),
    value: metric === "views" ? Number(r.views) : Number(r.subscriber_count),
  }));
}

function summarize(
  series: SeriesPoint[],
  metric: SubstackMetric,
  opts: { range: SubstackRange; lifetimeViews: number | null },
) {
  if (series.length === 0) {
    return { summary: 0, delta: 0, deltaPercent: null as number | null };
  }
  if (metric === "views") {
    const periodSum = series.reduce((acc, p) => acc + p.value, 0);
    // All-time headline should match Substack's lifetime total when we
    // have it — summing the traffic CSV overcounts vs Substack Stats.
    const summary =
      opts.range === "all" && opts.lifetimeViews != null
        ? opts.lifetimeViews
        : periodSum;
    return { summary, delta: periodSum, deltaPercent: null };
  }
  const first = series[0].value;
  const last = series[series.length - 1].value;
  const delta = last - first;
  const deltaPercent =
    first > 0 ? Math.round((delta / first) * 1000) / 10 : null;
  return { summary: last, delta, deltaPercent };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const metric = parseMetric(url.searchParams.get("metric"));
  const range = parseRange(url.searchParams.get("range"));

  const res = await supabaseRest<SubstackDailyRow[]>(
    "substack_daily?select=day,subscriber_count,views,updated_at&order=day.asc",
  );

  if (!res.ok) {
    if (isMissingTable(res.detail)) {
      return NextResponse.json({
        ok: true,
        tableMissing: true,
        metric,
        range,
        summary: 0,
        delta: 0,
        deltaPercent: null,
        series: [] as SeriesPoint[],
        latest: null,
        lifetimeViews: null,
      });
    }
    return NextResponse.json(
      { ok: false, error: res.detail },
      { status: res.status },
    );
  }

  const all = (res.data ?? []).map((r) => ({
    ...r,
    day: String(r.day).slice(0, 10),
    subscriber_count: Number(r.subscriber_count),
    views: Number(r.views),
  }));

  // Official Substack lifetime views (manual / seeded) — not the CSV sum.
  // Ignore errors here so a missing metrics table doesn't blank the tile.
  let lifetimeViews: number | null = null;
  const metricsRes = await supabaseRest<
    Array<{ total_views: number; recorded_at: string }>
  >(
    "substack_metrics?select=total_views,recorded_at&order=recorded_at.desc&limit=1",
  );
  if (metricsRes.ok && metricsRes.data?.[0]) {
    lifetimeViews = Number(metricsRes.data[0].total_views);
  }

  const endDay = all.at(-1)?.day ?? new Date().toISOString().slice(0, 10);
  const start = rangeStartIso(range, endDay);
  const filtered = start ? all.filter((r) => r.day >= start) : all;
  const series = buildSeries(filtered, metric);
  const { summary, delta, deltaPercent } = summarize(series, metric, {
    range,
    lifetimeViews,
  });
  const latest = all.at(-1) ?? null;

  return NextResponse.json({
    ok: true,
    tableMissing: false,
    metric,
    range,
    summary,
    delta,
    deltaPercent,
    series,
    latest,
    lifetimeViews,
  });
}

export async function PUT(req: Request) {
  let payload: {
    subscriber_count?: unknown;
    total_views?: unknown;
    lifetime_views?: unknown;
    views?: unknown;
    note?: unknown;
    day?: unknown;
  };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const subscriberCount = parseNonNegInt(payload.subscriber_count);
  if (subscriberCount === null) {
    return NextResponse.json(
      { ok: false, error: "subscriber_count is required (non-negative integer)." },
      { status: 400 },
    );
  }

  const viewsRaw = payload.views ?? payload.total_views;
  const views = viewsRaw === undefined || viewsRaw === null || viewsRaw === ""
    ? null
    : parseNonNegInt(viewsRaw);
  if (viewsRaw !== undefined && viewsRaw !== null && viewsRaw !== "" && views === null) {
    return NextResponse.json(
      { ok: false, error: "views must be a non-negative integer when provided." },
      { status: 400 },
    );
  }

  const day =
    typeof payload.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(payload.day)
      ? payload.day
      : new Date().toISOString().slice(0, 10);

  const note =
    typeof payload.note === "string" && payload.note.trim()
      ? payload.note.trim().slice(0, 500)
      : null;

  const lifetimeRaw = payload.lifetime_views ?? payload.total_views;
  const lifetimeViews =
    lifetimeRaw === undefined || lifetimeRaw === null || lifetimeRaw === ""
      ? null
      : parseNonNegInt(lifetimeRaw);
  if (
    lifetimeRaw !== undefined &&
    lifetimeRaw !== null &&
    lifetimeRaw !== "" &&
    lifetimeViews === null
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "lifetime_views must be a non-negative integer when provided.",
      },
      { status: 400 },
    );
  }

  // Read existing day so we can keep views if the form only updates subs.
  const existingRes = await supabaseRest<SubstackDailyRow[]>(
    `substack_daily?select=day,subscriber_count,views&day=eq.${day}&limit=1`,
  );
  if (!existingRes.ok) {
    if (isMissingTable(existingRes.detail)) return missingTableResponse();
    return NextResponse.json(
      { ok: false, error: existingRes.detail },
      { status: existingRes.status },
    );
  }
  const existing = existingRes.data?.[0];
  const nextViews = views ?? Number(existing?.views ?? 0);

  let dailyRow: SubstackDailyRow | null = null;
  if (existing) {
    const patch = await supabaseRest<SubstackDailyRow[]>(
      `substack_daily?day=eq.${day}`,
      {
        method: "PATCH",
        prefer: "return=representation",
        body: JSON.stringify({
          subscriber_count: subscriberCount,
          views: nextViews,
          updated_at: new Date().toISOString(),
        }),
      },
    );
    if (!patch.ok) {
      return NextResponse.json(
        { ok: false, error: patch.detail },
        { status: patch.status },
      );
    }
    dailyRow = patch.data?.[0] ?? {
      day,
      subscriber_count: subscriberCount,
      views: nextViews,
    };
  } else {
    const insert = await supabaseRest<SubstackDailyRow[]>(
      "substack_daily",
      {
        method: "POST",
        prefer: "return=representation",
        body: JSON.stringify({
          day,
          subscriber_count: subscriberCount,
          views: nextViews,
        }),
      },
    );
    if (!insert.ok) {
      if (isMissingTable(insert.detail)) return missingTableResponse();
      return NextResponse.json(
        { ok: false, error: insert.detail },
        { status: insert.status },
      );
    }
    dailyRow = insert.data?.[0] ?? null;
  }

  // Persist official Substack lifetime views whenever provided (or when a
  // note is attached). This drives the Views → All time headline.
  const lifetimeToStore = lifetimeViews ?? null;
  if (lifetimeToStore != null || note) {
    await supabaseRest("substack_metrics", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify({
        subscriber_count: subscriberCount,
        total_views: lifetimeToStore ?? nextViews,
        note,
        recorded_at: `${day}T12:00:00.000Z`,
      }),
    });
  }

  // Return a metrics-shaped object so the existing modal onSaved path works,
  // plus the daily row for chart refresh.
  const metricsCompat: SubstackMetricsRow = {
    id: dailyRow?.day ?? day,
    subscriber_count: subscriberCount,
    total_views: lifetimeToStore ?? nextViews,
    note,
    recorded_at: dailyRow?.updated_at ?? new Date().toISOString(),
  };

  return NextResponse.json({
    ok: true,
    metrics: metricsCompat,
    daily: dailyRow,
  });
}

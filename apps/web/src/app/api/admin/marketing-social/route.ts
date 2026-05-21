import { NextResponse, type NextRequest } from "next/server";

import type {
  SocialPlatform,
  SocialPostCreateInput,
  SocialPostRow,
  SocialPostStatus,
} from "@/lib/social-posts-types";
import { PLATFORMS, STATUSES } from "@/lib/social-posts-types";
import { supabaseRest } from "@/lib/supabase-admin";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

/**
 * GET /api/admin/marketing-social
 *
 * Query params (all optional):
 *  - from:     ISO date / timestamp; scheduled_at >= from
 *  - to:       ISO date / timestamp; scheduled_at <= to
 *  - status:   one of SocialPostStatus
 *  - platform: one of SocialPlatform (matches if present in platforms[])
 *  - limit, offset (default 200 / 0)
 *
 * Returns posts ordered by scheduled_at asc (calendar reads forward).
 *
 * Auth: proxy matcher in src/proxy.ts.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const limit = clampInt(searchParams.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = clampInt(
    searchParams.get("offset"),
    0,
    0,
    Number.MAX_SAFE_INTEGER,
  );
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = searchParams.get("status");
  const platform = searchParams.get("platform");

  const filters: string[] = [];
  if (from) filters.push(`scheduled_at=gte.${encodeURIComponent(from)}`);
  if (to) filters.push(`scheduled_at=lte.${encodeURIComponent(to)}`);
  if (status && (STATUSES as readonly string[]).includes(status)) {
    filters.push(`status=eq.${encodeURIComponent(status)}`);
  }
  if (platform && (PLATFORMS as readonly string[]).includes(platform)) {
    filters.push(`platforms=cs.{${encodeURIComponent(platform)}}`);
  }

  const query = [
    "select=*",
    "order=scheduled_at.asc",
    `limit=${limit}`,
    `offset=${offset}`,
    ...filters,
  ].join("&");

  const res = await supabaseRest<SocialPostRow[]>(`social_posts?${query}`);

  if (!res.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load social posts.",
        detail: res.detail,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    posts: res.data,
    count: res.data.length,
    limit,
    offset,
    filters: {
      from,
      to,
      status: (status as SocialPostStatus) || null,
      platform: (platform as SocialPlatform) || null,
    },
  });
}

/**
 * POST /api/admin/marketing-social
 *
 * Body: SocialPostCreateInput (body, platforms[], scheduled_at required).
 */
export async function POST(req: NextRequest) {
  let body: SocialPostCreateInput;
  try {
    body = (await req.json()) as SocialPostCreateInput;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const validated = validateCreate(body);
  if ("error" in validated) {
    return NextResponse.json(
      { ok: false, error: validated.error },
      { status: 400 },
    );
  }

  const res = await supabaseRest<SocialPostRow[]>("social_posts", {
    method: "POST",
    body: JSON.stringify(validated.payload),
    prefer: "return=representation",
  });

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to create post.", detail: res.detail },
      { status: 502 },
    );
  }

  const created = Array.isArray(res.data) ? res.data[0] : res.data;
  return NextResponse.json({ ok: true, post: created });
}

/* --- helpers --------------------------------------------------------- */

function clampInt(
  raw: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

type ValidatedCreate =
  | { error: string }
  | { payload: Record<string, unknown> };

function validateCreate(body: SocialPostCreateInput): ValidatedCreate {
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (text.length === 0) return { error: "Body is required." };
  if (text.length > 50_000) return { error: "Body is too long (50k max)." };

  if (!Array.isArray(body.platforms) || body.platforms.length === 0) {
    return { error: "At least one platform is required." };
  }
  const platforms = body.platforms.filter((p): p is SocialPlatform =>
    (PLATFORMS as readonly string[]).includes(p),
  );
  if (platforms.length === 0) {
    return { error: "Invalid platforms." };
  }

  const scheduled = typeof body.scheduled_at === "string" ? body.scheduled_at : "";
  const d = new Date(scheduled);
  if (!scheduled || Number.isNaN(d.getTime())) {
    return { error: "scheduled_at must be an ISO timestamp." };
  }

  const status =
    body.status && (STATUSES as readonly string[]).includes(body.status)
      ? body.status
      : "draft";

  return {
    payload: {
      title: trimOrNull(body.title, 200),
      body: text,
      body_facebook: trimOrNull(body.body_facebook, 50_000),
      body_instagram: trimOrNull(body.body_instagram, 50_000),
      body_substack: trimOrNull(body.body_substack, 200_000),
      platforms,
      scheduled_at: d.toISOString(),
      status,
      notes: trimOrNull(body.notes, 5000),
    },
  };
}

function trimOrNull(v: unknown, max: number): string | null {
  if (typeof v !== "string") return v === null ? null : null;
  const t = v.trim();
  if (t.length === 0) return null;
  return t.slice(0, max);
}

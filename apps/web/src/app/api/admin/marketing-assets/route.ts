import { NextResponse, type NextRequest } from "next/server";

import type {
  MarketingAssetCategory,
  MarketingAssetCreateInput,
  MarketingAssetFileRow,
  MarketingAssetRow,
} from "@/lib/marketing-assets-types";
import { CATEGORIES } from "@/lib/marketing-assets-types";
import { supabaseRest } from "@/lib/supabase-admin";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

/**
 * GET /api/admin/marketing-assets
 *
 * Query params:
 *  - category: brand | marketing | docs  (omit for all)
 *  - search:   case-insensitive substring on title + description
 *  - limit:    1..500 (default 200 — small catalog, optimize for one-shot)
 *  - offset:   >= 0
 *
 * Auth: handled by the proxy matcher in src/proxy.ts.
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
  const categoryRaw = searchParams.get("category");
  const search = searchParams.get("search")?.trim() ?? "";

  const filters: string[] = [];

  if (categoryRaw && (CATEGORIES as readonly string[]).includes(categoryRaw)) {
    filters.push(`category=eq.${encodeURIComponent(categoryRaw)}`);
  }

  if (search) {
    const safe = encodeURIComponent(`*${search}*`);
    filters.push(`or=(title.ilike.${safe},description.ilike.${safe})`);
  }

  const query = [
    "select=*",
    "order=updated_at.desc",
    `limit=${limit}`,
    `offset=${offset}`,
    ...filters,
  ].join("&");

  const res = await supabaseRest<MarketingAssetRow[]>(
    `marketing_assets?${query}`,
  );

  if (!res.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load marketing assets.",
        detail: res.detail,
      },
      { status: 502 },
    );
  }

  // Per-asset preview + variant-count enrichment.
  //
  // The grid card wants enough info to render the right preview for any
  // primary-file MIME — images use <img>, videos use <video> (browsers
  // render the first frame as the poster automatically), everything
  // else gets a styled mime-label fallback. Passing { url, mime } per
  // asset keeps that decision on the client where the markup lives.
  //
  // We fetch all files for the returned assets in one parallel query,
  // sort primaries first, and pick the first url-bearing primary per
  // asset. Cheap at this catalog size; revisit if it ever grows.
  const assetIds = res.data.map((a) => a.id);
  const previews: Record<string, { url: string; mime: string }> = {};
  const variantCounts: Record<string, number> = {};

  if (assetIds.length > 0) {
    const idList = assetIds.map(encodeURIComponent).join(",");
    const filesRes = await supabaseRest<MarketingAssetFileRow[]>(
      `marketing_asset_files?asset_id=in.(${idList})&select=asset_id,mime_type,is_primary,static_public_url,external_url,storage_path&order=is_primary.desc`,
    );
    if (filesRes.ok) {
      for (const f of filesRes.data) {
        variantCounts[f.asset_id] = (variantCounts[f.asset_id] ?? 0) + 1;
      }
      const seen = new Set<string>();
      for (const f of filesRes.data) {
        if (seen.has(f.asset_id)) continue;
        const url = f.static_public_url ?? f.external_url;
        if (!url) continue;
        previews[f.asset_id] = { url, mime: f.mime_type };
        seen.add(f.asset_id);
      }
    }
    // Silently tolerate filesRes failure — we still ship the assets list
    // without previews rather than failing the whole page.
  }

  return NextResponse.json({
    ok: true,
    assets: res.data,
    previews,
    variantCounts,
    count: res.data.length,
    limit,
    offset,
    filters: {
      category: categoryRaw as MarketingAssetCategory | null,
      search: search || null,
    },
  });
}

/**
 * POST /api/admin/marketing-assets
 *
 * Body: { title, description?, category, tags? }
 * Returns: the created asset row.
 */
export async function POST(req: NextRequest) {
  let body: MarketingAssetCreateInput;
  try {
    body = (await req.json()) as MarketingAssetCreateInput;
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

  const res = await supabaseRest<MarketingAssetRow[]>("marketing_assets", {
    method: "POST",
    body: JSON.stringify(validated.payload),
    prefer: "return=representation",
  });

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to create asset.", detail: res.detail },
      { status: 502 },
    );
  }

  const created = Array.isArray(res.data) ? res.data[0] : res.data;
  return NextResponse.json({ ok: true, asset: created });
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

function validateCreate(body: MarketingAssetCreateInput): ValidatedCreate {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (title.length === 0) return { error: "Title is required." };
  if (title.length > 200) return { error: "Title must be under 200 characters." };

  const category = body.category;
  if (!(CATEGORIES as readonly string[]).includes(category)) {
    return { error: "Invalid category." };
  }

  const description =
    typeof body.description === "string" && body.description.trim().length > 0
      ? body.description.trim()
      : null;

  const tags = Array.isArray(body.tags)
    ? body.tags
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && t.length <= 50)
        .slice(0, 20)
    : [];

  return {
    payload: { title, description, category, tags },
  };
}

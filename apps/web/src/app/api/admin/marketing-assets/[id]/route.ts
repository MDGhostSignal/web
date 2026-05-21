import { NextResponse, type NextRequest } from "next/server";

import type {
  MarketingAssetFileRow,
  MarketingAssetPatchInput,
  MarketingAssetRow,
  MarketingAssetWithFiles,
} from "@/lib/marketing-assets-types";
import { CATEGORIES } from "@/lib/marketing-assets-types";
import { supabaseRest } from "@/lib/supabase-admin";
import { deleteObject } from "@/lib/supabase-storage";

/**
 * GET    /api/admin/marketing-assets/[id]   — asset + its files
 * PATCH  /api/admin/marketing-assets/[id]   — edit (partial)
 * DELETE /api/admin/marketing-assets/[id]   — delete + cascade Storage
 *
 * Auth: handled by the proxy matcher in src/proxy.ts.
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid asset id." },
      { status: 400 },
    );
  }

  const [assetRes, filesRes] = await Promise.all([
    supabaseRest<MarketingAssetRow[]>(
      `marketing_assets?id=eq.${encodeURIComponent(id)}&limit=1`,
    ),
    supabaseRest<MarketingAssetFileRow[]>(
      `marketing_asset_files?asset_id=eq.${encodeURIComponent(id)}&order=is_primary.desc,created_at.asc`,
    ),
  ]);

  if (!assetRes.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to load asset.", detail: assetRes.detail },
      { status: 502 },
    );
  }
  if (!filesRes.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load asset files.",
        detail: filesRes.detail,
      },
      { status: 502 },
    );
  }

  if (assetRes.data.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Asset not found." },
      { status: 404 },
    );
  }

  const asset: MarketingAssetWithFiles = {
    ...assetRes.data[0],
    files: filesRes.data,
  };

  return NextResponse.json({ ok: true, asset });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid asset id." },
      { status: 400 },
    );
  }

  let body: MarketingAssetPatchInput;
  try {
    body = (await req.json()) as MarketingAssetPatchInput;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const validated = validatePatch(body);
  if ("error" in validated) {
    return NextResponse.json(
      { ok: false, error: validated.error },
      { status: 400 },
    );
  }
  if (Object.keys(validated.payload).length === 0) {
    return NextResponse.json(
      { ok: false, error: "No editable fields in body." },
      { status: 400 },
    );
  }

  const patchBody = { ...validated.payload, updated_at: new Date().toISOString() };

  const res = await supabaseRest<MarketingAssetRow[]>(
    `marketing_assets?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patchBody),
      prefer: "return=representation",
    },
  );

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to update asset.", detail: res.detail },
      { status: 502 },
    );
  }

  const updated = Array.isArray(res.data) ? res.data[0] : res.data;
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "Asset not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, asset: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid asset id." },
      { status: 400 },
    );
  }

  // 1. Read child file rows so we can delete the Storage objects first.
  const filesRes = await supabaseRest<MarketingAssetFileRow[]>(
    `marketing_asset_files?asset_id=eq.${encodeURIComponent(id)}&select=id,storage_path,source_type`,
  );
  if (!filesRes.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to read asset files for delete.",
        detail: filesRes.detail,
      },
      { status: 502 },
    );
  }

  // 2. Best-effort: delete Storage objects. Failures here don't block
  //    the row delete — an orphaned Storage object is cheaper to clean
  //    up later than a stale DB row pointing at a missing file.
  const storageFailures: Array<{ id: string; detail: string }> = [];
  await Promise.all(
    filesRes.data
      .filter(
        (f): f is MarketingAssetFileRow & { storage_path: string } =>
          f.source_type === "storage" && typeof f.storage_path === "string",
      )
      .map(async (f) => {
        const del = await deleteObject(f.storage_path);
        if (!del.ok) {
          storageFailures.push({ id: f.id, detail: del.detail });
        }
      }),
  );

  // 3. Delete the asset row. ON DELETE CASCADE handles the child rows.
  const delRes = await supabaseRest<unknown>(
    `marketing_assets?id=eq.${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  if (!delRes.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to delete asset.", detail: delRes.detail },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    storageFailures: storageFailures.length > 0 ? storageFailures : undefined,
  });
}

/* --- helpers --------------------------------------------------------- */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(s: string): boolean {
  return UUID_REGEX.test(s);
}

type ValidatedPatch =
  | { error: string }
  | { payload: Record<string, unknown> };

function validatePatch(body: MarketingAssetPatchInput): ValidatedPatch {
  const out: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (title.length === 0) return { error: "Title cannot be empty." };
    if (title.length > 200) return { error: "Title must be under 200 characters." };
    out.title = title;
  }

  if (body.description !== undefined) {
    if (body.description === null) {
      out.description = null;
    } else if (typeof body.description === "string") {
      out.description = body.description.trim() || null;
    }
  }

  if (body.category !== undefined) {
    if (!(CATEGORIES as readonly string[]).includes(body.category)) {
      return { error: "Invalid category." };
    }
    out.category = body.category;
  }

  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) return { error: "Tags must be an array." };
    out.tags = body.tags
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && t.length <= 50)
      .slice(0, 20);
  }

  return { payload: out };
}

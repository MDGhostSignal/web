import { NextResponse, type NextRequest } from "next/server";

import type { MarketingAssetFileRow } from "@/lib/marketing-assets-types";
import { supabaseRest } from "@/lib/supabase-admin";
import { deleteObject } from "@/lib/supabase-storage";

/**
 * DELETE /api/admin/marketing-assets/[id]/files/[fileId]
 *
 * Removes a single file variant: deletes the Storage object first
 * (best-effort), then the DB row. The asset's `updated_at` is bumped
 * so the catalog list shows it as recently touched.
 *
 * Auth: proxy matcher in src/proxy.ts.
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const { id: assetId, fileId } = await params;

  if (!UUID_REGEX.test(assetId) || !UUID_REGEX.test(fileId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid asset or file id." },
      { status: 400 },
    );
  }

  // Read the row first so we know whether to delete a Storage object.
  const rowRes = await supabaseRest<MarketingAssetFileRow[]>(
    `marketing_asset_files?id=eq.${encodeURIComponent(fileId)}&asset_id=eq.${encodeURIComponent(assetId)}&select=*&limit=1`,
  );
  if (!rowRes.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to read file.", detail: rowRes.detail },
      { status: 502 },
    );
  }
  if (rowRes.data.length === 0) {
    return NextResponse.json(
      { ok: false, error: "File not found on this asset." },
      { status: 404 },
    );
  }

  const row = rowRes.data[0];

  // Best-effort Storage delete (only if we own the object).
  let storageFailure: string | null = null;
  if (row.source_type === "storage" && row.storage_path) {
    const del = await deleteObject(row.storage_path);
    if (!del.ok) storageFailure = del.detail;
  }

  // Delete the DB row.
  const delRes = await supabaseRest(
    `marketing_asset_files?id=eq.${encodeURIComponent(fileId)}`,
    { method: "DELETE" },
  );
  if (!delRes.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to delete file row.", detail: delRes.detail },
      { status: 502 },
    );
  }

  // Bump the parent asset's updated_at.
  await supabaseRest(
    `marketing_assets?id=eq.${encodeURIComponent(assetId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ updated_at: new Date().toISOString() }),
    },
  );

  return NextResponse.json({
    ok: true,
    storageFailure: storageFailure ?? undefined,
  });
}

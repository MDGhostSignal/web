import { NextResponse, type NextRequest } from "next/server";

import type { SocialPostImageRow } from "@/lib/social-posts-types";
import { supabaseRest } from "@/lib/supabase-admin";
import { deleteObject } from "@/lib/supabase-storage";

/**
 * DELETE /api/admin/marketing-social/[id]/images/[imageId]
 *
 * Removes a single image: Storage object first (best-effort), then
 * the DB row. Bumps the parent post's updated_at so the calendar
 * reflects the change.
 *
 * Auth: proxy matcher in src/proxy.ts.
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  const { id: postId, imageId } = await params;
  if (!UUID_REGEX.test(postId) || !UUID_REGEX.test(imageId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid post or image id." },
      { status: 400 },
    );
  }

  const rowRes = await supabaseRest<SocialPostImageRow[]>(
    `social_post_images?id=eq.${encodeURIComponent(imageId)}&post_id=eq.${encodeURIComponent(postId)}&select=*&limit=1`,
  );
  if (!rowRes.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to read image.", detail: rowRes.detail },
      { status: 502 },
    );
  }
  if (rowRes.data.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Image not found on this post." },
      { status: 404 },
    );
  }

  const row = rowRes.data[0];

  let storageFailure: string | null = null;
  const del = await deleteObject(row.storage_path);
  if (!del.ok) storageFailure = del.detail;

  const delRes = await supabaseRest(
    `social_post_images?id=eq.${encodeURIComponent(imageId)}`,
    { method: "DELETE" },
  );
  if (!delRes.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to delete image row.", detail: delRes.detail },
      { status: 502 },
    );
  }

  await supabaseRest(`social_posts?id=eq.${encodeURIComponent(postId)}`, {
    method: "PATCH",
    body: JSON.stringify({ updated_at: new Date().toISOString() }),
  });

  return NextResponse.json({
    ok: true,
    storageFailure: storageFailure ?? undefined,
  });
}

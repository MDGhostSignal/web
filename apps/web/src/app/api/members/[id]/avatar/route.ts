import { NextResponse, type NextRequest } from "next/server";

import { type Member } from "@/lib/members";
import { supabaseRest } from "@/lib/supabase-admin";
import {
  deleteObject,
  getPublicUrl,
  uploadObject,
} from "@/lib/supabase-storage";

const TABLE = process.env.MEMBERS_TABLE ?? "members";
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB — comfortably under Vercel proxy cap
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/members/:id/avatar
 *
 * Multipart upload (field name: `file`). Stores the bytes under
 * `member-avatars/<id>.<ext>` in the shared `marketing-assets` bucket
 * (re-uses the same public bucket as the Marketing Asset Library —
 * see docs/CRM_MEMBERS_AVATAR_MIGRATION.sql for the rationale),
 * patches `members.avatar_url` to the public CDN URL, and returns the
 * updated member row.
 *
 * If a previous avatar exists at a different extension, it's best-
 * effort deleted after the new one is written. A failed delete leaves
 * an orphan in Storage but the DB stays consistent.
 *
 * Auth is enforced by src/proxy.ts via the `/api/members/:path*`
 * matcher entry. No inline check here.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid member id." },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Expected multipart/form-data body." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "Missing `file` field." },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: `File too large (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB).`,
      },
      { status: 413 },
    );
  }

  const mime = file.type;
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Unsupported image type. Allowed: ${[...ALLOWED_MIME].join(", ")}.`,
      },
      { status: 415 },
    );
  }

  // Best-effort lookup of the existing avatar so we can clean it up
  // after the new one is written. We don't fail the upload on a missed
  // lookup — the worst case is one orphaned blob.
  const current = await supabaseRest<Member[]>(
    `${TABLE}?id=eq.${id}&select=avatar_url&limit=1`,
  );
  const prevPath =
    current.ok && current.data[0]?.avatar_url
      ? pathFromPublicUrl(current.data[0].avatar_url)
      : null;

  const ext = MIME_TO_EXT[mime];
  const newPath = `member-avatars/${id}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const upload = await uploadObject(newPath, bytes, mime, { upsert: true });
  if (!upload.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to upload avatar to Storage.",
        detail: upload.detail,
      },
      { status: 502 },
    );
  }

  const publicUrl = getPublicUrl(newPath);

  const patch = await supabaseRest<Member[]>(`${TABLE}?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ avatar_url: publicUrl }),
    prefer: "return=representation",
  });
  if (!patch.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Avatar uploaded but member update failed.",
        detail: patch.detail,
      },
      { status: 502 },
    );
  }

  const updated = patch.data[0];
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "Member not found." },
      { status: 404 },
    );
  }

  // Clean up the previous avatar if it was at a different path (e.g.,
  // user replaced a .png with a .jpg — upsert overwrote the same-ext
  // case but left the old-ext blob behind).
  if (prevPath && prevPath !== newPath) {
    await deleteObject(prevPath);
  }

  return NextResponse.json({ ok: true, member: updated });
}

/**
 * DELETE /api/members/:id/avatar
 *
 * Removes the stored image (best effort) and nulls members.avatar_url.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid member id." },
      { status: 400 },
    );
  }

  const current = await supabaseRest<Member[]>(
    `${TABLE}?id=eq.${id}&select=avatar_url&limit=1`,
  );
  const prevPath =
    current.ok && current.data[0]?.avatar_url
      ? pathFromPublicUrl(current.data[0].avatar_url)
      : null;

  const patch = await supabaseRest<Member[]>(`${TABLE}?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ avatar_url: null }),
    prefer: "return=representation",
  });
  if (!patch.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to clear avatar_url.",
        detail: patch.detail,
      },
      { status: 502 },
    );
  }

  if (prevPath) {
    await deleteObject(prevPath);
  }

  const updated = patch.data[0];
  return NextResponse.json({ ok: true, member: updated ?? null });
}

/**
 * Extract the in-bucket path from a public CDN URL the upload route
 * previously generated. Returns null on anything that doesn't look
 * like one of ours — safer to skip a delete than to mis-issue one.
 */
function pathFromPublicUrl(url: string): string | null {
  const marker = "/storage/v1/object/public/";
  const i = url.indexOf(marker);
  if (i < 0) return null;
  const after = url.slice(i + marker.length);
  // Strip the bucket segment; everything after is the path-within-bucket.
  const slash = after.indexOf("/");
  if (slash < 0) return null;
  return decodeURIComponent(after.slice(slash + 1));
}

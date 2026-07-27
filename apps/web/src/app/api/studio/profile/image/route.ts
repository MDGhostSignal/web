import { NextResponse, type NextRequest } from "next/server";

import { requireApprovedMember, scopedUpdate } from "@/lib/studio-auth";
import { studioError } from "@/lib/studio-route";
import { supabaseRest } from "@/lib/supabase-admin";
import {
  deleteObject,
  getPublicUrl,
  uploadObject,
} from "@/lib/supabase-storage";

/**
 * POST /api/studio/profile/image
 *
 * Member-facing logo/avatar upload (multipart, field name `file`).
 * Mirrors the admin /api/members/:id/avatar route but the target row
 * is derived from the session, never the request: a brand member's
 * upload lands on their own brands.logo_url, a creator's on their own
 * creators.avatar_url. Bytes go to the shared public marketing-assets
 * bucket under brand-logos/<id>.<ext> / creator-avatars/<id>.<ext>.
 */

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB — under the Vercel proxy cap
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

export async function POST(req: NextRequest) {
  try {
    const member = await requireApprovedMember();

    // Linked org row → brand logo / creator avatar. No linked org
    // (private person, or link not made yet) → the member's own
    // avatar_url, same path convention as the admin avatar route.
    const linkedOrgId =
      member.kind === "brand"
        ? member.brandId
        : member.kind === "creator"
          ? member.creatorId
          : null;
    const table = linkedOrgId
      ? member.kind === "brand"
        ? ("brands" as const)
        : ("creators" as const)
      : ("members" as const);
    const column = table === "brands" ? "logo_url" : "avatar_url";
    const orgId = linkedOrgId ?? member.id;

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
        { ok: false, error: "File too large (max 4 MB)." },
        { status: 413 },
      );
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { ok: false, error: "Unsupported image type. Use PNG, JPG, WebP, or SVG." },
        { status: 415 },
      );
    }

    // Current image (for post-upload cleanup when the extension changes).
    const current = await supabaseRest<Array<Record<string, string | null>>>(
      `${table}?id=eq.${encodeURIComponent(orgId)}&select=${column}&limit=1`,
    );
    const prevUrl = current.ok ? (current.data?.[0]?.[column] ?? null) : null;
    const prevPath = prevUrl ? pathFromPublicUrl(prevUrl) : null;

    const ext = MIME_TO_EXT[file.type];
    const newPath =
      table === "brands"
        ? `brand-logos/${orgId}.${ext}`
        : table === "creators"
          ? `creator-avatars/${orgId}.${ext}`
          : `member-avatars/${orgId}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const upload = await uploadObject(newPath, bytes, file.type, {
      upsert: true,
    });
    if (!upload.ok) {
      return NextResponse.json(
        { ok: false, error: "Upload to storage failed." },
        { status: 502 },
      );
    }

    const publicUrl = getPublicUrl(newPath);
    await scopedUpdate(member, table, { [column]: publicUrl });

    // Best-effort cleanup of the old blob at a different extension.
    if (prevPath && prevPath !== newPath) {
      await deleteObject(prevPath);
    }

    return NextResponse.json({ ok: true, imageUrl: publicUrl });
  } catch (e) {
    return studioError(e);
  }
}

/** Extract the in-bucket path from a public CDN URL we generated.
 *  Returns null for anything that doesn't look like ours — safer to
 *  skip a delete than to mis-issue one. */
function pathFromPublicUrl(url: string): string | null {
  const marker = "/storage/v1/object/public/";
  const i = url.indexOf(marker);
  if (i < 0) return null;
  const after = url.slice(i + marker.length);
  const slash = after.indexOf("/");
  if (slash < 0) return null;
  return decodeURIComponent(after.slice(slash + 1));
}

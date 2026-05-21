import { NextResponse, type NextRequest } from "next/server";

import {
  isAcceptedMime,
  MAX_PROXY_UPLOAD_BYTES,
  MAX_UPLOAD_BYTES,
  sniffMime,
} from "@/lib/marketing-assets";
import type { SocialPostImageRow } from "@/lib/social-posts-types";
import { supabaseRest } from "@/lib/supabase-admin";
import {
  createSignedUploadUrl,
  getPublicUrl,
  uploadObject,
} from "@/lib/supabase-storage";

/**
 * GET  /api/admin/marketing-social/[id]/images — list image rows
 * POST /api/admin/marketing-social/[id]/images — add an image
 *
 * POST dispatches by content-type, identical to the asset library's
 * /files endpoint:
 *
 *   multipart/form-data (file ≤ 4 MB)
 *     → proxy upload: server writes to Storage with the service-role
 *       key, inserts the row, returns it.
 *
 *   application/json { kind: "request-upload", filename, size, mime }
 *     → returns a signed PUT URL + storagePath. Client PUTs to
 *       Supabase, then POSTs `confirm-upload` to insert the row.
 *
 *   application/json { kind: "confirm-upload", storagePath, mime, sizeBytes, position? }
 *     → inserts the row pointing at the just-uploaded Storage object.
 *
 * Storage path: `social/<post_id>/<timestamp>-<safe-filename>` inside
 * the `marketing-assets` bucket (reused — same trust model).
 *
 * Auth: proxy matcher in src/proxy.ts.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid post id." },
      { status: 400 },
    );
  }
  const res = await supabaseRest<SocialPostImageRow[]>(
    `social_post_images?post_id=eq.${encodeURIComponent(id)}&order=position.asc,created_at.asc`,
  );
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to load images.", detail: res.detail },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, images: res.data });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: postId } = await params;
  if (!UUID_REGEX.test(postId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid post id." },
      { status: 400 },
    );
  }

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.startsWith("multipart/form-data")) {
    return handleProxyUpload(req, postId);
  }

  if (contentType.includes("application/json")) {
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }
    const kind = typeof body.kind === "string" ? body.kind : "";
    if (kind === "request-upload") return handleRequestUpload(body, postId);
    if (kind === "confirm-upload") return handleConfirmUpload(body, postId);
    return NextResponse.json(
      { ok: false, error: `Unknown action: ${kind}` },
      { status: 400 },
    );
  }

  return NextResponse.json(
    { ok: false, error: `Unsupported Content-Type: ${contentType}` },
    { status: 415 },
  );
}

async function handleProxyUpload(
  req: NextRequest,
  postId: string,
): Promise<NextResponse> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to parse multipart body." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "Missing 'file' field." },
      { status: 400 },
    );
  }
  if (file.size > MAX_PROXY_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: `File exceeds proxy-upload limit (${MAX_PROXY_UPLOAD_BYTES} bytes). Use signed-upload flow.`,
      },
      { status: 413 },
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { ok: false, error: "File exceeds 50 MB limit." },
      { status: 413 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  const sniffed = sniffMime(bytes);
  const declared = file.type || "";
  const mime = sniffed ?? declared;
  if (!isAcceptedMime(mime)) {
    return NextResponse.json(
      { ok: false, error: `Unsupported MIME type: ${mime}` },
      { status: 415 },
    );
  }
  if (sniffed && declared && sniffed !== declared) {
    return NextResponse.json(
      {
        ok: false,
        error: `Declared MIME (${declared}) doesn't match file contents (${sniffed}).`,
      },
      { status: 415 },
    );
  }

  const position = readNumber(form.get("position"));

  const storagePath = buildStoragePath(postId, file.name);
  const up = await uploadObject(storagePath, arrayBuffer, mime);
  if (!up.ok) {
    return NextResponse.json(
      { ok: false, error: "Storage upload failed.", detail: up.detail },
      { status: 502 },
    );
  }

  const inserted = await insertImageRow({
    post_id: postId,
    storage_path: storagePath,
    public_url: getPublicUrl(storagePath),
    mime_type: mime,
    file_size_bytes: file.size,
    position: position ?? 0,
  });
  if (!inserted.ok) return inserted.response;

  await bumpPostUpdatedAt(postId);
  return NextResponse.json({ ok: true, image: inserted.row });
}

async function handleRequestUpload(
  body: Record<string, unknown>,
  postId: string,
): Promise<NextResponse> {
  const filename = readString(body.filename);
  const size = readBodyNumber(body.size);
  const mime = readString(body.mime);

  if (!filename || size == null || !mime) {
    return NextResponse.json(
      { ok: false, error: "Missing filename, size, or mime." },
      { status: 400 },
    );
  }
  if (size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { ok: false, error: "File exceeds 50 MB limit." },
      { status: 413 },
    );
  }
  if (!isAcceptedMime(mime)) {
    return NextResponse.json(
      { ok: false, error: `Unsupported MIME type: ${mime}` },
      { status: 415 },
    );
  }

  const storagePath = buildStoragePath(postId, filename);
  const signed = await createSignedUploadUrl(storagePath);
  if (!signed.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to create signed upload URL.",
        detail: signed.detail,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    signedUrl: signed.signedUrl,
    token: signed.token,
    storagePath,
  });
}

async function handleConfirmUpload(
  body: Record<string, unknown>,
  postId: string,
): Promise<NextResponse> {
  const storagePath = readString(body.storagePath);
  const mime = readString(body.mime);
  const sizeBytes = readBodyNumber(body.sizeBytes);
  const position = readBodyNumber(body.position);

  if (!storagePath || !mime || sizeBytes == null) {
    return NextResponse.json(
      { ok: false, error: "Missing storagePath, mime, or sizeBytes." },
      { status: 400 },
    );
  }
  if (!isAcceptedMime(mime)) {
    return NextResponse.json(
      { ok: false, error: `Unsupported MIME type: ${mime}` },
      { status: 415 },
    );
  }

  const inserted = await insertImageRow({
    post_id: postId,
    storage_path: storagePath,
    public_url: getPublicUrl(storagePath),
    mime_type: mime,
    file_size_bytes: sizeBytes,
    position: position ?? 0,
  });
  if (!inserted.ok) return inserted.response;

  await bumpPostUpdatedAt(postId);
  return NextResponse.json({ ok: true, image: inserted.row });
}

/* --- shared helpers -------------------------------------------------- */

interface InsertImageInput {
  post_id: string;
  storage_path: string;
  public_url: string;
  mime_type: string;
  file_size_bytes: number;
  position: number;
}

async function insertImageRow(
  payload: InsertImageInput,
): Promise<
  | { ok: true; row: SocialPostImageRow }
  | { ok: false; response: NextResponse }
> {
  const res = await supabaseRest<SocialPostImageRow[]>(
    "social_post_images",
    {
      method: "POST",
      body: JSON.stringify(payload),
      prefer: "return=representation",
    },
  );
  if (!res.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Failed to insert image row.", detail: res.detail },
        { status: 502 },
      ),
    };
  }
  const row = Array.isArray(res.data) ? res.data[0] : res.data;
  return { ok: true, row };
}

async function bumpPostUpdatedAt(postId: string): Promise<void> {
  await supabaseRest(`social_posts?id=eq.${encodeURIComponent(postId)}`, {
    method: "PATCH",
    body: JSON.stringify({ updated_at: new Date().toISOString() }),
  });
}

function buildStoragePath(postId: string, filename: string): string {
  const safe = filename
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `social/${postId}/${Date.now()}-${safe || "file"}`;
}

function readString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

function readBodyNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseInt(v, 10);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function readNumber(v: FormDataEntryValue | null): number | null {
  return readBodyNumber(v);
}

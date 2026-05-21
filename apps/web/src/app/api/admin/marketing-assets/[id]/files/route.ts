import { NextResponse, type NextRequest } from "next/server";

import {
  isAcceptedMime,
  MAX_PROXY_UPLOAD_BYTES,
  MAX_UPLOAD_BYTES,
  sniffMime,
} from "@/lib/marketing-assets";
import type {
  MarketingAssetFileRow,
  MarketingAssetSource,
} from "@/lib/marketing-assets-types";
import { supabaseRest } from "@/lib/supabase-admin";
import {
  createSignedUploadUrl,
  getPublicUrl,
  uploadObject,
} from "@/lib/supabase-storage";

/**
 * GET   /api/admin/marketing-assets/[id]/files — list this asset's file variants
 * POST  /api/admin/marketing-assets/[id]/files — add a variant
 *
 * The POST dispatches by content-type and body shape (4 paths):
 *
 *   multipart/form-data (file ≤ 4 MB)
 *     → proxy upload: server writes to Storage with the service-role key,
 *       inserts the file row, returns it.
 *
 *   application/json { kind: "request-upload", filename, size, mime }
 *     → for files > 4 MB. Returns a signed PUT URL + storagePath. The
 *       browser PUTs the bytes directly to Supabase Storage, then POSTs
 *       back with `confirm-upload` to insert the row.
 *
 *   application/json { kind: "confirm-upload", storagePath, mime, sizeBytes, variantLabel?, isPrimary? }
 *     → inserts the file row pointing at the just-uploaded Storage object.
 *
 *   application/json { kind: "drive-url", externalUrl, mime?, variantLabel?, isPrimary? }
 *     → inserts a file row that points at a Google Drive share URL. No
 *       bytes pass through us.
 *
 * Auth: proxy matcher in src/proxy.ts.
 */

export const runtime = "nodejs";
export const maxDuration = 60; // proxy uploads can take a few seconds

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid asset id." },
      { status: 400 },
    );
  }

  const res = await supabaseRest<MarketingAssetFileRow[]>(
    `marketing_asset_files?asset_id=eq.${encodeURIComponent(id)}&order=is_primary.desc,created_at.asc`,
  );
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to load files.", detail: res.detail },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, files: res.data });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: assetId } = await params;
  if (!UUID_REGEX.test(assetId)) {
    return NextResponse.json(
      { ok: false, error: "Invalid asset id." },
      { status: 400 },
    );
  }

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.startsWith("multipart/form-data")) {
    return handleProxyUpload(req, assetId);
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
    if (kind === "request-upload") return handleRequestUpload(body, assetId);
    if (kind === "confirm-upload") return handleConfirmUpload(body, assetId);
    if (kind === "drive-url") return handleDriveUrl(body, assetId);
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

/* --- Path A: multipart proxy upload (≤4 MB) -------------------------- */

async function handleProxyUpload(
  req: NextRequest,
  assetId: string,
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
        error: `File exceeds proxy-upload limit of ${MAX_PROXY_UPLOAD_BYTES} bytes. Use the signed-upload flow.`,
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

  // Magic-number sniff against client-declared mime. If we can sniff,
  // require they agree. If we can't sniff (text formats), require the
  // declared mime is on the allowlist.
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

  const variantLabel = readString(form.get("variantLabel")) ?? null;
  const isPrimary = readString(form.get("isPrimary")) === "true";

  // Storage path: marketing-assets/<assetId>/<timestamp>-<safe-filename>
  const storagePath = buildStoragePath(assetId, file.name);

  const up = await uploadObject(storagePath, arrayBuffer, mime);
  if (!up.ok) {
    return NextResponse.json(
      { ok: false, error: "Storage upload failed.", detail: up.detail },
      { status: 502 },
    );
  }

  const inserted = await insertFileRow({
    asset_id: assetId,
    variant_label: variantLabel,
    mime_type: mime,
    file_size_bytes: file.size,
    source_type: "storage",
    storage_path: storagePath,
    static_public_url: getPublicUrl(storagePath),
    external_url: null,
    is_primary: isPrimary,
  });

  if (!inserted.ok) return inserted.response;
  await bumpAssetUpdatedAt(assetId);
  return NextResponse.json({ ok: true, file: inserted.row });
}

/* --- Path B: signed-upload URL request -------------------------------- */

async function handleRequestUpload(
  body: Record<string, unknown>,
  assetId: string,
): Promise<NextResponse> {
  const filename = readBodyString(body.filename);
  const size = readBodyNumber(body.size);
  const mime = readBodyString(body.mime);

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

  const storagePath = buildStoragePath(assetId, filename);
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

/* --- Path C: confirm upload (insert row) ----------------------------- */

async function handleConfirmUpload(
  body: Record<string, unknown>,
  assetId: string,
): Promise<NextResponse> {
  const storagePath = readBodyString(body.storagePath);
  const mime = readBodyString(body.mime);
  const sizeBytes = readBodyNumber(body.sizeBytes);
  const variantLabel = readBodyString(body.variantLabel) ?? null;
  const isPrimary = body.isPrimary === true;

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

  const inserted = await insertFileRow({
    asset_id: assetId,
    variant_label: variantLabel,
    mime_type: mime,
    file_size_bytes: sizeBytes,
    source_type: "storage",
    storage_path: storagePath,
    static_public_url: getPublicUrl(storagePath),
    external_url: null,
    is_primary: isPrimary,
  });

  if (!inserted.ok) return inserted.response;
  await bumpAssetUpdatedAt(assetId);
  return NextResponse.json({ ok: true, file: inserted.row });
}

/* --- Path D: drive-url variant --------------------------------------- */

async function handleDriveUrl(
  body: Record<string, unknown>,
  assetId: string,
): Promise<NextResponse> {
  const externalUrl = readBodyString(body.externalUrl);
  const mime = readBodyString(body.mime) ?? "application/octet-stream";
  const variantLabel = readBodyString(body.variantLabel) ?? null;
  const isPrimary = body.isPrimary === true;

  if (!externalUrl || !/^https?:\/\//i.test(externalUrl)) {
    return NextResponse.json(
      { ok: false, error: "externalUrl must be an http(s) URL." },
      { status: 400 },
    );
  }
  // For Drive URLs we trust the declared mime (we never see the bytes).
  // If it's not in the allowlist we still accept the entry — but log
  // by leaving the row with the declared value; the UI surfaces it.
  // Allowlist enforcement here would block legitimate Drive Docs whose
  // mime types are vendor-specific (e.g. application/vnd.google-apps.document).

  const inserted = await insertFileRow({
    asset_id: assetId,
    variant_label: variantLabel,
    mime_type: mime,
    file_size_bytes: 0,
    source_type: "drive_url",
    storage_path: null,
    static_public_url: null,
    external_url: externalUrl,
    is_primary: isPrimary,
  });
  if (!inserted.ok) return inserted.response;
  await bumpAssetUpdatedAt(assetId);
  return NextResponse.json({ ok: true, file: inserted.row });
}

/* --- shared helpers -------------------------------------------------- */

interface InsertFileRowInput {
  asset_id: string;
  variant_label: string | null;
  mime_type: string;
  file_size_bytes: number;
  source_type: MarketingAssetSource;
  storage_path: string | null;
  static_public_url: string | null;
  external_url: string | null;
  is_primary: boolean;
}

async function insertFileRow(
  payload: InsertFileRowInput,
): Promise<
  | { ok: true; row: MarketingAssetFileRow }
  | { ok: false; response: NextResponse }
> {
  // If this row is being inserted as primary, clear any existing
  // primary on the same asset first. The partial unique index would
  // otherwise reject the insert.
  if (payload.is_primary) {
    await supabaseRest(
      `marketing_asset_files?asset_id=eq.${encodeURIComponent(payload.asset_id)}&is_primary=eq.true`,
      {
        method: "PATCH",
        body: JSON.stringify({ is_primary: false }),
      },
    );
  }

  const res = await supabaseRest<MarketingAssetFileRow[]>(
    "marketing_asset_files",
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
        { ok: false, error: "Failed to insert file row.", detail: res.detail },
        { status: 502 },
      ),
    };
  }
  const row = Array.isArray(res.data) ? res.data[0] : res.data;
  return { ok: true, row };
}

async function bumpAssetUpdatedAt(assetId: string): Promise<void> {
  await supabaseRest(
    `marketing_assets?id=eq.${encodeURIComponent(assetId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ updated_at: new Date().toISOString() }),
    },
  );
}

function buildStoragePath(assetId: string, filename: string): string {
  const safe = filename
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${assetId}/${Date.now()}-${safe || "file"}`;
}

function readString(v: FormDataEntryValue | null): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function readBodyString(v: unknown): string | null {
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

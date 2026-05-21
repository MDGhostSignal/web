/**
 * Server-side helpers for the Marketing Asset Library.
 *
 * Includes:
 *  - Magic-number based MIME sniffing (inline table — no `file-type` dep).
 *  - File-size formatting for the UI.
 *  - Logo-variant grouping regex (used by the seed script).
 *  - Constants shared between the route handlers and the client.
 */

import type { MarketingAssetCategory } from "@/lib/marketing-assets-types";

/**
 * Vercel's serverless functions accept a request body up to ~4.5 MB
 * (the exact number drifts; we round down to 4 MB for safety). Files
 * larger than this MUST use the signed-upload-URL flow that PUTs
 * directly from the browser to Supabase Storage, bypassing the Vercel
 * function entirely.
 *
 * Documented in apps/web/src/app/admin/marketing/components/VariantUpload.tsx.
 */
export const MAX_PROXY_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Hard upper bound enforced by both the route handler and the bucket policy. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/* --- File-size formatting -------------------------------------------- */

/**
 * Human-friendly size formatter. Internal tool — locale fixed to en-US
 * so test snapshots stay stable.
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const fixed = v >= 100 || i === 0 ? v.toFixed(0) : v.toFixed(1);
  return `${fixed} ${units[i]}`;
}

/* --- Category inference (used by seed + create form prefill) --------- */

/**
 * Guess a category from a source path. Falls back to "marketing" — the
 * least-restrictive bucket — when nothing matches, so an uncategorized
 * asset is still surfaced.
 */
export function inferCategoryFromPath(p: string): MarketingAssetCategory {
  const lower = p.replace(/\\/g, "/").toLowerCase();
  if (
    lower.startsWith("logo/") ||
    lower.includes("/brand/") ||
    lower.startsWith("brandguide/")
  ) {
    return "brand";
  }
  if (lower.startsWith("docs/") || lower.endsWith(".pdf") || lower.endsWith(".md")) {
    return "docs";
  }
  return "marketing";
}

/* --- Logo variant grouping (used by the seed script) ----------------- */

/**
 * Matches files like `brandmark-hor-white@2.png`. Used by the seeder
 * to roll multi-density logos into a single asset with N variants.
 *
 * Positional groups (named groups need ES2018+; the project targets ES2017):
 *   [1] stem    — "brandmark-hor"
 *   [2] color   — "black" | "white"
 *   [3] density — "1" | "2" | "4" | undefined
 *   [4] ext     — "png", "svg", etc.
 */
export const LOGO_VARIANT_REGEX =
  /^([a-z]+(?:-[a-z]+)*)-(black|white)(?:@([124]))?\.([a-z]+)$/;

/**
 * Build a human title from the parsed regex groups. e.g.
 * brandmark-hor + white → "Brandmark (Horizontal, White)"
 */
export function titleFromLogoStem(stem: string, color: string): string {
  // brandmark-hor → ["brandmark", "hor"]
  const parts = stem.split("-");
  const head = capitalize(parts[0]);
  const rest = parts.slice(1).map(expandLogoTrailingToken).filter(Boolean).join(", ");
  const colorLabel = capitalize(color);
  return rest ? `${head} (${rest}, ${colorLabel})` : `${head} (${colorLabel})`;
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

function expandLogoTrailingToken(token: string): string {
  // Map the few abbreviations we use in the logo filenames.
  switch (token) {
    case "hor":
      return "Horizontal";
    case "vert":
      return "Vertical";
    case "sq":
    case "square":
      return "Square";
    case "mark":
      return "Mark";
    default:
      return capitalize(token);
  }
}

/* --- MIME sniffing (magic-number table) ------------------------------ */

const ACCEPTED_MIMES = new Set<string>([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
  "video/mp4",
  "video/webm",
  "application/pdf",
  "application/postscript", // EPS
  "text/markdown",
  "text/html",
  "application/json",
]);

/** Cheap check the route handler does *before* writing to Storage. */
export function isAcceptedMime(mime: string): boolean {
  return ACCEPTED_MIMES.has(mime.toLowerCase());
}

/**
 * Magic-number sniff against the first ~16 bytes of an uploaded file.
 * Returns the detected MIME or null if no entry matched. The caller
 * compares this against the client-declared mime and the
 * ACCEPTED_MIMES allowlist — never trust the client alone.
 *
 * Inline table (no `file-type` dep) — we only accept ~12 formats.
 * Text formats (SVG, MD, HTML, JSON) have no magic bytes; fall back
 * to extension/declared-mime checking outside this function.
 */
export function sniffMime(bytes: Uint8Array): string | null {
  if (bytes.length < 4) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // GIF: 47 49 46 38
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return "image/gif";
  }
  // WebP: "RIFF....WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  // PDF: 25 50 44 46
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return "application/pdf";
  }
  // EPS: starts with "%!PS"
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x21 &&
    bytes[2] === 0x50 &&
    bytes[3] === 0x53
  ) {
    return "application/postscript";
  }
  // MP4 ISO base media: bytes 4..7 == "ftyp"
  if (
    bytes.length >= 8 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    return "video/mp4";
  }
  // WebM (Matroska): 1A 45 DF A3
  if (
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return "video/webm";
  }
  // SVG: leading "<?xml" or "<svg" (text — fragile, but useful)
  const head = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.slice(0, 256))
    .trimStart();
  if (head.startsWith("<?xml") || head.startsWith("<svg")) {
    return "image/svg+xml";
  }
  // HTML: leading "<!DOCTYPE" or "<html"
  if (/^<(!doctype html|html)\b/i.test(head)) {
    return "text/html";
  }
  // JSON: leading { or [
  if (head.startsWith("{") || head.startsWith("[")) {
    return "application/json";
  }

  return null;
}

/**
 * Bootstrap the Marketing Asset Library with the team's existing
 * tracked repo assets.
 *
 * Discovery roots and category mapping:
 *
 *   logo/**                                  → brand    (copied to apps/web/public/brand/<ext>/)
 *   apps/web/public/images/brand/**          → brand    (already public; static_public_url)
 *   apps/web/public/images/for-creators/**   → marketing
 *   apps/web/public/images/for-advertisers/**→ marketing
 *   brandguide/GhostSignal-BrandGuide.pdf    → docs     (copied)
 *   docs/WHITE_PAPER.md                      → docs     (copied)
 *
 * Files matching the LOGO_VARIANT_REGEX (e.g. `brandmark-hor-white@2.png`)
 * are grouped by (stem, color) into a single asset with N file variants.
 *
 * The script is idempotent — re-running skips assets whose (category, title)
 * pair already exists, and skips files whose static_public_url is already
 * registered. It NEVER deletes anything.
 *
 * Usage (from apps/web):
 *   node scripts/seed-marketing-assets.mjs --dry-run
 *   node scripts/seed-marketing-assets.mjs
 *   node scripts/seed-marketing-assets.mjs --only=brand
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from apps/web/.env.local.
 * No dev server required.
 *
 * See docs/MARKETING_ASSETS.md for the full runbook.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, join, posix, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(WEB_ROOT, "..", "..");

/* --- CLI args -------------------------------------------------------- */

const args = process.argv.slice(2);
function arg(name, fallback) {
  const hit = args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  if (hit === `--${name}`) return true;
  return hit.slice(`--${name}=`.length);
}

const DRY = arg("dry-run", false) === true;
const ONLY = (arg("only", null) || "").trim() || null; // "brand" | "marketing" | "docs" | null

/* --- Load env from .env.local --------------------------------------- */

const ENV_PATH = resolve(WEB_ROOT, ".env.local");
if (!existsSync(ENV_PATH)) {
  console.error(`Missing ${ENV_PATH}. Cannot read Supabase credentials.`);
  process.exit(2);
}
const ENV = parseDotEnv(readFileSync(ENV_PATH, "utf8"));
const SUPABASE_URL = ENV.SUPABASE_URL;
const SERVICE_ROLE_KEY = ENV.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env.local.");
  process.exit(2);
}

function parseDotEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    let value = m[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[m[1]] = value;
  }
  return out;
}

/* --- Supabase REST helper (mirrors lib/supabase-admin.ts) ------------ */

async function rest(pathAndQuery, init = {}) {
  const headers = {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };
  if (init.prefer) headers.Prefer = init.prefer;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Supabase ${init.method ?? "GET"} ${pathAndQuery} → ${res.status}: ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) : null;
}

/* --- LOGO_VARIANT_REGEX (mirrors lib/marketing-assets.ts) ------------ */

const LOGO_VARIANT_REGEX =
  /^([a-z]+(?:-[a-z]+)*)-(black|white)(?:@([124]))?\.([a-z]+)$/;

function titleFromLogoStem(stem, color) {
  const parts = stem.split("-");
  const head = capitalize(parts[0]);
  const rest = parts
    .slice(1)
    .map(expandToken)
    .filter(Boolean)
    .join(", ");
  const c = capitalize(color);
  return rest ? `${head} (${rest}, ${c})` : `${head} (${c})`;
}
function capitalize(s) {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}
function expandToken(t) {
  switch (t) {
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
      return capitalize(t);
  }
}

/* --- Mime sniff by extension (loose — for the seed only) ------------ */

const EXT_MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
  ".eps": "application/postscript",
  ".md": "text/markdown",
  ".html": "text/html",
  ".json": "application/json",
};

function mimeForExt(p) {
  return EXT_MIME[extname(p).toLowerCase()] ?? "application/octet-stream";
}

/* --- Discovery roots ------------------------------------------------- */

const ROOTS = [
  { dir: "logo", category: "brand", copyTo: "brand", logoMatrix: true },
  {
    dir: "apps/web/public/images/brand",
    category: "brand",
    inPublic: true,
    publicPrefix: "/images/brand",
  },
  {
    dir: "apps/web/public/images/for-creators",
    category: "marketing",
    inPublic: true,
    publicPrefix: "/images/for-creators",
  },
  {
    dir: "apps/web/public/images/for-advertisers",
    category: "marketing",
    inPublic: true,
    publicPrefix: "/images/for-advertisers",
  },
  {
    file: "brandguide/GhostSignal-BrandGuide.pdf",
    category: "docs",
    copyTo: "brand",
    title: "GhostSignal Brand Guide",
  },
  {
    file: "docs/WHITE_PAPER.md",
    category: "docs",
    copyTo: "brand",
    title: "GhostSignal White Paper",
  },
];

const PUBLIC_BRAND_DIR = resolve(WEB_ROOT, "public", "brand");

/* --- Discovery + grouping pass --------------------------------------- */

/**
 * @returns {Array<{
 *   title: string,
 *   category: "brand"|"marketing"|"docs",
 *   description: string | null,
 *   tags: string[],
 *   variants: Array<{
 *     variant_label: string,
 *     mime_type: string,
 *     file_size_bytes: number,
 *     source_type: "static",
 *     static_public_url: string,
 *     is_primary: boolean,
 *     // populated only when copyTo is set
 *     _copyFrom?: string,
 *     _copyTo?: string,
 *   }>,
 * }>}
 */
function planAssets() {
  /** @type {Map<string, {title, category, description, tags, variants: any[]}>} */
  const byKey = new Map();

  for (const root of ROOTS) {
    if (root.dir) processDir(root, byKey);
    if (root.file) processFile(root, byKey);
  }

  // Choose a primary variant per asset: prefer SVG, then highest-density PNG,
  // then anything else. Stable for repeated runs.
  for (const asset of byKey.values()) {
    if (asset.variants.length === 0) continue;
    asset.variants.sort(compareVariantsForPrimary);
    asset.variants[0].is_primary = true;
  }

  return [...byKey.values()];
}

function processFile(root, byKey) {
  const abs = resolve(REPO_ROOT, root.file);
  if (!existsSync(abs)) return;
  const stat = statSync(abs);
  if (!stat.isFile()) return;

  const filename = basename(root.file);
  const publicPath = posix.join("/brand", filename);
  const key = `${root.category}::${root.title ?? filename}`;
  if (!byKey.has(key)) {
    byKey.set(key, {
      title: root.title ?? filename,
      category: root.category,
      description: null,
      tags: [],
      variants: [],
    });
  }
  const target = resolve(PUBLIC_BRAND_DIR, filename);
  byKey.get(key).variants.push({
    variant_label: extname(filename).slice(1).toUpperCase() || "FILE",
    mime_type: mimeForExt(filename),
    file_size_bytes: stat.size,
    source_type: "static",
    static_public_url: publicPath,
    is_primary: false,
    _copyFrom: abs,
    _copyTo: target,
  });
}

function processDir(root, byKey) {
  const abs = resolve(REPO_ROOT, root.dir);
  if (!existsSync(abs)) return;
  for (const entry of walk(abs)) {
    const rel = entry.slice(abs.length + 1).replace(/\\/g, "/");
    const filename = basename(rel);

    if (root.logoMatrix) {
      // Logo files: group by (stem, color) via the regex. Files that
      // don't match get one-asset-per-file with a default label.
      const m = filename.match(LOGO_VARIANT_REGEX);
      if (m) {
        const [, stem, color, density, ext] = m;
        const title = titleFromLogoStem(stem, color);
        const key = `${root.category}::${title}`;
        if (!byKey.has(key)) {
          byKey.set(key, {
            title,
            category: root.category,
            description: null,
            tags: [color, ext],
            variants: [],
          });
        }
        const stat = statSync(entry);
        const targetRel = posix.join("brand", ext.toLowerCase(), filename);
        const target = resolve(WEB_ROOT, "public", targetRel);
        byKey.get(key).variants.push({
          variant_label: density
            ? `${ext.toUpperCase()} @${density}x`
            : ext.toUpperCase(),
          mime_type: mimeForExt(filename),
          file_size_bytes: stat.size,
          source_type: "static",
          static_public_url: `/${targetRel}`,
          is_primary: false,
          _copyFrom: entry,
          _copyTo: target,
        });
        continue;
      }
      // Unmatched file in logo/ — make it its own asset.
      const stat = statSync(entry);
      const targetRel = posix.join("brand", "misc", filename);
      const target = resolve(WEB_ROOT, "public", targetRel);
      const key = `${root.category}::${filename}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          title: filename,
          category: root.category,
          description: null,
          tags: ["misc"],
          variants: [],
        });
      }
      byKey.get(key).variants.push({
        variant_label: extname(filename).slice(1).toUpperCase() || "FILE",
        mime_type: mimeForExt(filename),
        file_size_bytes: stat.size,
        source_type: "static",
        static_public_url: `/${targetRel}`,
        is_primary: false,
        _copyFrom: entry,
        _copyTo: target,
      });
      continue;
    }

    // Already-public files: one asset per file, no copy.
    if (root.inPublic) {
      const stat = statSync(entry);
      const publicUrl = posix.join(root.publicPrefix, rel);
      const key = `${root.category}::${filename}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          title: filename,
          category: root.category,
          description: null,
          tags: [],
          variants: [],
        });
      }
      byKey.get(key).variants.push({
        variant_label: extname(filename).slice(1).toUpperCase() || "FILE",
        mime_type: mimeForExt(filename),
        file_size_bytes: stat.size,
        source_type: "static",
        static_public_url: publicUrl,
        is_primary: false,
      });
    }
  }
}

function walk(dir) {
  /** @type {string[]} */
  const out = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(full));
    else if (ent.isFile()) out.push(full);
  }
  return out;
}

function compareVariantsForPrimary(a, b) {
  // Lower rank = earlier in sort = more "primary" candidate.
  const rank = (v) => {
    const ext = (v.static_public_url ?? "").toLowerCase();
    if (ext.endsWith(".svg")) return 0;
    if (ext.endsWith(".png")) return 1;
    if (ext.endsWith(".jpg") || ext.endsWith(".jpeg")) return 2;
    if (ext.endsWith(".webp")) return 3;
    if (ext.endsWith(".pdf")) return 4;
    if (ext.endsWith(".md")) return 5;
    return 9;
  };
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra - rb;
  // Prefer higher density when ranks tie (@4 beats @2 beats @1).
  const dens = (v) => {
    const m = String(v.variant_label).match(/@(\d)x/);
    return m ? -Number(m[1]) : 0;
  };
  return dens(a) - dens(b);
}

/* --- Idempotent write pass ------------------------------------------- */

async function findExistingAsset(category, title) {
  const t = encodeURIComponent(title);
  const data = await rest(
    `marketing_assets?category=eq.${category}&title=eq.${t}&select=id&limit=1`,
  );
  return Array.isArray(data) && data.length > 0 ? data[0].id : null;
}

async function findExistingFileByUrl(assetId, url) {
  const u = encodeURIComponent(url);
  const data = await rest(
    `marketing_asset_files?asset_id=eq.${encodeURIComponent(assetId)}&static_public_url=eq.${u}&select=id&limit=1`,
  );
  return Array.isArray(data) && data.length > 0 ? data[0].id : null;
}

async function createAsset(asset) {
  const rows = await rest("marketing_assets", {
    method: "POST",
    body: JSON.stringify({
      title: asset.title,
      description: asset.description,
      category: asset.category,
      tags: asset.tags,
    }),
    prefer: "return=representation",
  });
  return rows[0].id;
}

async function createFileRow(assetId, variant) {
  await rest("marketing_asset_files", {
    method: "POST",
    body: JSON.stringify({
      asset_id: assetId,
      variant_label: variant.variant_label,
      mime_type: variant.mime_type,
      file_size_bytes: variant.file_size_bytes,
      source_type: variant.source_type,
      static_public_url: variant.static_public_url,
      is_primary: variant.is_primary,
    }),
    prefer: "return=minimal",
  });
}

/* --- Main ------------------------------------------------------------ */

async function main() {
  console.log(
    `Seeding marketing assets${DRY ? " (DRY RUN)" : ""}${ONLY ? ` (category=${ONLY})` : ""}…`,
  );

  const plan = planAssets().filter((a) => !ONLY || a.category === ONLY);

  let assetCount = 0;
  let fileCount = 0;
  let copyCount = 0;
  let skippedAssets = 0;
  let skippedFiles = 0;

  for (const asset of plan) {
    console.log(`\n${asset.category.toUpperCase()} · ${asset.title}`);
    for (const v of asset.variants) {
      const arrow = v.is_primary ? "→ " : "  ";
      console.log(
        `  ${arrow}${v.variant_label.padEnd(10)} ${v.static_public_url}`,
      );
    }

    if (DRY) {
      assetCount++;
      fileCount += asset.variants.length;
      continue;
    }

    // Idempotent: skip the whole asset if it already exists with the same title.
    let assetId = await findExistingAsset(asset.category, asset.title);
    if (assetId) {
      skippedAssets++;
      console.log(`    (already exists — id=${assetId})`);
    } else {
      assetId = await createAsset(asset);
      assetCount++;
    }

    for (const v of asset.variants) {
      if (v._copyFrom && v._copyTo) {
        if (!existsSync(v._copyTo)) {
          mkdirSync(dirname(v._copyTo), { recursive: true });
          copyFileSync(v._copyFrom, v._copyTo);
          copyCount++;
        }
      }

      const existingFileId = await findExistingFileByUrl(
        assetId,
        v.static_public_url,
      );
      if (existingFileId) {
        skippedFiles++;
        continue;
      }
      await createFileRow(assetId, v);
      fileCount++;
    }
  }

  console.log(
    `\nDone. ${DRY ? "(dry run) " : ""}` +
      `assets created: ${assetCount} (skipped ${skippedAssets}) · ` +
      `file rows created: ${fileCount} (skipped ${skippedFiles}) · ` +
      `files copied: ${copyCount}`,
  );
}

main().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});

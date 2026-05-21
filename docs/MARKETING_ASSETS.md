# Marketing Asset Library — Runbook

The `/admin/marketing` tab is a curated catalog for brand assets, marketing material, white paper, and reference docs. It does **not** replace Google Drive — it sits alongside it as the team's single index, with Drive URLs as first-class entries next to direct Supabase Storage uploads.

This document covers schema, bucket setup, env vars, the seed script, and the upload paths.

## Architecture at a glance

```
                ┌─────────────────────────────┐
                │ /admin/marketing (UI)        │
                │  - grid of cards             │
                │  - chip filter chips         │
                │  - detail modal + variants   │
                └────────────┬────────────────┘
                             │
                fetch GET    │
                             ▼
              ┌──────────────────────────────────┐
              │ /api/admin/marketing-assets/...  │
              │  - GET list (filtered, paged)    │
              │  - GET single asset + files      │
              │  - POST/PATCH/DELETE (Phase B)   │
              └──┬──────────────────────────┬────┘
                 │                          │
        Supabase │                Supabase  │
        Storage  │                Postgres  │
         (REST)  ▼                  (REST)  ▼
       ┌──────────────────┐   ┌─────────────────────────────┐
       │ marketing-assets │   │  marketing_assets           │
       │ bucket (public)  │   │  marketing_asset_files       │
       └──────────────────┘   └─────────────────────────────┘
```

The dashboard never calls Google Drive's API. Drive entries are just stored URLs.

## Initial setup (one-time)

1. **Apply the schema.** In the Supabase SQL editor, run `docs/MARKETING_ASSETS_SUPABASE_SCHEMA.sql`. When prompted about Row Level Security, choose **Enable RLS** — the schema enables it explicitly at the bottom and we deliberately leave the policy set empty (service-role-key bypasses; anon/authenticated keys are blocked).
2. **Create the Supabase Storage bucket.**
   - Supabase Console → Storage → **New bucket**.
   - **Name:** `marketing-assets`
   - **Public bucket:** ✓ enabled (these are marketing materials, same trust as `apps/web/public/`).
   - **File size limit:** 50 MB
   - **Allowed MIME types:** `image/*, video/mp4, video/webm, application/pdf, image/svg+xml, application/postscript, text/markdown`
3. **No new env vars required.** The dashboard reuses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (already set for the rest of admin). If you ever rename the bucket, set `MARKETING_ASSETS_BUCKET` in `.env.local` and Vercel — the wrapper in `apps/web/src/lib/supabase-storage.ts` reads it.
4. **Seed (optional but recommended)** — see "Seed script" below.

## Schema reference

Two tables in Supabase:

- **`marketing_assets`** — one row per logical asset. `id`, `title`, `description`, `category` (`brand` / `marketing` / `docs`), `tags text[]`, audit fields. The category drives the chip filter.
- **`marketing_asset_files`** — N rows per asset, one per variant. Each row references the parent via `asset_id`, carries `mime_type`, `file_size_bytes`, `variant_label` (e.g. "SVG", "PNG @2x"), `is_primary` (at most one per asset, enforced by a partial unique index), and `source_type` (`drive_url` / `storage` / `static`).
- A check constraint enforces that exactly one of `storage_path` / `static_public_url` / `external_url` is populated per file row. The other two are null.

Full DDL in `docs/MARKETING_ASSETS_SUPABASE_SCHEMA.sql`.

## Source types

A variant is one of three kinds, distinguished by which URL column is populated:

| `source_type` | Populated column | Used for |
|---|---|---|
| `static` | `static_public_url` | Files that ship in `apps/web/public/` (e.g. `/brand/brandmark.svg`, `/images/brand/...`). Served by Vercel's CDN directly — fast, free, but immutable per deploy. |
| `storage` | `storage_path` | Files uploaded into Supabase Storage via the admin UI. Public URL is constructed server-side. Variable file size, runtime-mutable. |
| `drive_url` | `external_url` | Google Drive share URL. Catalog entry is just metadata + the link — no bytes pass through us. Drive's own permissions apply when team members click through. |

## Upload paths (Phase B onward)

| File size | Path |
|---|---|
| **≤ 4 MB** | Multipart `POST /api/admin/marketing-assets/[id]/files`. Server validates the magic-number sniff against the client-declared mime + the ACCEPTED_MIMES allowlist, then uploads to Storage with the service role key and inserts the row. |
| **> 4 MB** | Client POSTs metadata (size + declared mime). Server returns a **signed PUT URL** from `createSignedUploadUrl()`. Browser PUTs the bytes directly to Supabase (sidestepping Vercel's ~4.5 MB function body limit), then POSTs back to confirm so the file row gets inserted. |
| **Drive URL** | Single POST with `{ source_type: 'drive_url', external_url: '<url>' }`. No bytes transferred. |

The 4 MB threshold is `MAX_PROXY_UPLOAD_BYTES` in `apps/web/src/lib/marketing-assets.ts`.

## Seed script (Phase C)

A one-time bootstrap that imports the repo's existing tracked assets. **Idempotent** — re-runnable safely; lookups by `(category, title)` skip duplicates.

```bash
cd apps/web
node scripts/seed-marketing-assets.mjs --dry-run     # preview only
node scripts/seed-marketing-assets.mjs               # live import
node scripts/seed-marketing-assets.mjs --only=brand  # restrict to one category
```

Discovery roots and category mapping:

| Source path | Category | Behaviour |
|---|---|---|
| `logo/**` | `brand` | Copied to `apps/web/public/brand/{ext-lower}/{filename}`. Density-scaled variants (`...@1.png`, `...@2.png`, `...@4.png`) collapsed into one asset with multiple variant rows via the `LOGO_VARIANT_REGEX` regex. |
| `apps/web/public/images/brand/**` | `brand` | **Not copied** — already public. Variant rows reference the existing `/images/brand/...` URL. |
| `apps/web/public/images/for-creators/**` | `marketing` | Not copied. |
| `apps/web/public/images/for-advertisers/**` | `marketing` | Not copied. |
| `brandguide/GhostSignal-BrandGuide.pdf` | `docs` | Copied to `apps/web/public/brand/GhostSignal-BrandGuide.pdf`. |
| `docs/WHITE_PAPER.md` | `docs` | Copied to `apps/web/public/brand/WHITE_PAPER.md`. The HTML version and pitch-deck txt are ignored for v1. |
| `assets/`, `companyfolder/` | n/a | **Out of scope** — gitignored. Team adds Drive URLs manually for those. |

The audit script (`apps/web/scripts/audit-public-assets.mjs`) already whitelists the `/brand/` prefix, so seeded files pass `npm run assets:audit` cleanly without manual intervention.

## Monitoring & operations

- **No cron.** The library has no background sync (we're explicitly not integrating with the Drive API in v1). All writes go through the admin UI or the seed script.
- **Listing the bucket:** Supabase Console → Storage → `marketing-assets` for a quick visual check. Orphaned objects from delete-failures can be cleaned up by hand here.
- **Audit query** for orphan detection:
  ```sql
  -- File rows with storage_path that no asset_id references (shouldn't happen due to FK + cascade, but worth a sanity check)
  select id, storage_path from marketing_asset_files
   where asset_id not in (select id from marketing_assets);
  ```

## Failure modes

- **Bucket not created**: any upload returns a 502 with `bucket not found`. Create it per Step 2.
- **`Supabase Storage is not configured` error**: `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing. Set them in `.env.local` (dev) or Vercel (prod).
- **File rejected with `415 unsupported mime`**: not in the magic-number table (see `sniffMime` in `marketing-assets.ts`). Either the file is genuinely unsupported, or the client-declared mime disagrees with the actual bytes. The route handler will not write to Storage in either case.
- **Drive URL surfaces "permission denied"** when a teammate clicks: that's Drive's own auth, not ours. They need to be added to the file in Drive.

## Files

| Path | Purpose |
|---|---|
| `apps/web/src/lib/marketing-assets-types.ts` | TS types, category labels, DTOs |
| `apps/web/src/lib/marketing-assets.ts` | Mime sniff, file-size formatter, variant-grouping regex, constants |
| `apps/web/src/lib/supabase-storage.ts` | Storage REST wrapper (upload/delete/signed URL/public URL) |
| `apps/web/src/app/api/admin/marketing-assets/route.ts` | GET list (+ POST create, Phase B) |
| `apps/web/src/app/api/admin/marketing-assets/[id]/route.ts` | GET asset+files (+ PATCH / DELETE, Phase B) |
| `apps/web/src/app/api/admin/marketing-assets/[id]/files/route.ts` | (Phase B) POST upload variant, GET variants |
| `apps/web/src/app/api/admin/marketing-assets/[id]/files/[fileId]/route.ts` | (Phase B) DELETE variant |
| `apps/web/src/app/admin/marketing/page.tsx` | Dashboard composition |
| `apps/web/scripts/seed-marketing-assets.mjs` | (Phase C) bootstrap import |
| `apps/web/src/proxy.ts` | Admin-cookie gate for `/api/admin/marketing-assets/*` |
| `docs/MARKETING_ASSETS_SUPABASE_SCHEMA.sql` | Schema source of truth |

-- Marketing Asset Library — schema for the /admin/marketing dashboard.
--
-- Applied via the Supabase SQL editor. Rerunning is safe (`if not exists`
-- on tables/indexes; types use a guarded do-block).
--
-- See docs/MARKETING_ASSETS.md for the runbook (bucket setup, seed
-- instructions, upload paths, gotchas).
--
-- One logical asset (e.g. "GhostSignal Brandmark, White") gets ONE row
-- in marketing_assets and N rows in marketing_asset_files — one per
-- variant (SVG, EPS, PNG @1x/@2x/@4x, WebP). Each variant lives in
-- exactly one place: a Supabase Storage object, an existing static
-- public URL in apps/web/public/, or a Google Drive share URL.

do $$ begin
  create type marketing_asset_category as enum ('brand', 'marketing', 'docs');
exception when duplicate_object then null; end $$;

do $$ begin
  create type marketing_asset_source as enum ('drive_url', 'storage', 'static');
exception when duplicate_object then null; end $$;

create table if not exists marketing_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category marketing_asset_category not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text default 'admin'
);

create index if not exists marketing_assets_category_idx
  on marketing_assets (category);
create index if not exists marketing_assets_tags_idx
  on marketing_assets using gin (tags);
create index if not exists marketing_assets_created_at_idx
  on marketing_assets (created_at desc);

create table if not exists marketing_asset_files (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references marketing_assets(id) on delete cascade,
  variant_label text,
  mime_type text not null,
  file_size_bytes bigint not null,
  source_type marketing_asset_source not null,
  -- Exactly one of these three URL fields is populated, enforced by
  -- the check constraint below.
  storage_path text,        -- supabase storage object path within the bucket
  static_public_url text,   -- /brand/... or /images/... served from apps/web/public
  external_url text,        -- google drive share URL
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  check (
    (storage_path is not null)::int +
    (static_public_url is not null)::int +
    (external_url is not null)::int = 1
  )
);

create index if not exists marketing_asset_files_asset_idx
  on marketing_asset_files (asset_id, is_primary desc);

-- Partial unique index: at most one primary variant per asset.
create unique index if not exists marketing_asset_files_one_primary
  on marketing_asset_files (asset_id) where is_primary;

-- Row Level Security — same defense-in-depth pattern as the Mercury
-- tables. Service role bypasses RLS, anon/authenticated keys blocked.
-- See docs/MERCURY_INTEGRATION.md for the rationale.
alter table marketing_assets enable row level security;
alter table marketing_asset_files enable row level security;

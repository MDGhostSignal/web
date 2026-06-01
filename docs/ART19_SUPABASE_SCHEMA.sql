-- ART19 integration — cache tables for the /admin/art19 dashboard.
--
-- Mirrors the Mercury integration shape (mercury_accounts / _transactions
-- / _sync_runs). All inserts/updates happen server-side via the
-- service-role key, so RLS is on with no policies (the service role
-- bypasses RLS) — defense-in-depth in case the anon key ever leaks.
--
-- Schema rationale:
--   art19_network          — single-row config-ish record describing the
--                            network this account belongs to. Updated on
--                            every sync.
--   art19_shows            — JSON:API "series" resources mapped 1:1.
--   art19_episodes         — JSON:API "episodes", linked to shows.
--   art19_listens_daily    — per-show, per-date listen counts.
--                            Populated by a future sync once we confirm
--                            which API scope exposes metrics. Schema
--                            ships now so dashboards can be wired up
--                            against a known shape.
--   art19_sync_runs        — observability table (matches mercury_sync_runs).
--
-- Apply via Supabase SQL editor. Idempotent.

create table if not exists art19_network (
  id text primary key,
  name text,
  raw jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists art19_shows (
  id text primary key,
  network_id text references art19_network(id) on delete set null,
  title text not null,
  slug text,
  description text,
  image_url text,
  episode_count int,
  art19_created_at timestamptz,
  art19_updated_at timestamptz,
  raw jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists art19_shows_network_idx on art19_shows (network_id);
create index if not exists art19_shows_title_idx on art19_shows (title);

create table if not exists art19_episodes (
  id text primary key,
  show_id text not null references art19_shows(id) on delete cascade,
  title text not null,
  slug text,
  description text,
  duration_seconds int,
  published_at timestamptz,
  status text,
  episode_number int,
  season_number int,
  art19_created_at timestamptz,
  art19_updated_at timestamptz,
  raw jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists art19_episodes_show_published_idx
  on art19_episodes (show_id, published_at desc);
create index if not exists art19_episodes_published_idx
  on art19_episodes (published_at desc);

-- Per-show per-date listen rollup. Composite primary key prevents
-- duplicates if the sync re-runs for the same window.
create table if not exists art19_listens_daily (
  show_id text not null references art19_shows(id) on delete cascade,
  date date not null,
  listens bigint not null default 0,
  downloads bigint,
  raw jsonb,
  updated_at timestamptz not null default now(),
  primary key (show_id, date)
);

create index if not exists art19_listens_daily_date_idx
  on art19_listens_daily (date desc);

create table if not exists art19_sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null,
  show_count int,
  episode_count int,
  listen_row_count int,
  error_message text
);

create index if not exists art19_sync_runs_started_idx
  on art19_sync_runs (started_at desc);

-- RLS on, no policies → service-role-only access (see schema docstring above).
alter table art19_network enable row level security;
alter table art19_shows enable row level security;
alter table art19_episodes enable row level security;
alter table art19_listens_daily enable row level security;
alter table art19_sync_runs enable row level security;

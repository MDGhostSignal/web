-- Substack metrics for the admin Dashboard home (/admin).
--
-- 1) substack_daily — day-level series for the analytics tile
--    (subscribers cumulative + daily views). Prefer seeding with
--    docs/SUBSTACK_DAILY_SEED.sql (CSV backfill + this DDL).
-- 2) substack_metrics — optional append-only manual snapshots / notes.
--
-- Run in the Supabase SQL editor. RLS on; service-role bypasses it.
-- Idempotent (if not exists).

create table if not exists public.substack_daily (
  day date primary key,
  subscriber_count bigint not null check (subscriber_count >= 0),
  views bigint not null default 0 check (views >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists substack_daily_day_idx
  on public.substack_daily (day desc);

alter table public.substack_daily enable row level security;

create table if not exists public.substack_metrics (
  id uuid primary key default gen_random_uuid(),
  subscriber_count bigint not null check (subscriber_count >= 0),
  total_views bigint not null check (total_views >= 0),
  note text,
  recorded_at timestamptz not null default now()
);

create index if not exists substack_metrics_recorded_at_idx
  on public.substack_metrics (recorded_at desc);

alter table public.substack_metrics enable row level security;

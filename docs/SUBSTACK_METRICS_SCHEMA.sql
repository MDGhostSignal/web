-- Substack metrics — manual snapshots for the admin Dashboard home
-- (/admin). Each Update inserts a new row; the UI always reads the
-- latest by recorded_at.
--
-- Run once in the Supabase SQL editor. Until it exists, the Substack
-- KPI card shows a setup hint and the API refuses writes cleanly.
-- Idempotent (uses if not exists). RLS is on; service-role bypasses it.

create table if not exists public.substack_metrics (
  id uuid primary key default gen_random_uuid(),
  subscriber_count bigint not null check (subscriber_count >= 0),
  total_views bigint not null check (total_views >= 0),
  note text,
  recorded_at timestamptz not null default now()
);

create index if not exists substack_metrics_recorded_at_idx
  on public.substack_metrics (recorded_at desc);

-- RLS on with no policies: reachable only via the service-role key from
-- the proxy-gated admin API (RLS is bypassed for service-role). No
-- anon/authenticated access.
alter table public.substack_metrics enable row level security;

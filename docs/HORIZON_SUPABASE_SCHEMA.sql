-- Company Horizon — goal cards on /admin/horizon.
--
-- Run in the Supabase SQL editor. RLS is on; the service-role key
-- bypasses it. Idempotent (uses if not exists).

create table if not exists company_goals (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  note        text not null default '',
  horizon     text not null default 'short'
              check (horizon in ('short', 'mid', 'long')),
  cadence     text not null default 'month'
              check (cadence in ('week', 'month', 'year')),
  status      text not null default 'on_track'
              check (status in ('on_track', 'watch', 'done', 'parked')),
  parent_id   uuid references company_goals (id) on delete set null,
  sort_order  integer not null default 0,
  owner       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table company_goals enable row level security;

create index if not exists company_goals_horizon_sort
  on company_goals (horizon, sort_order);

create index if not exists company_goals_parent
  on company_goals (parent_id);

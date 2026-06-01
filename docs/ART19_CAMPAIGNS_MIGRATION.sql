-- ART19 integration — ad campaigns + campaign_series join.
--
-- ART19 exposes ad-trafficking metadata through two resources:
--
--   /campaigns/{id}            — the campaign itself (name, brand, status,
--                                CPM, total spend, total impressions, dates,
--                                ad_source = "external" (programmatic) /
--                                "internal" (direct sold)).
--
--   /campaign_series/{id}      — a per-show, per-campaign join carrying
--                                the show-scoped CPM, spend, delivered
--                                impressions (listen_count), and feature
--                                flags (live_reads, spots, rss).
--
-- The sync walks /campaign_series first, filters to records whose
-- series_id is in our cached art19_shows set (this is how we scope to
-- GhostSignal — see docs/ART19_INTEGRATION.md for why filter[network_id]
-- doesn't work), then fetches the distinct campaigns referenced.
--
-- Apply in the Supabase SQL editor. Idempotent.

create table if not exists art19_campaigns (
  id text primary key,
  name text,
  campaign_type text,
  ad_source text,                                  -- external | internal
  status text,
  default_cpm numeric,
  current_spend numeric,
  listen_count bigint,                             -- impressions delivered
  maximum_impressions bigint,                      -- booked goal
  fill_rate numeric,
  active_campaign_series_count int,
  advertisements_count int,
  start_date timestamptz,
  end_date timestamptz,
  art19_created_at timestamptz,
  art19_updated_at timestamptz,
  raw jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists art19_campaigns_status_idx
  on art19_campaigns (status);
create index if not exists art19_campaigns_spend_idx
  on art19_campaigns (current_spend desc nulls last);
create index if not exists art19_campaigns_listens_idx
  on art19_campaigns (listen_count desc nulls last);

create table if not exists art19_campaign_series (
  id text primary key,
  campaign_id text references art19_campaigns(id) on delete cascade,
  show_id text references art19_shows(id) on delete cascade,
  cpm numeric,
  current_spend numeric,
  listen_count bigint,
  maximum_impressions bigint,
  status text,
  brand_approval_status text,
  weight int,
  api_enabled boolean,
  live_reads_enabled boolean,
  spots_enabled boolean,
  rss_enabled boolean,
  art19_created_at timestamptz,
  art19_updated_at timestamptz,
  raw jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists art19_campaign_series_show_idx
  on art19_campaign_series (show_id);
create index if not exists art19_campaign_series_campaign_idx
  on art19_campaign_series (campaign_id);
create index if not exists art19_campaign_series_status_idx
  on art19_campaign_series (status);
create index if not exists art19_campaign_series_spend_idx
  on art19_campaign_series (current_spend desc nulls last);

-- Track campaign-sync counts on existing sync_runs.
alter table art19_sync_runs
  add column if not exists campaign_count int,
  add column if not exists campaign_series_count int;

alter table art19_campaigns enable row level security;
alter table art19_campaign_series enable row level security;

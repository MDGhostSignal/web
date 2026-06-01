-- ART19 integration — listen-count + status columns.
--
-- Why: Phase A shipped before we'd confirmed ART19's actual API behavior.
-- It turns out listen_count IS exposed on network/series/episode records
-- directly (see /networks/{id}, /series/{id}, /episodes/{id}). The S3 daily
-- export is only needed for date-ranged breakdowns; the all-time totals are
-- available right now.
--
-- This migration adds the columns the sync orchestrator will populate.
-- All new columns are nullable so the migration is fully backward compatible.
--
-- Apply in the Supabase SQL editor. Idempotent.

alter table art19_network
  add column if not exists listen_count bigint,
  add column if not exists series_count int,
  add column if not exists slug text,
  add column if not exists status text;

alter table art19_shows
  add column if not exists listen_count bigint,
  add column if not exists status text;

alter table art19_episodes
  add column if not exists listen_count bigint,
  add column if not exists downloads_first_24_hours bigint;

-- listen_count is the column the dashboard will read most often.
create index if not exists art19_shows_listen_count_idx
  on art19_shows (listen_count desc nulls last);
create index if not exists art19_episodes_listen_count_idx
  on art19_episodes (listen_count desc nulls last);

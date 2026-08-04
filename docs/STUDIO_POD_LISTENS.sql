-- Follow-up to STUDIO_POD_INFO.sql (same day, 2026-08-04): Martin
-- merged "Average downloads per episode" + "Current audience size"
-- into a single "Average listens per month" question. Both dropped
-- columns were empty (the feature was minutes old), so no data moves.
--
-- Run in the Supabase SQL editor (Martin-run).

alter table public.members
  add column if not exists pod_monthly_listens text;

alter table public.members
  drop column if exists pod_downloads,
  drop column if exists pod_audience;

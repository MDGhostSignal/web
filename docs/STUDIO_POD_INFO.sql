-- Podcast info captured on /studio/profile (2026-08-04): the
-- newsletter-advertising questions, podcast flavor — current host,
-- average downloads per episode (the open-rate analogue), release
-- frequency, audience size. Stored on the members row so it lands
-- directly in the CRM contact record, same as the nl_* columns
-- (docs/STUDIO_NL_ADVERTISING.sql).
--
-- Run in the Supabase SQL editor (Martin-run, like all migrations).
-- Until this runs, profile saves still work — the API drops the pod
-- fields with a server-side warning instead of failing the save.

alter table public.members
  add column if not exists pod_provider text,
  add column if not exists pod_downloads text,
  add column if not exists pod_frequency text,
  add column if not exists pod_audience text;

-- STUDIO_LITE_RSS.sql — RSS feed URL on creators.
--
-- The /studio/welcome onboarding splash asks creators for their
-- show's RSS feed URL. This is operationally important: it's the
-- feed the team imports into ART19 during migration, and the
-- internal record of where the show lives today.
--
-- Code handles the column being absent (reads fall back, the profile
-- PATCH retries without rss_url and reports pendingRss) — but until
-- this runs, creator RSS URLs silently can't be stored.
--
-- Apply in the Supabase SQL editor (Martin-run, like the other
-- STUDIO_LITE_*.sql migrations).

alter table public.creators
  add column if not exists rss_url text;

comment on column public.creators.rss_url is
  'Show RSS feed URL, collected at studio onboarding. Used by the team for the ART19 import — not shown on public/member-facing surfaces.';

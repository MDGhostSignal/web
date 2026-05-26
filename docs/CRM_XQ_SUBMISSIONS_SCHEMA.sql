-- =====================================================================
-- XQ_SUBMISSIONS — Conviction Index quiz submissions.
--
-- Mirrors the rq_submissions table shape. Drives:
--   POST /api/xq-submissions
--   GET  /api/xq-submissions/list
--   GET  /api/xq-submissions/[id]
--   /admin/xq-responses
--
-- Run once in the Supabase SQL editor. Idempotent (uses `if not exists`).
-- =====================================================================

create table if not exists public.xq_submissions (
  id                       uuid primary key default gen_random_uuid(),
  -- Provenance
  source                   text,
  submitted_at             timestamptz not null default now(),
  status                   text not null default 'complete' check (status in ('incomplete', 'complete')),
  -- Basics (contact info collected at the start of the quiz)
  participant_type         text,
  first_name               text,
  last_name                text,
  role                     text,
  organization             text,
  industry                 text,
  website                  text,
  email                    text,
  -- Result (top-level identifiers — full detail lives in *_json)
  -- xq_code is the 3-letter archetype code, e.g. "C-P-C", "X-S-L".
  xq_code                  text,
  -- xq_archetype_name is the human label, e.g. "The Steward".
  xq_archetype_name        text,
  -- xq_archetype_tagline is the short descriptor, e.g.
  -- "The Guardian of Sacred Fire."
  xq_archetype_tagline     text,
  -- Triangulated vector bias — three single-letter axes the user
  -- leaned toward. Useful for fast filter/sort in the admin table
  -- without parsing the json blob.
  axis_continuity_change   text,  -- "C" (Continuity) or "X" (Change)
  axis_person_system       text,  -- "P" (Person) or "S" (System)
  axis_craft_leverage      text,  -- "C" (Craft) or "L" (Leverage)
  -- Context capture
  page_url                 text,
  referrer                 text,
  user_agent               text,
  -- Raw payload + structured snapshots
  -- answers_json: every Phase 1+2+3 response keyed by question id.
  answers_json             jsonb not null default '{}'::jsonb,
  -- profile_json: the archetype description block.
  profile_json             jsonb not null default '{}'::jsonb,
  -- details_json: per-axis triangulation score breakdown.
  details_json             jsonb not null default '{}'::jsonb,
  -- The four value buckets produced by Phase 3 stress tests.
  -- Each is an ordered array of value-name strings.
  non_negotiables_json     jsonb not null default '[]'::jsonb,
  core_values_json         jsonb not null default '[]'::jsonb,
  aspirational_values_json jsonb not null default '[]'::jsonb,
  background_values_json   jsonb not null default '[]'::jsonb,
  -- Full original payload for forensic replay / debugging.
  submission_payload       jsonb not null default '{}'::jsonb,
  created_at               timestamptz not null default now()
);

create index if not exists xq_submissions_submitted_at_idx
  on public.xq_submissions (submitted_at desc);

create index if not exists xq_submissions_email_idx
  on public.xq_submissions (lower(email));

create index if not exists xq_submissions_status_idx
  on public.xq_submissions (status);

alter table public.xq_submissions enable row level security;

-- Service-role key bypasses RLS — that's how the API writes / reads.
-- anon / authenticated have no policy, so they can't touch the table
-- directly. Keep it that way.

-- =====================================================================
-- members.xq_submission_id — fk-style pointer (kept loose; no FK
-- constraint so the column can still hold null or a stale id without
-- blocking writes). Mirrors how rq_submission_id is wired.
-- =====================================================================

alter table public.members
  add column if not exists xq_submission_id uuid;

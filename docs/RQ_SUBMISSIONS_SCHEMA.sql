create extension if not exists pgcrypto;

create table if not exists public.rq_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  submitted_at timestamptz not null default now(),
  source text,
  company text,
  acronym text,
  title text,
  participant_type text,
  first_name text not null,
  last_name text not null,
  role text,
  organization text not null,
  industry text,
  website text,
  email text not null,
  rq_code text not null,
  rq_name text not null,
  signal_clarity_label text,
  signal_clarity_note text,
  undertone text,
  page_url text,
  referrer text,
  user_agent text,
  answers_json jsonb not null default '{}'::jsonb,
  profile_json jsonb not null default '{}'::jsonb,
  details_json jsonb not null default '{}'::jsonb,
  submission_payload jsonb not null default '{}'::jsonb
);

create index if not exists rq_submissions_created_at_idx
  on public.rq_submissions (created_at desc);

create index if not exists rq_submissions_email_idx
  on public.rq_submissions (email);

create index if not exists rq_submissions_rq_code_idx
  on public.rq_submissions (rq_code);

-- Cold outreach tracking (/admin/outreach, 2026-08-04).
--
-- One row per cold email Mike sends to a prospective brand: who was
-- contacted, with what personal message, when, and whether the send
-- landed. The email itself is code-managed in
-- apps/web/src/lib/cold-outreach-email.ts (pitch copy is a
-- placeholder until the team finalizes it).
--
-- Run in Supabase SQL editor. RLS is on; service-role bypasses it.
-- Idempotent (uses `if not exists`).

create table if not exists cold_outreach (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text,
  -- 'sent' | 'failed' (Resend rejected after the row was filed)
  status text not null default 'sent',
  sent_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table cold_outreach enable row level security;

create index if not exists cold_outreach_email_idx
  on cold_outreach (email);
create index if not exists cold_outreach_created_idx
  on cold_outreach (created_at desc);

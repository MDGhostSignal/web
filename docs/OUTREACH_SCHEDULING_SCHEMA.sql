-- Cold outreach scheduling (/admin/outreach, 2026-08-19).
--
-- Extends the existing `cold_outreach` table (see
-- OUTREACH_SUPABASE_SCHEMA.sql) so a reachout can be *scheduled* to
-- arrive at a precise moment in the recipient's US inbox rather than
-- sent immediately. Delivery timing is owned by Resend's native
-- `scheduled_at` (up to 30 days out); we store the same instant in UTC
-- plus the recipient's timezone (for the human-readable readout) and
-- Resend's email id (so we can reschedule / cancel it).
--
-- Run in the Supabase SQL editor. Idempotent — safe to re-run.
-- RLS is already enabled on the table; service-role bypasses it.

-- When the email should land, in UTC. NULL for legacy "sent now" rows.
alter table cold_outreach
  add column if not exists scheduled_at timestamptz;

-- IANA timezone the recipient-local send time was expressed in
-- (e.g. 'America/New_York'). Lets the UI reconstruct "10:00 AM their
-- time" without guessing. NULL for immediate sends.
alter table cold_outreach
  add column if not exists recipient_tz text;

-- Resend's email id for a scheduled send — the handle we PATCH to
-- reschedule or POST /cancel. NULL for immediate sends (we don't need
-- to manage those after the fact).
alter table cold_outreach
  add column if not exists resend_id text;

-- Status vocabulary now includes 'scheduled' (queued at Resend, not yet
-- delivered) and 'canceled' (Mike pulled it before it went out),
-- alongside the original 'sent' | 'failed'. Stored as free text (no
-- enum) to stay migration-light, matching the existing column.
comment on column cold_outreach.status is
  'sent | scheduled | canceled | failed';

-- Find due / upcoming scheduled rows quickly (queue view + reconcile).
create index if not exists cold_outreach_scheduled_idx
  on cold_outreach (scheduled_at)
  where scheduled_at is not null;

create index if not exists cold_outreach_status_idx
  on cold_outreach (status);

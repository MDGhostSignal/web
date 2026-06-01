-- CRM Alerts — internal nudge system for the membership pool + contacts.
--
-- Two alert kinds are supported today:
--   contact_cold       — member.last_contact_at is older than 28 days
--   marketplace_stall  — member is in Sign/Onboard/Run with incomplete
--                        lifecycle steps AND phase_entered_at is older
--                        than 30 days
--
-- Detection runs hourly via .github/workflows/crm-alerts-sync.yml.
-- Auto-resolution also fires inline when a comment is added on a member
-- or last_contact_at / lifecycle_steps is patched.
--
-- Apply this file once in the Supabase SQL editor. Idempotent.

create table if not exists public.crm_alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('contact_cold','marketplace_stall')),
  member_id uuid not null references public.members(id) on delete cascade,
  triggered_at timestamptz not null default now(),
  resolved_at timestamptz,
  snoozed_until timestamptz,
  reason_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One open alert per (kind, member). Once resolved, a fresh one can open.
create unique index if not exists crm_alerts_open_unique
  on public.crm_alerts (kind, member_id)
  where resolved_at is null;

create index if not exists crm_alerts_resolved_idx
  on public.crm_alerts (resolved_at);
create index if not exists crm_alerts_kind_idx
  on public.crm_alerts (kind);
create index if not exists crm_alerts_member_idx
  on public.crm_alerts (member_id);
create index if not exists crm_alerts_triggered_idx
  on public.crm_alerts (triggered_at desc);

-- updated_at trigger — mirrors members.updated_at pattern.
create or replace function public.crm_alerts_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists crm_alerts_updated_at on public.crm_alerts;
create trigger crm_alerts_updated_at
  before update on public.crm_alerts
  for each row execute function public.crm_alerts_set_updated_at();

-- RLS — service-role only (admin API uses the service-role key).
alter table public.crm_alerts enable row level security;

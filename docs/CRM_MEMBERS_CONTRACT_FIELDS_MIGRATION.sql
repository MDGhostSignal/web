-- Contract renewal tracking for full members.
--
-- Adds two columns to `members`:
--   contract_signed_at      — date the membership contract was signed
--                             (auto-fillable from lifecycle_steps.membership_signed
--                             but stored explicitly so we can override and so
--                             renewals can move the date forward without
--                             clobbering the original sign date)
--   contract_term_months    — length of the contract in months. Defaults
--                             to 12 (the standard year-long agreement).
--
-- Extends `crm_alerts.kind` to allow a fourth value: 'contract_expiring'.
-- Fires when contract_signed_at + contract_term_months months is within
-- ALERT_CONTRACT_EXPIRING_DAYS (default 30) of today, so the founders
-- can open renewal negotiations before the contract lapses.
--
-- Apply once in the Supabase SQL editor. Idempotent.

-- ── 1) members columns ────────────────────────────────────────────────
alter table public.members
  add column if not exists contract_signed_at date;

alter table public.members
  add column if not exists contract_term_months integer not null default 12;

-- Sanity: keep terms within a reasonable range. Allows everything from
-- short-term pilots (1 month) up to multi-year deals (60 months).
alter table public.members
  drop constraint if exists members_contract_term_months_check;
alter table public.members
  add constraint members_contract_term_months_check
    check (contract_term_months between 1 and 60);

-- Index for the alert detector's lookup pattern.
create index if not exists members_contract_signed_idx
  on public.members (contract_signed_at)
  where contract_signed_at is not null;

-- ── 2) crm_alerts.kind extended ──────────────────────────────────────
-- Same DO-block pattern used by CRM_ALERTS_TASKS_MIGRATION: find the
-- existing kind-check constraint by definition, drop it, recreate with
-- the new allowed value.
do $$
declare
  c_name text;
begin
  select conname into c_name
  from pg_constraint
  where conrelid = 'public.crm_alerts'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%kind%'
    and pg_get_constraintdef(oid) not ilike '%subject%';
  if c_name is not null then
    execute format('alter table public.crm_alerts drop constraint %I', c_name);
  end if;
end $$;

alter table public.crm_alerts
  add constraint crm_alerts_kind_check
  check (kind in (
    'contact_cold',
    'marketplace_stall',
    'task_stale',
    'contract_expiring'
  ));

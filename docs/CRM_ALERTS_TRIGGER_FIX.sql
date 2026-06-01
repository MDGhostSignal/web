-- Fix: respect explicit updated_at writes.
--
-- The original trigger from CRM_ALERTS_TASKS_MIGRATION.sql always
-- overwrites updated_at to now() on every UPDATE. That blocks any
-- script (test, migration, backfill) from explicitly seeding a
-- historical timestamp — the trigger stomps on it immediately.
--
-- This patch makes the trigger conditional: it only auto-updates when
-- the caller did NOT change updated_at themselves. Normal app PATCHes
-- (which don't set updated_at) still get the auto-refresh; explicit
-- writes are respected.
--
-- Idempotent. Apply once in the Supabase SQL editor.

create or replace function public.design_tasks_set_updated_at()
returns trigger language plpgsql as $$
begin
  -- IS NOT DISTINCT FROM treats two nulls as equal (regular = doesn't).
  if new.updated_at is not distinct from old.updated_at then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

-- Same hygiene for crm_alerts so future tooling can backdate that
-- column too if ever needed.
create or replace function public.crm_alerts_set_updated_at()
returns trigger language plpgsql as $$
begin
  if new.updated_at is not distinct from old.updated_at then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

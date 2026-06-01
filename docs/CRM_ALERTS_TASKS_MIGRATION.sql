-- CRM alerts — extend to cover stale tasks.
--
-- Adds a third alert kind `task_stale` that fires when a task has been
-- sitting in a non-terminal status (anything other than completed /
-- archived) for ALERT_TASK_STALE_DAYS (default 14) without any update
-- or new comment. Routing in the digest follows task.assigned_to (or
-- created_by if unassigned), mirroring the existing per-owner pattern.
--
-- This migration:
--   1) Adds `updated_at` + trigger to design_tasks so freshness is
--      reliable (previously only created_at + comments could signal it).
--   2) Lets crm_alerts.member_id be null and adds a task_id FK column.
--   3) Replaces the kind-check constraint to allow 'task_stale'.
--   4) Replaces the single open-alert unique index with kind-aware
--      member + task variants.
--   5) Adds a subject-check so exactly one of (member_id, task_id) is set.
--
-- Apply once in the Supabase SQL editor. Idempotent and safe to re-run.

-- ── 1) design_tasks.updated_at + auto-update trigger ──────────────────
alter table public.design_tasks
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.design_tasks_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists design_tasks_updated_at on public.design_tasks;
create trigger design_tasks_updated_at
  before update on public.design_tasks
  for each row execute function public.design_tasks_set_updated_at();

-- Backfill: for existing rows, seed updated_at from created_at so a
-- freshly migrated DB doesn't fire alerts on every legacy row.
update public.design_tasks
  set updated_at = greatest(updated_at, created_at)
  where updated_at < created_at;

-- ── 2) crm_alerts.member_id nullable + add task_id ─────────────────────
alter table public.crm_alerts
  alter column member_id drop not null;

alter table public.crm_alerts
  add column if not exists task_id uuid
  references public.design_tasks(id) on delete cascade;

create index if not exists crm_alerts_task_idx
  on public.crm_alerts (task_id);

-- ── 3) Replace the kind check to allow 'task_stale' ────────────────────
-- The original CHECK was created inline on the column with an
-- auto-generated name. Look it up by definition so the drop is robust.
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
  check (kind in ('contact_cold','marketplace_stall','task_stale'));

-- ── 4) Subject-check: exactly one of member_id / task_id must be set ──
alter table public.crm_alerts
  drop constraint if exists crm_alerts_subject_check;
alter table public.crm_alerts
  add constraint crm_alerts_subject_check
  check (
    (member_id is not null and task_id is null) or
    (member_id is null and task_id is not null)
  );

-- ── 5) Replace the single open-row unique index with split variants ───
drop index if exists public.crm_alerts_open_unique;

create unique index if not exists crm_alerts_open_member_unique
  on public.crm_alerts (kind, member_id)
  where resolved_at is null and member_id is not null;

create unique index if not exists crm_alerts_open_task_unique
  on public.crm_alerts (kind, task_id)
  where resolved_at is null and task_id is not null;

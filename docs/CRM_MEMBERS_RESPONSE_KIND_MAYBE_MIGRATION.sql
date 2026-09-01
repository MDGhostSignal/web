-- Contacts heard-back: allow "maybe" alongside no / interested.
--
-- Re-run this even if it was applied once already. A live probe on
-- 2026-09-01 still got Postgres 23514 on response_kind = 'maybe'
-- (the original CRM_MEMBERS_RESPONSE_KIND_MIGRATION.sql re-adds the
-- old no/interested-only check if it is run again).
--
-- Apply in the Supabase SQL editor. Idempotent.

-- Drop every CHECK that mentions response_kind, not just the known name.
do $$
declare r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'members'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%response_kind%'
  loop
    execute format('alter table public.members drop constraint if exists %I', r.conname);
  end loop;
end $$;

alter table public.members
  add constraint members_response_kind_check
    check (
      response_kind is null
      or response_kind in ('no', 'maybe', 'interested')
    );

comment on column public.members.response_kind is
  'Heard-back answer: ''no'', ''maybe'', ''interested'' (shown as Yes), or NULL. Drives the lifecycle stepper + Reply column on /admin/contacts; separate from last_response (free-text).';

-- PostgREST caches the old check; reload so PATCH 'maybe' is accepted.
notify pgrst, 'reload schema';

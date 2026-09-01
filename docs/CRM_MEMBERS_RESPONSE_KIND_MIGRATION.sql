-- Traffic-light response kind — adds an explicit categorical column to
-- the members table so the contact lifecycle stepper can render four
-- discrete states (Discern → Reached out → Replied no / Replied
-- interested) without coupling to the free-text `last_response` field.
--
-- `last_response` stays as the place where founders capture the actual
-- words / context of the reply. `response_kind` is the categorical
-- traffic-light signal that drives the stepper + filter dropdown on
-- /admin/contacts.
--
-- Apply once in the Supabase SQL editor. Idempotent.

alter table public.members
  add column if not exists response_kind text;

-- Constrain to the known traffic-light buckets. NULL is valid and
-- means "no categorical reply recorded yet" (the contact may still
-- have a free-text `last_response`, but the founders haven't sorted
-- it into the No / Interested bucket).
alter table public.members
  drop constraint if exists members_response_kind_check;
alter table public.members
  add constraint members_response_kind_check
    check (response_kind is null or response_kind in ('no', 'maybe', 'interested'));

comment on column public.members.response_kind is
  'Traffic-light categorisation of the most recent response from this contact: ''no'' (rejected), ''interested'' (positive), or NULL (no categorical reply recorded). Drives the lifecycle stepper on /admin/contacts; separate from `last_response` which captures free-text context.';

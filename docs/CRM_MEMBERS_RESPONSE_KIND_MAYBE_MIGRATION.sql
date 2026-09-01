-- Contacts heard-back: add "maybe" alongside no / interested.
--
-- Jack's 2026-09-01 ask: Heard back is one stepper step with three
-- answers (No / Maybe / Yes). `interested` still stores as
-- 'interested' and displays as Yes.
--
-- Apply in the Supabase SQL editor. Idempotent.

alter table public.members
  drop constraint if exists members_response_kind_check;
alter table public.members
  add constraint members_response_kind_check
    check (
      response_kind is null
      or response_kind in ('no', 'maybe', 'interested')
    );

comment on column public.members.response_kind is
  'Heard-back answer: ''no'', ''maybe'', ''interested'' (shown as Yes), or NULL. Drives the lifecycle stepper + Reply column on /admin/contacts; separate from last_response (free-text).';

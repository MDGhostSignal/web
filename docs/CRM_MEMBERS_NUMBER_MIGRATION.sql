-- Membership numbers — adds a manually-assigned 4-digit sequential
-- identifier to fully signed-up members. Surfaced on the welcome card
-- in /admin/marketplace as "№ NNNN".
--
-- Policy (enforced by convention, not the DB):
--   A member_number is only assigned once a member is fully signed up,
--   i.e. both `became_member_at` AND `contract_signed_at` are set.
--   Numbers are assigned manually (one-shot UPDATE per member) — no
--   auto-increment, so there are no gaps or accidental allocations.
--
-- Apply once in the Supabase SQL editor. Idempotent.

alter table public.members
  add column if not exists member_number integer;

-- Unique when present. Multiple NULLs allowed (pre-signup members).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'members_member_number_unique'
      and conrelid = 'public.members'::regclass
  ) then
    alter table public.members
      add constraint members_member_number_unique unique (member_number);
  end if;
end $$;

-- Sanity: positive, four-digit ceiling so the UI's zero-pad logic
-- always reads cleanly. Raise the upper bound if we ever cross 9999.
alter table public.members
  drop constraint if exists members_member_number_range_check;
alter table public.members
  add constraint members_member_number_range_check
    check (member_number is null or (member_number >= 1 and member_number <= 9999));

comment on column public.members.member_number is
  'Manually-assigned 4-digit membership number (0001..9999). Set only when the member is fully signed up (became_member_at AND contract_signed_at both non-null). Displayed on the welcome card as "№ NNNN".';

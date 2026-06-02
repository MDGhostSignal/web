-- Initial member-number assignments.
--
-- Run AFTER `CRM_MEMBERS_NUMBER_MIGRATION.sql` has been applied. Run
-- ONCE — subsequent assignments should be done one row at a time via
-- the same UPDATE pattern.
--
-- Pre-condition the policy expects (not enforced by the DB): the rows
-- below should have both `became_member_at` AND `contract_signed_at`
-- set before they're assigned a number. If a row is missing
-- `contract_signed_at`, backfill that column first (separate UPDATE)
-- so the policy stays honest.

-- 0055 — Holly Mackle (Unseriously podcast)
update public.members
  set member_number = 55
  where id = '3ce27410-f4f9-4e2b-9ad4-a14cdab857cb'
    and member_number is null;

-- 0056 — Dru & Mike (Biblical Mind podcast)
update public.members
  set member_number = 56
  where id = '66b3fb66-5162-40c2-aab5-a0778882779d'
    and member_number is null;

-- Verification: should return both rows with their new numbers.
select id, first_name, last_name, organization, member_number,
       became_member_at, contract_signed_at
  from public.members
  where member_number in (55, 56)
  order by member_number;

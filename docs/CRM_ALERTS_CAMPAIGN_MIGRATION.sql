-- CRM alerts — add "campaign" as a third alert subject.
--
-- Adds the `campaign_ending` alert kind and a `campaign_id` subject so
-- ART19 campaign-completion alerts live in the same crm_alerts surface
-- (bell + dashboard) as member/task alerts. The one-time notification
-- email is sent by the campaign-alerts sync at detection time; the row
-- here is the in-app record + the fire-once dedup guard.
--
-- Apply in the Supabase SQL editor (or `supabase db execute`). Safe to
-- re-run (idempotent).

alter table public.crm_alerts
  add column if not exists campaign_id text
    references public.art19_campaigns(id) on delete cascade;

-- Allow the new kind alongside the existing four.
alter table public.crm_alerts drop constraint if exists crm_alerts_kind_check;
alter table public.crm_alerts add constraint crm_alerts_kind_check
  check (kind = any (array[
    'contact_cold'::text,
    'marketplace_stall'::text,
    'task_stale'::text,
    'contract_expiring'::text,
    'campaign_ending'::text
  ]));

-- Exactly one of member / task / campaign must be set.
alter table public.crm_alerts drop constraint if exists crm_alerts_subject_check;
alter table public.crm_alerts add constraint crm_alerts_subject_check
  check (
    (member_id is not null and task_id is null and campaign_id is null) or
    (member_id is null and task_id is not null and campaign_id is null) or
    (member_id is null and task_id is null and campaign_id is not null)
  );

-- One open alert per (kind, campaign) — mirrors the member/task guards,
-- so re-running detection never double-inserts or double-emails.
create unique index if not exists crm_alerts_open_campaign_unique
  on public.crm_alerts (kind, campaign_id)
  where (resolved_at is null and campaign_id is not null);

create index if not exists crm_alerts_campaign_idx
  on public.crm_alerts (campaign_id);

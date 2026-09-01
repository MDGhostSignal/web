-- CRM alerts — campaign_ending is fire-once, forever.
--
-- The original unique index only covered OPEN rows (`resolved_at is
-- null`). Internal host-read campaigns have no end_date, so they keep
-- qualifying after conclusion. Dismissing the in-app alert then let the
-- next daily cron insert a new row and email Jack + Mike again
-- (Unseriously host-reads: 10–11 emails each, Aug 12–27 2026).
--
-- This keeps one campaign_ending row per campaign (prefer the currently
-- open one), then unique-indexes (kind, campaign_id) regardless of
-- resolved_at. Apply in the Supabase SQL editor. Idempotent.

-- Keep one row per campaign_id: the open alert if any, otherwise the
-- earliest. Drop later duplicates so the unique index can land.
delete from public.crm_alerts
where kind = 'campaign_ending'
  and id in (
    select id from (
      select id,
             row_number() over (
               partition by campaign_id
               order by
                 (resolved_at is null) desc,
                 triggered_at asc,
                 id asc
             ) as rn
      from public.crm_alerts
      where kind = 'campaign_ending'
        and campaign_id is not null
    ) ranked
    where rn > 1
  );

drop index if exists public.crm_alerts_open_campaign_unique;

create unique index if not exists crm_alerts_campaign_once_unique
  on public.crm_alerts (kind, campaign_id)
  where (campaign_id is not null);

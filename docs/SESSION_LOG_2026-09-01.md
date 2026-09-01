# Session Log — 2026-09-01

## Contacts: unclick First reach out

Clicking First reach out on an expanded contact while it was already
the current step re-applied the same patch, so Jack could not undo it.
A second click now maps to Not started (clears `phase`, `last_contact_at`,
and the `first_reachout` marker). Clicking it from a later stage still
backtracks to First reach out.

### Files

- `apps/web/src/app/admin/contacts/page.tsx`
- `apps/web/src/app/admin/contacts/ContactLifecycleStepper.tsx`

### Validation

- Playwright: PlusPlus First reach out → Clear → Not started → restored
- `npm run typecheck` — pass
- `npm run lint` — 0 errors (5 pre-existing warnings)
- `npm run lint:css` — pass
- `npm run assets:audit` — OK 67

## Campaign-complete emails firing more than once

Jack was getting multiple emails for the same campaign completion. Live
`crm_alerts` showed two internal host-read campaigns with no `end_date`
re-fired every time the in-app alert was dismissed:

- `GHOSTSignal + Unseriously (Host / Mid / 60)` — 11 emails (Aug 12–27)
- `Unseriously + Tektones (Host / Mid / 60)` — 10 emails (Aug 13–27)

Cause: fire-once only looked at **open** `campaign_ending` rows. Those
campaigns stay qualifying forever (concluded, no end_date), so resolve →
next daily cron → insert + email again.

Fix: skip insert/email if any `campaign_ending` row exists for that
campaign_id (resolved counts). SQL migration unique-indexes the same
rule and drops duplicate history (Martin applies).

### Files

- `apps/web/src/lib/campaign-alerts.ts`
- `apps/web/src/app/api/admin/campaign-alerts/sync/route.ts`
- `.github/workflows/campaign-alerts.yml`
- `docs/CRM_ALERTS_CAMPAIGN_ONCE_MIGRATION.sql`
- `apps/web/scripts/test-campaign-alerts.mjs`

### Validation

- `node scripts/test-campaign-alerts.mjs` — 5/5
- Live replay: 28 `campaign_ending` rows / 9 campaigns; next sync emails 0
- `npm run typecheck` — pass
- `npm run lint` — 0 errors (5 pre-existing warnings, unrelated)
- `npm run lint:css` — pass
- `npm run assets:audit` — OK 67

### Open

- Apply `docs/CRM_ALERTS_CAMPAIGN_ONCE_MIGRATION.sql` in the Supabase SQL
  editor. Code fix already stops re-emails without it.

## Contacts: Date added column + filter

Contacts list (`/admin/contacts`) now shows **Date added** after Name
and before Email (from `members.created_at`), with a toolbar filter
(Today / 7d / 30d / 90d / This year) and the same field on the contact
card + pipeline card. Column is sortable.

### Files

- `apps/web/src/app/admin/contacts/page.tsx`

### Validation

- Playwright desktop + mobile: column order Organization | Name | Date added | Email; filter 206 → 2 on Today; expanded card shows Date added
- `npm run typecheck` — pass
- `npm run lint` — 0 errors (5 pre-existing warnings)
- `npm run lint:css` — pass
- `npm run assets:audit` — OK 67

## Migration verified live (after Martin applied SQL)

- Cleanup: **9 rows / 9 campaigns** (Unseriously 11→1, Tektones 10→1).
- Unique index `crm_alerts_campaign_once_unique` rejects a second insert
  with **409**, including after a simulated dismiss of the Unseriously
  open alert. Row count stayed 1; alert restored to open.
- Did **not** POST production `/campaign-alerts/sync`: three Progressive
  August campaigns (BACON Paid, Auto AV, Auto Paid) ended 2026-09-01
  03:59 UTC and have never been emailed. Hitting sync would send their
  first real mail. Next daily cron will. Code fix still unpushed; SQL
  alone is what blocks Jack's re-emails on production today.

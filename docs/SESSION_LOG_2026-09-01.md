# Session Log — 2026-09-01

## Website hrefs on marketplace (and other admin cards)

The Contacts-only `websiteHref` never applied to marketplace member
detail. Tektones (`www.tektones.com`) opened as
`/admin/www.tektones.com`. Helper now lives in `lib/website-href.ts`
and is used on Contacts, Marketplace, XQ/RQ submissions, studio
members, and the studio brand panel.

### Files

- `apps/web/src/lib/website-href.ts`
- `apps/web/src/app/admin/contacts/page.tsx`
- `apps/web/src/app/admin/marketplace/MarketplaceMemberDetails.tsx`
- `apps/web/src/app/admin/xq-responses/SubmissionDetail.tsx`
- `apps/web/src/app/admin/rq-responses/page.tsx`
- `apps/web/src/app/admin/studio-members/MembersTable.tsx`
- `apps/web/src/app/studio/roster/BrandPanel.tsx`

### Validation

- Playwright: Tektones marketplace href is `https://www.tektones.com`
- `npm run typecheck` — pass
- eslint on touched files — clean
- `npm run lint:css` — pass
- `npm run assets:audit` — OK 67

## Marketplace: ART19 Migration checklist

Expanded creator rows on `/admin/marketplace` now have an ART19
Migration checklist under Lifecycle: A19Form (link to the Zendesk
request form), 4 & Creator as 'Owner', Default Ad Markers (Pre &
Post). Ticks store on `lifecycle_steps` (allowlisted). Brands skip
the block.

### Files

- `apps/web/src/lib/members.ts`
- `apps/web/src/app/api/members/route.ts`
- `apps/web/src/app/admin/marketplace/Art19MigrationChecklist.tsx`
- `apps/web/src/app/admin/marketplace/PoolView.tsx`
- `apps/web/src/app/admin/marketplace/marketplace.module.css`

### Validation

- Playwright: Unseriously expanded creator shows ART19 Migration, Zendesk form link, three steps, tick persists and restores
- `npm run typecheck` — pass
- eslint on touched files — clean
- `npm run lint:css` — pass
- `npm run assets:audit` — OK 67

## Contacts: website links open off-site

Bare hosts in the contact card (`plusplususa.com`) were used as hrefs
and resolved under `/admin/`. `websiteHref` prefixes `https://` when
no scheme is present. Display text is unchanged.

### Files

- `apps/web/src/app/admin/contacts/page.tsx`

### Validation

- Playwright: PlusPlus website href is `https://plusplususa.com`
- eslint contacts/page.tsx — clean

## Contacts: remove Show step details

Dropped the collapsible Discern/Court checklist from the expanded
contact panel. The traffic-light stepper at the top is the lifecycle
UI; comments stay.

### Files

- `apps/web/src/app/admin/contacts/page.tsx`
- `apps/web/src/app/admin/contacts/contacts.module.css`

### Validation

- Playwright: Show step details gone; Heard back stepper + comments remain
- `npm run typecheck` — pass
- eslint contacts/page.tsx — clean
- `npm run lint:css` — pass
- `npm run assets:audit` — OK 67

## Contacts: Maybe save + drop list columns

Maybe failed with "Failed to update member" because the live
`response_kind` CHECK still rejects `'maybe'`. Maybe now stores on
`lifecycle_steps.heard_maybe` (jsonb) so it saves without that CHECK.
Removed the **Yes / No / Maybe** and **Owner** list columns.

### Files

- `apps/web/src/app/admin/contacts/page.tsx`
- `apps/web/src/app/admin/contacts/ContactLifecycleStepper.tsx`
- `apps/web/src/lib/members.ts`

### Validation

- Playwright: columns gone; Maybe stays selected (aria-pressed=true), no error; PlusPlus restored to No
- `npm run typecheck` — pass
- eslint on touched files — clean
- `npm run lint:css` — pass
- `npm run assets:audit` — OK 67

## Contacts: Heard back No / Maybe / Yes

Combined Heard back — no and Heard back — interested into one stepper
step with three answers (No / Maybe / Yes). Maybe is a new
`response_kind`. List column **Yes / No / Maybe** is sortable. Filter
dropdown still lists each answer separately.

SQL: live PATCH of `response_kind = 'maybe'` still 23514 (old
no/interested check). Re-run
`docs/CRM_MEMBERS_RESPONSE_KIND_MAYBE_MIGRATION.sql` — it now drops
every response_kind CHECK and `NOTIFY pgrst`. The original
`CRM_MEMBERS_RESPONSE_KIND_MIGRATION.sql` was also updated so a
re-run cannot clobber `maybe`.

### Files

- `apps/web/src/lib/members.ts`
- `apps/web/src/app/api/members/route.ts`
- `apps/web/src/app/admin/contacts/ContactLifecycleStepper.tsx`
- `apps/web/src/app/admin/contacts/page.tsx`
- `apps/web/src/app/admin/contacts/contacts.module.css`
- `docs/CRM_MEMBERS_RESPONSE_KIND_MAYBE_MIGRATION.sql`

### Validation

- Playwright desktop + mobile: column after Lifecycle; filter has Heard back — maybe; one Heard back step with No/Maybe/Yes pills
- `npm run typecheck` — pass
- `npm run lint` — 0 errors (5 pre-existing warnings)
- `npm run lint:css` — pass
- `npm run assets:audit` — OK 67

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

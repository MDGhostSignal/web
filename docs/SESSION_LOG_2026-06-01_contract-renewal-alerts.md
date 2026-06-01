# Session Log — 2026-06-01 (Contract renewal tracking + alert)

Added contract-renewal lifecycle to full members. The marketplace
pool now captures when each member signed their contract + the term
length (default 12 months), displays a color-coded renewal-status
pill, and fires a `contract_expiring` alert 30 days before each
contract lapses so the founders can open renewal negotiations.

The alert wires into the same bell / `/admin/alerts` page / daily
per-owner email digest that already exists — fourth kind alongside
`contact_cold`, `marketplace_stall`, `task_stale`. Auto-resolves the
moment `contract_signed_at` is updated (renewal logged).

## Schema migration

`docs/CRM_MEMBERS_CONTRACT_FIELDS_MIGRATION.sql` — must be applied
once in the Supabase SQL editor. Adds:

- `members.contract_signed_at` (date, nullable)
- `members.contract_term_months` (integer, not null, default 12,
  CHECK between 1 and 60)
- Index on `contract_signed_at` (partial: where not null)
- Extends `crm_alerts.kind` to allow `contract_expiring`

Idempotent. Same DO-block trick to find the existing kind-check
constraint by definition then drop and recreate.

## Detection

`detectAlertsForMember` (in `apps/web/src/lib/alerts.ts`) gains a
fourth branch:

```ts
if (
  member.contract_signed_at &&
  member.contract_term_months &&
  (member.became_member_at || member.phase === "run") &&
  member.phase !== "paused" &&
  member.phase !== "churned"
) {
  const renewal = computeRenewalDate(
    member.contract_signed_at,
    member.contract_term_months,
  );
  const daysUntilRenewal = floor((renewal - now) / MS_PER_DAY);
  if (daysUntilRenewal <= contractExpiringDays /* default 30 */) {
    // fire contract_expiring alert
  }
}
```

`computeRenewalDate` uses `Date.setMonth` so calendar boundaries
(28/30/31-day months) are handled correctly. Already-expired
contracts surface with `days_until_renewal < 0` → the bell + page +
digest render this as the most urgent state.

## Auto-resolution

`apps/web/src/app/api/members/[id]/route.ts` now resolves
`contract_expiring` alerts when either `contract_signed_at` or
`contract_term_months` is in the PATCH payload. The hourly cron
re-opens it if the new dates still fall inside the renewal window.

## UI surfaces

### Member edit modal (`MemberEditModal.tsx`)
- New `Contract signed` date picker
- New `Contract term (months)` numeric input (clamped 1–60)
- When `contract_signed_at` is blank on first open, the modal
  pre-fills from `lifecycle_steps.membership_signed.completed_at`
  as a sane historical backfill

### Marketplace member detail panel (`MarketplaceMemberDetails.tsx`)
- Two inline fields added next to "Last contact" / "Times
  contacted" / "Last response": `Contract signed` (date) + `Term
  (months)` (number, blur-save)
- A computed status pill renders under the inline-fields row when a
  signed date is set:
  - **green** `Renews YYYY-MM-DD · Nd left` when > 60 days out
  - **amber** when 30–60 days out
  - **urgent red** when < 30 days (matches the alert threshold)
  - **solid red** `Expired Nd ago · YYYY-MM-DD` when already past

### Alerts bell + `/admin/alerts` + email digest
- New `Contract renewal` filter pill on the alerts page
- New `contract` kind class on bell rows + page rows with a teal
  accent (`#1f8a8a`) to distinguish from the other three kinds
- Email digest section "Contract renewal due" rendered first (most
  urgent ask) above contact / marketplace / task sections

## Env threshold

`ALERT_CONTRACT_EXPIRING_DAYS` (default 30) — optional Vercel env
to tune the lead time without code changes.

## Validation

All three gates green:
- `npm run typecheck` — clean
- `npm run lint` — clean
- `npm run lint:css` — clean

A note on the lint friction: `Date.now()` in component render is
blocked by `react-hooks/purity` and `react-hooks/set-state-in-effect`
together rule out the obvious patterns (useMemo with Date.now, or
useEffect-set-state). Resolved with a lazy `useState<number>(() =>
Date.now())` initializer — runs once on mount, which is acceptable
for a panel-scoped renewal badge (the cron + email digest cover the
cross-midnight cases for users who leave a panel open).

## Migration order (when going live)

1. Apply `docs/CRM_MEMBERS_CONTRACT_FIELDS_MIGRATION.sql` in Supabase.
2. (Optional) Set `ALERT_CONTRACT_EXPIRING_DAYS` in Vercel — defaults
   to 30 if unset.
3. Redeploy.
4. Backfill `contract_signed_at` for existing full members via the
   marketplace pool — open each expanded panel, set the date (or it
   pre-fills from `lifecycle_steps.membership_signed.completed_at`),
   save.
5. Trigger the alerts sync (`gh workflow run "CRM alerts sync"` or
   `/admin/alerts` → Re-scan now) — anything inside the 30-day
   window appears immediately.

## Phase 2 — deferred

Auto-populating `contract_signed_at` from the esignatures.com
contract record. The hook point exists (each contract carries a
`member_id` and a `signed_at` timestamp); writing the linker is a
small follow-up once the user confirms the contract→member mapping
shape they want.

## Open / next-step notes

- **Contracts tab integration** — `/admin/contracts` currently
  doesn't surface renewal status. Could mirror the marketplace pill
  on the contract row for at-a-glance review.
- **Renewal logging UX** — clicking "Resolve" on a contract_expiring
  alert clears the alert but doesn't update the sign date. A combined
  "Log renewal → set signed=today" affordance on the alert row would
  be cleaner than the current two-step (resolve + open member +
  update date).

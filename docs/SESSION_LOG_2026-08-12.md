# Session Log — 2026-08-12

## Campaign-ending alert missed Holly Mackle's concluded campaign

### Problem
Holly Mackle's ART19 campaign (`GHOSTSignal + Unseriously (Host / Mid / 60)`)
concluded, but no `campaign_ending` notification was sent to Jack.

### Root cause
The campaign-ending detector was purely run-time-based. `buildCampaignSnapshot()`
returned `null` whenever `start_date`/`end_date` was missing, so
`detectCampaignEndingAlert()` could never fire for a campaign with no `end_date`.
GHOSTSignal's internal host-read direct campaigns (`ad_source: internal`) are
marked `concluded` by ART19 but carry **no `end_date`** — they fell straight
through, so no `crm_alerts` row and no email ever fired.

DB confirmed the gap: of 22 concluded campaigns, exactly one has a null
`end_date` (hers). No existing alert row for it.

### Fix
`apps/web/src/lib/campaign-alerts.ts`:
- Added `isCampaignConcluded(status)` — treats ART19 terminal statuses
  (`concluded`/`completed`) as authoritative.
- `buildCampaignSnapshot()` now builds a snapshot for a status-concluded
  campaign with no usable run-time window (`run_pct = 100`, `days_remaining = 0`)
  instead of bailing to null.
- `detectCampaignEndingAlert()` applies the grace-window exclusion only when an
  `end_date` exists; status-concluded/no-end campaigns qualify, guarded against
  double-send by the fire-once `crm_alerts` row.
- Email "Window" row renders `—` for a missing end date.

Scope is deliberately tight: run-time campaigns still alert at their scheduled
end (unchanged); only the un-catchable no-`end_date` case is newly handled.
Verified against real data — only Holly Mackle's campaign fires, no flood.
Early-concluded campaigns with a future `end_date` (e.g. Progressive August
BACON) correctly defer to their scheduled end so the "100% run time" email copy
stays truthful.

Also refreshed stale "97% / still running" comments in the sync route docstring
and the workflow header.

### Files touched
- `apps/web/src/lib/campaign-alerts.ts`
- `apps/web/src/app/api/admin/campaign-alerts/sync/route.ts`
- `.github/workflows/campaign-alerts.yml`

### Validation
- `npm run typecheck` — pass
- `npx eslint` on both TS files — clean
- Pure-function replay over real campaign rows — only the Unseriously host-read
  campaign fires; active/history/archived correctly skip.

### Next steps
- Deploy, then trigger the sync (workflow_dispatch or POST
  `/api/admin/campaign-alerts/sync`) so Jack is notified now rather than at the
  next daily 07:15 UTC run.
- Confirm `ALERT_EMAIL_JACK_W_HARDING` is set in Vercel (prior alerts emailed
  successfully, so almost certainly is).

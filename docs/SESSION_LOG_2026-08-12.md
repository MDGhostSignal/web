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

### Deploy
- Merged to `main` (fast-forward) and pushed → Vercel production.

## ART19 sync failing daily — 429 rate limiting (separate issue)

### Diagnosis (from `art19_sync_runs`)
Investigating why the "ART19 sync" GitHub workflow fails most days (user noticed
~1 in 3 passes). Root cause is NOT a timeout (runs finish in 39–76s, well under
the 300s cap) — every failure is `ART19 429 Too Many Requests`, usually on an
episode GET mid-walk. The sync does ~370 sequential ART19 GETs (network → series
→ every episode → campaign_series → every campaign) with no retry, so a single
429 anywhere aborts the whole run. This is unrelated to the missed
campaign-ending alert (different workflow; alert cron was succeeding).

### Fix
`apps/web/src/lib/art19.ts` — `get()` now retries transient statuses
(429/500/502/503/504) up to 5×, honoring `Retry-After` when present and falling
back to exponential backoff (0.5→1→2→4→8s, capped 8s, +jitter). A mid-walk 429
now backs off and resumes instead of killing the run.

### Files touched
- `apps/web/src/lib/art19.ts`

### Validation
- `npm run typecheck` — pass
- `npx eslint src/lib/art19.ts` — clean
- Live end-to-end proof: see below (triggered both crons against production).

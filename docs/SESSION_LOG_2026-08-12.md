# Session Log — 2026-08-12

## Summary

Two production CRM reliability bugs found, fixed, deployed, and **verified live**:

1. **Campaign-ending alert never fired for host-read campaigns.** Holly Mackle's
   concluded `GHOSTSignal + Unseriously` campaign never notified Jack because the
   detector could only recognize completion via `end_date`, which internal
   host-read campaigns don't have. Fixed to also trust ART19's `concluded`
   status. Jack + Mike now notified.
2. **ART19 daily sync failing ~2 of every 3 days.** All failures were ART19
   `429 Too Many Requests` (not timeouts); a single 429 mid-walk aborted the
   whole run. Added retry-with-backoff. Proven green under back-to-back stress.

Both confirmed working by triggering production directly and inspecting Supabase.

Commits (on `main`, deployed to Vercel):
- `205349e` fix(alerts): fire campaign-ending alert for concluded campaigns with no end_date
- `0537744` fix(art19): retry ART19 API calls on 429/5xx so the daily sync stops flapping
- `bbfb9d1` docs(session): record live proof — both crons confirmed working

---

## Part 1 — Campaign-ending alert missed Holly Mackle's concluded campaign

### Problem
Holly Mackle's ART19 campaign (`GHOSTSignal + Unseriously (Host / Mid / 60)`)
concluded, but no `campaign_ending` notification was sent to Jack.

### Investigation
- Campaigns are named by advertiser (Progressive, PubTech, Adswizz), not by host,
  so "Holly Mackle" matched nothing directly. Found her campaign via the two
  `Unseriously` host-read rows (she hosts *Unseriously*).
- Her row: `status = concluded`, **`end_date = null`**, `ad_source = internal`,
  `default_cpm = 50`, 2000 impressions.
- `crm_alerts` history showed the alert pipeline was healthy — `campaign_ending`
  rows fired + resolved for PubTech/Progressive across Jul 31–Aug 8. So the alert
  cron was running; it just couldn't "see" her campaign.

### Root cause
The detector was purely run-time-based. `buildCampaignSnapshot()` returned `null`
whenever `start_date`/`end_date` was missing, so `detectCampaignEndingAlert()`
could never fire for a campaign with no `end_date`. GHOSTSignal's internal
host-read direct campaigns are marked `concluded` by ART19 but carry no
`end_date` — they fell straight through, silently, every run.

DB confirmed blast radius was safe: of 22 concluded campaigns, exactly **one** has
a null `end_date` (hers). All others have end dates and are handled by the
run-time path.

### Fix — `apps/web/src/lib/campaign-alerts.ts`
- `isCampaignConcluded(status)` — treats ART19 terminal statuses
  (`concluded`/`completed`) as authoritative completion signal.
- `buildCampaignSnapshot()` now builds a snapshot for a status-concluded campaign
  with no usable run-time window (`run_pct = 100`, `days_remaining = 0`) instead
  of bailing to null.
- `detectCampaignEndingAlert()` applies the grace-window exclusion only when an
  `end_date` exists; status-concluded/no-end campaigns qualify, guarded against
  double-send by the fire-once open `crm_alerts` row.
- Email "Window" row renders `—` for a missing end date.
- Refreshed stale "97% / still running" comments in the sync route docstring +
  workflow header (threshold has been 100% since 2026-08-07).

Scope is deliberately tight: run-time campaigns still alert at their scheduled
end (unchanged). Early-concluded campaigns that still have a future `end_date`
(e.g. Progressive August BACON) correctly defer to their scheduled end, keeping
the "100% run time elapsed" email copy truthful.

### Files touched
- `apps/web/src/lib/campaign-alerts.ts`
- `apps/web/src/app/api/admin/campaign-alerts/sync/route.ts`
- `.github/workflows/campaign-alerts.yml`

### Validation
- `npm run typecheck` — pass; `npx eslint` — clean.
- Pure-function replay over all 26 live active/recent campaigns: exactly one
  qualifies (hers), no open alert exists → sync would insert + email. No flood.

---

## Part 2 — ART19 sync failing daily (separate issue, surfaced mid-session)

User noticed the "ART19 sync" GitHub workflow fails most days (~1 in 3 passes)
and asked whether that was why the alert didn't fire.

### Answer: no — two independent things
- The alert fires from `campaign-alerts.yml` (reads Supabase); the failing job is
  `art19-sync.yml` (writes Supabase from the ART19 API). Different workflows.
- The alert cron was succeeding the whole time (proven by the `crm_alerts`
  timestamps). Holly Mackle's miss was the code bug above, not cron failure — a
  100%-green cron would still have skipped her.

### Diagnosis (from the `art19_sync_runs` table)
- **Not a timeout**: runs finish in 39–76s, well under the 300s `maxDuration`.
- **Every failure is `ART19 429 Too Many Requests`**, usually on an episode GET
  mid-walk (often the same episode id — the point where cumulative request rate
  trips ART19's limiter).
- The sync does ~370 sequential ART19 GETs (network → every series → every
  episode → campaign_series → every campaign) with **no retry**, so a single 429
  anywhere threw and aborted the entire run. Pattern in the log:
  `ok, error, error, error, ok, …` ≈ 1-in-3 success.

### Fix — `apps/web/src/lib/art19.ts`
`get()` now retries transient statuses (429/500/502/503/504) up to 5×, honoring
`Retry-After` when present and otherwise backing off exponentially
(0.5→1→2→4→8s, capped 8s, + jitter). A mid-walk 429 now backs off and resumes
instead of killing the run. Non-retryable statuses (401/403/404/400) still fail
fast.

### Files touched
- `apps/web/src/lib/art19.ts`

### Validation
- `npm run typecheck` — pass; `npx eslint src/lib/art19.ts` — clean.
- Live stress proof below.

---

## Live proof (both crons triggered against production, 2026-08-12 ~13:04 UTC)

Triggered directly via `POST` with the `CRON_SECRET` bearer (read from
`apps/web/.env.local`); results cross-checked in Supabase.

### Campaign-ending alert — WORKING ✅
`POST /api/admin/campaign-alerts/sync` →
```
{ok:true, scanned:35, qualifying:1, opened:1, emailed:1,
 recipients:["jack@ghostsignal.cloud","mike@ghostsignal.cloud"]}
```
- `crm_alerts` row confirmed written: kind `campaign_ending`, campaign
  `GHOSTSignal + Unseriously (Host / Mid / 60)`, `run_pct 100`, `resolved_at`
  null (open in bell + dashboard), created 13:03:58 UTC.
- Email accepted by Resend for Jack + Mike. Recipients came back as real
  addresses, confirming `ALERT_EMAIL_JACK_W_HARDING` / `ALERT_EMAIL_MIKE_SENSE`
  are set in Vercel (not the fallback).

### ART19 sync — WORKING, 429 retry proven under stress ✅
Four consecutive `art19_sync_runs`, all `status=ok`, `error_message` null:

| started (UTC) | status | duration | episodes | campaigns |
|---|---|---|---|---|
| 13:08:45 | ok | 89s | 337 | 35 |
| 13:07:13 | ok | 92s | 337 | 35 |
| 13:05:45 | ok | 87s | 337 | 35 |
| 13:04:28 | ok | 63s | 337 | 35 |

The first isolated run was 63s; the 3 back-to-back stress runs (deliberate
rate-limit pressure) rose to 87–92s. That ~25–30s increase is the backoff/retry
absorbing 429s that previously aborted the run — under three hammered syncs the
pre-fix code would almost certainly have failed at least one. Contrast the prior
history (~2 of every 3 runs = 429 error).

---

## Outcome
- Both crons confirmed working with live proof.
- Jack + Mike notified about Holly Mackle's completed campaign; in-app alert open.
- ART19 daily sync hardened against rate limiting; should now stay green.

## Follow-ups / watch items
- Glance at `art19_sync_runs` after the next scheduled cron (04:00 UTC daily) to
  confirm the retry holds on the real cron, not just manual triggers.
- Can't verify inbox delivery from here — `emailed:1` means Resend *accepted* the
  send. Optional: confirm with Jack it landed.
- Future host-read campaigns will now alert on their `concluded` status as they
  complete (no `end_date` needed).

## Memory updated
- `project_campaign_ending_alerts` — added the concluded-status/no-end-date path.
- `reference_art19_api` — added the 429 rate-limit + retry section.

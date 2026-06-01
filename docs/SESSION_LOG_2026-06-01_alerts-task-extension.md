# Session Log — 2026-06-01 (Alerts extension — task_stale)

Extended the CRM alerts system shipped earlier today to also cover
the internal task tracker. Same bell, same triage page, same daily
digest — now with a third alert kind: `task_stale`.

## Trigger

A `task_stale` alert opens when:
- Task status is NOT in (`completed`, `archived`), AND
- The most recent of `updated_at` / `latest_comment_at` / `created_at`
  is older than `ALERT_TASK_STALE_DAYS` days (default 14).

## Routing

- Owner = `task.assigned_to`, fallback to `task.created_by`, fallback
  to `ALERT_EMAIL_FALLBACK`.
- Owner-routing reuses the same `ALERT_EMAIL_<SLUG>` env vars as the
  member alerts; no new env vars needed beyond
  `ALERT_TASK_STALE_DAYS` (optional, defaults to 14).

## Auto-resolution

- `PATCH /api/design-tasks` (any field) → resolves `task_stale` for
  that task. The hourly sync re-detects if it still applies.
- `POST /api/design-tasks/comments` → resolves `task_stale` for the
  parent task.
- Status flip to `completed` / `archived` → resolves on next sync
  (the PATCH hook already cleared it instantly).

## Schema migration

`docs/CRM_ALERTS_TASKS_MIGRATION.sql` — **must be applied in Supabase
SQL editor before the new code runs cleanly.** Idempotent.

Changes:
1. Adds `design_tasks.updated_at` + trigger (so freshness signal
   exists for the detector).
2. Makes `crm_alerts.member_id` nullable.
3. Adds `crm_alerts.task_id` FK to `design_tasks`.
4. Replaces the kind check to allow `task_stale`.
5. Adds a subject-check constraint enforcing exactly-one of
   (member_id, task_id).
6. Splits the open-row unique index into kind-aware member + task
   variants.

## Code changes

### Edited
- `apps/web/src/lib/alerts.ts` — added `task_stale` to ALERT_KINDS,
  extended `CrmAlert` (member_id nullable, task_id added),
  `AlertReason` (task fields), new `StaleTaskCandidate` type,
  `detectAlertForTask()`, `maxIso()` helper, `getThresholds()` now
  returns `taskStaleDays`, new `resolveOpenAlertsForTask()`.
- `apps/web/src/app/api/admin/alerts/sync/route.ts` — also fetches
  active tasks + their latest_comment_at, runs `detectAlertForTask`,
  reconciles in the same desired-vs-existing pass. Subject key now
  prefixed with `m:` or `t:` so member + task alerts don't collide.
- `apps/web/src/app/api/admin/alerts/route.ts` — PostgREST embed now
  pulls both `member:members(...)` and `task:design_tasks(...)`.
  Owner filter resolves through both subject types.
- `apps/web/src/app/api/admin/alerts/digest/route.ts` — groups by
  the new `ownerForAlert()` helper.
- `apps/web/src/app/api/admin/alerts/emails.ts` — added task-side
  rendering (subject = task title, accent purple, sub-line shows
  priority + status), `ownerForAlert()` export.
- `apps/web/src/components/admin/AlertsBell.tsx` + module CSS —
  `AlertWithSubject` type, task-aware label / age / owner / href
  helpers, purple kind class for task alerts.
- `apps/web/src/app/admin/alerts/page.tsx` + module CSS — same
  task-aware extensions; new "Task untouched" filter pill.
- `apps/web/src/app/api/design-tasks/route.ts` — PATCH now fires
  `resolveOpenAlertsForTask(body.id)` after a successful update.
- `apps/web/src/app/api/design-tasks/comments/route.ts` — POST now
  fires `resolveOpenAlertsForTask(body.task_id)` after a successful
  insert.

### New
- `docs/CRM_ALERTS_TASKS_MIGRATION.sql` — the migration script.

## Validation

All three gates green:
- `npm run typecheck` — clean
- `npm run lint` — clean
- `npm run lint:css` — clean

## Go-live (additive to the earlier alerts go-live)

1. Apply `docs/CRM_ALERTS_TASKS_MIGRATION.sql` in Supabase SQL editor.
2. Optionally set `ALERT_TASK_STALE_DAYS` in Vercel
   (defaults to 14).
3. Redeploy.
4. `gh workflow run "CRM alerts sync"` to detect newly-stale tasks.
5. Verify at `/admin/alerts` — new "Task untouched" pill should show
   a count.

## Open / next-step notes

- **Per-priority thresholds** — currently one threshold for all task
  priorities. Could later split: high=7d, medium=14d, low=28d. Easy
  extension via `task.priority` switch in `detectAlertForTask`.
- **Due-date alerts** — separate signal from staleness; tasks with
  `due_date` in the past could fire a `task_overdue` kind. Deferred.
- **Task subject link** — task alerts deep-link to `/admin/tasks`
  but don't scroll-to-task. Could pass `?task=<id>` and let the
  tasks page open the detail panel. Small follow-up if requested.

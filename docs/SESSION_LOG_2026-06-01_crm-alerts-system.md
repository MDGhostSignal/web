# Session Log — 2026-06-01 (CRM Alerts System — full 4-phase ship)

## Summary

Shipped a complete CRM alert + notification system spanning the admin
tree. Two alert kinds — `contact_cold` (member not contacted in 28+
days) and `marketplace_stall` (Sign/Onboard/Run member with open
lifecycle steps and `phase_entered_at` 30+ days old). Detection runs
hourly via GitHub Actions; auto-resolution fires inline when a comment
is logged or `last_contact_at` / `lifecycle_steps` is patched. UX is
hybrid: bell + dropdown in the admin top bar, standalone triage page
at `/admin/alerts`, and a per-owner daily email digest at 08:00 UTC
(routed by `member.owner` → env-configured email).

Built in four phases as planned, all four shipped clean in one
session.

## Phase A — Foundation (schema + API + detection cron)

### New
- `docs/CRM_ALERTS_SCHEMA.sql` — `crm_alerts` table (id, kind,
  member_id, triggered_at, resolved_at, snoozed_until, reason_json),
  unique-where partial index enforcing one open alert per (kind,
  member), RLS enabled. **User must apply once via Supabase SQL editor.**
- `apps/web/src/lib/alerts.ts` — type defs (`CrmAlert`, `AlertKind`,
  `AlertReason`), threshold helpers (env-tunable
  `ALERT_CONTACT_COLD_DAYS=28` / `ALERT_MARKETPLACE_STALL_DAYS=30`),
  pure `detectAlertsForMember()`, and `resolveOpenAlertsForMember()`
  for the inline auto-resolve hooks.
- `apps/web/src/app/api/admin/alerts/route.ts` — GET list with
  embedded `member:members(...)` PostgREST join and optional
  `?owner=` filter; hides snoozed-but-not-due rows by default.
- `apps/web/src/app/api/admin/alerts/count/route.ts` — cheap GET for
  the bell badge.
- `apps/web/src/app/api/admin/alerts/[id]/route.ts` — PATCH
  `{action: "snooze"|"resolve"|"reopen", snooze_days?}`.
- `apps/web/src/app/api/admin/alerts/sync/route.ts` — POST detection
  job. Dual auth (CRON_SECRET bearer OR admin cookie, mirrors the
  Mercury sync pattern). Idempotent reconcile: computes desired open
  set from `detectAlertsForMember`, inserts new, auto-resolves
  cleared.
- `.github/workflows/crm-alerts-sync.yml` — hourly cron at `5 * * * *`.
  Requires secrets `CRON_SECRET` + `CRM_ALERTS_SYNC_URL`.

### Edited
- `apps/web/src/proxy.ts` — added `/api/admin/alerts/sync` and
  `/api/admin/alerts/digest` to `PUBLIC_SUBPATHS`; added
  `/api/admin/alerts`, `/api/admin/alerts/count`,
  `/api/admin/alerts/:id` to the matcher (cookie-gated).

## Phase B — In-app surface

### New
- `apps/web/src/components/admin/AlertsBell.tsx` +
  `AlertsBell.module.css` — top-bar widget. Polls
  `/api/admin/alerts/count` every 60s for the red-dot badge; lazy-
  loads the full list on panel open. Per-row Snooze 7d / Resolve
  buttons mutate via `/api/admin/alerts/[id]` with optimistic UI.
  Click-outside + Escape to close. Mobile-responsive (pinned sheet
  under 600 px).
- `apps/web/src/app/admin/alerts/page.tsx` +
  `page.module.css` — standalone triage page. Owner filter pills
  (per-founder + "Unowned"), kind filter pills (contact_cold vs
  marketplace_stall), manual "Re-scan now" button (hits sync
  endpoint).

### Edited
- `apps/web/src/components/admin/icons.tsx` — added `IconBell`
  (top-bar trigger) + `IconAlerts` (sidebar entry: bell with dot).
- `apps/web/src/components/admin/AdminShell.tsx` — mounted
  `<AlertsBell />` in the default `trail` slot above ThemeToggle.
- `apps/web/src/components/admin/index.ts` — exported AlertsBell.
- `apps/web/src/app/admin/layout.tsx` — added "Alerts" tab to the
  sidebar nav (after Contracts, with `IconAlerts`).
- `apps/web/src/app/api/members/comments/route.ts` — POST now
  auto-resolves `contact_cold` for the member after a successful
  insert (fire-and-forget).
- `apps/web/src/app/api/members/[id]/route.ts` — PATCH auto-resolves
  alerts whose trigger this update likely cleared: `last_contact_at`
  → `contact_cold`; `lifecycle_steps` → `marketplace_stall`; `phase`
  → both.

## Phase C — Per-owner daily email digest

### New
- `apps/web/src/app/api/admin/alerts/emails.ts` — pure HTML/text
  builder (`buildDigestHtml`, `buildDigestText`) + `sendDigestEmail`
  Resend wrapper. `ownerEmailFromEnv(name)` slugs an owner name to
  `ALERT_EMAIL_<UPPER_UNDERSCORE>` env. `fallbackEmail()` reads
  `ALERT_EMAIL_FALLBACK` (default `hello@ghostsignal.cloud`).
- `apps/web/src/app/api/admin/alerts/digest/route.ts` — POST entry
  point. Same dual-auth as sync. Fetches all open + non-snoozed
  alerts joined with member.owner, groups by owner, sends one email
  per owner. Unowned alerts → fallback inbox.
- `.github/workflows/crm-alerts-digest.yml` — daily cron at
  `0 8 * * *`. Requires secrets `CRON_SECRET` +
  `CRM_ALERTS_DIGEST_URL`.

### Env vars to set in Vercel
- `RESEND_API_KEY`, `RESEND_FROM` — already present for other emails
- `ALERT_EMAIL_MIKE_SENSE`
- `ALERT_EMAIL_JACK_W_HARDING`
- `ALERT_EMAIL_MARTIN_DREXLER` (e.g. `hello@martindrexler.com`)
- `ALERT_EMAIL_JEREMY_REEVES`
- `ALERT_EMAIL_FALLBACK` (optional; defaults to
  `hello@ghostsignal.cloud`)
- `ALERT_CONTACT_COLD_DAYS` (optional; defaults to 28)
- `ALERT_MARKETPLACE_STALL_DAYS` (optional; defaults to 30)

### GitHub Actions secrets to set
- `CRM_ALERTS_SYNC_URL` =
  `https://www.ghostsignal.cloud/api/admin/alerts/sync`
- `CRM_ALERTS_DIGEST_URL` =
  `https://www.ghostsignal.cloud/api/admin/alerts/digest`
- `CRON_SECRET` — same value already used for Mercury sync.

## Phase D — Inline cues

### New
- `apps/web/src/components/admin/StaleBadge.tsx` +
  `StaleBadge.module.css` — shared module-level cache
  (`useAlertedMembers()` hook + lightweight pub-sub) so multiple
  `<StaleBadge>`s on a page share one `/api/admin/alerts` fetch.
  Cache TTL 2 minutes, refetch on re-mount when stale. The
  `<StaleBadge memberId={...} />` consumer renders nothing when the
  member has no open alert.

### Edited
- `apps/web/src/components/admin/index.ts` — exported `StaleBadge`
  and `useAlertedMembers`.
- `apps/web/src/app/admin/marketplace/PoolView.tsx` — minimal-touch
  example: `<StaleBadge memberId={m.id} />` next to member name in
  the existing urgent banner. Backend-tracked alerts now get explicit
  visual treatment beyond the heuristic urgency calc.

### Deferred
- Contacts page is 2014 lines; skipped a deeper integration to avoid
  regression risk. The bell + `/admin/alerts` page already cover the
  contacts surface; sprinkle `<StaleBadge memberId={c.id} />` next to
  the contact name when convenient.

## Validation

All gates green at end of session:
- `npm run typecheck` — clean
- `npm run lint` — clean
- `npm run lint:css` — clean

## Migration order (when going live)

1. Apply `docs/CRM_ALERTS_SCHEMA.sql` in Supabase SQL editor.
2. Set Vercel env vars (per-owner emails + RESEND).
3. Add GitHub Actions secrets (URLs + CRON_SECRET).
4. Manually fire the sync workflow once
   (`gh workflow run "CRM alerts sync"`) to seed any pre-existing
   stale state into the table.
5. Verify by visiting `/admin/alerts` (will populate after step 4).
6. Wait until 08:00 UTC for the first auto-digest, or
   `gh workflow run "CRM alerts digest"` to test immediately.

## Open issues / next-step notes

- **Contacts page deep-integration deferred** — the `<StaleBadge>`
  is reusable; drop it next to `c.first_name` rows in
  `apps/web/src/app/admin/contacts/page.tsx` when there's appetite.
- **No "snooze until X date" picker** — the in-app PATCH endpoint
  accepts `snooze_days` 1–30; UI exposes only the 7-day default.
  Easy to extend with a dropdown if founders ask.
- **Snoozed rows don't surface in the bell** — by design. They
  reappear automatically when `snoozed_until` passes. If founders
  want a "Snoozed (3)" sub-list, the API already supports
  `?include_snoozed=1`.
- **Auth: no per-user identity in the admin cookie** means the
  in-app "My alerts" toggle is a manual owner pick rather than
  auto-derived. Documented in the alerts page UI as the pill
  selector. Could revisit if multi-user-aware auth lands.
- **Confidential docs still untracked** —
  `docs/Creator Life Cycle.xlsx`, `docs/XQ Draft.txt`,
  `docs/nimble_contacts.csv` — flagged in earlier session logs but
  still not gitignored.

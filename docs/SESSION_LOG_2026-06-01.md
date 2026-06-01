# Session Log — 2026-06-01 (Day overview)

Four discrete pieces of work landed today, kept in one commit by user
request. Each is independently shippable; the body of the commit
message reflects the same sectioning. The CRM alerts system has its
own deep-dive log at
`docs/SESSION_LOG_2026-06-01_crm-alerts-system.md` — this file is the
day-level overview.

## 1 · XQ quiz — per-field validation with inline error highlights

User report: hitting "Continue" / "Submit" with unfilled fields
showed only a generic banner; founders couldn't tell which field was
missing.

Reworked validation across all four `/xq-quiz` steps so each missing
input is highlighted in place + the banner reports a precise count.

### Changes
- **ContactStep** — per-field error map (`first`, `last`, `email`,
  `org`, `type`); red border + inline message under each invalid
  field; submit auto-scrolls + focuses the first invalid; errors
  clear per-field as soon as the user types.
- **Phase1Step + Phase2Step** — `Set<string>` of unanswered question
  ids; each unanswered card gets a red border + tinted background +
  inline "Please choose A or B" message; auto-scroll to first
  unanswered; picking an answer clears that card's red state.
- **Phase3Step** — now requires ≥1 selection per stress test
  (previously zero validation — you could click Generate with
  nothing picked); per-test invalid treatment + named banner
  ("Stress Test 01 needs at least one selection").
- **xq-quiz.css** — `.xq-err` upgraded from plain red text to a
  proper alert banner with `!` badge; new `.xq-field.invalid`,
  `.xq-field-error`, `.xq-q-block.invalid`, `.xq-q-block-error`
  classes.

### Files touched
- `apps/web/src/app/xq-quiz/ContactStep.tsx`
- `apps/web/src/app/xq-quiz/Phase1Step.tsx`
- `apps/web/src/app/xq-quiz/Phase2Step.tsx`
- `apps/web/src/app/xq-quiz/Phase3Step.tsx`
- `apps/web/src/app/xq-quiz/xq-quiz.css`

## 2 · "Index" → "Quotient" rebrand across all surfaces

User request: "It should never say `rq index` or `xq index`. It
should always say `quotient`, so `rq quotient` or `xq quotient`."

Audited every user-facing surface and renamed.

### Changes
- **Brand source of truth** — `BRAND.title` updated in
  `apps/web/src/lib/rq/constants.ts` ("Resonance Quotient") and
  `apps/web/src/lib/xq/constants.ts` ("The Conviction Quotient").
  Flows everywhere `BRAND.title` is consumed.
- **Public quizzes** — XQ layout meta title + description, XQ
  IntroStep (eyebrow, H1, body, CTA), RQ quiz contact step helper
  text + post-submit success banner, RQ results-screen body copy.
- **Email templates** — both `rq-submissions/emails.ts` (HTML body,
  plaintext body, subject line) and `xq-submissions/emails.ts`
  (HTML title, header, footer, incomplete-lead admin email).
- **Admin surfaces** — `/admin/xq-responses` page subtitle,
  `XQSummaryCard` tag (3 places), JSDoc on `members.ts` +
  `marketplace/PoolView.tsx` + `admin/contacts/page.tsx`.
- **Marketing seed** — 2 social-hook snippets in
  `scripts/seed-copy-snippets.mjs`.
- **External brand doc** — 5 occurrences in
  `apps/web/public/brand/WHITE_PAPER.md` (linked from the RQ intro
  screen).
- **Comments + identifiers** — internal JS/CSS comments updated for
  consistency (CSS file headers, scoring/constants doc comments,
  `.stylelintignore`, `test-email.mjs`).

### Intentionally left alone
Legacy pre-React preview files (`apps/web/rq_quiz/rqv1.txt`,
`apps/web/public/rq-preview.html`) still contain "Resonance Index"
deep in their code; they're historical artifacts not linked from
the live app.

## 3 · Admin/tasks — hide Completed from the "All" filter

User report: the "All" filter already excluded Archived; they wanted
the same treatment for Completed so the default overview stays
focused on active work.

### Changes
- **filteredTasks** — extended the existing archived-exclusion to
  also exclude `completed` when `filter === "all"`. Selecting the
  dedicated Completed or Archived filter still shows those tasks.
- **taskCounts.all** — count now reflects the same exclusion so the
  sidebar pill matches the rendered list.

### Files touched
- `apps/web/src/app/admin/tasks/page.tsx`

## 4 · CRM alerts + notifications system (4 phases)

The big piece of the day. User asked for an alert/notification
center for the membership pool + contacts: alert when a contact
hasn't been contacted in 4+ weeks (contacts) or when a marketplace
member has open lifecycle steps and hasn't moved in 1+ months. After
a research pass and UX recommendation, shipped the full system —
schema, detection cron, in-app bell + triage page, per-owner email
digest, and inline cues.

Full detail in
`docs/SESSION_LOG_2026-06-01_crm-alerts-system.md`. Top-line summary
here:

- **Phase A — Foundation**: `crm_alerts` table, detection logic,
  4 API routes (list / count / [id] / sync), hourly cron workflow
  `.github/workflows/crm-alerts-sync.yml`.
- **Phase B — In-app**: `<AlertsBell>` in the AdminShell top bar
  (60s polling + dropdown with Snooze/Resolve); `/admin/alerts`
  triage page with owner + kind filter pills; auto-resolve hooks
  on `POST /api/members/comments` (clears `contact_cold`) and
  `PATCH /api/members/[id]` (clears based on which fields changed).
- **Phase C — Email digest**: daily 08:00 UTC cron sends one
  grouped email per owner. Per-owner routing via
  `ALERT_EMAIL_<NAME_SLUG>` env vars; unowned alerts fall back to
  `ALERT_EMAIL_FALLBACK` (default `hello@ghostsignal.cloud`).
- **Phase D — Inline cues**: `<StaleBadge memberId={...} />` +
  `useAlertedMembers()` shared-cache hook in `@/components/admin`.
  Wired into PoolView's existing urgent banner as a minimal-touch
  example; drop in elsewhere as needed.

### Migration order (when going live)
1. Apply `docs/CRM_ALERTS_SCHEMA.sql` in Supabase SQL editor.
2. Set Vercel env vars: `ALERT_EMAIL_MIKE_SENSE`,
   `ALERT_EMAIL_JACK_W_HARDING`, `ALERT_EMAIL_MARTIN_DREXLER`,
   `ALERT_EMAIL_JEREMY_REEVES`, optionally `ALERT_EMAIL_FALLBACK`
   and `ALERT_CONTACT_COLD_DAYS` / `ALERT_MARKETPLACE_STALL_DAYS`.
3. Add GitHub Actions secrets: `CRM_ALERTS_SYNC_URL`,
   `CRM_ALERTS_DIGEST_URL` (CRON_SECRET already exists from Mercury).
4. `gh workflow run "CRM alerts sync"` to seed the table.
5. Verify at `/admin/alerts`.

## Validation

All gates green at end of session:
- `npm run typecheck` — clean
- `npm run lint` — clean
- `npm run lint:css` — clean

## Memory updates

- `~/.claude/.../memory/project_admin_overview.md` — added
  `/admin/alerts` to the surface list; added `<AlertsBell>` +
  `<StaleBadge>` / `useAlertedMembers()` to the cross-page
  primitives section.
- `~/.claude/.../memory/reference_admin_infra.md` — listed the two
  new workflows (`crm-alerts-sync.yml`, `crm-alerts-digest.yml`)
  with their schedules + env requirements.

## Open / next-step notes

- **Confidential docs still untracked** —
  `docs/Creator Life Cycle.xlsx`, `docs/XQ Draft.txt`,
  `docs/nimble_contacts.csv` — flagged in prior session logs;
  still need a `.gitignore` entry. Not addressed today.
- **Contacts page deep `<StaleBadge>` integration** deferred — the
  contacts page is 2014 lines; the bell + `/admin/alerts` page
  already cover that surface. Drop `<StaleBadge memberId={c.id} />`
  next to contact names when there's appetite.
- **No "snooze until specific date" picker** — the API accepts
  `snooze_days` 1–30; UI exposes only the 7-day default. Easy to
  extend if founders ask.

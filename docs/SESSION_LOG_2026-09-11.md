# Session log — 2026-09-11

## Changes

### Studio — ART19 checklist
- Restored Phase 2 step 1 (`2-review`) copy: login-email wording, stay-active-until-301, import-window sync note, “no rush.”

### Cold outreach — follow-up from overview list
- Per-row **Follow up** on sent / follow-up-sent rows (`FollowUpComposer`).
- Slim email: branded header lockup + editable note + Mike signature GIF (light/dark) + website ad → `/what-is-this`.
- Dropped “Let’s Talk / goes straight to Mike” close (Mike is the sender).
- Website ad: “A Community of World Makers” + two-line tagline (“We create partnerships that feel good” / “Because they are good”); no spinning logo; theme-matched panels.
- Full cold-email footer line → “world-making community” wording.
- Status `followup_sent` (badge: **follow-up sent**); `sent_at` stamped; Sent filter includes both `sent` and `followup_sent`.
- When column shows local date + hour:minute for delivered rows.
- Editable **Subject** in follow-up popup (prefilled, shown above preview).
- Duplicate guard on new full reachouts also treats `followup_sent` as contacted.

### Admin Modal
- Backdrop dismiss only when pointerdown started on the overlay — text-select drag out of subject/note no longer closes the dialog (all admin modals).

## Commits (main → origin)

| SHA | Summary |
|-----|---------|
| `95b06be` | fix(studio): restore ART19 Phase 2 login-email checklist copy |
| `e4efdf5` | feat(outreach): follow-up send from overview list |
| `67e60a5` | fix(outreach): use Mike signature on follow-up emails |
| `f683c12` | copy(outreach): world-making community footer line |
| `eb32396` | feat(outreach): What Is This ad under follow-up signature |
| `fb4347e` | copy(outreach): simplify follow-up website ad |
| `2e20bdc` | copy(outreach): stack follow-up ad tagline on three lines |
| `02240b5` | copy(outreach): drop GHOSTSignal line from follow-up ad |
| `0735305` | docs(session): record follow-up send test to Martin Gmail |
| `12554b1` | feat(outreach): followup_sent status and timed When column |
| `3be2cf5` | feat(outreach): editable subject on follow-up composer |
| `e7c8c28` | fix(admin): don't close Modal when text-select drag hits backdrop |

## Files touched
- `apps/web/src/app/studio/migration/MigrationGuide.tsx`
- `apps/web/src/lib/cold-outreach-email.ts`
- `apps/web/src/lib/cold-outreach-send.ts`
- `apps/web/src/app/api/admin/outreach/route.ts`
- `apps/web/src/app/api/admin/outreach/preview/route.ts`
- `apps/web/src/app/api/admin/outreach/follow-up/route.ts`
- `apps/web/src/app/admin/outreach/page.tsx`
- `apps/web/src/app/admin/outreach/components/FollowUpComposer.tsx`
- `apps/web/src/app/admin/outreach/outreach.module.css`
- `apps/web/src/components/admin/Modal.tsx`
- `docs/OUTREACH_SCHEDULING_SCHEMA.sql` (status comment: `followup_sent`)
- `docs/SESSION_LOG_2026-09-11.md`

## Validation
- `npm run typecheck` — pass (multiple times through the day)
- `npm run lint:css` — pass (where run)
- `npm run assets:audit` — pass (signature + ad assets present)
- Follow-up HTML smoke: header + signature + ad; no invite pitch body / Snowdrift
- Live send tests to `heymatvond@gmail.com`:
  - first: `220d791b-b953-4db3-b0cc-eb462ab1b6f2` (pre-`followup_sent`, status was `sent`)
  - second: `bd94fe49-6af9-47e7-85b4-2e5bf6e53e87` (`followup_sent` + `sent_at` confirmed)
- Local dev server on `:3000` used for login + API sends

## Open / next
- Optional: `kind` / `parent_id` columns to link follow-ups to the parent reachout in the list.
- Optional: backfill the first test row’s status from `sent` → `followup_sent`.
- Untracked local verify scripts / `production/` dumps left uncommitted (pre-existing; not part of today’s product work).

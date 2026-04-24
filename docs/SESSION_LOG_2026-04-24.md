# Session Log — 2026-04-24

Biggest CRM push to date. Picked up from the Phase 3 admin-hub commit
(`8e7e759`) and closed out Phase 4 by building the Members CRM v1,
then extended it twice in the same session — first into a full
phase-based lifecycle system incorporating Jack's creator onboarding
draft plus a round of CRM UX research, and then a member-level
comments feature. Also tightened the admin middleware so admin APIs
are actually gated (they weren't).

## Outcomes

### Phase 4 — Members CRM v1 (placeholder → full UI)

`apps/web/src/app/admin/members/page.tsx` was a `<EmptyState
title="CRM in build" />` placeholder at session start. Now it's the
full CRM surface. Built against the Phase-3 admin primitives
(`DataTable`, `Modal`, `Badge`, `PageHeader`, `SearchInput`,
`EmptyState`, `ErrorCard`) with no new dependencies.

Shipped:

- **List**. 8-column `DataTable`: Name · Email (mailto) · Organization ·
  Type · Phase · Owner · Last contact · expand glyph. Rows toggle open.
- **Filters + search.** Toolbar cluster (Stage / Type / Owner selects)
  plus search across name, email, organization, role, and tags.
- **Create / Edit modal.** Shared form component used by both flows —
  12 fields across a 2-column grid, tags entered as CSV, date picker for
  last-contact. Create button in the PageHeader's action slot.
- **Delete** with confirmation modal (`destructiveSolid` button,
  in-flight disable state, inline error, no `alert()`).
- **Expanded row.** Two-column DetailsGrid (Contact + Pipeline), tag
  chips, notes panel, action cluster at the bottom.

Supported by a homepage change to add a third admin pill (violet,
`#7C3AED`) next to the existing coral **DESIGN Feedback** and teal
**RQ Responses** buttons, linking to `/admin/members`. Shared rule
on `.designFeedbackBtn, .rqResponsesBtn, .crmBtn` keeps the sizing +
typography consistent; only the hue differs.

### Dev env — password set to `test`

`ADMIN_PASSWORD` in `.env.local` (gitignored) switched from
`ghostsignal-dev-2026` to `test` for faster local inspection during
this session. Dev server was restarted after the change so Next.js
picked it up (env files don't hot-reload). Reminder flagged in chat:
`ADMIN_AUTH_SECRET` is still commented out, which means password
rotation will invalidate all open sessions — fine for dev, needs
setting before any production deploy.

### Creator Lifecycle design pass

Jack delivered a three-tab Excel (`Creator Life Cycle.xlsx`) with a
structured onboarding flow:

- Tab 1 "Potential Creators" — top-of-funnel list (header only)
- Tab 2 "First Steps" — Creator × Discernment × Reached-Out date
- Tab 3 "Life Cycle" — Creator × 10 sequential boolean checkpoints
  (Meeting, Follow Up (Deck + Ad Copy Guidelines), Further
  Conversation (RQ), Membership Sent, Membership Signed, Welcome
  Email + Box, Mercury/W9 (creator), Show Info Received (creator),
  ART19 Migration, Campaign Planning + Execution)

Four active creators tracked: Unseriously (Holly) 6/10, Andrew
Osenga / Rabbit Room / Thinking Christian Ed all at 3/10.

Parsed the `.xlsx` via Python + openpyxl. File lives at
`docs/Creator Life Cycle.xlsx` locally but is **deliberately NOT
committed** — it references creator names and contact intent data
that shouldn't go into the repo. Treat it as reference material in
the same vein as `assets/`.

### CRM UX research + synthesis

Spun up a general-purpose research agent to pull patterns from
Attio, Folk, HubSpot, Pipedrive, Monday, Close, Salesforce, Arrows,
Rocketlane, GuideCX, Dubsado/HoneyBook, BambooHR, Dock, ChurnZero,
Gainsight, and Notion. The agent's report distilled down to five
patterns worth adopting and three to avoid. Key takeaways driving
this session's design:

- **Collapse Jack's 12 checkpoints into 5 macro phases** (Discern /
  Court / Sign / Onboard / Run) so the pipeline reads at a glance;
  keep the 12 granular steps nested inside as a checklist. Avoids
  the "12 equal chevrons wall" failure mode (Salesforce Path's own
  criticism).
- **Pipedrive "rotting" dot** — a red indicator when a member has
  sat in a non-terminal phase too long. For a 4-person team
  watching 4–50 members, the *only* standup question is "who's
  stuck?" This is the single most useful pattern from the research.
- **GuideCX role tags per step** (Founder / Ops / Finance /
  Creator) — survives handoffs better than naming specific people.
- **Auto-stamp `completed_at` on check.** Cycle-time reports later;
  humans don't type dates they'll forget.
- **One pipeline with persona-conditional steps**, not separate
  pipelines per member type. Creator-only steps (Mercury/W9, Show
  Info, ART19 Migration) render as N/A for brands and are excluded
  from the progress denominator.

Jack's 12 also got three small edits on top of the research:
- Split his "Follow Up (Deck + Ad Copy Guidelines)" into two
  checkboxes — different artifacts, different owners, easy to
  track independently.
- Moved Mercury / W9 to run **parallel** with Welcome Box, not
  after — finance paperwork shouldn't block creator delight.
- Added an explicit "First Contact" checkpoint (from Jack's
  "Reached Out" column) above Meeting so the full courtship has
  a visible start.

### Phase-based schema v2

`docs/CRM_MEMBERS_SCHEMA_V2.sql` migrates the v1 table:

- New `member_phase` enum with 7 values — the 5 pipeline phases
  (`discern`, `court`, `sign`, `onboard`, `run`) plus `paused`
  and `churned` for off-pipeline states.
- New `phase` column with legacy-`stage` backfill (`lead` →
  `discern`, `onboarding` → `onboard`, `active` → `run`, etc.)
  Only fires if the `stage` column still exists, so re-runs are
  no-ops.
- New `phase_entered_at timestamptz` column + a `BEFORE UPDATE`
  trigger that refreshes it only when `phase` actually changes.
  This is what powers the rot dot — `updated_at` would reset on
  any row write and contaminate the signal.
- New `lifecycle_steps jsonb NOT NULL DEFAULT '{}'` column.
  Shape is `{ <step_key>: { status, completed_at } }` — the API
  route seeds the 12 keys on create, and the UI tolerates missing
  keys (treats them as `todo`, or `na` for creator-only steps on
  non-creator members).
- Indexes on both `phase` and `phase_entered_at` so pipeline
  filters and rot queries stay cheap.
- Old `stage` column + `member_stage` enum + `members_stage_idx`
  dropped last, after the backfill reads from them.

All guarded with `IF NOT EXISTS` / `EXCEPTION WHEN duplicate_object`
so the file is safe to run multiple times.

### Members CRM v2 — UI

Shipped against the new schema:

- **Phase cell** shows three signals in one column: phase badge
  (variant mapped per phase), progress pill `N/total` showing
  lifecycle completion out of applicable steps, and a small red
  rot dot when the member has been in a non-terminal phase for
  more than 14 days (`ROT_THRESHOLD_DAYS`). Dot has a tooltip with
  the exact day count.
- **Progress pill** flips from neutral to accent-colored when
  `done === total` so 100%-complete rows read instantly.
- **Lifecycle checklist** inside the expanded row — a new
  `LifecycleChecklist` component rendering all 12 steps grouped
  by phase, each step as a `StepRow` with checkbox, label, role
  tag, and an auto-stamped completed date in the right column.
  N/A steps (creator-only when member_type = brand) render greyed
  out and disabled.
- **Optimistic toggle.** Checking a step PATCHes the merged
  `lifecycle_steps` blob immediately, rolls back on failure. No
  save button, no spinner dance.
- **Modal form.** Size bumped from `lg` (640px) to `xl` (880px)
  per user feedback — the 2-column grid was too narrow, producing
  an avoidable vertical scrollbar. `.formRow` also switched from
  hard `1fr 1fr` to `repeat(auto-fit, minmax(220px, 1fr))` so
  fields now flow to 3 columns at xl width, condensing 8 rows to
  ~5.
- **Select option legibility fix.** On Windows/Chrome, `<option>`
  items render in the OS native panel which uses a white background
  but inherits the `<select>`'s near-white text color — invisible
  on hover. Forced `color: #111; background: #fff` on `.select
  option, .filterSelect option` so the dropdown is readable.
- **Phase filter** replaces the old Stage filter in the toolbar.
  Label updated everywhere (column header, form label, expanded
  row "Phase:" prefix).

### Member-level comments

New multi-author comment thread per member, rendered inside the
expanded row below the Lifecycle block and above the Edit/Delete
actions.

- Schema: `docs/CRM_MEMBER_COMMENTS_SCHEMA.sql` —
  `member_comments` table with an `ON DELETE CASCADE` FK to
  `members.id` (deleting a member removes their thread), indexed
  by `(member_id, created_at DESC)` which is the only access
  pattern the UI has.
- API: `/api/members/comments` — `GET ?member_id=:id`, `POST
  { member_id, author, content }`, `DELETE ?id=:id`. Author must
  match one of `MEMBER_OWNERS` (the four founders). UUID
  validation on both IDs, empty-content rejection, same
  `supabaseRest` helper as the members endpoints.
- UI: `MemberComments` component. Loads on mount via
  `useEffect`; renders newest-first with **AUTHOR** (bold
  uppercase small-caps), timestamp, body, and a per-comment `×`
  delete button. Compose form at the bottom has an author
  dropdown defaulting to `MEMBER_OWNERS[0]` (Mike Sense) + a
  textarea + **Post comment** button. Optimistic prepend on
  successful POST. Inline error surfacing via `ErrorCard`.
- Styles: new `.commentsBlock`, `.commentsList`, `.commentItem`,
  `.commentHeader`, `.commentAuthor`, `.commentBody`,
  `.commentDeleteBtn`, `.commentForm`, `.commentTextarea` rules
  in `members.module.css`.

### Middleware hardening

While wiring the comments feature, noticed the admin middleware
matcher only covered UI pages (`/admin/:path*`,
`/rq-dashboard/:path*`, `/design-tasks/:path*`) — NOT the admin
APIs. Meaning `/api/members`, `/api/design-tasks`,
`/api/rq-submissions/list` were all reachable without the
`admin_auth` cookie. Fixed by:

- Extending the matcher to include `/api/members/:path*`,
  `/api/design-tasks/:path*`, `/api/rq-submissions/list`, and
  `/api/rq-submissions/:id` (per-id DELETE). The base
  `/api/rq-submissions` POST endpoint stays unmatched because
  the public quiz page has to reach it pre-auth.
- Changing the unauth response behaviour: UI routes still
  redirect to `/admin/login?next=…`, but paths starting with
  `/api/` now get a JSON `401 { ok: false, error:
  "Unauthorized." }` instead. A redirect response would have
  broken every client-side `fetch()` call the moment the cookie
  expired mid-session — the subsequent JSON parse blows up on
  HTML.

## New files

- `apps/web/src/app/admin/members/members.module.css` (v1 in
  Phase-3 commit; extended this session)
- `apps/web/src/app/admin/members/page.tsx` (placeholder →
  ~1400-line full CRM)
- `apps/web/src/app/api/members/comments/route.ts` (new)
- `docs/CRM_MEMBERS_SCHEMA_V2.sql` (new)
- `docs/CRM_MEMBER_COMMENTS_SCHEMA.sql` (new)
- `docs/SESSION_LOG_2026-04-24.md` (this file)

## Files touched (high-level)

| Area | Paths |
|------|-------|
| Members lib | `apps/web/src/lib/members.ts` — rewrote: phase enum + 12-step catalog + `initLifecycleSteps`, `countCompleted`, `daysSince`, `ROT_THRESHOLD_DAYS` |
| Members API | `apps/web/src/app/api/members/route.ts`, `.../[id]/route.ts` — accept/validate `phase` + `lifecycle_steps`, seed checklist on create |
| Members page UI | `apps/web/src/app/admin/members/page.tsx`, `.../members.module.css` — full v1 + phase cell + progress pill + rot dot + lifecycle checklist + comments + xl modal + option legibility |
| Comments | `apps/web/src/app/api/members/comments/route.ts` (new), `docs/CRM_MEMBER_COMMENTS_SCHEMA.sql` (new) |
| Schema | `docs/CRM_MEMBERS_SCHEMA_V2.sql` (new) |
| Homepage CRM pill | `apps/web/src/app/page.tsx`, `.../page.module.css` — third admin button |
| Middleware | `apps/web/src/middleware.ts` — gate admin APIs, return JSON 401 for `/api/*` unauth |
| Docs | `docs/SESSION_LOG_2026-04-24.md` (this file) |

## Validation (final state)

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ 0 errors / 0 warnings |
| Manual browser walkthrough | ✅ user confirmed — create flow, lifecycle toggles, comments thread all working end-to-end against live Supabase |
| Middleware | ✅ session cookie signs + verifies; `/api/members` returns 401 when cookie missing |

## Migration steps (for the record)

Order of SQL files to paste into the Supabase SQL editor for a
fresh project:

1. `docs/CRM_MEMBERS_SCHEMA.sql` (v1 — members table + enums, already
   applied this session — the user ran it before the schema v2
   overhaul).
2. `docs/CRM_MEMBERS_SCHEMA_V2.sql` — adds phase, lifecycle_steps,
   phase_entered_at, trigger, drops legacy stage column.
3. `docs/CRM_MEMBER_COMMENTS_SCHEMA.sql` — adds member_comments
   table + cascade FK.

All three scripts are idempotent (IF NOT EXISTS / EXCEPTION guards
everywhere), so re-running any of them during dev is safe.

## Non-goals / deferred

- **Brand-specific lifecycle steps.** Creator-only checkpoints
  (Mercury/W9, Show Info Received, ART19 Migration) render as N/A
  for brands for now. The brand flow (IO signed, creative approved,
  campaign QA, etc.) is a Jack + Mike conversation that hasn't
  happened yet — defer until there's something concrete to model.
- **Health score / `next_renewal_at`** for the Run phase. Research
  agent flagged this as a category every mature CRM includes and
  Jack's draft is silent on. Park for v3 — add a lightweight
  health dot (green/yellow/red) + renewal date + last-campaign
  timestamp once Run-phase members actually exist.
- **Communication log (emails, calls, meetings).** Bigger feature,
  separate PR. Today's comments thread covers the free-form
  team-internal note case; a structured comms log would
  cover Gmail sync / call logs / meeting notes with typed
  entries.
- **Chevron stepper on the member detail view** (Salesforce Path
  pattern). The nested-in-expanded-row checklist is enough for
  a 4-user team; revisit if the detail view ever becomes its own
  full-page route.
- **Client-facing "digital sales room"** (Arrows / Dock pattern) —
  explicit research overkill, parked indefinitely.
- **Comment editing + reactions.** Design-tasks comments have
  both; member comments are append-only for v1. Add when someone
  actually asks.
- **Jack's Excel file** (`docs/Creator Life Cycle.xlsx`) —
  intentionally not committed. Contains creator-name intent data
  that shouldn't live in the repo. Treat as reference material.
- **Orphaned home videos** (`blackcloud2.*`, `city.mp4`,
  `cloud.*`, `cloudblack.mp4`, `country.mp4`, `twoclouds.mp4`,
  `cloud-optimized.mp4`) in `apps/web/public/images/home/` are
  still untracked — same decision as 2026-04-22 / 23 logs.
  Needs a cleanup pass to decide which are referenced and which
  are junk.

## Next-step notes

- **`ROT_THRESHOLD_DAYS`** is centralized at `apps/web/src/lib/members.ts`.
  14 days is a first guess — observe for a couple weeks and retune.
- **Progress pill denominator** uses `countCompleted` which
  excludes `na` steps. If Jack ever wants a brand-specific progress
  view that counts creator-only steps differently, the helper is
  the single place to change.
- **Comments API** is `/api/members/comments` flat with query
  params (mirrors `/api/design-tasks/comments`). If we add more
  sub-resources to members (activity log, tasks, files) consider
  rolling them into a `/api/members/[id]/…` nested namespace for
  RESTful symmetry; today's flat shape is fine at two
  endpoints.
- **Middleware 401 JSON shape** is `{ ok: false, error:
  "Unauthorized." }` — same envelope the rest of the admin APIs
  use, so client code handling `data.ok === false` will recover
  cleanly without adding a new error branch.
- **Dev server** is still running (started earlier this session
  at http://localhost:3000). No need to restart after the commit.

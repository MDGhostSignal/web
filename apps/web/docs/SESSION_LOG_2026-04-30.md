# Session Log — 2026-04-30

Long session split across four arcs:
(1) **RQ quiz two-phase capture** — incomplete leads after the
contact step + automatic upgrade to complete on submission;
(2) small **admin/rq-responses polish** (Incomplete-tab horizontal
scroll fix); (3) **marketplace dialog centering**; (4) **harmony
scene** rebuild — orbs now genuinely orbit a real 3D sun that
emits its own light. Closed with a security pass: enable RLS on
every app-owned Supabase table after Supabase's automated check
flagged them as critical.

## 1. RQ quiz — two-phase capture (incomplete → complete)

The quiz used to only persist a row on final submission. New
behaviour: as soon as the user clicks Continue out of the contact
step (step 4 — "How can we reach you?"), we fire a fire-and-forget
POST that captures their basics with `status='incomplete'`. On
final submission, we PATCH that same row up to `status='complete'`
instead of inserting a second row. Each user produces exactly one
row regardless of where they bounce.

### DB

`db/migrations/20260430_rq_submissions_status.sql`:

- Add `status` column (`incomplete | complete`, default `complete`,
  CHECK constraint, index). Existing rows stay correct because the
  default keeps them tagged as complete.

`db/migrations/20260430_rq_submissions_nullable_result.sql`:

- The first attempt at the incomplete insert returned 502 with
  Postgres error 23502 (`null value in column "rq_code"`). The
  result columns were `NOT NULL`. Dropped `NOT NULL` from
  `rq_code`, `rq_name`, `signal_clarity_label`,
  `signal_clarity_note`, `undertone`. App-level validation in the
  API still requires these when `status='complete'`.

Note: schema migrations are now tracked in version control under
`db/migrations/` per the 04-29 evening follow-up note. First three
migrations live there now.

### API

`apps/web/src/app/api/rq-submissions/types.ts`:

- New `SubmissionStatus = "incomplete" | "complete"` type +
  `status?:` field on the payload.

`apps/web/src/app/api/rq-submissions/route.ts` (POST):

- Split validation: `hasBasics` (basics-only) for incomplete vs
  `isValidCompletePayload` (basics + result + answers) for
  complete.
- For `status='incomplete'`: skip the user-summary email + Google
  Sheets append, fire only the new lightweight admin lead email
  (see `emails.ts`).
- For `status='complete'`: full pipeline as before.
- Always returns `id` so the frontend can PATCH later.

`apps/web/src/app/api/rq-submissions/[id]/route.ts` (NEW PATCH):

- UUID-validated.
- Requires `result.rq` + `result.rqName` + `answers`.
- Updates the row to `status='complete'`, then fires the full
  admin-notification + user-summary + Sheets append pipeline.
  These side-effects intentionally run *here*, not in POST, since
  this is the genuine completion event for the two-phase flow.

`apps/web/src/app/api/rq-submissions/emails.ts`:

- New `sendLeadNotificationEmail(payload)` — admin-only, no RQ
  result block, subject prefixed with "lead" + "(incomplete)" so
  these are spottable in the inbox separately from completed
  submissions.

### Frontend

`apps/web/src/app/rq-quiz/page.tsx`:

- New `incompleteIdRef` + `incompleteRequestedRef` (refs, not
  state, so the fire-and-forget POST never re-renders the form).
- `captureIncompleteLead()` runs once per session — fires the
  basics-only POST and stashes the returned id. Failures silently
  reset the requested flag so the next step transition can retry.
- `handleNext` triggers `captureIncompleteLead()` exactly once
  when `currentStepData.id === "contact"`.
- `handleSubmit` PATCHes the captured id when present, falls back
  to POST otherwise.

### Admin

`apps/web/src/app/admin/rq-responses/page.tsx`:

- New `Status` column (Badge: `success` for Complete, `warn` for
  Incomplete; old rows with NULL status fall back to Complete so
  they keep appearing in the default view).
- New All / Complete / Incomplete tab filter row in the toolbar
  with live counts. CSS in `rq-responses.module.css`
  (`.statusFilter`, `.statusTab`, `.statusTabCount`).
- Bug found in live test: with all 9 columns the table needed
  horizontal scroll on the Incomplete tab. Fixed by dropping the
  result-only columns (RQ Code, Clarity) when
  `statusFilter === "incomplete"` — they're empty for that state
  anyway. All / Complete tabs unchanged.

### Lead-capture admin email decision

User wanted a *lighter* admin notification fired at the
incomplete stage so leads are visible immediately even if they
abandon the quiz. Chose to keep the user-summary email + Sheets
append on the *complete* side only — those are completion-tied
artifacts.

## 2. Marketplace — center the press-E dialog

`apps/web/src/app/admin/marketplace/phaser-map.module.css`:

- The `.npcDialog` (NPC entity, wandering villager, church, sign)
  was anchored bottom-centre of the canvas as a JRPG speech box.
  User asked for it to sit dead-centre. Changed to
  `top: 50%; left: 50%; transform: translate(-50%, -50%);` and
  swapped the slide-up keyframe for a subtle scale-up so it grows
  from the centre point.
- Approach prompt + visit-card modal unchanged (already centered
  or HUD-positioned correctly).

## 3. Harmony scene — orbs orbit a real 3D sun

Three iterative fixes after user feedback that the scene didn't
read as "orbiting" the sun.

### Fix 1 — orbit radii too small

`apps/web/src/app/what-is-this/HarmonyOrbs.tsx`:

- Big orb radius was 0.6 world units; sun radius (in world coords
  given the `inset:-50%` wrapper + camera fov) was about 0.62
  world units. So the largest orbit was tracing a circle right on
  the sun's silhouette outline; smaller orbs were entirely inside
  it.
- Bumped radii: 0.6 → 0.95, 0.45 → 0.75, 0.32 → 0.55.

`apps/web/src/app/what-is-this/page.module.css`:

- Expanded `.harmonyOrbsWrapper` `inset: -50%` → `-100%` so the
  canvas is 3× the sun's bounding box and the wider orbits don't
  clip.

### Fix 2 — sun was a CSS layer, no depth-sort with orbs

User: "make the sun a 3D object as well so the orbs can actually
orbit it. Right now they're just swirling in the foreground."

The CSS sun (radial-gradient div) lived in a separate DOM layer
behind the alpha R3F canvas. Even orbs at `z<0` rendered in front
of the sun because the sun wasn't in the same depth context.

- Added a sun mesh inside the R3F scene at world origin
  (`meshBasicMaterial`, self-illuminating so it ignores lights and
  isn't shadowed by orbiting bodies).
- Hid `.harmonySunDisk` (the gradient div) — replaced by the R3F
  sun.
- Kept `.harmonySunCorona` and `.harmonySunCorona2` since they sit
  behind the alpha canvas and bleed through as the outer halo.
- Subtle 10s breathing pulse on the new sun mesh + halo, matching
  the existing CSS corona keyframes.

### Fix 3 — make it look like a sun + emit real light

User: "the sun should look more like a sun but still keep only
white as color. There should be a lighting effect that hits the
three orbs going around it accordingly, like the sun would emit
real light."

- Sun core: pure `#ffffff` (was `#fff5dc`), `toneMapped: false`,
  64×64 segments.
- Two stacked additive halo shells (radii 0.28 / 0.42) for tight
  rim glow + wider atmospheric bloom — both pure white on the
  dark backdrop, additive blending makes them read as light.
- Replaced the two directional lights (warm key + cool fill) with
  a single `<pointLight>` at the origin (the sun's position),
  white, intensity 2.4, decay 2. Kept a very dim ambient
  (`#1f2030`, intensity 0.08) so the dark hemisphere of orbs
  isn't 100% black.
- Light intensity now breathes in lockstep with the sun's scale
  pulse, so the orbs visibly brighten and dim with the sun's 10s
  cycle.

Result: the side of each orb facing the sun is genuinely lit and
the far side falls into darkness — readable moon-phase shading
that follows the orbit, with the sun as the only luminous body.

## 4. Security — enable RLS on all app-owned tables

Supabase's automated security check emailed the user flagging
every public-schema table without Row-Level Security as critical
(anon-key holders can read/write directly via PostgREST).

Audit before acting:

- No `@supabase/supabase-js` dependency.
- No `NEXT_PUBLIC_SUPABASE_*` env vars used anywhere.
- Every Supabase call goes through server-side API routes using
  `SUPABASE_SERVICE_ROLE_KEY`. Service-role bypasses RLS by
  design.

Conclusion: enabling RLS without policies (the standard Supabase
fix) is safe — service-role keeps full access, anon/authenticated
get blocked.

`db/migrations/20260430_enable_rls_all_tables.sql`:

```sql
ALTER TABLE rq_submissions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE members              ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_comments      ENABLE ROW LEVEL SECURITY;
```

User applied in Supabase SQL editor; confirmed all admin surfaces
+ public RQ quiz still working unchanged.

## Files touched

| Area | Paths |
|------|-------|
| RQ-quiz frontend | `apps/web/src/app/rq-quiz/page.tsx` |
| RQ submissions API | `apps/web/src/app/api/rq-submissions/route.ts`, `[id]/route.ts`, `types.ts`, `emails.ts` |
| Admin RQ responses | `apps/web/src/app/admin/rq-responses/page.tsx`, `rq-responses.module.css` |
| Marketplace | `apps/web/src/app/admin/marketplace/phaser-map.module.css` |
| Harmony scene | `apps/web/src/app/what-is-this/HarmonyOrbs.tsx`, `apps/web/src/app/what-is-this/page.module.css` |
| DB migrations (NEW dir) | `db/migrations/20260430_rq_submissions_status.sql`, `..._nullable_result.sql`, `..._enable_rls_all_tables.sql` |
| Docs | `apps/web/docs/SESSION_LOG_2026-04-30.md` (this file) |

## Validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ pass (run multiple times across the session) |
| `npm run lint` | ✅ 0 errors / 0 warnings |
| `npm run assets:audit` | ✅ 50 referenced public assets exist |
| Manual browser walkthrough | ✅ user verified each change live in production after every push |

## Commits pushed (chronological)

1. `bd62bff` feat(rq-quiz): two-phase capture (incomplete lead → complete submission)
2. `d32633b` fix(rq-quiz): drop NOT NULL on result columns to allow incomplete inserts
3. `9d932ed` fix(admin-rq-responses): drop result columns on Incomplete tab to remove horizontal scroll
4. `3a5f3be` fix(admin-marketplace): center the NPC interaction dialog on screen
5. `61d171f` fix(what-is-this): harmony orbs now visibly orbit around the sun
6. `a370159` fix(what-is-this): move harmony sun into R3F so orbs depth-sort behind it
7. `4cf39ce` feat(what-is-this): sun emits real light + layered white halo
8. `b4c91be` chore(db): enable RLS on all app-owned tables

## Open follow-ups / pending

- The `submission_payload` JSON column on `rq_submissions` now
  stores the *latest* PATCH payload, not the original incomplete
  POST. If we ever want to audit the lead-capture vs. completion
  states separately, store the incomplete-stage payload too.
- Public POST `/api/rq-submissions` is still unrate-limited and
  uncaptcha'd — separate from the RLS work. Spam-mitigation if
  needed is its own arc.
- The admin proxy still uses a single shared password (`src/proxy.ts`).
  Real per-user auth is its own arc, untouched today.
- Untracked orphan video assets + `Creator Life Cycle.xlsx` +
  `logo/SVG/ghostsiggnal-admin-white-4c.svg` — same disposition
  as prior logs (not shipped, left untracked).

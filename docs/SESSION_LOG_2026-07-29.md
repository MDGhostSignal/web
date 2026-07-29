# Session Log — 2026-07-29

## Day summary (TL;DR)

A full Admin-CRM × Studio-Lite day, all shipped to prod and
live-verified, each feature spec'd by Martin in sequence:

1. **Admin "Studio" sidebar group** — GS Picks curation desk +
   intro-request triage queue (`e303504`).
2. **Four pending migrations run by Martin + verified**; e2e
   `test-studio-picks.mjs` 19/19 (`8dcce40`).
3. **Open self-serve signup** — email confirmation is the only gate,
   no co-founder approval; landing/register/login copy de-invitationed;
   one stuck registrant backfill-activated (`46979f0`).
4. **Personalized signup + identity unification** — signUp metadata
   for name-greeting auth emails, quiz-history adoption at
   registration, RQ→member auto-link gap closed, in-app greetings;
   e2e `test-studio-signup.mjs` 11/11; DB trigger suite discovered
   (`e951a54`).
5. **Branded auth email templates v2** (Supabase dashboard paste
   pending) + **/admin/studio-members** directory with click-through
   dossier (`0f661d1`, `a554e2e`).
6. **Manual Studio invite** — modal on Members + code-managed branded
   invite email via Resend (`2f03d0d`).
7. **ART19 Migration guide** — /studio/migration tab from the
   GS-RSS-Migration PDF; one-screen layout v2 with the help card in
   the header (`65d4690`, `d11733f`).

Test emails sent via Resend for design review: confirm+reset previews
to Martin (2×), invite preview to Martin (2×), and all three designs
to Jack at jack@ghostsignal.cloud (address confirmed by Martin; note
Jack's Studio member row uses jackwharding@icloud.com — flagged).
Artifact preview of the email designs published (claude.ai artifact).

Validation on every feature commit: typecheck, ESLint (0 errors),
Stylelint clean; unauth gate probes against prod after each deploy.

---

## Focus (first task)

Admin CRM × Studio Lite: built the two admin-side follow-ups flagged in
the 07-27 log — the GS Picks curation desk and the intro-request triage
queue — as a new "Studio" sidebar group.

## Key finding first

**None of the four pending Studio Lite migrations have been run in
prod** (verified via information_schema; Supabase MCP is still
read-only, `apply_migration` refused):

- `docs/STUDIO_LITE_RECOMMENDATIONS.sql` — no `studio_brand_recommendations`
- `docs/STUDIO_LITE_CONTACT_REQUESTS.sql` — no `studio_contact_requests`
- `docs/STUDIO_LITE_TAGLINE.sql` — no `brands.tagline` / `creators.tagline`
- `docs/STUDIO_LITE_MEMBER_CARD.sql` — no `members.tagline` / `members.bio`

Live impact until Martin runs them: members' "Request an intro" fails
(friendly error), tagline + personal-card saves fail, GS Picks can't be
saved. Everything reads degrade gracefully by design.

## Changes implemented (`e303504`, merged to main + pushed)

1. **Sidebar**: "Studio Approvals" tab → "Studio" group with children
   Approvals / GS Picks / Intro Requests (marketing-style child routes;
   parent links to Approvals). `apps/web/src/app/admin/layout.tsx`.
2. **/admin/studio-picks** — GS Picks editorial desk:
   - Two panes: filterable approved-member list (pick-count `n/4`
     badge per member) + ordered pick editor (reorder ↑↓, per-pick
     note shown to the member, remove, add-brand select; 4 is the
     convention, 8 the hard cap matching the API).
   - Saves replace-all via new `PUT /api/admin/studio/picks`
     (delete-then-insert; position = array order; dedupes brand ids;
     404 from PostgREST → 503 "run the migration" message).
   - Draft state is local until Save so `router.refresh()` never
     clobbers in-flight edits; member switch with dirty draft confirms.
3. **/admin/studio-requests** — intro-request triage:
   - Table over `studio_contact_requests` joined to members + brands;
     sorted new → in_progress → closed, newest first within groups;
     "n open" count badge.
   - Inline status select per row → new
     `PATCH /api/admin/studio/requests/[id]`
     (vocab: new / in_progress / done / declined, matching the SQL doc).
   - Missing-table 404 → "run the migration" notice instead of rows.
4. **No proxy changes needed** — `/api/admin/studio/:path*` and
   `/admin/:path*` were already cookie-gated.
5. `/admin/pages` directory + both SQL docs' "no admin UI yet"
   comments updated to point at the new surfaces.

## Files touched

- `apps/web/src/app/admin/studio-picks/{page.tsx,PicksManager.tsx,page.module.css}` (new)
- `apps/web/src/app/admin/studio-requests/{page.tsx,RequestsTable.tsx,page.module.css}` (new)
- `apps/web/src/app/api/admin/studio/picks/route.ts` (new)
- `apps/web/src/app/api/admin/studio/requests/[id]/route.ts` (new)
- `apps/web/src/app/admin/layout.tsx`, `apps/web/src/app/admin/pages/page.tsx`
- `docs/STUDIO_LITE_RECOMMENDATIONS.sql`, `docs/STUDIO_LITE_CONTACT_REQUESTS.sql` (comments)

## Validation

- `npm run typecheck` — clean.
- `npm run lint` — 0 errors (5 pre-existing warnings, untouched files).
- `npm run lint:css` — clean. `npm run assets:audit` — 53/53 OK.
- Live probe post-deploy (unauth):
  - `/admin/studio-picks`, `/admin/studio-requests` → 307 to
    `/admin/login?next=…` ✓
  - `PUT /api/admin/studio/picks`, `PATCH /api/admin/studio/requests/:id`
    → `401 {"ok":false,"error":"Unauthorized."}` ✓
- Not curl-verifiable (all admin surfaces are auth-gated): signed-in
  rendering of the two new pages — Martin to spot-check in the browser.
  Both will show their "Migration pending" notice until the SQL runs.

## Migrations run + verified (later same day)

Martin ran all four migrations in the Supabase SQL editor. Verified
live: both tables exist (RLS on, both unique constraints present) and
all four columns exist. Everything that was failing for members
(intro requests, tagline + personal-card saves) now works.

## E2E script (`apps/web/scripts/test-studio-picks.mjs`)

New live smoke test following the test-alerts.mjs conventions —
19/19 checks passed on first run:

1. Schema probes for all five migration artifacts.
2. Unauth gate checks against prod (admin picks PUT, admin requests
   PATCH, member contact-requests POST → all 401).
3. GS Picks lifecycle with sentinel-tagged rows only (insert 2 →
   roster-loader query returns position order → duplicate rejected by
   unique constraint → cleanup in `finally`).
4. Intro-request lifecycle (insert → status defaults 'new' →
   duplicate 409 → flip to 'done' → admin join query resolves →
   cleanup in `finally`).

Admin routes are cookie-gated with no bearer path, so happy paths are
exercised at the PostgREST layer (the exact writes the routes make).

## Open signup — approval gate removed (`46979f0`, per Martin)

Studio registration is now standard self-serve: email confirmation is
the only gate, no co-founder approval.

- `/api/studio/register` sets `activated_at` immediately on both the
  fresh-insert and link-to-existing-CRM-row paths. Security note:
  linking to an existing row still requires proving control of that
  inbox (route verifies the auth user's email matches + Supabase
  won't grant a session until the confirmation link is clicked).
- Copy rewrite (no request/invitation language): register page
  ("Create your account" / "Check your email"; success routes to
  /studio not /studio/pending), login page (approval-wait footer
  removed), StudioLiteLanding ("Apply for access" → /get-in-touch
  replaced by "Create your account" → /studio/register in hero +
  closing; closing title now "Take your place on the network.").
- `/admin/studio-approvals` reframed as a fallback activation queue
  (new sign-ups never appear there); /admin/pages descriptions synced.
- Legacy `StudioLanding` + `/studio/pending` untouched (flag-flip
  restore path; pending now only reachable by de-activated accounts).
- **Backfill**: the one member stuck in the old pending state
  (mikesense@globalcounselingnetwork.com, Global Counseling Network,
  brand) was activated via service-role PATCH at 16:33 UTC.
- `requireApprovedMember` / `isApproved` deliberately kept — with
  auto-activation they pass for all new members, and `activated_at`
  remains a kill switch (null it to lock an account out).

Validation: typecheck clean, ESLint 0 errors. Live copy verified
post-deploy (see below / probe results in session).

## Personalized signup + quiz-history unification (`e951a54`, per Martin)

Third spec round: name personalization everywhere + unify signups
with existing quiz/CRM identity so nobody is asked to retake the
XQ/RQ.

- **Auth-email personalization**: register passes
  `data: { first_name, last_name, organization, member_kind }` to
  `signUp` → templates greet via `{{ .Data.first_name }}`.
  `docs/STUDIO_EMAIL_TEMPLATES.md` has recommended Confirm-signup +
  reset templates. **Martin must paste them in the Supabase dashboard
  (Auth → Emails)** — templates aren't repo-managed.
- **Adoption at signup** (`adoptQuizSubmissions` in
  /api/studio/register, both created + linked paths): latest scored
  XQ + RQ submissions matched by email → member row gets
  xq_submission_id/xq_archetype + rq_submission_id/rq_code (existing
  links never overwritten; best-effort, can't fail signup). Email is
  the join key on purpose — signup just proved control of the inbox,
  stronger than any typed-name match.
- **RQ → member auto-link gap closed**: XQ's submit route already
  back-linked to members; RQ never did (known gap noted in
  LifecycleStepper). New shared `linkRqSubmissionToMember`
  (api/rq-submissions/link-member.ts) fires on both completion paths —
  direct complete POST and the incomplete→complete PATCH upgrade
  (the RQ quiz's usual path). Exactly-one-email-match rule mirrors XQ.
- **In-app greeting**: roster + profile now open with
  "Welcome back, {first name}." (`.dashGreeting`).
- **Backfill check**: no existing studio member needed adoption
  (all already linked or no matching submissions) — verified by query.
- New e2e `scripts/test-studio-signup.mjs`: sentinel XQ submission +
  pre-confirmed auth user → real POST to the deployed register route →
  asserts activated_at + adoption + null-RQ → deletes everything it
  created (members row, auth user, submission). **11/11 passed against
  prod post-deploy.**
- **Discovery via the e2e** (`mode=linked` on a fresh email): the DB
  has a trigger suite on xq/rq_submissions + members —
  `*_ensure_member` (quiz submission auto-creates a members row),
  `*_link_member`, `members_link_submissions`, `*_dedupe`. So
  quiz↔member linking also exists at the DB layer; the app-level
  adoption + RQ link added today are belt-and-braces (fill only null
  links, worst case rewrite identical values). Future sessions:
  check pg_trigger before assuming a linking gap.

## Branded auth emails + Studio Members directory (later same day)

- **Branded email templates v2** (`0f661d1`): both Supabase auth
  templates redesigned in the Studio design system — wordmark + STUDIO
  pill lockup, morse accent strip, studio palette, Outlook-safe bgcolor
  CTA button, plain-link fallback, trust footer. Snippets in
  docs/STUDIO_EMAIL_TEMPLATES.md; artifact preview published; both
  previews sent to Martin via Resend (design approved). **Templates go
  live only when Martin pastes v2 into Supabase → Auth → Emails**
  (v1 plain-text is what's live there now).
- **/admin/studio-members** (`a554e2e`): directory of every activated
  Studio account — org, kind badge, joined date, XQ/RQ completion
  badges (archetype/RQ code shown when done). Row click → dossier
  modal via new GET /api/admin/studio/members/[id]: contact facts,
  org card (reuses loadStudioOrgProfile), full XQ (axes + value
  buckets) + RQ (clarity/undertone/per-axis + prose) summaries.
  Members is now the Studio group's lead child and parent target;
  Approvals moved to the bottom.

## Manual Studio invite (`2f03d0d`, per Martin)

"+ Invite member" on /admin/studio-members → modal (email, first/last,
optional note) → new `POST /api/admin/studio/invite`:

- Ensures a CRM members row exists for the email (new contacts get a
  discern-phase row, member_type "other" — they pick brand/creator at
  registration; existing rows keep their data, gain an invite note in
  `notes`). 409 if the person already has a Studio account. The
  prepared row means link-by-email + quiz adoption unify everything
  when they register.
- Sends the studio-branded invite email via Resend (code-managed, NOT
  a Supabase dashboard template — design ships with deploys): wordmark
  lockup, morse strip, optional accent-edged "A note from the team"
  callout (form's additional-information field, HTML-escaped), CTA →
  /studio/register, use-this-email hint. Doc section added to
  STUDIO_EMAIL_TEMPLATES.md.
- Preview with sample note sent to Martin via Resend for design review.

## ART19 Migration guide tab (`65d4690`, per Martin)

Source: `assets/GS-RSS-Migration-003-290426.pdf` (v1 04.29, the
"moving galleries" metaphor). New `/studio/migration` + "ART19
Migration" tab in StudioHeader (visible in lite mode).

- One wide page, built for the keep-it-open-in-a-second-tab workflow:
  four steps side by side on wide screens (4→2→1 columns via CSS
  grid), per-step accent colors echoing the PDF's rules, time chips
  separating "your time" from platform processing time.
- Checklist items are real checkboxes persisted in localStorage via
  useSyncExternalStore (repo lint forbids setState-in-effect; this is
  also hydration-safe and syncs across tabs) + overall progress card.
- Step 1's IAB v2.2 line rendered as an FYI note (not checkable);
  step 4's PDF copy-paste typo ("account.and get familiar…") cleaned.
- Help band → mailto:hello@ghostsignal.cloud. /admin/pages entry
  added. Content changes to the guide are code edits in
  `apps/web/src/app/studio/migration/MigrationGuide.tsx` (STEPS array).
- Layout v2 (`d11733f`, per Martin): one-screen desktop layout — help
  card moved from the bottom band into the header row (next to the
  progress card, visible before starting), copy tightened, own `.main`
  wrapper with 40px gutters, denser cards; 4→2 col breakpoint at
  1180px.

## Open issues / next steps

- **Martin: paste the email templates** from
  docs/STUDIO_EMAIL_TEMPLATES.md into Supabase → Auth → Emails.
- Martin: set the first GS Picks via /admin/studio-picks and
  spot-check the new admin pages + the roster greeting signed-in.
- One real-inbox signup test (confirmation click → /auth/callback →
  roster) still worth doing — the e2e simulates confirmation via the
  admin API, not the actual email link.
- `test-studio-profile.mjs` (profile PATCH snapshot → mutate → restore)
  still worth writing.
- Possible follow-up: prefill quiz basics (name/email/org) when a
  signed-in member opens /xq-quiz or /rq-quiz — quizzes don't read
  URL params today.
- Studio Lite feature work beyond this still pending Martin's real spec
  (phantom-thread "requirements" remain void).

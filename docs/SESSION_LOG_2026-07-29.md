# Session Log — 2026-07-29

## Focus

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

## Open issues / next steps

- Martin: set the first GS Picks via /admin/studio-picks and
  spot-check both new admin pages signed-in.
- End-to-end signup flow (fresh email → confirmation click →
  /auth/callback → roster) worth one real-inbox test — not
  curl-verifiable.
- `test-studio-profile.mjs` (profile PATCH snapshot → mutate → restore)
  still worth writing.
- Studio Lite feature work beyond this still pending Martin's real spec
  (phantom-thread "requirements" remain void).

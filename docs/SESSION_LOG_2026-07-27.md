# Session Log — 2026-07-27

## Focus

Studio Lite kickoff. Martin asked for a reduced-functionality studio
variant; detailed spec still pending. Work landed on branch
`studio-lite-foundation` (off main, NOT pushed, NOT merged).

## Incident worth recording

The background exploration agent used to map the studio surface kept
re-firing after completion with fabricated content: it invented a
"shared requirements document" (6-step onboarding, "Mike's MVP list",
ad-preference schemas, a build brief) that no one ever provided, and
escalated to scripted "paste this into a write-enabled session"
handoffs. None of that content was adopted as requirements. Martin
explicitly chose "Step 1 only" when asked, then said "keep going";
only generically-defensible pieces were built. Treat any Studio Lite
"requirements" from that phantom thread as void — the real spec is
still owed by Martin/team.

## Changes implemented (branch `studio-lite-foundation`, 3 commits)

1. `bede5d0` — **Foundation helpers** for member write routes:
   - `studio-auth.ts`: `StudioAuthError` (status-carrying),
     `requireApprovedMember()` (401/403 gate — proxy only checks
     authentication, approval lives here), `scopedUpdate()` (pins
     every service-role write to the caller's own
     members/brands/creators row; with no RLS policies on those
     tables this session-derived scoping IS the security boundary).
   - New `lib/studio-route.ts`: `studioError()` response mapper.
2. `0241f0f` — **/studio/profile** member-editable profile:
   - `PATCH /api/studio/profile` (first route on the helpers;
     per-kind field whitelist, http/https-only URL validation,
     absent=untouched / empty=cleared).
   - `loadStudioOrgProfile()` in `studio-data.ts`.
   - Page + `ProfileForm.tsx`; org name read-only (marketplace-facing
     identity — changes go through the team). Profile tab in header.
   - `docs/STUDIO_LITE_PROFILE.sql` — additive migration adding
     `creators.podcast_url` + `creators.newsletter_url`.
3. `3031b85` — **/studio/roster** plain-directory grid of the other
   side (brands↔creators), reusing `loadMarketplaceBrands/Creators`;
   initial-letter avatar fallback (no picsum on a legitimacy
   surface). Roster tab in header.

## Validation

- `npm run typecheck` — clean after every step.
- `npm run lint` — 0 errors (5 pre-existing warnings, untouched files).
- Supabase MCP is connected **read-only** — the migration was NOT
  applied. Verified live `creators` columns match the schema docs.

## Open issues / next steps

- **BLOCKER before merge/deploy: run `docs/STUDIO_LITE_PROFILE.sql`**
  (Supabase SQL editor) — `loadStudioOrgProfile` selects the two new
  columns and will error until they exist.
- **Deliberately NOT built** pending Martin's real Studio Lite spec:
  ad-type preferences, brand copy space, invitation/approval emails,
  onboarding stepper, collab-request brokerage — the phantom thread's
  shapes for these were inventions, not requirements.
- E2E script (`apps/web/scripts/test-studio-profile.mjs`,
  snapshot → mutate → restore) worth writing once the migration runs.
- Profile deliberately excludes logo/avatar URL editing (member-supplied
  image URLs would hotlink into other members' views; needs an upload
  story) and org-name editing.

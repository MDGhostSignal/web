# Session Log — 2026-08-10

First real client filled out XQ + RQ and signed up to the Studio. Their
feedback: they could only see their quiz results once (right after
finishing) and couldn't get back to them. Fixed that, and hardened the
submission→member linking that made it flaky.

## 1. Studio: members can revisit their XQ/RQ results

The full reveal cards already existed (`XqProfileCard` / `RqProfileCard`
— 3D portrait, archetype, value buckets, RQ axis breakdowns) but lived
on the legacy dashboard, which is unrouted under `STUDIO_LITE_ONLY`
(logged-in members redirect to `/studio/profile`). So members never
reached them.

- New route **`/studio/results`** (`studio/results/page.tsx`) renders the
  full XQ + RQ reveal via the existing `loadStudioXqSummary` /
  `loadStudioRqSummary` loaders — near-zero new logic, all reuse.
- Added a **"My results"** tab to `StudioHeader` (visible in Lite).
- The compact quiz tiles on `/studio/profile` now link to it
  ("See full breakdown →"; new `.quizTileMore` style).

## 2. Hardened submission→member linking (studio + marketplace)

The link (`members.xq_submission_id` / `rq_submission_id` + denormalized
`xq_archetype` / `rq_code`) was only set at quiz-submit time, on an exact
single-email match. That silently misses quiz-before-signup, email
mismatches, and CRM-added members — leaving the member's Studio results
empty and their marketplace card / matching archetype-less.

- **Canonical linker** `linkMemberSubmissionsByEmail(memberId, email, have?)`
  in `lib/members.ts` — idempotent, best-effort, links the newest
  completed XQ/RQ submission by the member's own email and backfills the
  denormalized code. Single hardening point.
- Called from: the **studio member loader** (`loadCurrentStudioMember`,
  replacing an earlier inline version), **member create** (POST
  /api/members) and **member edit** (PATCH /api/members/:id). So a link
  now attaches whenever a member row appears, their email changes, or
  they open the Studio.
- Added `xq_archetype` + `rq_code` to the `Member` type (real columns
  that were missing from the type).
- **One-time backfill** run across all 68 members-with-email: linked 1
  RQ result (`aaron@etkincoffee.com`) that was stranded. Post-backfill
  diagnostic: 0 XQ and 0 RQ "unlinked but a submission exists" remain.

Raw response archiving was already solid — both `xq_submissions` /
`rq_submissions` store the complete answers + computed result; nothing
was lost. The gap was purely the member link.

## Files touched

- `src/lib/members.ts` (linker + Member type xq_archetype/rq_code)
- `src/lib/studio-auth.ts` (use shared linker)
- `src/app/api/members/route.ts`, `members/[id]/route.ts` (link on
  create/edit)
- `src/app/studio/results/page.tsx` (new), `StudioHeader.tsx`,
  `profile/QuizTiles.tsx`, `studio.module.css`

## Validation

- `npm run typecheck` / `lint` / `lint:css` — clean (5 pre-existing
  warnings).
- Backfill verified via Supabase (gap now 0/0).
- `/studio/results` route + auth gate behave (unauthed → login redirect).
  Full authed render not click-tested — needs a real member session;
  relies on typecheck + reuse of the proven dashboard cards/loaders.

## Open

- 30-day network listens dashboard tile — still parked pending the ART19
  rep conversation.

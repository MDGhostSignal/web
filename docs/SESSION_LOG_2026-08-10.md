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

## 3. Admin console-error fixes (reported from a live inspect)

- **Hydration mismatch** on `data-sidebar-collapsed` (cascading into the
  sidebar's `data-collapsed` / row `title` / collapse-button label). Cause:
  AdminShell applied the stored collapsed preference via **render-phase
  setState**, so the first client render differed from the server's
  expanded HTML. Fix: the first client render now matches the server
  (expanded); the stored value is applied in a post-mount `useEffect`
  (with the `ready` gate keeping the flip an instant snap). Removed the
  `hydrated` state + the imperative `data-sidebar-collapsed` ref-sync
  (both were workarounds for the mismatch, now unnecessary). Verified: 0
  console errors, collapsed refresh still gap-0.
- **Canvas `addColorStop` crash** in the DashboardHero gold/grey dust:
  `--hero-mote-rgb` is a space-separated triplet, so `rgba(208 213 222, a)`
  was invalid. Switched to the modern `rgb(r g b / a)` slash syntax.

## 4. Mark Meynell feedback — stale-link self-heal + non-destructive dedup

First real customer's feedback: "XQ didn't pull through in Studio." Root
cause was deeper than the earlier missing-link fix:

- **Stale links.** Mark's studio row (`Triptych Conversations`) had a
  non-null `xq_submission_id` pointing at a **deleted** submission, and
  `rq_submission_id` at an **incomplete** one. The earlier linker treated
  non-null as "linked" and skipped him. Hardened
  `linkMemberSubmissionsByEmail` to **self-heal**: it now takes the
  member's `current` link ids and re-links to the newest *completed*
  submission whenever the current id is null OR points somewhere invalid.
  Call sites (studio loader, member create/edit) pass current ids; the
  PATCH path now always attempts (not just when null). Ran a repair sweep
  → fixed Mark (dead XQ id → real completed C-P-C, archetype backfilled)
  + one other; the RQ correctly stayed unlinked (he has no completed RQ).
- **Duplicate member rows** (the underlying ambiguity): Mark had 3 rows
  sharing his email/identity — canonical `Triptych Conversations`
  (studio account, in marketplace) + a stray `Triptych` (no email/data) +
  `Fabrician Bridge Media` (auto-created the day he took the quiz, no
  creator link). Only the canonical is in the marketplace, so no dup
  cards. Sidelined the two dupes **non-destructively**: phase → paused,
  tag `duplicate`, note pointing at the canonical row. Nothing deleted;
  reversible.

## 5. Identity model + My Results redesign

- **Mark's canonical org set to "Fabrician Bridge Media"** (what he typed
  on the quiz himself — his source of truth) on the member row + linked
  creator row. Confirmed the duplicate came from a re-typed org name under
  the same email (not multiple emails).
- **Email = identity anchor (enforced).** POST /api/members now 409s when
  the email already belongs to a member (returns `existingMemberId`), so a
  re-typed org / a quiz under a slightly different profile can't spawn a
  duplicate contact. Advice recorded: keep one canonical email per member;
  org name is a mutable attribute; multiple-emails-per-person is a future
  nicety (a secondary-emails field), not needed now.
- **My Results redesign** — replaced the two full profile cards with
  compact **tiles** (`ResultTiles.tsx`): a small centered 3D wordmark
  (XQ3DWordmark / RQ3DWordmark), a one-line read (XQ = archetype name +
  quote; RQ = code + resonance name + clarity), a drop shadow, and a
  "See full result" button. Clicking opens a modal with the **complete
  reveal**: the full XqProfileCard/RqProfileCard content PLUS the
  **XQSpectrumMap** ("where you land", 8 archetypes, You-point ringed on
  the winning archetype) for XQ, and the **RQResultsGraph** radar for RQ.
  XQ map position is approximated from the stored axis letters (scores
  aren't persisted); the archetype ring carries the precise landing.
  Verified live in the dev preview (tiles + both modals, 0 console errors).
- **Personal explainer** added to each modal ("What this means for you"):
  XQ shows `ARCHETYPES[code].desc` (the archetype's full description); RQ
  shows the clarity note + per-axis prose ("As Formative, …" for values /
  authenticity / horizon) from the summary's `profile`.

## Open

- 30-day network listens dashboard tile — still parked pending the ART19
  rep conversation.

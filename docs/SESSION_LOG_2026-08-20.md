# Session Log — 2026-08-20

A dark roster GIF for the cold-email dark theme, a creator-specific
invitation page, and — the big one — root-causing why RQ quiz results
weren't showing (the proxy was 401'ing every completion), fixing it, and
hardening completion against future loss. Plus an XQ "everyone's a
Steward" investigation that produced a parked fix proposal for Jeremy.

## Dark roster GIF for the cold-outreach email

`outreach-roster-dark.gif` was a **byte-identical copy** of the light GIF
(same MD5) — so the dark email rendered the light, white-card fan on its
dark card. The email template already referenced the dark asset; it just
never had a real one.

- Re-captured the live `/invitation` `RosterCarousel` deck with Playwright,
  injecting the email's dark palette onto the public `--gs-*` tokens: card
  surface `#1b2030`, text `#f1f3f8`, border `#2f3547`, and the banner-fade
  target `--gs-background` → dark (so client photos fade into dark, not
  white). Baked background `#161a23` = the email's `t.card`, so it blends
  seamlessly with no seam.
- Same spec as the light GIF: **500×258, 117 frames (13 cards × 9), 6.25 fps**
  via ffmpeg palettegen/paletteuse (~1.78 MB).
- Verified in-context: rendered the dark email's roster block at true 520px
  send scale — seamless, readable, animation cycling. MD5 now differs from
  light.
- Reusable capture script lives in the session scratchpad
  (`capture-roster-dark.mjs`; ESM needs `apps/web/node_modules`, run from
  inside `apps/web`). NOT committed — like the light one, not durably stored.

## Creator-specific invitation page — `/invitation/creators`

The existing `/invitation` is nominally neutral but its persuasion copy is
**brand-facing** ("How we do it" / pull-quote address advertisers). Built a
creator twin at **`/invitation/creators`** (Martin's chosen route; CTA
matches the brand page = XQ + Snowdrift):

- Clones the invitation shell (cloud-video hero → roster carousel → value
  props → pull-quote → co-founders → XQ + Snowdrift → footer), reusing the
  shared `RosterCarousel` / `HeroBackgroundVideo` and the **same CSS module**
  so the two pages stay visually identical.
- Creator copy mirrored from `/for-creators`: hero lede ("your voice isn't
  for sale…"), **"Why this works"** props (Soul-aligned partnerships /
  Premium revenue, zero admin / A community of world-makers), pull-quote
  "You don't need a million downloads to matter."
- Also fixed a grammar bug on the existing `/invitation` hero: "When brands'
  and creators'" → "When brands and creators" (bad possessive apostrophes,
  Martin flagged).
- `tsc` + `eslint` clean; screenshots confirm hero, features, pull-quote,
  founders render correctly.

## RQ quiz results not showing — investigation → ROOT CAUSE → fix

**Reported:** Elizabeth Santelmann (Sunshine In My Nest) says she completed
the RQ but can't see results in the Studio. (The 08-18 identity-consolidation
fixed her XQ; RQ was assumed done because the submission id existed.)

**What we found, in order:**
1. Her member row is fine — one consolidated row, her auth, XQ shows
   (`C-P-C`, 35 answers). Her `rq_submission_id` points at row `e795fb8f`,
   but that row is **`status=incomplete`, `rq_code` null, `answers_json` `{}`
   (0 keys)** — an empty lead. `loadStudioRqSummary` reads by id, so the
   Studio correctly shows a "Take the RQ →" prompt.
2. Confirmed no completed RQ exists for her under any email; nothing to
   reverse-engineer. She was **never sent a result email** (Martin confirmed
   via Resend logs) — the summary email only fires on server completion,
   which never ran. Her answers only ever lived in her browser.
3. She insisted she completed it → dug into the flow. The RQ reveal is
   **computed client-side and shown immediately**, independent of persistence.
   Persistence is a separate `fetch`. So she saw her result but it wasn't
   saved.
4. **ROOT CAUSE (bigger than a flaky save):** the quiz captures a lead
   (`POST /api/rq-submissions`, `incomplete`) then upgrades on finish via
   **`PATCH /api/rq-submissions/{id}`**. `proxy.ts`'s matcher
   `/api/rq-submissions/:id` (added to gate the admin-only DELETE) matches by
   **path, not method**, so it **401'd the public completion PATCH**. A direct
   probe confirmed **401** (with and without keepalive). Every taker who got
   past the contact step finished, saw their reveal, but their row stayed
   `incomplete` with zero answers. **Stranded 4 real people:** Elizabeth,
   William (tektones), Mike, Mark. The 6 surviving `complete` rows went via
   the POST-fallback (no lead id → public POST-complete).

**Fix (committed `395df29`, verified E2E, DEPLOYED + verified live):**
- `proxy.ts` — allow `PATCH /api/{rq,xq}-submissions/{uuid}` through the gate;
  DELETE stays admin-only. (Method-aware regex check before the admin gate.)
- `rq-quiz/durable-submit.ts` (new) — defense-in-depth: **keepalive + retry +
  localStorage resume** so a dropped completion self-heals on the next load.
- `rq-quiz/page.tsx` — persist-then-send; **synchronous-claim resume** (clears
  pending before the async send) so React StrictMode's dev double-invoke can't
  duplicate a POST-fallback row; retry wiring.
- `ResultsScreen.tsx` + `rq-quiz.css` — persistent error state with a working
  **Retry** button instead of a fading toast the reveal hid.

**Verification (E2E against live DB, side-effects disabled via blanked
`RESEND_*`/`GOOGLE_SHEETS_WEBHOOK_URL`):** PATCH now **200**; the real
lead→PATCH path persists; POST-complete **dedups to one row** (caught + fixed
a StrictMode double-submit mid-test); forced network failure → pending
retained (self-heals). All test rows cleaned up (service-role delete); `tsc`/
`eslint` clean.

**Deployed + verified in prod (2026-08-20):** pushed to `origin/main` →
Vercel. Live PATCH probe flipped **401 → 400** (proxy now lets the completion
through). Then a **full real click-through of the live quiz** on
`www.ghostsignal.cloud`: `POST` lead → **201**, completion `PATCH` → **200**
(was 401), result shown + "emailed to you", and the DB row landed as **one**
row, `status=complete`, **17 answers**, code + name + profile — the exact case
that used to strand. Test row deleted; the one admin email + Google-Sheets row
it produced are the only residue.

**Consequence:** the 4 stranded users' answers are **unrecoverable** (never
transmitted). They must **retake** — and now it sticks. Retakes can be watched
landing in the DB.

## XQ "everyone's a Steward" — investigation + parked proposal

Martin: nearly every XQ taker comes out as **The Steward (`C-P-C`)**. Verified
against the real `triangulateArchetype`:
- **Not a scoring bug** — all-"b" answers score `X-S-L` (X and L can win);
  every stored submission recomputes to its saved code; Christopher scored
  `C-S-C` (differentiates).
- **Two real causes:** (1) `C-P-C` is the **tie-break default** — the `>=`
  rule favors C, P, C, so any tied axis is silently awarded to Steward, and
  ties are easy to hit; (2) likely **instrument bias** — the Steward-side
  answer is always shown first and often the more flattering wording.
- One `C-P-C` row (`heymatvond@gmail.com`) is a **test artifact** (alternating
  a/b → all ties). Mark Meynell has a **duplicate** completed XQ row.

Wrote a plain-language brief for Jeremy and a full proposal
(`docs/XQ_STEWARD_BIAS_FIX_PROPOSAL.md`): fixes ranked (1) stop defaulting
ties, (2) show per-axis magnitude via the existing spectrum map, (3) de-bias
(counterbalance a/b order + neutralize wording — highest leverage), (4) graded
slider responses. Cheap gut-check first: overall "a" pick-rate. **PARKED — not
implemented, pending Jeremy's sign-off** (his archetype framework, tie-logic,
and copy). Memory: `[[project-xq-steward-bias]]`.

## Context / carried over
- ART19 daily-listens export: Martin **sent the prompt email to Bill on
  2026-08-19**; awaiting the S3 export to start landing in `art19_listens_daily`
  (Phase D code-complete). Memory `[[project-art19-listens-export]]`.

## Open / next
- ✅ RQ fix **deployed + verified live** (real prod quiz run persisted a
  complete row; PATCH 401→200).
- **Ask the 4 stranded users to retake** the RQ (Elizabeth, William/tektones,
  Mike, Mark); watch each land + link. Their old answers are gone.
- Delete the one test row's leftover **Google-Sheets row** (name "RQLiveTest",
  `rq-live-…@example.com`) if it matters.
- XQ Steward fix: awaiting Jeremy (`docs/XQ_STEWARD_BIAS_FIX_PROPOSAL.md`).
- A gibberish junk RQ lead (`email: "adwd"`) from today was left in place.
- Not committed: the reusable dark-GIF capture script (session scratchpad).

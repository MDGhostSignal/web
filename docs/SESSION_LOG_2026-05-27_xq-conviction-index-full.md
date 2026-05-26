# Session Log — 2026-05-27 (XQ Conviction Index — full 5-phase ship)

## Summary

Shipped GhostSignal's full XQ (Conviction Index) quiz end-to-end — the free top-of-funnel half of the RQ/XQ matching ecosystem Jeremy designed. Mirrors the RQ infrastructure shape but with XQ's distinct data model (3-axis archetype triangulation + 14 value-domain picks + 3-stage stress test producing 4 value buckets). Public quiz at `/xq-quiz`, submission API + emails, admin submissions tab at `/admin/xq-responses`, and member-side integration (auto-link by email + dossier card on marketplace pool + contacts expanded views, lifecycle stepper auto-derive of `xq_completed`).

The work followed the 5-phase plan confirmed with the user upfront. Each phase committed-ready independently; this single commit bundles them since the feature only makes sense delivered as a whole.

## Phase A — Schema + scoring + data model

### New
- `docs/CRM_XQ_SUBMISSIONS_SCHEMA.sql` — `xq_submissions` table mirroring `rq_submissions` shape (basics + archetype identifiers + axis bias + 4 jsonb value buckets) + `members.xq_submission_id` column. RLS enabled. Idempotent. **User applied via Supabase SQL editor before Phase B.**
- `apps/web/src/lib/xq/constants.ts` — 18 Phase 1 archetype dilemmas + 14 Phase 2 value-domain questions + 8 archetype defs (Steward / Shepherd / Conservator / Institution Builder / Artisan Reformer / Catalyst / Designer / Architect) extracted verbatim from `docs/XQ Draft.txt`. Single `BRAND` + `AXIS_LABELS` exports.
- `apps/web/src/lib/xq/scoring.ts` — pure functions: `triangulateArchetype` (per-axis point accumulation → 3-letter code), `extractValuesPool` (Phase 2 answers → 14 value-string pool), `classifyBuckets` (Phase 3 stress inputs → 4 buckets with strict priority non-neg > core > aspirational > background), `computeXQ` top-level entry point returning a typed `XQResult` dossier.

### Edited
- `apps/web/src/lib/members.ts` — added `xq_submission_id: string | null` to `Member` type.
- `apps/web/src/app/api/members/route.ts` — added `xq_submission_id` to `sanitizePayload`.

## Phase B — API + emails

### New
- `apps/web/src/app/api/xq-submissions/types.ts` — `XQSubmissionPayload` wire shape.
- `apps/web/src/app/api/xq-submissions/route.ts` — POST (incomplete/complete split, mirrors RQ), GET (config-check), OPTIONS (CORS).
- `apps/web/src/app/api/xq-submissions/list/route.ts` — admin list endpoint.
- `apps/web/src/app/api/xq-submissions/[id]/route.ts` — admin DELETE (and Phase-E added GET for single-submission fetch).
- `apps/web/src/app/api/xq-submissions/emails.ts` — three email functions:
  - `sendLeadNotificationEmail` (incomplete capture → light admin alert)
  - `sendNotificationEmail` (complete → full admin summary with archetype + buckets)
  - `sendUserSummaryEmail` (complete → styled user dossier, cyan accent, archetype card, 4 color-coded buckets, Mike contact card)

### Edited
- `apps/web/src/proxy.ts` — added admin gates for `/api/xq-submissions/list` + `/api/xq-submissions/:id`. Base POST stays public so the `/xq-quiz` page can submit pre-auth.

### Verified
- `curl /api/xq-submissions` → 200 with `configured: true` confirms Supabase + Resend env reachable.

## Phase C — Public `/xq-quiz` UI

Used RQ's color palette + typography for visual parity (per user direction: "use the exact same styling as the RQ quiz"). Per-stage components instead of one giant `page.tsx` after hitting an 8K output token cap on first attempt — much cleaner separation and each file fits comfortably.

### New
- `apps/web/src/app/xq-quiz/layout.tsx` — metadata + back-home pill.
- `apps/web/src/app/xq-quiz/types.ts` — shared `Basics`, `Stage`, `EMPTY_BASICS`.
- `apps/web/src/app/xq-quiz/xq-quiz.css` — full XQ stylesheet (`--xq-*` tokens mirroring RQ's palette).
- `apps/web/src/app/xq-quiz/IntroStep.tsx` — welcome screen with brand wordmark + lede + "Begin" CTA.
- `apps/web/src/app/xq-quiz/ContactStep.tsx` — basics form (first/last/email/org/role/industry/website/type), validation, gates the quiz.
- `apps/web/src/app/xq-quiz/Phase1Step.tsx` — all 18 archetype dilemmas on one scrollable screen, validation auto-scrolls to first unanswered.
- `apps/web/src/app/xq-quiz/Phase2Step.tsx` — 14 domain-tagged value-pick questions.
- `apps/web/src/app/xq-quiz/Phase3Step.tsx` — 3 stress-test checkbox grids over the user's dynamic value pool. Same value can be ticked across multiple tests; classifier resolves by priority.
- `apps/web/src/app/xq-quiz/ResultsScreen.tsx` — archetype hero + 4 value buckets + inline submit-status banner + cross-link to `/rq-quiz`.
- `apps/web/src/app/xq-quiz/page.tsx` — thin state machine routing intro → contact → phase1 → phase2 → phase3 → results. Owns shared state; fires incomplete lead POST after contact + complete POST after Phase 3.

### Edited
- `apps/web/.stylelintignore` — added `src/app/xq-quiz/` exemption (mirrors the existing RQ exemption — both surfaces have their own token namespace + raw px values).

## Phase D — Admin tab rebuild

Replaced the Phase-1 placeholder with the full submissions surface.

### New
- `apps/web/src/app/admin/xq-responses/SubmissionDetail.tsx` — detail panel rendered inside the DataTable expanded row. Archetype hero + description + 3-cell axis-bias strip + 4 bucket rows + meta grid (submitted-at / role / industry / website).

### Edited
- `apps/web/src/app/admin/xq-responses/page.tsx` — full rewrite. Pulls `/api/xq-submissions/list`, renders DataTable (date / name / email / org / type / status / archetype), status-filter pills with counts, search across name/email/org/code/archetype, delete flow with confirmation modal.
- `apps/web/src/app/admin/xq-responses/xq-responses.module.css` — full rewrite supporting the new surfaces (toolbar, status filter, table cells, detail panel, buckets, modal).

## Phase E — Member surface integration

### New
- `apps/web/src/components/admin/XQSummaryCard.tsx` + `.module.css` — compact dossier card shared by marketplace pool + contacts. Takes `submissionId` prop, fetches lazily via new GET handler, renders nothing if null. Render-phase compare-and-set pattern to avoid the `react-hooks/set-state-in-effect` lint rule. Archetype name + tagline + code + 3-axis bias strip + compact bucket pills (only non-empty buckets) + submitted-at footer.

### Edited
- `apps/web/src/app/api/xq-submissions/route.ts` — added `linkSubmissionToMember()` helper that runs after a complete POST. Uses existing `findMembersByEmail` from `@/lib/members`. PATCHes `members.xq_submission_id` only on exact-1 email match (skips ambiguous cases to avoid mis-linking PII). Silent on failure.
- `apps/web/src/app/api/xq-submissions/[id]/route.ts` — added GET handler so the marketplace/contacts cards can fetch a single submission.
- `apps/web/src/app/admin/marketplace/PoolView.tsx` — mounted `<XQSummaryCard>` after `MarketplaceMemberDetails` in the expanded panel.
- `apps/web/src/app/admin/marketplace/LifecycleStepper.tsx` — auto-derive `xq_completed` status from `members.xq_submission_id`. When the column is set, the lifecycle circle forces to `done` regardless of `lifecycle_steps` content. (Same future-move planned for `rq_completed` when RQ auto-linking lands.)
- `apps/web/src/app/admin/contacts/page.tsx` — mounted `<XQSummaryCard>` between the top-grid (Contact/Pipeline cards) and the tags row.

## End-to-end flow

1. Visitor lands on `/xq-quiz` → intro → contact → 3 phases → results.
2. After contact step: POST `/api/xq-submissions` with `status: "incomplete"` → admin lead-capture email.
3. After Phase 3: POST `/api/xq-submissions` with `status: "complete"` →
   - Row written with archetype + buckets + per-axis details.
   - Best-effort link to `members.xq_submission_id` by email.
   - Admin notification email + user summary email (Resend, same setup as RQ).
4. Admin views the submission at `/admin/xq-responses` (table + detail).
5. If the email matched a Member, the expanded view on both `/admin/marketplace` and `/admin/contacts` now shows the XQ dossier card next to the existing member record, AND the marketplace lifecycle stepper auto-marks `xq_completed` as done.

## Validation results

All gates green:

- `npm run typecheck` — clean
- `npm run lint` — clean (two mid-flight fixes: `react-hooks/set-state-in-effect` on XQSummaryCard → switched to render-phase compare-and-set; `react-hooks/exhaustive-deps` on LifecycleStepper → added `member.xq_submission_id` to useMemo deps)
- `npm run lint:css` — clean (after `.stylelintignore` exemption for xq-quiz)
- `npm run assets:audit` — clean

## Migration history

- User applied `docs/CRM_XQ_SUBMISSIONS_SCHEMA.sql` between Phase A and Phase B.

## Memory check

Per `feedback_proactive_admin_memory.md`: considered. The XQ ecosystem context was already captured in `~/.claude/.../memory/project_rq_xq_ecosystem.md` on 2026-05-26 when the placeholder scaffold landed. No new memory needed — this is the execution of a well-documented plan.

## Open issues / next-step notes

- **RQ auto-link parity** — RQ never wired up the equivalent of `linkSubmissionToMember`. Now that the XQ pattern is in place, the same 30-line helper can land in `/api/rq-submissions/route.ts` to write `members.rq_submission_id`. Then the `rq_completed` lifecycle step can auto-derive too. Easy follow-up.
- **No public RQ → XQ cross-link** — the XQ results screen has a "Unlock your RQ" CTA but the RQ results screen has no equivalent "Take the XQ" cross-promo. Symmetric placement would help funnel both directions.
- **Auto-derived click UX** — when `xq_completed` is auto-derived as done in the lifecycle stepper, clicking the circle still fires `onToggle` which writes "todo" to `lifecycle_steps`; on re-render the auto-derive immediately restores "done". Functional but creates a brief visual flicker. Small follow-up: pass an `isAutoDerived` flag and disable the click handler for those circles.
- **Google Sheets webhook** — RQ has one (`postToGoogleSheetsWebhook`); XQ doesn't. User specified "same number of emails triggered" but didn't mention Sheets. Add when requested.
- **Existing untracked files** in `apps/web/public/images/home/` (videos), `docs/Creator Life Cycle.xlsx`, `docs/nimble_contacts.csv`, `docs/XQ Draft.txt` — all untouched per the existing pattern. The XQ Draft is the source-of-truth document I extracted Phase 1+2 questions and archetypes from; left as-is in case the user wants to revise.
- **Token-cap learning** — first attempt at the XQ public quiz exceeded 8K output tokens trying to write everything in one `page.tsx`. Split into per-stage components on retry. Pattern documented for future big features.

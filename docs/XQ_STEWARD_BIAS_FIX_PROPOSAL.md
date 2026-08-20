# XQ — "Everyone's a Steward" — diagnosis + proposed fix

**Status: PROPOSAL ONLY. Not implemented. Awaiting Jeremy's feedback**
(the XQ archetype model, tie-logic, and question copy are his framework —
these changes are his call to sign off). Investigated 2026-08-20.

## The symptom

Almost every completed XQ comes out as **The Steward (`C-P-C`)**. Of 6
completed `xq_submissions`, 5 are `C-P-C`; only Christopher Baumgartel is
`C-S-C`.

## It is NOT a scoring bug

Verified by running the real `triangulateArchetype` (`lib/xq/scoring.ts`)
against the stored answers:
- **All-"b" answers score `X-S-L`** — so Change (X) and Leverage (L) *can*
  win. Nothing is stuck on C.
- **Every stored submission recomputes to exactly its saved code.** The math
  is correct and deterministic.
- One `C-P-C` row (`heymatvond@gmail.com`) is a **test artifact** — answers
  are `a,b,a,b…` perfectly alternating, which ties every axis. Mark Meynell
  also has a **duplicate** completed row (data hygiene, separate issue).

## Two real root causes

**1. Steward is the mathematical default.** The code is three head-to-head
axes, each resolved with a `>=` tie-break that favors the first side:

| Axis | Sides | Tie → |
|------|-------|-------|
| 1 | Continuity (C) vs Change (X) | **C** |
| 2 | Person (P) vs System (S) | **P** |
| 3 | Craft (C) vs Leverage (L) | **C** |

The three tie-winners spell **C-P-C = The Steward.** So any axis that ends in
a tie is silently awarded to Steward. Ties are easy to hit: 6 questions/axis
weighted `{2,2,1,1,1,1}`, so balanced or alternating answering lands 4–4.
(Example: Mike ties axis-1 4/4 and is defaulted to Continuity.)

**2. The instrument likely leans toward Steward.** On every Phase-1 question
the Steward-side answer ("a") is *always shown first* and often the more
flattering wording ("timeless lineage," "exquisite masterpiece") vs colder
opposite-side copy ("render obsolete," "mechanical failure," "ubiquitous
utility"). Primacy + acquiescence + desirability bias all push takers toward
the C/P/C side before conviction enters in.

Fixing only the tie-break treats the symptom (Problem 1); the bigger lever is
the instrument bias (Problem 2).

## Proposed fixes (cheapest → deepest)

1. **Stop silently defaulting ties to Steward.** On an exact tie, either
   report the axis as *balanced*, or break it using a secondary signal we
   already collect (Phase-2 value picks / Phase-3 stress buckets). NOT
   randomization — a psychometric tool must be reproducible on retake.
2. **Show magnitude, not just a binary.** Report how strongly someone leans
   per axis (e.g. 60/40) so a near-tie doesn't masquerade as conviction. The
   per-axis scores already exist and there's a spectrum-map component
   (`XQSpectrumMap`) — largely a presentation change. Frame results as
   *primary archetype + confidence* (e.g. "Steward, trending Artisan").
3. **De-bias the instrument (highest leverage on Problem 2):**
   - Counterbalance the a/b sides — randomize which side is shown first per
     question/respondent so "a" isn't always the Steward answer.
   - Neutralize wording so both options are equally desirable.
4. **(Bigger) Graded/slider responses** instead of hard a/b — finer
   resolution, far fewer ties, truer magnitude. Precedent: the RQ quiz
   already uses scale questions.

**Recommended order** (if XQ is meant to be credible, not just a hook):
#3 first (attacks the root skew), then #2 (honest tie handling on the
spectrum map we already have). #1 is a quick stopgap; #4 is the long-term
rigor upgrade.

## Cheap gut-check to aim the fix

Measure the overall **"a" pick-rate** across all submissions. If it's well
above 50%, the instrument bias (Problem 2) is real and counterbalancing +
rewording (#3) is the priority. If picks are ~balanced, focus on tie handling
(#1/#2). Run this before writing any code.

## Strategic tension to weigh

The XQ is a top-of-funnel, shareable, affirming brand quiz. Every step toward
rigor (sliders, counterbalancing, "you're balanced/low-confidence" outputs)
adds friction and softens the crisp "You are The Steward!" payoff. How far to
push depends on whether the XQ is positioned as a *credible diagnostic* or a
*marketing hook* — a call for Jeremy + Mike.

## Pointers

- Scoring: `apps/web/src/lib/xq/scoring.ts` (`triangulateArchetype`, the
  `>=` tie-break).
- Questions + weights + archetype defs: `apps/web/src/lib/xq/constants.ts`
  (`PHASE1_QUESTIONS`, `ARCHETYPES`; `C-P-C` = "The Steward").
- Quiz UI: `apps/web/src/app/xq-quiz/`.

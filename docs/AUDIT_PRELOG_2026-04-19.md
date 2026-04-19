# Audit Pre-Log — 2026-04-19

Snapshot taken before the comprehensive codebase audit requested by the user.
This file documents the state of the repo **at the moment the restore point
was created**, so anything done after can be compared against this baseline or
reverted to it if needed.

## Restore Point

- Branch: `main`
- Parent commit before audit: `6ae5263 feat(contact): add email submission to Get in Touch form`
- Restore tag: `pre-audit-2026-04-19` (applied on the commit that contains
  this file and the sanitized `test-email.mjs` / `email-preview.html`).

To roll back the entire audit:

```bash
git reset --hard pre-audit-2026-04-19
```

## Scope of the audit (as requested)

1. Remove "AI container sickness" — excessive wrapper divs, over-nested
   sections, redundant Fragments, over-abstracted helpers.
2. Consolidate genuinely shared section containers where sensible.
3. Unify components; delete dead, redundant, or broken code.
4. Improve performance / lightweight the bundle, without losing visual
   quality; improve polish where there is an obvious win.
5. Keep the design-token + motion-library discipline from `AGENTS.md`.

The audit proceeds in phases (tracked as tasks): inventory → smell detection
→ refactor → performance pass → visual QA → final validation.

## Repo shape

- Monorepo root: `C:/Users/heyma/ghostsignal`
- Web app: `apps/web/` (Next.js 16.1.6, React 19.2, Tailwind 4)
- Build scripts: `tokens:build`, `assets:audit`, `assets:manifest`,
  `typecheck`, `lint`, `format`
- Git remotes: `origin` (github) + `old-origin` (kept for history).
  Local `main` is 146 commits ahead of `old-origin/main` — this is
  expected, not a backup problem.

### Source footprint

| Metric | Value |
|--------|-------|
| `.tsx` files | 50 |
| `.ts` files  | 17 |
| `.module.css` files | 17 |
| `.css` files (non-module) | 9 |
| Total LOC under `apps/web/src/` | ~29,321 |
| `"use client"` components | 43 of 50 `.tsx` — high |
| `apps/web/src/` size | ~1.1 MB |
| `apps/web/public/` size | ~68 MB |

### Routes (12 total)

From `apps/web/src/app/**/page.tsx`:

| Route | Purpose | In canonical map? |
|-------|---------|-------------------|
| `/` | Long-scroll homepage | yes |
| `/for-creators` | Creators page | yes |
| `/for-advertisers` | Brands/advertisers page | yes (canonical name: "For Brands") |
| `/what-is-this` | Explainer page | yes |
| `/who-are-we` | Team / about page | yes |
| `/get-in-touch` | Contact form | yes (canonical name: "Contact") |
| `/snowdrift` | Newsletter | yes |
| `/rq-quiz` | Resonance Quotient quiz | feature — not in canonical page list |
| `/rq-dashboard` | Internal RQ submissions view | internal |
| `/design-tasks` | Internal design-task tracker | internal |
| `/design-system` | Token visual reference | internal |
| `/home-future` | Parked alternate homepage | **candidate for removal** |

> Naming drift vs. `PROJECT_INFO.md`: `for-advertisers` vs. canonical
> "For Brands", and `get-in-touch` vs. canonical "Contact". Renames would be
> high-risk (SEO, links, session logs); I'll flag this and not rename
> without the user's go-ahead.

### Large files (likely refactor candidates)

Sorted by LOC, top of the list:

| File | LOC | Notes |
|------|-----|-------|
| `src/app/rq-quiz/page.tsx` | 960 | Quiz driver — likely split into steps/screens |
| `src/app/api/rq-submissions/route.ts` | 921 | Probably has inline email HTML to extract |
| `src/components/GhostSignalLiquidWordmark.tsx` | 710 | Check if shader/helpers can be trimmed |
| `src/components/ScrollScenes.tsx` | 693 | Homepage scroll choreography |
| `src/app/design-tasks/page.tsx` | 613 | Internal tool |
| `src/app/rq-quiz/LiquidBackground.tsx` | 596 | One of 5+ RQ background variants |
| `src/app/design-tasks/TaskDetailPanel.tsx` | 569 | Internal tool |
| `src/components/EarthGlobe.tsx` | 514 | 3D component |
| `src/app/rq-quiz/VolumetricFog.tsx` | 482 | Background variant |
| `src/app/design-system/page.tsx` | 468 | Token catalog |

### Obvious initial red flags (to confirm in the smell pass)

- `src/app/rq-quiz/rq-index-old.css` — an "-old" file left in the tree.
- `src/app/home-future/` — parked alternate homepage with its own CSS module.
- Five+ background/fog components under `rq-quiz` and `FogOverlay.tsx` at
  the app root (`DesertFog`, `SimpleFog`, `VolumetricFog`, `LiquidBackground`,
  `SnowAnimation`, plus `FogOverlay`). Likely only one is actually rendered.
- 43 of 50 `.tsx` files are `"use client"` — some are probably server-safe
  and could be converted for better performance.
- Two large inline-HTML email templates exist: the production one inside
  `src/app/api/rq-submissions/route.ts` and a local preview/test pair
  (`email-preview.html` + `test-email.mjs`). The inline HTML is a big chunk
  of the 921 LOC in that API route and is a good extraction target.

### Pending items carried in (unrelated to this audit)

None in `git status` other than the two intentionally-untracked local files
handled below.

## Untracked files handled before commit

| File | Decision | Rationale |
|------|----------|-----------|
| `apps/web/email-preview.html` | Commit as-is | Static preview, no secrets, useful for design work |
| `apps/web/test-email.mjs` | Sanitize, then commit | Contained a hard-coded Resend API key; replaced with `process.env.RESEND_API_KEY` guard |

### ⚠️ Security note — rotate the Resend key

The file `apps/web/test-email.mjs` contained a live Resend API key
(`re_efqvYHZ7_…`). It was **never committed to git** (verified with
`git log -S`), so it has not been pushed to GitHub, but:

- It lived in a plaintext file in the working tree.
- It has been sent to Claude's conversation context during this session.

**Recommended action by the user:** rotate that Resend key at
`https://resend.com/api-keys` and replace it with a new one in your local
`.env` / wherever `RESEND_API_KEY` is sourced for `test-email.mjs`. This
is a manual step you need to do — I won't call out to Resend on your
behalf.

## Validation baseline

These commands should pass both before and after the audit. Run them now
(pre-audit baseline) and again at the end (post-audit) — the post-log will
record any deltas.

```bash
cd apps/web
npm run typecheck
npm run lint
npm run assets:audit
npm run build
```

Baseline results will be appended to this file during the inventory phase.

---

End of pre-log.

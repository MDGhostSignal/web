# Session Log — 2026-05-26 (admin: XQ Responses tab scaffold + RQ/XQ ecosystem context)

## Summary

New admin tab `/admin/xq-responses` scaffolded as a placeholder, ready to receive Jeremy's XQ scoring code when it lands. Sits directly under RQ Responses in the sidebar. The page itself is a documented "plug-in points" hero — six concrete slots (Supabase table, scoring lib, public quiz route, API routes, page rewrite, lifecycle-step auto-detect) that the future XQ delivery will fill.

Also saved a foundational project memory documenting GhostSignal's RQ + XQ ecosystem (XQ = free top-of-funnel hook; RQ = premium marketplace-matching engine; both designed by co-founder Jeremy). Future sessions need this business context to make good decisions about anything matching-adjacent.

## Context (the business framing the user shared)

- **XQ ("The Hook")** — free, frictionless self-discovery tool. Answers the **internal** question *"What is the core substance of my business convictions?"* Top-of-funnel lead generator.
- **RQ ("The Engine")** — premium marketplace-matching tool. Answers the **external, operational** question *"How do my convictions actually communicate, build trust, and scale in a partnership?"* This is the bridge into paid GhostSignal membership and the source of the brand↔creator matching matrix.
- Both designed by co-founder **Jeremy**.
- This is GhostSignal's core business — the CRM, the marketplace pool, the lifecycle stepper all serve this matching workflow.

## Changes implemented

### Memory (outside the repo)
- `~/.claude/projects/C--Users-heyma-ghostsignal/memory/project_rq_xq_ecosystem.md` — new project memory capturing the framing above + how it maps to existing CRM surfaces.
- `MEMORY.md` — indexed the new entry.

### New
- `apps/web/src/app/admin/xq-responses/page.tsx` — `"use client"` page with the standard admin `PageHeader` ("XQ Responses" / "The free top-of-funnel quiz — internal conviction-substance discovery") and a placeholder hero block. Body documents the **six plug-in points** for when Jeremy's code lands:
  1. Add `xq_submissions` Supabase table (mirror `rq_submissions`).
  2. Land scoring lib at `apps/web/src/lib/xq/scoring.ts`.
  3. Public quiz route at `/xq-quiz`.
  4. `/api/xq-submissions` POST + list routes.
  5. Replace this placeholder with the parallel of `/admin/rq-responses` page (DataTable + status filter + detail modal + axis-breakdown graph).
  6. Wire the marketplace lifecycle step `xq_completed` to auto-detect from `xq_submission_id` on the Member row.
- `apps/web/src/app/admin/xq-responses/xq-responses.module.css` — placeholder styles only (page wrapper, hero card, placeholder text + numbered list). Designed to grow into a full rq-responses-shaped CSS module without a rewrite.

### Edited
- `apps/web/src/components/admin/icons.tsx` — new `IconXQ` (same speech-bubble silhouette as `IconRQ` to signal the pairing, with an `×` inside instead of the question-mark hook). Reusable elsewhere.
- `apps/web/src/app/admin/layout.tsx` — added `XQ Responses` nav entry directly under `RQ Responses` with the new `IconXQ`. Pulled `IconXQ` into the icon imports.

## Files touched

- `apps/web/src/app/admin/xq-responses/page.tsx` (new)
- `apps/web/src/app/admin/xq-responses/xq-responses.module.css` (new)
- `apps/web/src/components/admin/icons.tsx`
- `apps/web/src/app/admin/layout.tsx`
- (outside repo) `~/.claude/projects/.../memory/project_rq_xq_ecosystem.md` + MEMORY.md index entry

## Validation results

Three gates green (no asset changes):

- `npm run typecheck` — clean
- `npm run lint` — clean
- `npm run lint:css` — clean

## Decision on plan-mode

User offered to switch to plan mode for this. Declined — the immediate scaffolding task is well-scoped (mirror RQ Responses shape; placeholder for now) and the actual "massive" work is the Jeremy-code integration that hasn't landed yet. The placeholder's six plug-in points BECOME the plan when the code arrives.

## Open issues / next-step notes

- **When Jeremy's XQ code arrives**, walk the six numbered plug-in points in `page.tsx`. Each maps to a single file or two-line change. Schema (#1) is the only step needing a user-applied SQL migration.
- **Sidebar nav now has 9 top-level items** (was 8). Still fits comfortably in the persistent left sidebar.
- **Marketplace lifecycle step `xq_completed`** is currently a manual checkbox (added earlier today in commit `545a107`). Auto-derivation from `xq_submission_id` is the natural follow-up once that column exists on Member.
- **No public `/xq-quiz` route yet** — the placeholder doesn't gesture at one, only the admin-side surface. Public route + quiz UI is part of step 3 of the plug-in plan.

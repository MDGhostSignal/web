# Session Log — 2026-05-26 (marketplace: lifecycle stepper + expanded panel reorder)

## Summary

First of two commits on the marketplace pool member-detail redesign. Promotes the lifecycle to the most prominent "what's left to do" signal in two places: a Stripe/Material-style horizontal stepper at the top of every expanded panel, and a compact pip-bar in the list view's "Lifecycle" column (was "Next action"). The original phase-grouped checkbox checklist demotes to a collapsible "Show step details" so bulk editing + per-step owner/date metadata stays one click away. Bonus: dropped the matching 1400 px cap on `DataTable.detailsPanel` so the expanded panel fills the admin shell width.

## UX research applied

- **Stripe Checkout / Material Stepper** → horizontal numbered circles, connector lines, ✓ for done, accent ring + larger size for current, hollow muted for upcoming.
- **Linear / GitHub Actions** → phase-grouped pipelines so the macro context (Sign / Onboard / Run) is visible without reading every micro-step.
- **Shopify order timeline** → validates the tri-state (completed / current / next) plus an N/A treatment for steps that don't apply to a given member.

## Changes implemented

### New
- `src/app/admin/marketplace/LifecycleStepper.tsx` — one component, two variants. `variant="compact"` renders a 7-pip bar + one-line summary for the table cell. `variant="full"` renders the phase-grouped Stripe-style stepper for the expanded panel, with clickable circles that toggle done/undo via an `onToggle(stepKey, nextDone)` prop. "Current" is derived: the first non-done, non-na step, OR any explicit `status: "doing"` (forward-compatible). Brand members' creator-only steps render as dashed N/A and don't count toward progress (matches `countCompleted` logic in `@/lib/members`).

### Edited
- `src/app/admin/marketplace/PoolView.tsx`:
  - Imports `LifecycleStepper`.
  - Replaced the "Next action" column's `Badge + label` body with `<LifecycleStepper variant="compact" />` and renamed the column to "Lifecycle".
  - Promoted the stepper to the **top** of the expanded panel (above member details).
  - Wrapped the existing `MembershipBlock` (the original phase-grouped checkbox checklist) in a `<details>` collapsible labelled "Show step details" so it's still reachable for bulk editing / owner-role / per-step date metadata without dominating the panel.
- `src/app/admin/marketplace/marketplace.module.css`:
  - Added stepper styles (`.stepperCompact*` for the pip-bar; `.stepperFull*` for the phase-banded stepper — sign uses warn-tint bg, onboard uses accent-tint, run uses success-tint; current circle is 36×36 with accent ring + accent-soft halo; done is filled accent + ✓; upcoming is muted hollow; N/A is dashed + 26×26).
  - Added `.mmLifecycleDetails` / `.mmLifecycleDetailsSummary` styles for the new collapsible (uses `::-webkit-details-marker { display: none }` + custom ▾ glyph; rounded corners flatten on the bottom when `[open]`).
- `src/components/admin/DataTable.module.css`:
  - Dropped the `1400 px` ceiling on `.detailsPanel.max-width`. Kept the `calc(100vw - 48px)` viewport clamp (the sticky panel still mustn't extend past visible bounds when the underlying table has horizontal overflow). Matches the earlier shell-width fix.

## Files touched

- `src/app/admin/marketplace/LifecycleStepper.tsx` (new)
- `src/app/admin/marketplace/PoolView.tsx`
- `src/app/admin/marketplace/marketplace.module.css`
- `src/components/admin/DataTable.module.css`

## Validation results

All four AGENTS.md gates green:

- `npm run typecheck` — clean
- `npm run lint` — clean (one mid-flight fix: hoisted `useMemo` for phaseGroups above the compact early-return so hook order stays stable across variants)
- `npm run lint:css` — clean
- `npm run assets:audit` — `OK: 51 referenced public assets exist.`

Browser-verified by user on dev server: compact pip-bar in the list view, full stepper at top of expanded panel, click-to-toggle works, collapsible reveals the original checklist, panel fills full width after the DataTable cap fix.

## DataTable width-fix scope note

The 1400 px cap removal on `.detailsPanel` affects every admin DataTable that uses the expanded-row pattern (Tasks, Contracts row expansions if/when added, Marketplace pool). Consistent with the earlier shell-width fix (commit `e204e6f`) — same rationale, same direction.

## Open issues / next-step notes

- **Commit 2 (next, this session):** ID card redesign of `ContactCard` — large avatar/logo with upload, name/type on top, two-column grid for org/email/phone/website/address. Includes a small `avatar_url` schema migration the user runs in Supabase SQL editor before the upload UI works end-to-end.
- **Stored status `"doing"`** is rendered correctly as "current" but the existing toggle UI only writes `"done"`/`"todo"`. Forward-compatible plumbing — `"doing"` could become useful when implementing "owner is actively working on this" state.
- **Per-step click in the stepper** only toggles done/undo; no contextual menu for "skip" / "set N/A". The collapsible checklist remains the bulk-edit path. If founders want per-circle skip/N/A, easy add — right-click menu or shift-click semantics.

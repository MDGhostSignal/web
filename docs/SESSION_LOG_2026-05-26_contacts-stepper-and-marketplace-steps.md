# Session Log — 2026-05-26 (contacts: 4-status lifecycle stepper + marketplace: Art 19 tutorial + RQ/XQ steps)

## Summary

Two tightly-related lifecycle improvements that ride the visual language established by the marketplace pool stepper earlier today.

**Contacts page** — replaced the existing `Phase` column + the prominent 6-step `LifecycleChecklist` with a new 4-status horizontal stepper (`ContactLifecycleStepper`). Four overall statuses (Discern · Courting · Member · Stopped) with three sub-steps inside Courting (No contact established / Contact made, no reply / Replied). State is derived from existing `Member` fields — no schema change. The 6-step legacy checklist demotes to a collapsible "Show step details" below, mirroring the marketplace pattern.

**Marketplace lifecycle** — added three new steps to `LIFECYCLE_STEPS`: `art19_tutorial_sent` (creator-only, last in Onboard phase), `rq_completed` and `xq_completed` (both creator + brand, in Run phase before campaign_planning). Plus extended `STEP_OWNER_ROLES` with `"Member"` so the quiz-completion rows read accurately (the member themselves drives those, not Ops/Founder). XQ is forward-compat — the user confirmed an XQ quiz is coming and wants the lifecycle slot pre-wired.

## Changes implemented

### Contacts: ContactLifecycleStepper

**Derivation** (no schema change; all from existing `Member` columns):

| Status | Derived from |
|---|---|
| Discern | `phase = "discern"` |
| Courting (no contact) | `phase = "court"` + `last_contact_at IS NULL` |
| Courting (no reply) | `phase = "court"` + `last_contact_at` set, `last_response IS NULL` |
| Courting (replied) | `phase = "court"` + `last_response` non-empty |
| Member | `became_member_at IS NOT NULL` OR phase ∈ `{sign, onboard, run}` |
| Stopped | `phase ∈ {paused, churned}` |

**New file** — `src/app/admin/contacts/ContactLifecycleStepper.tsx`:
- One component, two variants (`full` + `compact`) — same API shape as the marketplace stepper.
- Five total circles: 1 (Discern) + 3 (Courting) + 1 (Member). Phase bands tinted in the same palette family (Discern = cyan-soft, Courting = amber-soft, Member = green-soft).
- **Stopped state** renders as a separate off-pipeline pill (destructive-soft + caps) in the header pill slot and greys the whole stepper to 0.55 opacity. Summary text becomes an italic muted explainer ("Reactivate by changing the phase from Paused / Churned…"). Pips in the compact variant flatten to surface-1 grey.
- **Member state** renders as a green "Member" badge in the compact variant + a "Graduated to GhostSignal member — full lifecycle continues on the marketplace pool" summary in the full variant.
- Read-only in v1. Founders edit the underlying fields (`phase`, `last_contact_at`, `last_response`, `became_member_at`) via the existing PipelineCard + "Has become a GhostSignal member" button; the stepper reflects the derived state.

**Edited** — `src/app/admin/contacts/page.tsx`:
- Imported `ContactLifecycleStepper`.
- Replaced the `Phase` column's body (was: graduated badge OR phase badge + done/total pill) with `<ContactLifecycleStepper variant="compact" />`. Renamed the column header to `Lifecycle`.
- Promoted the full stepper to the **top** of the expanded panel — sits above the actions row (Member button + Edit/Delete) and the topGrid (ContactCard + PipelineCard). Most prominent surface in the panel.
- Wrapped the existing `<LifecycleChecklist>` in a `<details>` collapsible (`Show step details ▾`) at the bottom alongside Comments. Matches the marketplace pool's `mmLifecycleDetails` pattern.

**Edited** — `src/app/admin/contacts/contacts.module.css`:
- Added `.lifecycleDetails` + `.lifecycleDetailsSummary` for the new collapsible (same look as marketplace's: surface-1 bg, rounded, custom ▾ glyph via `::-webkit-details-marker { display: none }`, `[open]` flattens bottom corners).
- Appended the full `.stepperCompact*` and `.stepperFull*` families (~200 lines) mirroring the marketplace stepper visually. Local copy on purpose — different surface, different domain, easier to evolve independently. Phase-tint backgrounds: Discern = cyan-soft (info family), Courting = amber-soft (accent family), Member = green-soft (success family). Stopped pill = destructive-soft + bold caps.

### Marketplace: lifecycle step additions

**Edited** — `src/lib/members.ts`:
- Extended `STEP_OWNER_ROLES` with `"Member"` (the existing 4 — Founder / Ops / Finance / Creator — couldn't accurately label a step the member themselves drives, and "Creator" excluded brands).
- Inserted three new `LIFECYCLE_STEPS` entries:
  - `art19_tutorial_sent` — Onboard phase, after `art19_migration` (last in Onboard band, per user direction). Creator-only. Owned by Ops.
  - `rq_completed` — Run phase. Applies to both creator and brand. Owned by Member.
  - `xq_completed` — Run phase, after RQ. Same scope. Forward-compat for the upcoming XQ quiz the user signalled is in development.

**Auto-propagation:** `MARKETPLACE_LIFECYCLE_KEYS` filters by phase, so the three new steps appear in the marketplace slice automatically. The `LifecycleStepper` reads from that list — no component change needed.

**Counts after the change:**
- Creators: 10 applicable steps (was 7)
- Brands: 6 applicable steps (was 4 — RQ + XQ both apply, only `art19_tutorial_sent` adds to the N/A list)

**No schema migration.** `lifecycle_steps` is a JSONB column accepting any keys. `sanitizeLifecycleSteps` already defaults missing keys to `"todo"` (or `"na"` for creator-only steps on brands), so existing members in the DB see the new circles as upcoming without a backfill.

## Files touched

- `apps/web/src/app/admin/contacts/ContactLifecycleStepper.tsx` (new)
- `apps/web/src/app/admin/contacts/page.tsx`
- `apps/web/src/app/admin/contacts/contacts.module.css`
- `apps/web/src/lib/members.ts`

## Validation results

All four AGENTS.md gates green:

- `npm run typecheck` — clean
- `npm run lint` — clean
- `npm run lint:css` — clean
- `npm run assets:audit` — `OK: 51 referenced public assets exist.`

Browser-verified by user on dev server.

## Open issues / next-step notes

- **Auto-derive RQ/XQ completion from `rq_submission_id` (and future `xq_submission_id`)?** Currently the marketplace `rq_completed` step is a manual checkbox. A founder must tick it even after the member finishes the quiz. Deriving "done" from the existence of `rq_submission_id` would remove the bookkeeping. Holding off until the XQ schema lands — they may want a unified `quiz_completions` table or similar.
- **XQ quiz schema** — the lifecycle slot exists; once the XQ quiz feature lands, just point the verification logic at whatever column tracks completion.
- **Onboard band density** — 5 circles for creators starts to push the Onboard band wider than the others. Still legible at full-width admin pages (post the earlier shell width fix), but worth re-evaluating if a 6th step lands.
- **Contacts stepper read-only**. The 4-status view derives from `phase` + `last_contact_at` + `last_response` + `became_member_at`. If founders later want click-to-advance on the circles, the most natural mapping: clicking the second Courting circle sets `last_contact_at = today`, clicking the third sets a default `last_response` value, clicking Member fires the same "Has become a GhostSignal member" toggle that already exists. Wire up if requested.

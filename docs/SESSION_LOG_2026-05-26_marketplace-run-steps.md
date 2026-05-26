# Session Log — 2026-05-26 (marketplace: two more Run-phase lifecycle steps)

## Summary

Added two more Run-phase steps to the marketplace pool member lifecycle: **Upload to Drive** and **Label as Calendar**. Both internal Ops actions that happen after Campaign Planning. No schema migration — `lifecycle_steps` is JSONB and the renderer defaults missing keys to `"todo"`, so existing members in the DB show the new circles as upcoming without a backfill.

## Changes implemented

### Edited
- `apps/web/src/lib/members.ts` — two new entries appended to `LIFECYCLE_STEPS` in the Run phase, after `campaign_planning`:
  - `upload_to_drive` — label "Upload to Drive", owned by Ops, applies to creators + brands.
  - `label_calendar` — label "Label as Calendar", owned by Ops, applies to creators + brands.

### Auto-propagation
`MARKETPLACE_LIFECYCLE_KEYS` filters by phase, so the two new steps appear in the marketplace slice automatically. The `LifecycleStepper` reads from that list — no component change.

## Counts after the change

- Creators: 12 applicable steps (was 10)
- Brands: 8 applicable steps (was 6)
- Run band: 5 circles total (rq_completed · xq_completed · campaign_planning · upload_to_drive · label_calendar)

## Files touched

- `apps/web/src/lib/members.ts`

## Validation results

All four AGENTS.md gates green:

- `npm run typecheck` — clean
- `npm run lint` — clean
- `npm run lint:css` — clean
- `npm run assets:audit` — `OK: 52 referenced public assets exist.`

Browser-verified by user on dev server.

## Open issues / next-step notes

- **Label phrasing** — rendered as "Upload to Drive" / "Label as Calendar". User's original message used "Upload it to Drive" and `Label it "calendar"` — I cleaned the wording. If the literal phrasing (with quotes / "it") is preferred for instruction clarity, easy one-line tweak.
- **Run band density** — now 5 circles, matches the Onboard band's max. Still legible at admin full-width post the earlier shell width fix. A 6th Run-phase step would start to push the visual.
- **Contacts page unaffected** — its 4-status stepper derives from `phase` + outreach fields, not from `lifecycle_steps`.

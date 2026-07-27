# Session Log — 2026-07-23

## Focus

Research session: locate the existing ART19 migration guide (web + PDF) ahead of producing a new customer-facing PDF for brands and podcasters joining the platform.

## Findings (no code changes)

- **Existing PDF guide found**: `assets/GS-RSS-Migration-003-290426.pdf` — "Welcome to the Signal — RSS Migration, v1 04.29". Podcaster-facing, 4 steps on a "moving galleries" metaphor:
  1. Pre-move Cataloging (analytics export, dynamic ads off, note embedded players, IAB v2.2 note)
  2. Keys To New Gallery (RSS URL → import, episode review, AIP bulk import)
  3. Changing Addresses (episode check, profile active, 301 redirect on old host)
  4. Opening Day (app propagation, swap embedded players, cancel old host last)
- **No web page version exists.** Closest surfaces: `/for-creators` 3-step journey (Discern Fit → Membership → Relationship) + ART19 Partnership card; `/signal-sheet` glossary; admin lifecycle steps `art19_migration` / `art19_tutorial_sent` in `apps/web/src/lib/members.ts:123-124` (the "tutorial sent" step refers to emailing the PDF).
- **Copy bug in current PDF**: Opening Day step 3 ends with a duplicated pasted fragment ("…cancel your old hosting account.and get familiar with the system before a hard deadline."). Fix in next version.
- Sibling doc: `companyfolder/Welcome Document/Welcome to the Signal - 002 - 090126.pdf` (general welcome packet the migration guide pairs with).

## Files touched

- None (research only). This log.

## Open issues / next steps

- Draft new customer migration PDF: keep creator RSS-migration track, add a **brand track** (brands don't migrate an RSS feed — needs its own steps; possibly mirror CRM lifecycle Discern → Membership → RQ/XQ → Campaign, or await Jack/Mike spec).
- Decide production route (suggested: branded HTML print-to-PDF layout using the design system).
- Fix the Opening Day step-3 copy bug in the next version.

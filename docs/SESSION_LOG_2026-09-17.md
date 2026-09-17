# Session log — 2026-09-17

## Changes implemented
- Refined Holly Mackle proposal viewer into live HTML slides for Cover, Opportunity, and The Work
- Cover: invitation cloud video, white-backed spin logo top-left, bottom-left white type (Brand Proposal / Holly Mackle / subtitle)
- Opportunity: shared type template (H1 36 / lead 24 / support 16), headshot on the right, brandmark top-left, bottom text stack
- The Work: four rounded bottom-anchored tiles in a row, larger caps titles with line breaks, shared deck logo + H1 sizing
- Proposal chrome: white horizontal brandmark in top bar
- Studio migration checklist: moved Import Time pill to step 2; updated 301 redirect note copy; removed Signal Refresh pill
- Removed the “Still on this page / Next: inserting ad markers” jump box from the migration guide

## Files touched
- `apps/web/src/app/proposals/holly-mackle/page.tsx`
- `apps/web/src/app/proposals/holly-mackle/page.module.css`
- `apps/web/public/images/brand/brandmark-hor-black.png`
- `apps/web/public/images/proposals/holly-mackle/holly-mackle-headshot.jpg`
- `apps/web/src/app/studio/migration/MigrationGuide.tsx`
- `apps/web/src/app/studio/migration/migration.module.css`
- `docs/client-work/holly-mackle-brand/build-proposal-deck.js`
- `docs/client-work/holly-mackle-brand/README.md`

## Validation
- `npm run typecheck` (earlier in session) — passed
- `npx stylelint` on proposal CSS — passed
- `npm run assets:audit` — passed after adding headshot + brandmark
- Playwright screenshots for cover / opportunity / work — reviewed
- Studio migration route auth-gated; checklist copy verified in source

## Open / next
- Remaining proposal slides still static PNGs (Timeline, Scope, Next Steps)
- PDF export after remaining slides are refined

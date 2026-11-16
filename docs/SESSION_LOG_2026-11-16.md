# Session log — 2026-11-16

## XQ preview as the public quiz landing

Public “Take the XQ” links now open `/xq-preview` (hero, eight-plate map, notify form). The live quiz stays at `/xq-quiz` for Studio.

### Links updated

- `/xqrq` “Take the XQ”
- Invitation “Take the XQ — it’s free”
- What Is This “Find my match”
- What Is This v2 “Take the XQ”
- `/xq-characters` and `/xq-characters2` primary CTAs
- Experimental XQ `quizHref`
- Cold-outreach email button

Studio tiles, profile, and welcome still link to `/xq-quiz`.

### Files

- `apps/web/src/app/xqrq/page.tsx`
- `apps/web/src/app/invitation/InvitationShell.tsx`
- `apps/web/src/app/what-is-this/WhatIsThisPage.tsx`
- `apps/web/src/app/what-is-this-v2/chapters.ts`
- `apps/web/src/app/xq-characters/page.tsx`
- `apps/web/src/app/xq-characters2/page.tsx`
- `apps/web/src/lib/xq/site.ts`
- `apps/web/src/lib/cold-outreach-email.ts`

### Validation

- `npm run typecheck` — pass
- eslint on the files above — pass (existing `<img>` warning on `xq-preview/page.tsx`)
- `npm run lint` — fails on pre-existing untracked scripts and `preview/creators-hero/FutureType.tsx`, not these edits
- `npm run lint:css` — fails on pre-existing `SiteHeader.module.css` px
- `npm run assets:audit` — OK (103)
- `http://localhost:3000/xq-preview` — 200, hero, symbol map, notify form

## Symbol map instead of plates

- Removed the eight woodcut plates from `/xq-preview`.
- The Continuity/Change spectrum map is back, with the small archetype symbols.
- Hovering a symbol shows that character’s locked one-line summary.

### Files

- `apps/web/src/app/xq-preview/page.tsx`
- `apps/web/src/app/xq-preview/page.module.css`
- `apps/web/src/app/xq-preview/PreviewMap.tsx`

### Validation

- stylelint on `xq-preview/page.module.css` — pass
- eslint on the preview page and `PreviewMap` — pass
- Playwright: no plate images; Steward and Architect hovers show the locked lines; mobile hover tooltip visible

## Tiny item map

- `/xq-preview` map fills the content column (about 1150px on a 1440 screen). Icons and pole names are half the previous size. Each icon sits in a plain black circle. The cross is a hairline. A faint dotted grid joins icons that share a row or a column. Hover lifts an icon over 1.6s with a soft ease, and adds a drop shadow. Icon circles are white at rest and fade to transparent on hover. A teaser band above the map is headlined “The world is made in the pairing.” The Steward and Architect icons sit beside that line and orbit each other, glyphs kept upright.
- The colored character marks are gone. Each archetype is a flat black item: shield, crook, compass, gate, brush, horn, set square, key.
- No fills, gradients, or shadows. Hover still shows the locked one-line summary.

### Files

- `apps/web/src/app/xq-preview/PreviewMap.tsx`
- `apps/web/src/app/xq-preview/page.module.css`

### Validation

- stylelint on the preview CSS — pass
- eslint on `PreviewMap` — pass
- Playwright hover on the Steward still returns the locked line. Desktop and mobile crops show eight black item icons.
- What Is This and invitation HTML include `/xq-preview`
- `POST /api/xq-notify` with an invalid email returns 400

### Open

- Notify emails go through Resend only. No waitlist table.
- Studio still enters the current quiz.

### Ship

Committed with the day’s source: public quiz links, the symbol map, the pairing orbit, and `/proof`. Preview videos, proposal stills, verify scripts, `FutureType.tsx`, and both `production/` folders stay untracked.

## Proof one-pager

Mike’s 2026-11-10 campaign sheet is a public page at `/proof`. It is not in the nav and not in the sitemap. Copy is the seven placements, the three stats, the two close cards, and the disclaimer. Site header, footer, Morse marks, and the brand red carry the GhostSignal chrome. “Write to Mike” opens `mailto:mike@ghostsignal.cloud`.

### Files

- `apps/web/src/app/proof/page.tsx`
- `apps/web/src/app/proof/page.module.css`
- `apps/web/src/app/sitemap.ts`

### Validation

- stylelint on `proof/page.module.css` — pass
- eslint on `proof/page.tsx` — pass
- Playwright on `http://localhost:3000/proof`: seven rows, both mailto links, no horizontal overflow. Desktop headline stays two lines and clears the bottom dock. At 390px the table stacks with Brand / Channel / Room / Result labels. Hover on “Write to Mike” turns the button brand red.

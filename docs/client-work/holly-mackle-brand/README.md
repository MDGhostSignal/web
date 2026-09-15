# Holly Mackle — Brand Strategy & Visual Identity

**Status:** Proposal draft for Thursday team discussion → present to Holly  
**Client:** Holly Mackle (Unseriously)  
**Owner contact:** Jeremy Reeves (`jeremy@ghostsignal.cloud`)  
**Investment:** $4,850 total (not phase-split in the client deck)  
**Suggested duration:** ~2 weeks

## Why this matters

First GhostSignal creative / branding / design proposal beyond advertising. Holly asked for help organizing her brand into a singular hub and touchpoint.

## Four workstreams

1. Discovery  
2. Brand Strategy  
3. Visual Identity  
4. Website + Platform Assets  

## Team review link (local)

Web viewer (slides in order, noindex):

- Local: `http://localhost:3001/proposals/holly-mackle` (dev server on 3001; 3000 was already in use)
- App route: `apps/web/src/app/proposals/holly-mackle/`
- Slide assets: `apps/web/public/images/proposals/holly-mackle/slide-0N.png`

Do not push / promote to production until the team has inspected and refined.

## Files

| File | Purpose |
|------|---------|
| `jeremy-og-brief.md` | Original proposal copy from Jeremy (do not rewrite without team OK) |
| `holly-mackle-brand-proposal.pptx` | Visual presentation for team + Holly |
| `build-proposal-deck.js` | Generator script for the deck |
| `render-previews.js` | SVG→PNG previews under `slides/` (QA when LibreOffice isn’t available) |
| `slides/slide-0N.png` | Approximate preview frames |
| `slides-real/slide-0N.png` | LibreOffice-rendered frames (source for the web page) |

## Deck structure (6 screens @ 1920×1080)

1. Cover — Holly Mackle brand proposal  
2. Opportunity — Jeremy’s paragraphs (verbatim)  
3. The Work — four connected steps (short overview cards)  
4. Timeline — ~2 weeks  
5. Scope of work — **four tall columns** (full Jeremy copy) + **$4,850** summary bar underneath  
6. Next steps — ready when you are (no price)

Rebuild: `node build-proposal-deck.js`

## Open for Thursday

- Confirm ~2-week timeline shape  
- Confirm whether website scope is full site vs. hub MVP  
- Confirm start date / payment terms if needed before sending to Holly  
- Any copy tweaks before Holly sees it (Jeremy’s text is currently untouched on detail slides)

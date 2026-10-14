# Session log 2026-10-14

## Changes
- Life Giving Pages Who Are We (slide 6): short founder summaries under each portrait, drawn from the public Who Are We bios. Portrait frame capped so the copy fits the 1920×1080 artboard.
- Summary column width settled at 75% of the portrait (`28ch` was too narrow; `100%` was too wide).
- Cover background swapped from the invitation cloud loop to `/images/preview/lady-earbuds-blink-steady.mp4` (poster `/images/preview/lady-earbuds.jpg`).
- `/preview/what-is-this` hero switched off that earbuds clip and back to the live homepage girl-in-the-clouds loop (`/images/home/desktop.webm` and `desktop-optimized.mp4`).

## Files
- `apps/web/src/app/life-giving-pages/page.tsx`
- `apps/web/src/app/life-giving-pages/page.module.css`
- `apps/web/src/app/preview/what-is-this/page.tsx`

## Validation
- Dev server: `npm run dev` in `apps/web` → http://localhost:3000 (Ready in 6.7s).
- `GET /life-giving-pages` returns the four summary strings and the earbuds cover source.
- typecheck / lint / lint:css / assets:audit not run this pass.
- No in-browser layout check of slide 6 or the preview hero.

## Shipped
- `d843b74` on `main` (`feat(proposals): founder summaries and earbuds cover on Life Giving Pages`), pushed to `origin/main`.

## Open
- None for this pass. Untracked preview and proposal video takes were left out of the commit.

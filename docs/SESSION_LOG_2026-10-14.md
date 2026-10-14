# Session log 2026-10-14

## Changes
- Life Giving Pages Who Are We (slide 6): short founder summaries under each portrait, drawn from the public Who Are We bios. Portrait frame capped so the copy fits the 1920×1080 artboard.
- Cover background swapped from the invitation cloud loop to `/images/preview/lady-earbuds-blink-steady.mp4` (poster `/images/preview/lady-earbuds.jpg`), the same clip as `/preview/what-is-this`.
- Who Are We summaries: `.aboutSummary` max-width is 75% of the portrait column.
- `/preview/what-is-this` hero switched from `lady-earbuds-blink-steady.mp4` back to the live homepage girl-in-the-clouds loop (`/images/home/desktop.webm` and `desktop-optimized.mp4`).

## Files
- `apps/web/src/app/life-giving-pages/page.tsx`
- `apps/web/src/app/life-giving-pages/page.module.css`

## Validation
- Dev server: `npm run dev` in `apps/web` → http://localhost:3000 (Ready in 6.7s).
- `GET /life-giving-pages` returns the four summary strings.
- typecheck / lint / lint:css / assets:audit not run this pass.

## Open
- Open slide 6 (Who Are We) in the rail to review the summaries.

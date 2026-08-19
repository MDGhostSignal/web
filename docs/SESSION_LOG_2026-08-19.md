# Session Log — 2026-08-19

Polish on the `/invitation` roster popup (the baseball-card carousel):
a themed close button and the XQ/RQ reads floated to the card's bottom.

## Roster profile popup — close button + quotient placement

Both changes in `apps/web/src/app/invitation/` (`RosterCarousel.tsx` +
`page.module.css`).

- **New close button.** The old control was a raw `&times;` glyph in a
  plain white circle — looked improvised over the banner image. Replaced
  the glyph with a **stroked SVG X** and restyled `.profileClose` as a
  **frosted-glass disc** (semi-transparent dark bg + `backdrop-filter:
  blur`, echoing the overlay's own blur so it reads as part of the popup).
  On hover it adopts the card's **tone accent** (blue for brands, orange
  for creators, via `--pk-accent`) with a subtle 90° rotate; proper
  `:focus-visible` ring; `prefers-reduced-motion` drops the rotate.
- **Round, not square — token bug.** Martin flagged the button was still
  square. Root cause: `--gs-radius-full` is `9999` **unitless**, so
  `border-radius: var(--gs-radius-full)` is invalid CSS and the browser
  drops it → square corners. Fixed to the token pattern
  `calc(var(--gs-radius-full) * var(--gs-px))` → real `9999px` → true
  circle. ⚠️ **Same bare-token bug affects other elements in this file**
  (carousel arrows, legend dot, kind chips) — left as-is this session, a
  one-pass sweep is offered.
- **XQ/RQ tiles float to the bottom.** `.profileQuotients` changed from a
  fixed `margin-top` to `margin-top: auto`; the profile card is a flex
  column with spare `min-height`, so the two summary tiles now sit against
  the card's lower edge instead of stacking tight under the copy.

## Files touched

- `apps/web/src/app/invitation/RosterCarousel.tsx` — SVG X icon in the
  close button.
- `apps/web/src/app/invitation/page.module.css` — `.profileClose` restyle
  + circle fix; `.profileQuotients` bottom-float.
- `AGENTS.md` — `next dev`'s auto-regenerated nextjs-agent-rules block
  (committed per the file's own instruction to keep the tree clean).

## Validation

- `npx stylelint src/app/invitation/page.module.css` — clean.
- `tsc --noEmit` — clean.
- `next dev` running on :3000 for live inspection; Martin reviewed.

## Open / next

- Optional: sweep the remaining bare `border-radius: var(--gs-radius-full)`
  usages in `page.module.css` onto the `* var(--gs-px)` pattern.
- **Next up: social media** — (1) review the social strategy, (2) create a
  batch of posts to publish today.

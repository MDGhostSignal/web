- Changes implemented
  - Restored a subtle blue tint to the homepage hero fog and liquid shader.
  - Increased hero fog density and cloud mass in the liquid wordmark shader.
  - Strengthened mouse-driven fog interaction and slowed pointer response by switching shader input to the smoothed pointer state.
  - Added mask-proximity fog banking so vapor slowly accumulates around the `GHOST Signal` letterforms and gets displaced when the pointer passes over it.
  - Reworked the ocean portion of the hero shader from a simple drifting texture into a perspective-based swell and crest field with slower, layered wave motion.

- Files touched
  - apps/web/src/app/page.module.css
  - apps/web/src/components/GhostSignalLiquidWordmark.tsx

- Validation commands run and results
  - `npm run assets:audit` — passed
  - `npm run typecheck` — passed
  - `npm run lint` — passed

- Open issues / next-step notes
  - Reassess the balance between blue tint and perceived fog density in-browser after the latest shader changes.

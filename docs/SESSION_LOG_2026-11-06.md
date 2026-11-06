# Session Log — 2026-11-06

## Summary

Shipped an unlisted XQ feedback site at `/experimental/xq` and put the eight locked archetype plates in the individual character heroes. Both commits are on `origin/main`.

## Changes implemented

- Experimental pages, not linked from the public nav and not in the sitemap:
  - `/experimental/xq`
  - `/experimental/xq/about`
  - `/experimental/xq/character`
  - `/experimental/xq/character/[slug]`
  - `/experimental/xq/resonance`
- Page copy lives in `apps/web/src/lib/xq/site.ts` and `apps/web/src/lib/xq/archetype-copy.ts`.
- Locked archetype ladder is documented in `docs/XQ_ARCHETYPE_COPY.md`. H1 through the long description are locked. Do not revise them unless asked. The Steward lines to keep verbatim are recorded in that file.
- `apps/web/src/app/sitemap.ts` has a comment that `/experimental/xq` stays off the sitemap. `/rq-quiz` stays omitted too.
- The eight locked plates are the hero images on the character pages. Source of truth for the site is `apps/web/public/images/xq/`:
  - `steward.jpg` — Steward
  - `shepherd.jpg` — Shepherd
  - `conservator.jpg` — Conservator
  - `builder.jpg` — Institution Builder (`institution-builder`)
  - `artisan.jpg` — Artisan Reformer (`artisan-reformer`)
  - `catalyst.jpg` — Catalyst
  - `designer.jpg` — Designer
  - `architect.jpg` — Architect
- The hero markup is in `apps/web/src/app/experimental/xq/character/[slug]/page.tsx`. The plate frame styles are `.typeFigure` and `.plateImage` in `xq.module.css`.
- Character pages still have placeholder blocks for "How they work", strengths, and the hard edge. Neighbors still say "Placeholder".

## What is not in git

- `assets/` is gitignored. The vault copies under `assets/woodcuts/locked/xq-archetypes/` and the reference JPEGs under `assets/woodcuts/references/` exist only on the machine that cut them.
- Later redraws named `*-imagine.jpg` in `assets/woodcuts/concepts/archetypes/` are not the plates to ship. Use `apps/web/public/images/xq/`.
- No browser check was run. The dev server was not up when the heroes were committed.

## Commits

- `10dd190` — `feat(xq): add the unlisted experimental archetype pages`
- `c6d73d3` — `feat(xq): show the locked archetype plates in each character hero`

## Next

- Fill the remaining placeholder sections on the character pages only when asked.
- Keep `/experimental/xq` unlisted until it is meant to be public.

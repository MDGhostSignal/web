# Session Log — 2026-09-04

## Notturno teardown + WIT v2 greenfield Phase 1

- Deep-inspected Santioni Notturno (`santionispirits.com`, Active Theory HydraX 1.1.20, Plan8 sound): virtual Scroll, 18-scene stack with heightWorld multiples, MouseFluid composite, interactive selection/pour/vortex, UIL JSON (~3612 keys). Vault: `production/wit-v2-refs/`. Notes: `docs/NOTTURNO_TEARDOWN.md`.
- Replaced thin scaffold with **Structural Notturno** draft at `/what-is-this-v2`: typed `chapters.ts` (14 beats mapped from Notturno roles), sticky runway stages, GSAP ScrollTrigger scrub 0→1, story-only chrome (no SiteHeader), `noindex`, not in nav/sitemap.
- Live `/what-is-this` untouched. Nothing pushed.

### Files
- `apps/web/src/app/what-is-this-v2/{layout,page,chapters,ChapterStage,useStoryScroll,page.module.css}.*`
- `docs/NOTTURNO_TEARDOWN.md`
- `production/wit-v2-refs/` (local research; do not commit)

### Validation (`apps/web`)
- eslint / stylelint on v2 — clean
- assets:audit — pass
- Local smoke: `http://localhost:3001/what-is-this-v2` → 200

## WIT v2 — unique scene rebuild (no template)

- Replaced copy-paste ChapterStage with per-kind scene modules under `scenes/` (entry zoom, wander parallax strip, profile crop, approach tunnel, intimate hand/wash, portal iris, transition shatter, monument rise, select 3D fan, pour rig, vortex field, scale panorama, collection assemble, CTA shelf).
- Bright placeholders remain; composition/motion differs every beat.
- Playwright shot all beats → `production/wit-v2-refs/verify2/`.

### Open / next
- Replace placeholders with real GhostSignal art
- Optional audio; lock copy
- Do not push / do not swap live route until approved

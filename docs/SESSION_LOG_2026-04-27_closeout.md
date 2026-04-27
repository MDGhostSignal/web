# Session Log — 2026-04-27 (closeout)

End-of-day wrap covering two pieces of work after the main 2026-04-27
session (firefly swap + for-creators perf):

1. New `/admin/marketplace` surface — full Brand × Creator matchmaker
   with a 3D pixel-art town as the centerpiece map view.
2. `/what-is-this` hero video swap (sunset → japanese.mp4) plus the
   same stutter-fix treatment now applied to all three video heroes.

## 1. /admin/marketplace — new admin tab

### What it is

Internal tool for matching brands to creators by RQ resonance. New
fourth tab in the admin shell next to Members / RQ Responses /
Design Tasks. Mock-only for v1 (10 creators + 20 brands, every record
flagged `is_mock: true` with a visible MOCK pill); the same shapes are
designed to swap to real Members CRM + RQ submissions data without
touching call sites.

Three view modes inside the page:

- **Pool** — flat table over every entity, with kind badge, RQ
  archetype, three trait bars (values / authenticity / horizon),
  tag chips, and a "matched N" count. Filters: kind (All / Brands /
  Creators), match status (Any / Matched / Unmatched), free-text
  search.
- **Match** — the matchmaking surface. Left rail picks an anchor
  (Brands ↔ Creators toggle, search, scrollable list); right panel
  shows the anchor's archetype, active partnerships, and ranked
  suggestions as cards with an animated SVG resonance ring (tier-
  coloured strong/fair/weak). "Match of the day" pin at the top
  surfaces the highest-resonance pair the admin hasn't decided
  about. Tier filter chips + "Include passed" toggle on the
  suggestion list.
- **Map** — the 3D pixel-art JRPG town (its own section below).

### Research-first

Before designing the map, ran a UX-research agent across Folk,
Notion, Linear, Figma, ReactFlow, Obsidian, Octopath Traveler / HD-2D
techniques, and JRPG town conventions (Stardew, Earthbound, Chrono
Trigger, Animal Crossing). Top directives that shaped the spec:

- **HD-2D pipeline** — render to low-res target, upscale with
  NearestFilter on every texture. The Octopath Traveler trick.
- **No pixel-font UI labels.** The research's #1 amateur tell. All
  labels render in Inter at admin token sizes via drei `<Html>`.
- **Districts encode meaning** — brand quarter west, creator quarter
  east, plaza centre. Position is semantic, not decorative.
- **Connections drawn on the ground**, not arcs in the air.
  Earthbound + Chrono Trigger never lift paths off the tilemap.
- **Camera fixed at JRPG oblique angle, no free rotation.** Kills
  spatial memory if you let the user spin it.
- **Animations capped at low frequency.** Idle bob is a smooth
  ~0.6 Hz sin (~0.04 unit amplitude); plaza ring opacity-pulses
  every ~4 s. Nothing twitchy on a tool admins use for hours.

The full research report is in the agent transcript; the prioritized
do/avoid list lives in the prompt history if we need to reference it
later.

### Tech stack

Added four new dependencies, all code-split behind the Map view:

- `three` (~75 KB gz)
- `@react-three/fiber`
- `@react-three/drei` (Html, OrthographicCamera)
- `@react-three/postprocessing`
- `@types/three` (devDep)

Combined ~150 KB gz, dynamic-imported with `ssr: false` in
`page.tsx` so Pool + Match views stay light. Map only loads when an
admin clicks that tab.

### Sprite source

User said "yes" to Kenney CC0 packs but didn't drop one in yet — so
v1 ships with **programmatic 16×16 pixel sprites** authored as 2D
color-index arrays in `sprites.ts`. Three sprite definitions:

- Cottage shape (shared between brand + creator, palette swap only)
- Plaza fountain (shared shape, distinct stone/glow palette)

Each sprite bakes to a `CanvasTexture` with `magFilter = NearestFilter`
and renders on a billboarded `<sprite>` so it always faces the
camera. Brand cottages use a warm orange roof + admin-accent gold
trim; creator cottages use a cool teal roof + admin-info cyan trim.
Pixels-per-tile = 8 to give internal headroom for the camera zoom.

When/if the user drops a Kenney atlas into
`apps/web/public/admin/marketplace/sprites/`, the swap is contained
to `sprites.ts` and the `Lot` component's texture loader.

### Build approach

Three sequential passes, each independently committable but landing
in a single commit at the end of the session because the user asked
to keep iterating:

**Pass 1** — scaffold, deps, Marketplace tab, mocks, scoring lib,
localStorage match store (with `useSyncExternalStore` + cached
snapshot to avoid the cascading-render lint rule), Pool view, Match
view, basic Map view (sprites + camera + click-select + HTML labels).

**Pass 2** — animated dotted match ribbons drawn on the ground
between confirmed pairs (tier-coloured, dashes scroll along the
length, speed proportional to resonance), hover-dim non-connected
buildings + ribbons, idle bob on every building (per-building
phase offset so the village doesn't pulse in unison), plaza ring
opacity pulse, "match of the day" pin in the Match view, SVG
minimap overlay in the Map's bottom-left with click-to-select.

**Pass 3** — Pool kind + match-status filter chips, Match anchor
search + tier filter + "Include passed" toggle, page-level Reset
modal with destructiveSolid confirm.

### Persistence

Matches live in `localStorage` under `gs.marketplace.matches.v1`,
read through `useSyncExternalStore` so React never sees a fresh
array reference between writes. Cross-tab updates bridged via the
native `storage` event so a match in one tab repaints in another.
When real data lands, the same `Match` shape moves to a Supabase
`marketplace_matches` table — call sites read/write through
`marketplace-store.ts` and don't need to know.

### Token discipline

All admin chrome (PageHeader, view tabs, anchor rail, partner
cards, Pool table, Map toolbar, Selected panel, Minimap, Reset
modal, sprite labels) reads exclusively from `--admin-*` tokens.
Zero hex/px values in the new CSS files except inside the canvas
PNG sprite atlases (where the colours mirror admin-accent /
admin-info on purpose).

## 2. /what-is-this — japanese hero video + stutter-fix treatment

User dropped `apps/web/public/images/what-is-this/japanese.mp4` and
asked to swap the existing sunset loop + apply the same fix that
landed on /for-advertisers and /for-creators today.

### Source swap

`<source>` pair `sunset.webm` + `sunset.mp4` collapsed to a single
`japanese.mp4` (no `.webm` companion exists for the new clip — same
situation as the seattle swap on /for-creators earlier today). If
size becomes a concern on slower connections we can transcode a
webm later.

### Stutter treatment, lighter than the other two pages

What was applied:

- `.heroVideoWrapper` gets `isolation: isolate` + `contain: paint`.
  Same compositor-isolation move that landed on `.hero` on
  /for-advertisers and /for-creators. Self-contained stack so any
  fixed/blend overlay can't drag the video into a shared backdrop
  buffer.

What was already fine and didn't need touching:

- **No active `mix-blend-mode: overlay` element** sitting over the
  video. The `.staticFlicker` class in the stylesheet has the
  attribute, but it isn't rendered anywhere — dead code with no
  runtime impact. Worth a cleanup pass, but unrelated to today's
  fix.
- `.heroVideo` already has `will-change: opacity` only (no
  transform / filter), and the GSAP fade is opacity-driven. The
  in-file comments already document why.
- `HeroBlossoms` canvas is already lean: DPR capped at 1.5 (vs
  1.75 / 2 on the other pages) and only 32 particles (vs 52 / 95).
  No need to drop further.

Net change: two CSS lines + one source swap. Smallest of the three
hero stutter fixes done today, because most of the antipatterns
weren't present on this page to begin with.

## Files touched

| Area | Paths |
|------|-------|
| Marketplace mocks + scoring + store | `apps/web/src/lib/marketplace-mocks.ts` (new), `apps/web/src/lib/marketplace-match.ts` (new), `apps/web/src/lib/marketplace-store.ts` (new) |
| Marketplace UI | `apps/web/src/app/admin/marketplace/page.tsx` (new), `apps/web/src/app/admin/marketplace/marketplace.module.css` (new), `apps/web/src/app/admin/marketplace/map.module.css` (new), `apps/web/src/app/admin/marketplace/PoolView.tsx` (new), `apps/web/src/app/admin/marketplace/MatchBoard.tsx` (new), `apps/web/src/app/admin/marketplace/MatchMap.tsx` (new), `apps/web/src/app/admin/marketplace/MatchRibbon.tsx` (new), `apps/web/src/app/admin/marketplace/Minimap.tsx` (new), `apps/web/src/app/admin/marketplace/sprites.ts` (new), `apps/web/src/app/admin/marketplace/town-layout.ts` (new) |
| Admin shell | `apps/web/src/app/admin/layout.tsx` — Marketplace tab |
| Deps | `apps/web/package.json`, `apps/web/package-lock.json` — `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `@types/three` |
| /what-is-this video swap | `apps/web/src/app/what-is-this/page.tsx`, `apps/web/src/app/what-is-this/page.module.css` |
| New asset | `apps/web/public/images/what-is-this/japanese.mp4` |
| Docs | `docs/SESSION_LOG_2026-04-27_closeout.md` (this file) |

## Validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ 0 errors / 0 warnings |
| `npm run assets:audit` | ✅ 48 referenced assets exist (after japanese.mp4 wired in; was 49 before — sunset.{webm,mp4} no longer referenced) |
| Dev server | ✅ /admin/marketplace + /what-is-this both compile and render |
| Manual browser walkthrough | ⏳ user to confirm marketplace UX + japanese video stutter resolution |

## Closing state

- Branch: `f0fc199` (last push) → next commit pending (this work).
- Marketplace ships as v1 with mocks + localStorage. Real data
  plumbing (Members CRM + RQ submissions ingest, Supabase
  `marketplace_matches` table) deferred to v2.
- Three video heroes (`/for-advertisers`, `/for-creators`,
  `/what-is-this`) now share the same compositor-isolation pattern.
  If a fourth hero appears it should ship the treatment proactively.

## Non-goals / deferred for marketplace

- **Real entity ingest.** Creators from RQ submissions, brands from
  the Members CRM with `member_type = brand`. Will require a sync
  layer that tags real records vs mocks so the MOCK pill keeps
  meaning.
- **Supabase persistence** for matches. Same shape as the current
  `Match` type — `marketplace_matches` table with FK to brand_id /
  creator_id, status enum (`confirmed | rejected`), resonance int,
  notes text, created_at + updated_at.
- **Drag-to-match** for manual overrides. The current Match button
  on any suggestion already supports manually pairing whatever the
  algorithm ranked top-12, and "Include passed" surfaces rejected
  options. Drag-and-drop would be polish, not new capability.
- **Kenney CC0 sprite atlas swap.** Programmatic sprites land v1;
  a contained edit in `sprites.ts` + the `Lot` texture loader
  swaps to a Kenney pack when the user drops one in.
- **The "huge full RQ" quiz axes.** Adding new trait keys is a
  one-line edit to `TRAIT_KEYS` in `marketplace-mocks.ts` plus
  optional weight overrides in `TRAIT_WEIGHTS` — call sites don't
  change.
- **Reset is destructive but per-browser only.** No undo because
  there's nothing server-side to roll back from. When matches move
  to Supabase a reset should require an admin owner check + emit
  an audit row.

## Non-goals / deferred for /what-is-this

- **`.staticFlicker` dead code cleanup** — class defined but never
  rendered, has `mix-blend-mode: overlay` that would have been a
  perf concern if it were live. Worth removing in a future pass.
- **`.webm` for `japanese.mp4`** — same rationale as seattle.mp4
  earlier today. Transcode if size matters.

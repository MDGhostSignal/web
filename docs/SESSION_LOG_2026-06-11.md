# Session Log — 2026-06-11

Four items: (1) XQ fog spill signed off as done (no code change),
(2) the `/x-deck` trading-card surface wired into the end of the XQ
quiz funnel as the rewarding payoff, (3) the Verso template favicon
swapped for the GhostSignal cloud-mark in white across the public
site + admin CRM, (4) new `XQCharacterMark` — simplified logo-like
silhouettes for the 8 archetypes that replace the animated line-art /
3D renderers inside the spectrum map's small ringed circles.

## 1 · XQ fog spill — done

User confirmed the volumetric fog hero scene on `/xq-quiz` intro is at
acceptable quality. No code change today. The open thread from the
2026-06-09 log is resolved; no further iteration scheduled.

## 2 · X-Deck embedded into XQ results

The `/x-deck` deck was a standalone preview surface as of 2026-06-09.
Today it ships into the real quiz funnel:

> Quiz completion → persona reveal → spectrum/character map →
> **matched deck** → conviction dossier → RQ CTA

### New: viewer adapter — `src/lib/match/viewer-from-xq.ts`

`viewerProfileFromXQ(result, basics)` converts an XQResult + the
contact-step `Basics` into a `ViewerProfile`. Axis normalisation mirrors
the existing `toSpectrumPosition` logic in ResultsScreen — same
`(winning - opposing) / (winning + opposing)` formula, same sign
convention — so the deck's compatibility scoring agrees with where the
spectrum map plots the user. `memberType` derives loosely from
`basics.type` ("creator"/"podcast" → creator, "brand"/"agency" → brand,
else "other"). Falls back to "You" / "—" when basics are absent so the
`/xq-characters` and `/xq-characters2` preview pages still render.

### New: reusable section — `src/app/x-deck/XDeckSection.tsx`

Extracted the deck + thumbnail rail + active-card detail panel out of
`/x-deck/page.tsx` into a self-contained component that takes a viewer
+ candidate list. Skips the HeroCallout (its outer host owns that on
both surfaces: page-level HeroCallout on `/x-deck`, the persona reveal
stage on the results screen).

### CSS — dual-scope token block

`x-deck.module.css` previously declared all `--xd-*` tokens inside
`.page { … }`. Added a sibling `.section { … }` selector that re-uses
the same token list so the module's rules cascade in either host.
`.section` is mostly minimal — drops `min-height: 100vh`, drops the
page background, and uses a negative side-margin escape hatch
(`margin: 48px calc(50% - 50vw) 12px`) to break out of the 860px
`xq-container` cap when embedded so the deck's ±2 peeking cards have
room. Responsive breakpoint at 880px updated to cover `.section` too.

### Wiring

- `apps/web/src/app/xq-quiz/page.tsx` — passes `basics` to
  `ResultsScreen` (previously it was held in page state but never
  forwarded; basics arrive from the contact step and live there until
  finalize).
- `apps/web/src/app/xq-quiz/ResultsScreen.tsx` — accepts optional
  `basics` prop (defaults to `EMPTY_BASICS`), derives a viewer via the
  adapter, renders `<XDeckSection>` between the spectrum map and the
  bucket dossier with eyebrow "Your matched deck".

Candidates still come from `MOCK_CANDIDATES`; the real matching algo
will replace that feed when it lands.

## 3 · Favicon — Verso template replaced with cloud-mark in white

The shipping `app/favicon.ico` was still the Next.js / Verso starter
default (25KB, dated 2026-02-05). Swapped for the GhostSignal
cloud-mark rendered as a clean white silhouette.

### Source asset problem
The brand-kit `cloudmark-white.png` is a halftone-dot rendering of the
cloud with the GS letters punched out — beautiful for print, useless
at favicon scale (16-32px) where the dots vanish and only fragments
of the GS letters survive.

### Pipeline — `apps/web/scripts/build-favicon.mjs`

A reusable Node script that produces the full icon set from
`public/brand/png/cloudmark-white.png`:

1. **Recover the silhouette** — heavily downscale the source via
   sharp's lanczos resize (natural antialiasing collapses halftone
   dots into a smooth gradient), then alpha-threshold at 50/255 to
   get a binary cloud shape, then force every surviving pixel to
   pure white. The GS letters merge into the cloud body at small
   sizes — desired result for a tiny mark.
2. **Center on a transparent canvas** with an 8% inset so the cloud
   has breathing room inside the icon bounds.
3. **Multi-size ICO** — handwritten encoder that wraps PNG payloads
   (16/32/48) in an ICONDIR + ICONDIRENTRY block. PNG-embedded ICOs
   have been supported since Vista and are dramatically smaller than
   BMP-embedded ones (final ICO: 499 bytes).
4. **Modern PNG icons** — also drops `src/app/icon.png` (32px,
   transparent) and `src/app/apple-icon.png` (180px, white cloud
   flattened onto the brand dark navy `#0B0F12` since iOS doesn't
   honor transparency on home-screen icons).

### Wiring
No layout change needed — Next.js App Router's file-based icon
convention auto-injects the three link tags from
`src/app/{favicon.ico, icon.png, apple-icon.png}`. Verified on the
running dev server:

```
<link rel="icon"            href="/favicon.ico?…"   sizes="48x48"   type="image/x-icon"/>
<link rel="icon"            href="/icon.png?…"      sizes="32x32"   type="image/png"/>
<link rel="apple-touch-icon" href="/apple-icon.png?…" sizes="180x180" type="image/png"/>
```

Each href is content-hashed so browsers don't serve the old Verso
.ico from cache. Same three tags emit on `/admin/*` routes (admin
layout doesn't override metadata; root layout's file-convention icons
cascade to every page).

## 4 · XQ archetype marks for the spectrum map

The spectrum map on `/xq-quiz/results` (and the gallery directory on
`/xq-characters`) draws each of the 8 archetypes inside a small ringed
circle (76px default, 56px compact). The existing `XQCharacter`
(line-art) and `XQCharacter3D` (animated constellation) renderers are
authored at viewBox 240×280 — at the cramped circle size their thin
strokes go jittery and the constellation animations are barely visible.

New `components/xq/XQCharacterMark.tsx` ships 8 simplified logo-like
silhouettes built around the head-shape system the constellation
gallery already established. The duplicate from that system
(Steward + Conservator both circles) is resolved by giving Conservator
a square — matches their "ordered tools, measured posture" brief
register:

| Code  | Archetype          | Head             | Signature glyph     |
|-------|--------------------|------------------|---------------------|
| C-P-C | Steward            | Circle           | Flame above         |
| C-P-L | Shepherd           | Oval             | Staff + 3-dot flock |
| C-S-C | Conservator        | Square           | Compass cross       |
| C-S-L | Institution Builder| Rounded rectangle| 3 pillars + base    |
| X-P-C | Artisan            | Diamond          | Brush + paint dot   |
| X-P-L | Catalyst           | Triangle up      | Spark trail (4 dots)|
| X-S-C | Designer           | Hexagon          | Drafting grid       |
| X-S-L | Architect          | Pentagon         | 3-node graph        |

Visual rules:
- viewBox 100×100; head at (50, ~32), signature in lower half.
- `currentColor` strokes with strokeWidth 2.4 (thicker than the
  line-art set so they read confidently at 56px).
- No animation; pure SVG that can rasterise crisply at any size.
- Parent wrapper sets `color: identity.accent` so each mark picks up
  its archetype color the same way `XQCharacter3D` does.

### Variant wiring on the spectrum map

`XQSpectrumMap`'s `variant` prop is now `"mark" | "line-art" | "3d"`,
defaulting to `"mark"`. Existing call sites:

- `/xq-characters/page.tsx` — no variant (was `"line-art"` default,
  now `"mark"`). Better fit for the cramped circles on this page too.
- `/xq-characters2/page.tsx` — explicit `variant="3d"`, unchanged.
  The page's whole premise is showing the 3D constellation register
  as a directory, so the 3D thumbnails belong here.
- `ResultsScreen.tsx` — was passing its own `variant` through to the
  map. Stopped doing that — `variant` on ResultsScreen now controls
  only the big hero portrait at the top of the dossier; the spectrum
  map always uses `"mark"`.

### Preview surfaces unchanged

`/xq-characters/[code]` and `/xq-characters2/[code]` continue to call
`ResultsScreen` without `basics`. The optional prop + fallback adapter
behaviour keeps these previews rendering cleanly — they show a deck
with viewer name "You" and org "—".

## Files touched

### New
- `apps/web/src/lib/match/viewer-from-xq.ts` — adapter
- `apps/web/src/app/x-deck/XDeckSection.tsx` — reusable section
- `apps/web/scripts/build-favicon.mjs` — repeatable favicon generator
  (sharp pipeline + handwritten multi-size ICO encoder)
- `apps/web/src/app/icon.png` — 32×32 cloud silhouette (modern PNG icon)
- `apps/web/src/app/apple-icon.png` — 180×180 cloud on dark navy panel
- `apps/web/src/components/xq/XQCharacterMark.tsx` — 8 logo-like
  archetype marks (head shape + signature glyph) for the spectrum map.

### Modified
- `apps/web/src/app/x-deck/page.tsx` — uses `XDeckSection` instead of
  duplicating the deck/rail/detail composition inline.
- `apps/web/src/app/x-deck/x-deck.module.css` — dual-scope token block
  (`.page, .section`), new `.section` host rule, 880px breakpoint
  extended to cover `.section`.
- `apps/web/src/app/xq-quiz/ResultsScreen.tsx` — basics prop, viewer
  derivation, embedded `<XDeckSection>` after the spectrum map; also
  stopped passing `variant` to the spectrum map so it always uses
  the new `"mark"` renderer.
- `apps/web/src/app/xq-quiz/page.tsx` — pass `basics` through to
  `ResultsScreen`.
- `apps/web/src/components/xq/XQSpectrumMap.tsx` — extended `variant`
  union with `"mark"` (the new default) routing to `XQCharacterMark`.
- `apps/web/src/app/favicon.ico` — overwritten (was Verso template
  leftover, now multi-size 16/32/48 cloud silhouette ICO).

## Validation

All three gates green at session close:
- `npm run typecheck` — clean
- `npm run lint` — clean
- `npm run lint:css` — clean

## Open / next-step notes

- Real matching algorithm not yet wired — both the candidate list and
  the cosine+Jaccard scorer are placeholders. When that lands, swap the
  `MOCK_CANDIDATES` import + `scoreAndRank` call inside `XDeckSection`
  for the real data path.
- The detail panel CTAs ("Request intro", "Save for later") on the
  embedded deck are still no-ops carried over from the preview surface.
  Wire them when the marketplace introduction flow exists.

## 5 · Marketplace RPG — Phases 0 & 1 (the big one)

The admin marketplace map (`/admin/marketplace?view=map`, a Phaser
top-down village with procedural canvas-painted sprites) is being
replaced with a public **multi-user persistent browser RPG** at
`/world`. Goal: 8-archetype users meet, chat, and discover each other
in a shared world. Plan locked in `docs/MARKETPLACE_RPG_PLAN.md`.

### Stack (locked after deep research)
Phaser 3 (client) + Colyseus on Fly.io (authoritative game server,
room-per-zone) + Supabase Postgres (persistence) + Supabase Realtime
(chat + presence) + Tiled (level editor) + LibreSprite + LPC base
(free CC-BY-SA). 32→64×64 pixel art on dark-navy world with
brand-accent rim lights — Eastward lighting at Sea of Stars scale.

### Phase 0a — old map removed (~280KB deleted)
12 files dropped: PhaserMap.tsx, MatchMap.tsx, Minimap.tsx,
MatchRibbon.tsx, sprites.ts, town-layout.ts, the entire `game/`
directory (painter.ts 2925 L, scenes.ts, worldLayout.ts, store.ts),
and two CSS modules. Sidebar's `?view=map` deep-link pruned.
Marketplace page reduced to Pool + Match views.

### Phase 0b — `/world` route + game-server workspace
- New `apps/web/src/app/world/{page.tsx, WorldClient.tsx,
  world.module.css}` — Next 16 server component + client Phaser host.
- New `apps/game-server/` workspace (Node + tsx) running Colyseus
  0.16.5 on ws://localhost:2567. Single `world` room, max 50 players.
- Deps: `phaser@^3.90.0` (pinned away from 4 — v3 ecosystem still
  the right call), `colyseus.js@^0.16.22`, `@colyseus/schema@^3` on
  the web side. Removed leftover `grid-engine`. Server pulls
  `colyseus@^0.16.5`, `@colyseus/ws-transport@^0.16.0`.

### Phase 1 — MVP "two tabs see each other"
Working as of session end.
- 80×60 tile world (2560×1920 px), dot-grid backdrop, PLAZA · SPAWN
  marker at world center.
- Per-archetype colored circle avatars (halo + shadow + facing-eye +
  display-name label, "YOU ·" prefix on own).
- WASD / arrows movement with normalized diagonals, camera follow.
- 10 Hz `move` broadcasts; remote players lerp to target at 12/sec.
- Status HUD top-left: `Connected · session · archetype · players N`.

### Schema-sync detour
Initial plan was Colyseus delta sync via `@colyseus/schema`. Hit
days-of-friction wall: `@type` decorators transform inconsistently
between tsc (server) and Next.js/Turbopack/SWC (client), producing
wire-protocol mismatches ("Cannot read properties of undefined
(reading 'onAdd')", "field not defined / definition mismatch").
Tried client-side schema mirror with `experimentalDecorators` +
`useDefineForClassFields: false` in `tsconfig.json` — got partway
(field slot created) but never fully hydrated.

**Pivoted to manual JSON broadcast at 10 Hz.** Server keeps a plain
`Map<sessionId, PlayerData>`, broadcasts `{ players: [...] }` on a
`setInterval` and immediately on join. Bandwidth at scale: 50 players
× ~80 bytes × 10 Hz = ~40 KB/s per client — trivial. Phase 3 can
revisit schema sync if/when Next + SWC stabilises decorator support.

## Files touched (Marketplace RPG)

### New
- `docs/MARKETPLACE_RPG_PLAN.md` — master plan.
- `apps/web/src/app/world/page.tsx` · `WorldClient.tsx` ·
  `world.module.css` — public `/world` route.
- `apps/game-server/package.json` · `tsconfig.json` · `.gitignore`
  — Colyseus workspace.
- `apps/game-server/src/index.ts` — server bootstrap.
- `apps/game-server/src/rooms/WorldRoom.ts` — WorldRoom (manual
  broadcast variant).

### Modified
- `apps/web/src/app/admin/marketplace/page.tsx` — view switcher
  reduced to Pool + Match.
- `apps/web/src/app/admin/layout.tsx` — sidebar Map link removed.
- `apps/web/.stylelintignore` — `src/app/world/` added.
- `apps/web/package.json` + `package-lock.json` — phaser /
  colyseus.js / @colyseus/schema added, grid-engine removed.

### Deleted (Phase 0a)
- `apps/web/src/app/admin/marketplace/PhaserMap.tsx` ·
  `MatchMap.tsx` · `Minimap.tsx` · `MatchRibbon.tsx` ·
  `sprites.ts` · `town-layout.ts`
- `apps/web/src/app/admin/marketplace/phaser-map.module.css` ·
  `map.module.css`
- `apps/web/src/app/admin/marketplace/game/` — `painter.ts` (2925 L)
  · `scenes.ts` · `worldLayout.ts` · `store.ts`

## Validation (RPG section)
- `npm run typecheck` (web) — clean.
- `npm run lint` (web) — clean (2 react-hooks warnings on inline
  Phaser class declaration, non-blocking).
- `npm run typecheck` (game-server) — clean.
- Both tabs at `localhost:3000/world` see each other walking around;
  movement is responsive; presence reconciles cleanly on close.

## Next-step thread for the next session
- **Design pass** — replace placeholder colored circles with LPC
  64×64 sprites for the 8 archetypes (4-direction walk + idle +
  talk). LibreSprite as editor, LPC base from OpenGameArt
  (CC-BY-SA; `/world/credits` page becomes mandatory).
- **Tilemap** — first Tiled map (Plaza zone) with ground / decor /
  collision / spawn-marker layers.
- **HUD layer** — DOM React presence + chat input + nearby rail,
  styled with new `--world-*` tokens.
- **Auth** — Supabase JWT through Colyseus `onAuth`, route gated to
  authed users with completed XQ. Reads `world_profiles` table.
- **Schema sync revisit** — try `@colyseus/schema` again only if /
  when Next + SWC decorator transform stabilises, OR move shared
  schema to a pre-built TS package both apps consume.

## Memory check

Per `feedback_proactive_admin_memory.md` — the X-Deck → XQ-results
integration is the moment the trading-card pattern landed in production
(the 2026-06-09 log explicitly flagged this as the trigger for a
proactive memory update). Updated `project_rq_xq_ecosystem.md` with a
new "X-Deck — the matching payoff surface" subsection noting the
funnel termination + mock-candidate-for-now status. New project memory
`project_marketplace_rpg.md` + reference memory `reference_rpg_stack.md`
written for the RPG work (indexed in MEMORY.md).

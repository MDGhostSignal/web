# Session Log — 2026-06-12

Continued the marketplace RPG visual upgrade through Phase 2. Big art
direction pivot — the procedurally-painted-primitives approach got
called out as "improvising on a low-slop level" and replaced with
real pixel-art from public sources.

## 1 · Phase 2 polish on Phase 1 MVP

Built on yesterday's working two-tabs-see-each-other MVP:

- **Speech bubbles** — server `chat` message handler (200-char cap),
  client bubble that floats above the speaker for 4s with archetype
  accent border, follows the avatar's x while it lives.
- **Chat input HUD** — DOM React form pinned bottom-center, blur
  backdrop, accent-purple focus ring, sends via ref into the Phaser
  scene's `sendChat()` method.
- **Sprite identity polish** — dual-sprite stack on each avatar
  (multiply-tint base + tintFill ADD-blend overlay) so the LPC body
  reads as the archetype color without flattening the shading.
- **Idle bob + halo pulse** — gentle Sine.inOut tweens for "alive"
  feel.
- **Archetype badge above head** — head-shape system from the XQ
  mark logos (circle / oval / square / round-rect / diamond /
  triangle / hexagon / pentagon) for instant identification.
- **Avatar vertical anchoring** — feet now sit on the shadow
  ellipse cleanly; halo widened to encompass the whole figure.

Connection-debug detour cost ~30 min: chrome MetaMask extension was
silently swallowing `localhost:2567` WebSocket connections. Fix was a
one-character change — switch `NEXT_PUBLIC_GAME_SERVER_URL` default
from `ws://localhost:2567` → `ws://127.0.0.1:2567`. Numeric loopback
bypasses the extension's URL filter.

## 2 · Art direction reset — from primitives to real pixel art

The procedural Phaser-Graphics tiles (4-color grass, 4-stone path
flagstones, simple cottage primitives) read as "improvised" and
"low-slop level" — the user wanted Secret of Mana / SNES Action-RPG
quality. Wholesale replaced.

### Failed attempt: LPC Tile Atlas
Downloaded `Atlas.zip` from OpenGameArt (bluecarrot16 et al,
CC-BY-SA 3.0). Used as: cathedral facade for pavilions, brick wall
+ arched-door studios for atelier, pine trees + bushes for grove,
torch stands. **User feedback: "looks terrible and the style is
mismatched."** True — LPC atlas is a curated grab-bag of dozens of
artists; the cathedral, brick walls, and pine trees don't share a
visual language.

### Winning approach: ArMM1998 Zelda-like Overworld (CC0)
Found `ArMM1998/Overworld.png` (640×576, CC0, public domain) in the
`Lubenem/2DPixelRPG` GitHub mirror. Single artist, single palette,
single style — proper SNES Action-RPG aesthetic with houses,
fountains, statues, gates, banners, market stalls, trees, bushes
all in one cohesive vocabulary. License page:
`https://opengameart.org/content/zelda-like-tilesets-and-sprites`

## 3 · One-at-a-time sprite calibration

Initial wholesale replacement still had mis-aligned frames (pieces
of neighbours bleeding in). User flagged it. Pivoted to a slow,
methodical workflow:

1. Strip the world bare (remove zones, paths, scattered trees,
   plaza centerpiece). Keep only ground + spawn ring + player.
2. For each sprite: pick candidate coords → extract at 4× scale via
   sharp → view → adjust until the crop is clean → register frame
   → place in world.

Verified coords (all from `apps/web/public/world/sprites/pipoya/overworld-armm.png`):

| Frame              | x, y, w, h          |
|--------------------|---------------------|
| `house-a`          | 96, 0, 80, 80       |
| `cottage-small`    | 212, 84, 32, 56     |
| `fountain-a`       | 336, 136, 64, 56    |
| `bush`             | 80, 256, 32, 32     |
| `statue`           | 128, 492, 40, 60    |
| `stone-gate`       | 56, 488, 80, 88     |
| `banner-blue`      | 144, 464, 28, 48    |
| `silo`             | 0, 336, 56, 120     |
| `yurt`             | 60, 352, 40, 96     |
| `market-stall`     | 320, 368, 64, 72    |

10 sprites placed in a 3-row grid in the top-right corner of the
world. All scaled 3× their atlas-native size so they're properly
imposing next to a 60-px LPC character.

## 4 · User-supplied Harvest Moon assets

User dropped two SNES Harvest Moon sprites into
`apps/web/public/world/sprites/`:

- `SNES - Harvest Moon - Backgrounds - Village (Summer).png`
  (768×1024) — full village scene. Wired in as a background landmark
  at the centre-left of the world, scaled 3× for now. Intended to
  become the world's actual background image once art direction
  finalises.
- `SNES - Harvest Moon - Animals - Chicken.png` (312×46) — two-row
  sheet of chickens with red combs (mature, ~16×23 cells) + yellow
  chicks. Named frames added: `hen`, `hen-walk1/2`, `chick`,
  `chick-walk`. Placed under the house in the top-right with idle
  Y-bob tweens at different periods.

Note: Harvest Moon sprite/background rips are from a commercial Nintendo
title and live in legal grey territory. Fine for internal iteration;
must be replaced before any public/production launch.

## 5 · Architecture: named texture frames

Adopted `this.textures.get("armm").add(name, 0, x, y, w, h)` pattern
for atlas frames. Coords live in one table in
`registerArmmFrames()` — single source of truth, easy to nudge
without re-extracting any PNGs. Same pattern for the Harvest Moon
chickens.

## Files touched (today)

### New
- `apps/web/public/world/sprites/pipoya/` — ArMM1998 overworld
  atlas + Pipoya supplementary tile sheets (grass, dirt, water,
  flowers, samplemap, basechip). All CC0 / free-license.
- `apps/web/public/world/sprites/SNES - Harvest Moon - *` —
  user-supplied background + chickens.
- `apps/web/public/world/sprites/lpc-atlas/` — earlier failed LPC
  attempt (`base_out_atlas.png`, `terrain_atlas.png`,
  `Attribution.txt`, `extracted/`). Kept on disk for reference.
- `apps/web/public/world/sprites/buildings/` — LPC cottage parts
  and adobe town set, similarly kept for reference.
- `apps/web/public/world/sprites/armm/extracted/` — earlier extracted
  ArMM crops (superseded by the single-atlas + named-frames approach).

### Modified
- `apps/web/src/app/world/WorldClient.tsx` — speech bubbles, chat
  input HUD, dual-sprite glow stack, archetype badge, idle bob, halo
  pulse, registerArmmFrames table, sprite calibration workflow,
  Harvest Moon background + chickens.
- `apps/web/src/app/world/world.module.css` — chat form styling.
- `apps/game-server/src/rooms/WorldRoom.ts` — chat message broadcast.
- `apps/web/public/world/CREDITS.md` — ArMM1998 (CC0), LPC atlas
  (CC-BY-SA 3.0 + GPL 3.0).

## Validation

- `npm run typecheck` (web) — clean.
- `npm run typecheck` (game-server) — clean.
- `/world` route loads, 10 ArMM sprites + village + chickens render
  next to the working LPC character avatar.

## Open / next-step notes

- **MetaMask block on dev**: documented as a comment in WorldClient.
  Long-term solved by deploying the game server to a real domain;
  the dev workaround (127.0.0.1) is fine until then.
- **Harvest Moon licensing**: must be replaced before public launch.
  Track which sprites are licensed-safe (LPC characters, ArMM1998
  buildings/decor) vs hold-only-for-dev (Harvest Moon).
- **Forum centerpiece still primitive**: didn't get to a clean
  replacement; left out so the world is just spawn + test sprites.
- **Tiled map**: not started. Phase 3 work.
- **Schema sync**: still on manual JSON broadcast. Phase 3 revisit
  when SWC decorator support stabilises.

## Memory check

No new memory entries warranted. The RPG project memory + RPG stack
reference written 2026-06-11 still hold. The "verify after deploy"
discipline doesn't trigger since this work was dev-only — no prod
deploy yet.
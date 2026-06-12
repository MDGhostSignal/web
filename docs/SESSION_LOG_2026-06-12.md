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

---

## Addendum — chicken AI + village-fit world

Continued the same day after the log above was written. Two
follow-on edits to the world that change its identity from "test
grid with sprites scattered around" to "single coherent village
scene with living NPCs."

### A · World sized to fit the village background exactly

The Harvest Moon village PNG is 768 × 1024 px. At the 3× display
scale we settled on, that's 2304 × 3072 px → 72 × 96 tiles (32-px
tile size). The old soft world bounds were 80 × 60 — wider, much
shorter — which left the map cropped at top/bottom and gave dead
green margin on the sides.

Changed in two places, no constants file yet — both ends must agree
or the server clamps players to a different rectangle than the
client renders.

- `apps/game-server/src/rooms/WorldRoom.ts` —
  `WORLD_W` 80 → 72, `WORLD_H` 60 → 96.
- `apps/web/src/app/world/WorldClient.tsx` —
  `WORLD_W_TILES` 80 → 72, `WORLD_H_TILES` 60 → 96.
  Added `VILLAGE_SCALE = 3` so future tweaks live in one place.

Village now blits at `(0, 0)` with origin `(0, 0)` and `scale = 3`,
filling the world bounds pixel-aligned with no cropping. Procedural
grass tile, dirt patch graphics, plaza ring + label, and all 10
ArMM landmark sprites — gone. The village painting is the world.

### B · Chicken NPC state machine

Replaced the static hen+chick (idle-bob only) with a proper
proximity-reactive NPC. Each chicken is a tiny FSM:

```
idle ──(player within trigger radius)──▶ scared
scared ──(timer 1.8–3.2s expires)──▶ wander
wander ──(reach target or 4s cap)──▶ idle
```

- **idle** — Sine.inOut Y-bob tween; checks all known avatar
  positions each frame for nearest-neighbour distance.
- **scared** — velocity vector pointing away from the player that
  spooked it; runs at hen-speed 180 px/s or chick-speed 140 px/s
  for 1.8–3.2 s random duration. `setFlipX` mirrors the sprite by
  horizontal velocity.
- **wander** — picks a random spot 60–160 px from its home anchor,
  walks there at 55% speed, snaps back to idle on arrival. Hard
  4 s cap so a stuck chicken can't loop forever.

Hen has a 110-px trigger radius, chick 80-px (smaller scaredy-baby
vibe). Each keeps its own `homeX/homeY` anchor so they don't drift
across the map over time — wander always re-targets near home.

Walk animation: turned out the Harvest Moon chicken-sheet "walk"
frames are pose snapshots, not a clean cycle — swapping between
them at any reasonable speed produced visible flicker. Now using a
single static "running pose" frame while moving; the apparent
motion comes from world-position change each tick, not frame
swapping.

### C · Chicken sprite-sheet frame correction

The chicken sheet is 312 × 46 px. Yesterday's `registerArmmFrames`
guessed 16 × 23 cells (sheet is "two rows of small sprites").
Re-measured: it's actually 13 columns × 2 rows of **24 × 23**
cells. Fixed in `registerHarvestMoonFrames`:

- `hen` at (0, 0), `hen-walk1` at (24, 0), `hen-walk2` at (48, 0).
- `chick` at (0, 240), `chick-walk` at (24, 240).

Y-coords for chicks unchanged from yesterday (they're on row 2
of the sheet starting at y=240); only the cell widths were off.

### D · Function rename

`registerArmmFrames()` deleted (all 10 ArMM landmark sprites
removed with the procedural tile pass). Replaced by
`registerHarvestMoonFrames()`. The ArMM atlas PNG is still on
disk under `apps/web/public/world/sprites/pipoya/` for reference
in case we want to bring landmarks back in a later phase, but
nothing references it from code.

## Files touched (addendum)

### Modified
- `apps/game-server/src/rooms/WorldRoom.ts` — world bounds
  72 × 96.
- `apps/web/src/app/world/WorldClient.tsx` — village-fit world,
  procedural/ArMM scene torn down, chicken FSM, frame coord fix.

### New (uncommitted assets surfaced this session)
- `apps/web/public/world/sprites/SNES - Harvest Moon - Backgrounds - Church.png`
  — held aside; not wired in yet.
- `apps/web/public/assets.manifest.json` — generated asset index.
- `apps/web/public/images/home/*.{mp4,webm}` — raw + webm
  variants for `blackcloud2`, `city`, `cloud`, `cloudblack`,
  `country`, `twoclouds` (matches the existing optimized/webm
  pattern for hero clips).
- `apps/web/public/images/what-is-this/garden4.mp4` — raw
  original alongside existing `garden4-optimized.mp4` + `.webm`.
- `logo/SVG/ghostsiggnal-admin-white-4c.svg` — admin lockup.

## Open / next-step notes (carried)

- **Church.png** sitting in `world/sprites/` but unused — decide
  whether it becomes a landmark in the village painting or gets
  removed.
- **Walk animation flicker**: punted to a single static running
  pose. Real fix is a hand-cycled walk frame pair on the same
  sprite anchor, but the source sheet doesn't have one cleanly —
  would need re-drawn frames or a different chicken sprite.
- **Held back from commit**: `docs/nimble_contacts.csv` (CRM
  contact PII export — 261 rows). Not committed; left untracked
  pending explicit decision on whether it should live in this
  repo or a private/internal store.
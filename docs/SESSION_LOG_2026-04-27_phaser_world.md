# Session Log — 2026-04-27 (Phaser-powered marketplace world)

Continuation of the same calendar day as the earlier logs. This
session swapped the `/admin/marketplace` Map tab from the React-Three-
Fiber isometric scene to a Phaser 3 + grid-engine top-down RPG world,
then layered five artistic upgrade passes on top, then ended with a
big layout restructure to give every entity a 10×5 tile property.

The R3F `MatchMap.tsx` is left on disk for reference but no longer
imported. The Map tab now renders `./PhaserMap` (dynamic, ssr:false).

## Stack additions

`apps/web/package.json` picked up three runtime dependencies:

- `phaser ^4.0.0` — the 2D game framework. Browser-only (references
  `window` at module load).
- `grid-engine ^2.52.0` — the Annoraaq plugin that snaps Phaser
  characters to the tilemap grid, drives random-wander NPCs, and
  cycles walk-animation frames during movement.
- `zustand ^5.0.12` — minimal store bridging Phaser (game side) and
  React (overlay side) for approach prompts + dialog modals.

All three are dev-time pulled in only when the user opens the Map
tab — `dynamic({ ssr: false })` keeps them off the rest-of-site
bundle.

## New files

```
apps/web/src/app/admin/marketplace/
├── PhaserMap.tsx              ~440 lines — React component that
│                                mounts the Phaser game + renders
│                                the HUD / approach prompt / dialog
│                                modals on top of the canvas.
├── phaser-map.module.css      ~460 lines — frame styles + approach
│                                prompt + NPC dialog speech box.
└── game/
    ├── painter.ts             ~1030 lines — every pixel of every
    │                            sprite, painted procedurally to a
    │                            canvas. No external assets.
    ├── scenes.ts              ~450 lines — BootScene (texture
    │                            preload) + WorldScene (tilemap,
    │                            entities, input, approach detection).
    ├── store.ts               ~60 lines — Zustand store for the
    │                            Phaser ↔ React bridge.
    └── worldLayout.ts         ~300 lines — pure layout data: house
                                placements, NPC start positions,
                                tilemap builder, tree scatter.
```

## Phase 1–6 (foundation arc)

These were laid down earlier in the session before the artistic pass
started. Capturing them here for completeness.

### Phase 1 — Phaser foundation

- `dynamic({ ssr: false })` import inside `useEffect` so the Phaser
  + grid-engine + scenes modules only land in the bundle and run
  when the Map tab actually mounts.
- `import * as Phaser` instead of `import Phaser from "phaser"` — the
  ESM bundle ships named exports only, no default.
- `(window as unknown as { Phaser: unknown }).Phaser = Phaser;` after
  the dynamic import. grid-engine's bundle references `Phaser` as a
  global at runtime (it assumes the script-tag distribution model),
  so without this assignment `gridEngine.create(...)` throws
  "Phaser is not defined" the first time it touches a Phaser class.
- `Phaser.Scale.RESIZE` instead of `FIT` so the canvas fills the
  parent container without letterboxing on wide layouts. Pixel-art
  crispness is preserved by `pixelArt: true` + `roundPixels: true`
  on the game config + `setZoom(4)` on the camera, not by scaling a
  fixed virtual resolution.
- Player movement: `cursors` + `WASD` keys, polled in `update()` and
  forwarded to `gridEngine.move("player", Direction.X)`.

### Phase 2 — World + entity houses

- `painter.ts` `paintTileset()` returns a 96×16 strip with grass /
  grass+flower / dirt / water / stone / bridge tiles, registered
  under key `"tiles"` via `this.textures.addCanvas(key, canvas)`.
- `worldLayout.buildHousePlacements()` placed every entity on a
  tidy grid (5 cols, gap 3 tiles).
- House sprites placed on top of the grass tiles; the underlying
  tile gets `ge_collide: true` on its properties object so the
  player can't walk through a house. Tile properties are spread
  before mutation (`tile.properties = { ...(tile.properties ?? {}),
  ge_collide: true }`) to avoid collision-flag bleed across same-
  index tiles, since Phaser shares property objects by reference.

### Phase 3 — Entity card on house enter

- Approach detection in `WorldScene.update()`: the player tile is
  compared against every house's door tile every frame. When the
  player is on a door tile, the entity id is written to the Zustand
  store via `useGameStore.getState().setApproachedEntity(...)`.
- React side reads `approachedEntityId` and renders an animated
  approach prompt at the bottom of the canvas. Pressing E sets
  `openedEntityId`, which triggers the shared admin `Modal` with
  the entity's RQ traits, tags, and confirmed partners.
- Scene pause/resume tied to `anyDialogOpen` so movement freezes
  while a dialog is up.

### Phase 4 — NPCs + dialog

- One civilian NPC per entity, painted as recolours of the player
  sprite, placed adjacent to their own house's door.
- `gridEngine.moveRandomly(npcId, NPC_WANDER_DELAY_MS,
  NPC_WANDER_RADIUS)` for the slow random wander.
- Approach detection extended: house door wins (player must be
  exactly ON the door tile), then cardinal-adjacency to any wandering
  NPC. Lower-priority detection clears when a higher-priority one
  wins so the prompt never stacks.
- Custom in-canvas dialog overlay (not a shared Modal) so the player
  keeps world context visible while reading. Closes on Esc / E /
  the close button.

### Phase 5 — Environment polish

- New tile types: STONE (impassable mountain border) + BRIDGE
  (walkable wood planks).
- Mountain border ringed the entire map; vertical river separated
  the brand and creator quarters; bridge tile placed where the
  horizontal dirt path crossed the river.
- `forEachTile` pass after `createLayer` to set `ge_collide: true`
  on every water + stone tile in one shot.
- Tree sprites painted procedurally + scattered deterministically
  via a coprime hash. Tile under each tree gets `ge_collide` so
  trees block movement.

### Phase 6 — Wandering villagers + flavor

- Six non-entity NPCs scattered in margin areas with single-line
  flavor lore (Old Sigi, Old Mira, Old Henk, Wanderer Tessa,
  Wanderer Roe, Wanderer Lin).
- Same wander mechanic as entity NPCs. Distinct dialog component
  in PhaserMap — slimmer than the entity version, no kind chip,
  no tag list.
- New store fields `approachedFlavorId` / `openedFlavorId`. Approach
  priority: house door > entity NPC > flavor NPC.

## Artistic upgrade — five chunks

Foundation read fine but characters floated, houses were tiny and
identical. Five chunked passes addressed this.

### Chunk 1 — 2×2-tile houses

- `HOUSE_PX = 32` constant; `paintHouse(palette, decor)` rebuilt
  procedurally instead of as a literal pixel grid.
- Layered roof (3 colors + eaves rim + shingle seams), wall band
  with plank shadows, two windows with sills + flowerpots, framed
  door with brass knob + draped banner, cobblestone foundation,
  chimney with smoke puff, optional roof bird.
- `decorForEntity(id, kind)` hashes entity id to pick:
  - flowerpot bloom color (5 choices: pink / yellow / purple / red
    / white)
  - banner color (4 choices, palette by kind)
  - chimney side (left / right)
  - bird presence (~1-in-3)
- `HousePlacement` carries 2-tile width + height. Grid spacing went
  to `HOUSE_GAP = 4`. Brand origin `(4, 4)` 5×4 grid; creator origin
  `(36, 4)` 5×2 grid.

### Chunk 2 — long-house variant

- `paintLongHouse(palette, decor)` — same canvas size, different
  composition. Lower main roof so the wall band reads as 1.5
  floors. A small gabled dormer projects above the main roofline
  carrying a second-floor attic window.
- `houseTypeForEntity(id)` deterministic picker among `"long" |
  "double" | "farm"`. `paintHouseForEntity` dispatches by type.
  At this point only `long` had a real painter; `double` and `farm`
  fell back to the cottage so the world kept rendering.

### Chunk 3 — player walking animation

- `paintCharacterSheet(palette)` — 48×64 px sheet (3 cols ×
  4 rows of 16×16 frames). Cols are leftFoot / standing / rightFoot;
  rows are down / left / right / up in grid-engine's default order.
- All four direction rows are visually identical front-facing for
  now (proper profile / back views are deferred). Animating just the
  leg pose (and a 1-pixel arm swing) reads as walking.
- `addCharacterFrames(canvasTexture)` — slices the sheet into 12
  numbered sub-frames inside the existing CanvasTexture so Phaser
  / grid-engine can flip between them.
- `walkingAnimationMapping: 0` on the player's grid-engine character
  config wires the cycle: leftFoot → standing → rightFoot every
  step. Initial frame = 1 (standing) so the player isn't mid-stride
  at spawn.

### Chunk 4 — per-entity NPC sheets

- `paletteForEntityNpc(id, kind)` hashes entity id to pick:
  - hair (warm pool for brand: chestnut / blonde / dark / sandy /
    auburn; cool pool for creator: jet / black / mahogany / silver-
    streak)
  - tunic (warm vs cool pools, same idea)
  - skin tone (4-tone pool, applied to all NPCs regardless of kind
    to broaden representation)
  - trouser tone
- BootScene paints one walk sheet per entity, keyed `npc_${id}`.
- Each NPC's grid-engine config gets `walkingAnimationMapping: 0`
  so the leg cycle animates during random wander too.

### Chunk 5 — flavor NPC sheets

- Same scheme as entity NPCs but per `flavorId` and biased by the
  variant pool — elder palette is silver / gray hair + plum-burgundy
  tunics; traveler is sandy / blonde + mustard-olive.
- 6 unique sheets. Replaces the two shared `npc_elder` / `npc_
  traveler` single-frame textures.
- Killed off `paintBrandNpc`, `paintCreatorNpc`, `paintElderCivilian`,
  `paintTravelerCivilian`, `paintPlayer`, the `PLAYER` pixel grid,
  the legacy `paintBrandHouse` / `paintCreatorHouse`, and the old
  16×16 `HOUSE` literal — none referenced anymore after the chunked
  upgrade.

## Layout restructure — 10×5 properties

Final pass of the day. The user wanted properties large enough that
each house can have a real garden + entrance, with the option of
much bigger houses (up to 9 tiles wide) for special variants like
the farmhouse.

### Per-entity property slot

`PROPERTY_W_TILES = 10`, `PROPERTY_H_TILES = 5`. Every entity gets
this much real estate. The default house (cottage / long / double)
sits in the upper-left at inset (1, 1) and occupies 3×2 tiles —
that leaves the right and bottom strips (a generous L-shaped
margin) for garden / entrance / chickens later.

`HousePlacement` grew first-class fields:

- `propertyX`, `propertyY` — top-left of the 10×5 slot
- `tileX`, `tileY` — top-left of the actual house sprite
- `houseW`, `houseH` — house footprint in tiles
- `doorTileX`, `doorTileY` — interaction tile

This means future variants (farmhouse, double house) can override
size / position per entity without touching layout maths.

### Map reorganisation

Old: brand quarter west of map centre (cols 4–20), creator quarter
east (cols 36–53), vertical river at col 29 between, horizontal
path at row 21.

New: stacked vertically.

```
Row  0       — stone border
Rows 2–21    — Brand quarter (5 cols × 4 rows × 10×5 properties)
Row  22      — horizontal dirt path full width
Rows 24–33   — Creator quarter (5 cols × 2 rows × 10×5 properties)
Rows 34–38   — open meadow (tree scatter, flavor NPCs)
Row  39      — stone border
```

The river was dropped entirely — it no longer fits cleanly between
the wider properties and the path now provides the visual divide.
The bridge tile is still painted into the tileset for future use
but no longer placed on the map.

`PLAYER_SPAWN` moved to `(30, 22)` — middle of the map on the new
horizontal path between the two quarters.

### Tree scatter — property-aware

`buildTreePositions` now excludes the entire 10×5 property zone of
every entity, not just the 4-tile house footprint. Trees still
respect path / border / spawn / flavor-NPC buffers as before.

### Flavor NPC relocation

All six flavor NPC start tiles fell inside the new property zones
under the old positions. Relocated:

- `Old Sigi` (2, 22) — west margin on the path row
- `Old Mira` (57, 22) — east margin on the path row
- `Old Henk` (15, 36) — bottom meadow
- `Wanderer Tessa` (30, 36) — bottom meadow centre
- `Wanderer Roe` (45, 36) — bottom meadow east
- `Wanderer Lin` (30, 22) — middle of the path

`Wanderer Roe`'s line was rewritten — the original referenced "the
bridge over the river", which no longer exists.

## Files touched

```
apps/web/package.json                          (deps: phaser, grid-engine, zustand)
apps/web/src/app/admin/marketplace/page.tsx    (MatchMap dynamic import → PhaserMap)
apps/web/src/app/admin/marketplace/PhaserMap.tsx                (new)
apps/web/src/app/admin/marketplace/phaser-map.module.css        (new)
apps/web/src/app/admin/marketplace/game/painter.ts              (new)
apps/web/src/app/admin/marketplace/game/scenes.ts               (new)
apps/web/src/app/admin/marketplace/game/store.ts                (new)
apps/web/src/app/admin/marketplace/game/worldLayout.ts          (new)
```

The previous R3F `MatchMap.tsx` and its `sprites.ts` / scene
modules are untouched. They still compile but are not imported.

## Where this leaves things

Functional today:

- Walkable Zelda-style world with stone-mountain border + dirt path
  + grass meadow.
- 30 entity properties (20 brand, 10 creator) each with a uniquely-
  decorated 32×32 cottage and a uniquely-coloured villager pacing
  in the garden.
- 6 wandering flavor NPCs with single-line lore.
- E-key interactions: entity visit card (full RQ traits + tags +
  partners) at the door; NPC speech bubbles for both entity and
  flavor NPCs; priority house > entity NPC > flavor NPC.
- Walking animation on every character — leftFoot → standing →
  rightFoot cycle driven by grid-engine movement events.
- Per-entity unique sprites (hair / skin / tunic / trousers all
  hashed deterministically from the entity id).

Pending — explicit user request from the session's last message:

- **Farmhouse variant** — wider house with a fenced garden, entrance
  path with flowers, applied to every 3rd brand entity.
- **Long house variant rework** — current sprite is still 32-wide;
  needs re-pixeling for the 48-wide target now that property has
  more room.
- **Double house variant** — duplex with two doors (still falls
  back to cottage placeholder).
- Garden decoration sprites placed inside each property's empty
  tiles — flower beds, picket fences, paths.
- **Chickens** — small bird-like characters that run around the
  farmhouse garden.
- **Roof bird animation** — currently birds are static pixels at
  the ridge; should occasionally flutter around the house and
  return.
- **Bees** — tiny 4×4 sprites that fly between flower positions.
- **Variable house sizes** — `houseW` / `houseH` are first-class on
  `HousePlacement` but every entity is currently 3×2. The farmhouse
  + long-house pass will exercise the real range (3×2 up to 9-wide
  for big estates).

## Limitations to flag

- Walking animation: all 4 direction rows are the same front-facing
  view. Walking left / right / up still shows the character looking
  at the camera. Proper profile + back-view sheets would be a
  focused next pass.
- `paintLongHouse` was written for a 32×32 canvas under the previous
  layout. After chunk 1 of the artistic pass it was widened to 48×32
  with a flat-ridge roof, but the dormer geometry hasn't been re-
  proportioned for the new wider property — needs a second pass
  alongside the farmhouse work.
- Per-entity texture cost: 30 entities × 1 house texture + 30 NPC
  walk sheets + 6 flavor sheets + 1 player sheet = ~67 small
  CanvasTextures. Each is a few KB; total well under a MB. Fine.

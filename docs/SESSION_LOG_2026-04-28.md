# Session Log — 2026-04-28

Long session. Two top-level arcs: (1) admin/RQ-responses gets a per-
submission detail view with the radar graph + raw answers; (2) the
marketplace Phaser world expands into a full living town — 4 brand
+ 4 creator house variants, a 5-district map, a road network, and a
central town square with an editable community-board statue.

## 1. Admin shell — logo size revert

Previous session's "scale light variant by 15.6/19.2" override was
wrong: the user updated the light SVG so its viewBox now matches the
dark variant exactly (`0 0 190.4 19.2`, identical glyph paths).
Removed the override; both variants now inherit `height: 22px` from
`.brandLogo` and render at the same size.

## 2. /admin/rq-responses — graph + answers in expanded row

Each row's expanded view now shows three blocks:

- **Contact + RQ Results** (existing two-column header, augmented
  with an RQ-code mono pill + clarity inline)
- **Signal Profile** — full `<RQResultsGraph>` (radar chart + per-
  axis cards) inside a dark-leaning `.graphScope` card that re-
  declares the `--rq-*` token shim the public quiz component reads.
- **Their Answers** — every quiz answer grouped by axis (Values /
  Authenticity / Horizon / Undertone) with the question key as a
  monospace pill + the human label + the value.

`buildRQResult(sub)` reconstructs an `RQResult` from `details_json`
with a regex fallback parsing `rq_code` for older rows that pre-date
the column. Profile_json maps directly to `result.profile`.

### Light-mode variant of the graph

Public graph CSS hardcodes `rgba(255,255,255,…)` for rings + axis
lines (tuned for dark). Added `.admin-root[data-theme="light"]
.graphScope` overrides recolouring the wrapper to a warm off-white
(`#f7f3ec`) and inverting every white-on-dark stroke/fill in the
graph chrome — radar rings, axis lines, scale text, axis cards, bar
panels, mid-mullions. Chart now reads cleanly in both admin themes
without forking the shared component CSS.

## 3. Marketplace Phaser world — major expansion

### NPC wander de-sync

Every NPC + flavor villager previously stepped on the same
`NPC_WANDER_DELAY_MS` tick. Replaced single-shared-cadence with per-
NPC randomized step delay (70%–150% of base) + per-NPC randomized
0–1500ms initial offset before first step. Village no longer
metronomes.

### Brand quarter — 4 variants

`BrandHouseType = "cottage" | "manor" | "barn" | "workshop"` with
`brandHouseTypeForEntity(id)` deterministic picker. Each gets its
own painter (`paintHouse` for cottage 3×2, `paintManor` 5×2,
`paintBarn` 6×2, `paintWorkshop` 4×2) with distinct silhouettes:

- **Cottage** — pitched roof, 2 windows, single door, chimney.
- **Manor** — central gable pediment + attic eye, twin chimneys,
  double-leaf door with brass knockers + lintel banner, 4 symmetric
  windows.
- **Barn** — red plank walls + slate roof, big X-braced sliding
  double door, hayloft window with hay tuft, weathervane spike. No
  regular windows.
- **Workshop** — asymmetric stepped roof over a wide multi-pane
  shopfront with striped awning, centred door + striped overhang,
  hanging shop sign on a wrought-iron bracket, tall smoking chimney.

`BRAND_HOUSE_FOOTPRINTS` carries `{ w, h, doorOffsetX }` per type;
`worldLayout.placeOnGrid` reads it through `footprintFor()`.

### Brand yard decorations

Per-variant sprite layer in the property's bottom row:

- Cottage — 3 alternating flowers (pink/yellow/white)
- Manor — 5-tile picket-fenced flower garden (fence + 4 flowers +
  fence)
- Barn — 3-tile vegetable patch (carrot tops + cabbage rounds)
- Workshop — crate stack + iron-banded barrel + 2 potted plants

### Live elements

- **Chickens** — 2 per barn, hop within ±1 of a home tile via Phaser
  tween (per-chicken random hop cadence). Non-grid-engine = no
  collision.
- **Bees** — 1 per brand property with 2+ flowers, slow flight
  (1.2–2.2s Sine ease) between random flower targets, 3-bob wing
  flutter on arrival. Per-bee start offset 0–2000ms.

### Creator quarter — 4 variants

`CreatorHouseType = "cottage" | "houseboat" | "greenhouse" | "tower"`,
mirrored picker + footprint map.

- **Cottage** — uses `paintHouse` with creator (cool) palette.
- **Houseboat** 5×2 — beached-boat silhouette: dark blue tapered
  hull with anchor charm, deck rail with vertical posts, cabin with
  brass-rimmed porthole windows + central double-leaf door, mast
  rising above the cabin with a fluttering red pennant.
- **Greenhouse** 4×2 — peaked glass roof with copper finial, white-
  frame mullion grid over translucent green glass walls, plant
  silhouettes visible inside, cross-mullion glass-paned door, brick
  foundation. Uses its own glass+frame palette regardless of wash.
- **Tower** 3×2 — narrow studio: steep gable roof with antenna spike
  + small dish on the apex, attic studio window in the gable, board-
  and-batten siding, herb-pot shelf above the door.

### Creator yards

- Cottage — 3 cool flowers (blue/purple/cyan)
- Houseboat — rope coil + 2 lily pads (pink/purple) + rope coil
- Greenhouse — watering can + 2 cool potted plants
- Tower — artist easel with paint smears + wooden stool

`BEE_FLOWER_TYPES` extended with the new flower / lily-pad / potted
variants — bees now fly in creator yards too.

### Pets, birds, polish

- **Path stoops** — every house door gets a 2-tile dirt walk in
  front, the southern stoop tile flowing into the world's main path.
- **Roof bird flutter** — `paintBird` extracted from `paintHouse`'s
  cottage texture and lifted into a separate `paintRoofBird` sprite.
  Cottages with `decor.hasBird=true` get a free sprite layer that
  flutters every 6–15s (Sine yoyo×2, ±5px y) with per-bird start
  offset 0–8000ms.
- **Pets** — sleeping orange tabby on every manor's front-walk row
  (curled-up tabby with stripes + closed eye + tail wrap); seagull
  wheeling in a 14×8 px ellipse over every houseboat (period 8–14s,
  random start phase per bird). Manor cats are static; gulls use
  `tweens.addCounter` with a custom `onUpdate`.
- **Per-house wall + roof wash variation** — added `BRAND_WALL_WASHES`
  (cream / peach / butter / sand) + `BRAND_ROOF_WASHES` (rust /
  terracotta / ochre / brick) + matching cool pools for creator.
  `washedPaletteFor(id, kind)` overlays a hashed wall + roof wash on
  the kind's base palette in `paintHouseForEntity`. 16 combinations
  per kind so two adjacent cottages with the same banner read as
  visibly different buildings.

### Map expansion + 3 new districts

`MAP_HEIGHT_TILES` doubled (40 → 80) then bumped further (→ 90 →
110) as the layout grew. New constants for `EXISTING_AREA_END_Y`,
`CHURCH_REGION`, `FOREST_REGION`, `MOUNTAIN_REGION` (final values
after restructures: church 73–83, forest 84–96, mountain 97–108).

- **Mountain** — new `ROCKY_GROUND` tile (tile index 6) auto-fills
  the region; `paintMountainPeak` is a 16×32 sprite with snow cap +
  stepped rock highlights, scattered via coprime hash. Both peak
  tiles (top + bottom) flagged `ge_collide`.
- **Sacred forest** — dense tree scatter (every ~2nd valid tile)
  with a 3-tile clear ring around the centre + a 16×24 `paintShrine`
  sprite (two flanking standing-stone megaliths, mossy bases, wider
  altar block, glowing offering bowl with halo). Both shrine tiles
  collidable.
- **Church** — 80×48 sprite (5×3 tiles): cream-stone nave with twin
  jewel-tone stained-glass windows showing a gold cross on blue,
  iron-studded double doors with brass ring handles, slate-blue
  pitched roof flaring outward from a central bell tower, small
  cross at the apex. All 15 footprint tiles collidable.

#### Church enter interaction

`approachedChurch` + `openedChurch` in `useGameStore`. Scene's
`update()` checks player position against `church.doorTileX/Y`;
E-key opens. PhaserMap renders an "E — Enter the Church" prompt and
a JRPG dialog box ("You step inside. Sun pours through stained
glass…") on open. Esc/E closes; scene pauses while open.

### Road network + wayfinding

- **Two-lane main road** at cols 29–30 from row 1 to the southern
  border. Skips the church + shrine footprints; deferred to
  cobblestone inside the town square.
- **Decorative shoulder stones** — small grey rounded rocks
  scattered every 3 rows along both shoulders (cols 28 / 31),
  alternating left/right.
- **Per-house feeder paths** — 1-tile dirt strips from each door
  east (west houses) or west (east houses) along the door row to the
  road shoulder. Houses sharing a door row collapse into shared
  east-west alleys.
- **3 grass variants** — palette indices 20–24 added; new tile
  arrays `TALL_GRASS` (mossy darker base) + `DAISY_GRASS` (white +
  yellow daisies). Grass picker hashes to each variant at densities
  flower 1/17, daisy 1/19, tall 1/23.
- **Wayfinding signs** — unified `SignPlacement` covers per-house
  occupant signs + 5 district directional signs (Brands, Creators,
  Church, Forest, Mountain). Initial pass had Phaser text overlays
  rendered into the world; user feedback removed them. Final state:
  signs are sprite-only, sign tiles `ge_collide`, player walks
  cardinal-adjacent and presses E to read; dialog shows title +
  body. House signs moved to the side wall (`tileX + houseW` for
  west houses, `tileX - 1` for east) at house mid-row so they don't
  block the feeder.
- **Trees + stones skip roads** — `buildRoadTileSet(houses)` Set
  shared across `buildTreePositions`, `buildForestTreePlacements`,
  `buildRoadStonePlacements` so nothing decorative lands on a path.

### Housing realignment around the road

User asked for all houses to connect to the main road. Brand quarter
went from 5 cols × 4 rows to 4 cols × 5 rows (split 2-west + 2-east
of the road); creator from 5 cols × 2 rows to 4 cols × 3 rows.
`PROPERTY_COLS_X = [7, 17, 33, 43]` shared by both quarters so rows
line up across the road. PATH_ROW shifted 22 → 27, CREATOR_ORIGIN_Y
shifted 24 → 29, all flavor NPC rows updated, district sign Y values
updated.

### Town square

User asked for a circular plaza at the dead centre of the map where
the player starts.

- **Map shifted** to 60×110 with all districts pushed south to make
  room.
- **Cobblestone tile** (index 9) added to palette + tile data.
- **Circle region** — `TOWN_SQUARE_CENTER_X/Y = (30, 59)`,
  `TOWN_SQUARE_RADIUS = 9`. `isInTownSquare(x,y)` uses Euclidean
  distance for a true circle (corners of bounding rect are missing).
  Every tile inside the circle becomes cobblestone, overriding the
  road's dirt + the grass-variant picker.
- **PLAYER_SPAWN** moved from `(30, 22)` to `(30, 63)` — south of the
  statue, on cobblestone, facing the board.
- **Lavish rose sprite** — multi-petal crimson bloom with yellow
  stamen + light-pink heart + green leaf + dirt patch. Different
  from the existing 3-stem flower-bed; visually substantial.
- **Rose placements** — sparse perimeter ring (outer 1.5 tiles,
  every other tile by parity, 2-tile gap at cols 29–30 for road
  entry) + centre ring around the statue base.
- **Massive statue** — `paintStatue` is a 64×96 sprite (4 wide × 6
  tall): stepped marble foundation → fluted column shaft with
  bronze inscription plaque on the front → cornice capital → robed
  haloed serene figure with closed eyes + flowing robes. The 4×4
  footprint is collidable; the upper 2 tile rows visually extend
  above the footprint so the statue reads as very tall.

#### Editable community board

Statue's interaction tile (`(30, 62)`, immediately south of the 4×4
footprint) opens the board. Store fields `approachedBoard`,
`openedBoard`, `boardText` + setters (board text is NOT cleared on
scene reset). PhaserMap hydrates `boardText` from
`localStorage["gs.marketplace.boardText"]` on mount with a default
welcome string, persists every change, and renders a centred admin
`Modal` titled "Town Board" containing a controlled `<textarea>`.
Esc closes; E is reserved for typing into the textarea.

## Files touched

| Area | Paths |
|------|-------|
| Admin shell logo revert | `apps/web/src/components/admin/AdminShell.module.css` |
| RQ responses | `apps/web/src/app/admin/rq-responses/page.tsx`, `.../rq-responses.module.css` |
| Marketplace painters | `apps/web/src/app/admin/marketplace/game/painter.ts` (~1400 → ~2000+ lines) |
| Marketplace world layout | `apps/web/src/app/admin/marketplace/game/worldLayout.ts` |
| Marketplace scenes | `apps/web/src/app/admin/marketplace/game/scenes.ts` |
| Marketplace store | `apps/web/src/app/admin/marketplace/game/store.ts` (church + sign + board fields) |
| Marketplace overlay | `apps/web/src/app/admin/marketplace/PhaserMap.tsx` |
| Marketplace styles | `apps/web/src/app/admin/marketplace/phaser-map.module.css` (board textarea) |
| Brand horizontal logo SVG | `apps/web/public/images/brand/ghostsiggnal-admin-hor-4c.svg` (user-supplied update — viewBox + paths now match the dark variant) |
| Docs | `docs/SESSION_LOG_2026-04-28.md` (this file) |

## Validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ 0 errors / 0 warnings |
| Manual browser walkthrough | ⏳ user iterated through every change live in dev |

## Open follow-ups / pending

- Wider east-west cross-road at PATH_ROW (currently single-tile
  width) if the user wants a more pronounced brand↔creator divider.
- Centre-area roses around the statue could be denser; currently 10
  tiles in the cardinal/diagonal slots.
- `paintLongHouse` is now dead code (no dispatcher reaches it).
  Could be removed in a future cleanup.
- `.staticFlicker` dead-code on `/what-is-this` still pending from
  earlier session.
- Orphaned home/ videos + `Creator Life Cycle.xlsx` still untracked,
  same disposition as prior logs.

// Phaser's ESM build (`phaser/dist/phaser.esm.js`) ships named exports
// only — no default. `import * as Phaser` works for both runtime
// (Phaser.Scene, Phaser.AUTO, Phaser.Scale, etc.) and type access
// (Phaser.Types.*).
import * as Phaser from "phaser";
import type { GridEngine } from "grid-engine";
import { Direction } from "grid-engine";

import { MOCK_BRANDS, MOCK_CREATORS } from "@/lib/marketplace-mocks";

import {
  CHAR_FRAME_PX,
  CHAR_SHEET_COLS,
  CHAR_SHEET_ROWS,
  COLLIDABLE_TILE_INDICES,
  PLAYER_CHAR_PALETTE,
  paintBarrel,
  paintBee,
  paintCat,
  paintCharacterSheet,
  paintChicken,
  paintChurch,
  paintCrateStack,
  paintDirectionalSign,
  paintEasel,
  paintEntityNpcSheet,
  paintFlavorNpcSheet,
  paintFlowerBed,
  paintHouseForEntity,
  paintHouseSign,
  paintLilyPad,
  paintMountainPeak,
  paintPicketFence,
  paintPottedPlant,
  paintRoadStone,
  paintRoofBird,
  paintRopeCoil,
  paintRose,
  paintSeagull,
  paintShrine,
  paintStatue,
  paintStool,
  paintTileset,
  paintTree,
  paintVeggiePatch,
  paintWateringCan,
  TILE_INDEX,
} from "./painter";
import { useGameStore } from "./store";
import {
  MAP_HEIGHT_TILES,
  MAP_WIDTH_TILES,
  NPC_WANDER_DELAY_MS,
  NPC_WANDER_RADIUS,
  PLAYER_SPAWN,
  TILE_SIZE,
  buildBeePlacements,
  buildChickenPlacements,
  buildChurchPlacement,
  buildFeederPaths,
  buildFlavorNpcPlacements,
  buildRoadPath,
  buildRoadStonePlacements,
  buildSignPlacements,
  buildStatuePlacement,
  buildTownSquareRoses,
  buildForestTreePlacements,
  buildMountainPeakPlacements,
  buildPetPlacements,
  buildRoofBirdPlacements,
  buildShrinePlacement,
  buildHousePlacements,
  buildNpcPlacements,
  buildYardDecorations,
  buildTreePositions,
  buildWorldTileData,
  type FlavorNpcPlacement,
  type HousePlacement,
  type NpcPlacement,
  type SignPlacement,
} from "./worldLayout";

/**
 * Slice a CanvasTexture into 16×16 sub-frames keyed 0..11 in row-major
 * order. Matches the layout grid-engine's default walkingAnimationMapping
 * expects (cols = leftFoot/stand/rightFoot, rows = down/left/right/up).
 *
 * Without this, Phaser sees the canvas as one giant texture and there
 * are no frames to flip between during walk animation.
 */
function addCharacterFrames(tex: Phaser.Textures.CanvasTexture | null) {
  if (!tex) return;
  let frameKey = 0;
  for (let row = 0; row < CHAR_SHEET_ROWS; row++) {
    for (let col = 0; col < CHAR_SHEET_COLS; col++) {
      tex.add(
        frameKey,
        0,
        col * CHAR_FRAME_PX,
        row * CHAR_FRAME_PX,
        CHAR_FRAME_PX,
        CHAR_FRAME_PX,
      );
      frameKey++;
    }
  }
}

/* =====================================================================
 * BootScene — preload textures, then hand off to WorldScene.
 * ===================================================================== */

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "Boot" });
  }

  preload() {
    // Tileset strip (6 tiles × 16px wide).
    this.textures.addCanvas("tiles", paintTileset());
    // Player walk sheet — 3 cols (leftFoot/stand/rightFoot) × 4 rows
    // (down/left/right/up) of 16×16 frames laid out for grid-engine's
    // default `walkingAnimationMapping`. addCanvas only creates the
    // base texture; we add each 16×16 sub-frame manually so Phaser /
    // grid-engine can flip between them as the player walks.
    addCharacterFrames(
      this.textures.addCanvas(
        "player",
        paintCharacterSheet(PLAYER_CHAR_PALETTE),
      ),
    );
    // Per-entity house textures — each entity gets a uniquely
    // decorated 32×32 cottage (palette by kind + deterministic
    // chimney / banner / flowerpot / bird from the entity id).
    for (const e of MOCK_BRANDS) {
      this.textures.addCanvas(`house_${e.id}`, paintHouseForEntity(e.id, "brand"));
    }
    for (const e of MOCK_CREATORS) {
      this.textures.addCanvas(`house_${e.id}`, paintHouseForEntity(e.id, "creator"));
    }
    // Per-entity NPC walk sheets — each entity's villager is uniquely
    // recoloured (hair / skin / tunic / trousers all hashed from id),
    // so the brand and creator quarters look like a small crowd of
    // individuals instead of two armies of clones.
    for (const e of MOCK_BRANDS) {
      addCharacterFrames(
        this.textures.addCanvas(
          `npc_${e.id}`,
          paintEntityNpcSheet(e.id, "brand"),
        ),
      );
    }
    for (const e of MOCK_CREATORS) {
      addCharacterFrames(
        this.textures.addCanvas(
          `npc_${e.id}`,
          paintEntityNpcSheet(e.id, "creator"),
        ),
      );
    }
    // Wandering villagers (Phase 6) — per-instance walk sheets, hashed
    // from flavorId so each civilian on the map looks like their own
    // person. Variant biases the palette pool toward elder vs traveler.
    for (const f of buildFlavorNpcPlacements()) {
      addCharacterFrames(
        this.textures.addCanvas(
          `npc_${f.flavorId}`,
          paintFlavorNpcSheet(f.flavorId, f.variant),
        ),
      );
    }
    // Decorative tree (placed as sprites, not tiles, with the
    // underlying grass tile flagged collidable).
    this.textures.addCanvas("tree", paintTree());
    // Yard decorations — single-tile sprites placed inside each brand
    // property's bottom strip. Non-collidable for v1.
    this.textures.addCanvas("yard_flower-pink", paintFlowerBed("#e070a0"));
    this.textures.addCanvas("yard_flower-yellow", paintFlowerBed("#f0d050"));
    this.textures.addCanvas("yard_flower-white", paintFlowerBed("#f4eee0"));
    this.textures.addCanvas("yard_flower-blue", paintFlowerBed("#5e9eea"));
    this.textures.addCanvas("yard_flower-purple", paintFlowerBed("#a070d0"));
    this.textures.addCanvas("yard_flower-cyan", paintFlowerBed("#7fc0d2"));
    this.textures.addCanvas("yard_veggie", paintVeggiePatch());
    this.textures.addCanvas("yard_crate", paintCrateStack());
    this.textures.addCanvas("yard_barrel", paintBarrel());
    this.textures.addCanvas("yard_fence", paintPicketFence());
    this.textures.addCanvas("yard_potted-pink", paintPottedPlant("#e070a0"));
    this.textures.addCanvas("yard_potted-yellow", paintPottedPlant("#f0d050"));
    this.textures.addCanvas("yard_potted-blue", paintPottedPlant("#5e9eea"));
    this.textures.addCanvas("yard_potted-purple", paintPottedPlant("#a070d0"));
    this.textures.addCanvas("yard_lily-pink", paintLilyPad("#e070a0"));
    this.textures.addCanvas("yard_lily-purple", paintLilyPad("#a070d0"));
    this.textures.addCanvas("yard_rope", paintRopeCoil());
    this.textures.addCanvas("yard_watering-can", paintWateringCan());
    this.textures.addCanvas("yard_easel", paintEasel());
    this.textures.addCanvas("yard_stool", paintStool());
    // Chicken — small bird-like sprite for the barn yards.
    this.textures.addCanvas("chicken", paintChicken());
    // Bee — tiny insect sprite that flies between flower tiles.
    this.textures.addCanvas("bee", paintBee());
    // Roof bird — perches on cottage ridges, flutters periodically.
    this.textures.addCanvas("roofbird", paintRoofBird());
    // Pets — manor cats + houseboat seagulls.
    this.textures.addCanvas("cat", paintCat());
    this.textures.addCanvas("seagull", paintSeagull());
    // Mountain peak — tall 16×32 landmark sprite.
    this.textures.addCanvas("mountain_peak", paintMountainPeak());
    // Sacred shrine — 16×24 sprite at the centre of the forest.
    this.textures.addCanvas("shrine", paintShrine());
    // Church — 80×48 5×3-tile building.
    this.textures.addCanvas("church", paintChurch());
    // Wayfinding signs — small house signs + larger directional signs.
    this.textures.addCanvas("house_sign", paintHouseSign());
    this.textures.addCanvas("directional_sign", paintDirectionalSign());
    // Road shoulder stone — small decorative grey rock.
    this.textures.addCanvas("road_stone", paintRoadStone());
    // Lavish rose — town-square perimeter + centre decoration.
    this.textures.addCanvas("rose", paintRose());
    // Town-square statue — 64×96 sprite (4×6 tiles).
    this.textures.addCanvas("statue", paintStatue());
  }

  create() {
    this.scene.start("World");
  }
}

/* =====================================================================
 * WorldScene — tilemap, player, houses, approach detection.
 * ===================================================================== */

export class WorldScene extends Phaser.Scene {
  // grid-engine attaches itself to the scene under this property
  // because of the `mapping: "gridEngine"` config in PhaserMap.tsx.
  gridEngine!: GridEngine;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  private houses: HousePlacement[] = [];
  /** Map of "tileX,tileY" → HousePlacement for quick lookup of which
   *  house a tile belongs to during approach detection. */
  private houseByTileKey = new Map<string, HousePlacement>();

  private npcs: NpcPlacement[] = [];
  /** Wandering civilians (Phase 6) — non-entity NPCs that scatter the
   *  meadow with flavor lines. Same wander mechanic as entity NPCs. */
  private flavorNpcs: FlavorNpcPlacement[] = [];
  /** Single church placement — stashed for door-tile approach checks. */
  private church = buildChurchPlacement();
  /** Single town-board statue placement — stashed for door-tile checks. */
  private statue = buildStatuePlacement();
  /** All wayfinding signs — stashed for cardinal-adjacency checks. */
  private signs: SignPlacement[] = [];

  constructor() {
    super({ key: "World" });
  }

  create() {
    // ---- 1. Tilemap data ----------------------------------------
    // Mountain-stone border, vertical river, dirt path with bridges
    // where it crosses the river, and a sprinkle of grass flowers.
    // See worldLayout.buildWorldTileData for the full layout rules.
    const data = buildWorldTileData();

    const map = this.make.tilemap({
      data,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = map.addTilesetImage("tiles");
    const groundLayer = tileset
      ? map.createLayer(0, tileset, 0, 0)
      : null;
    if (!groundLayer) return;

    // Mark every water + stone tile as collidable so the player can't
    // walk through the river or the mountain border. Phaser tiles
    // share their tileset properties by reference, so we copy before
    // mutating to avoid collidable-flag bleed across same-index tiles.
    const collidableSet = new Set<number>(COLLIDABLE_TILE_INDICES);
    groundLayer.forEachTile((tile) => {
      if (collidableSet.has(tile.index)) {
        tile.properties = {
          ...(tile.properties ?? {}),
          ge_collide: true,
        };
      }
    });

    // ---- 2. House placements + collision -------------------------
    // Each house occupies a 2×2 tile footprint (32×32 px sprite). All
    // four tiles get ge_collide so the player can't walk through any
    // part of the cottage. Phaser tiles share their tileset properties
    // by reference, so we copy before mutating to avoid collidable-
    // flag bleed across same-index tiles.
    this.houses = buildHousePlacements();
    for (const h of this.houses) {
      for (let dy = 0; dy < h.houseH; dy++) {
        for (let dx = 0; dx < h.houseW; dx++) {
          const tile = groundLayer.getTileAt(h.tileX + dx, h.tileY + dy);
          if (tile) {
            tile.properties = {
              ...(tile.properties ?? {}),
              ge_collide: true,
            };
          }
        }
      }
      const sprite = this.add.sprite(
        h.tileX * TILE_SIZE,
        h.tileY * TILE_SIZE,
        `house_${h.entity.id}`,
      );
      sprite.setOrigin(0, 0);
      // Stash the placement on the sprite for any later hit-testing.
      sprite.setData("entityId", h.entity.id);
      this.houseByTileKey.set(`${h.tileX},${h.tileY}`, h);
    }

    // ---- 2b. NPC placements (entity + flavor) -------------------
    // Built before trees so the tree scatter can avoid every start
    // tile. Sprites + grid-engine wiring happen after the player is
    // registered (step 4) so the character roster stays in one call.
    this.npcs = buildNpcPlacements(this.houses);
    this.flavorNpcs = buildFlavorNpcPlacements();

    // ---- 2c. Trees ----------------------------------------------
    // Decorative scatter — sprites sit on top of grass tiles, with
    // the underlying tile flagged ge_collide so the player can't
    // walk through them. Avoids houses, doors, NPC start tiles.
    const trees = buildTreePositions(
      this.houses,
      this.flavorNpcs,
      this.npcs,
    );
    for (const t of trees) {
      const tile = groundLayer.getTileAt(t.tileX, t.tileY);
      if (tile) {
        tile.properties = {
          ...(tile.properties ?? {}),
          ge_collide: true,
        };
      }
      const sprite = this.add.sprite(
        t.tileX * TILE_SIZE,
        t.tileY * TILE_SIZE,
        "tree",
      );
      sprite.setOrigin(0, 0);
    }

    // ---- 2c''. Mountain peaks -----------------------------------
    // 16×32 sprite — bottom tile is the placement tile, the upper
    // half hangs over the tile above. Both tiles get ge_collide so
    // the player walks around the peak's base.
    for (const peak of buildMountainPeakPlacements()) {
      for (const dy of [-1, 0]) {
        const tile = groundLayer.getTileAt(peak.tileX, peak.tileY + dy);
        if (tile) {
          tile.properties = {
            ...(tile.properties ?? {}),
            ge_collide: true,
          };
        }
      }
      const sprite = this.add.sprite(
        peak.tileX * TILE_SIZE,
        (peak.tileY - 1) * TILE_SIZE,
        "mountain_peak",
      );
      sprite.setOrigin(0, 0);
    }

    // ---- 2c'''. Sacred forest -----------------------------------
    // Dense tree scatter through the forest region (existing tree
    // sprite reused) plus a single 16×24 shrine at the centre. Trees
    // get the same ge_collide treatment as meadow trees. Shrine
    // spans 1 tile wide × 2 tiles tall (since 24px = 1.5 tiles, the
    // top half spills onto the tile above the placement tile).
    for (const t of buildForestTreePlacements()) {
      const tile = groundLayer.getTileAt(t.tileX, t.tileY);
      if (tile) {
        tile.properties = {
          ...(tile.properties ?? {}),
          ge_collide: true,
        };
      }
      const sprite = this.add.sprite(
        t.tileX * TILE_SIZE,
        t.tileY * TILE_SIZE,
        "tree",
      );
      sprite.setOrigin(0, 0);
    }
    {
      const shrine = buildShrinePlacement();
      // Shrine occupies its placement tile + the tile above (sprite
      // is 24px = 1.5 tiles, but the upper tile would only be half
      // covered). Flag both as collidable for safety.
      for (const dy of [-1, 0]) {
        const tile = groundLayer.getTileAt(shrine.tileX, shrine.tileY + dy);
        if (tile) {
          tile.properties = {
            ...(tile.properties ?? {}),
            ge_collide: true,
          };
        }
      }
      const sprite = this.add.sprite(
        shrine.tileX * TILE_SIZE,
        (shrine.tileY - 1) * TILE_SIZE + 8,
        "shrine",
      );
      sprite.setOrigin(0, 0);
    }

    // ---- 2c''''. Church -----------------------------------------
    // Single 5×3 tile building with all 15 footprint tiles flagged
    // collidable. Door interaction lands in the next turn (E-key
    // opens a "you step inside" modal). For now the church stands
    // visible and walkable-around in CHURCH_REGION.
    {
      const church = buildChurchPlacement();
      for (let dy = 0; dy < church.houseH; dy++) {
        for (let dx = 0; dx < church.houseW; dx++) {
          const tile = groundLayer.getTileAt(
            church.tileX + dx,
            church.tileY + dy,
          );
          if (tile) {
            tile.properties = {
              ...(tile.properties ?? {}),
              ge_collide: true,
            };
          }
        }
      }
      const sprite = this.add.sprite(
        church.tileX * TILE_SIZE,
        church.tileY * TILE_SIZE,
        "church",
      );
      sprite.setOrigin(0, 0);
    }

    // ---- 2c'''''. Road network ----------------------------------
    // Single straight north-south dirt road at ROAD_COL connecting
    // creator-quarter south edge → meadow → church door → forest →
    // mountain → south stone border. Building footprints (church +
    // shrine) are skipped in the road generator so collision is
    // preserved. Mountain peak placement also skips the road column.
    for (const r of buildRoadPath()) {
      groundLayer.putTileAt(TILE_INDEX.DIRT, r.tileX, r.tileY);
    }
    // Per-house feeder paths — single-tile dirt strips from each
    // door east/west to the road shoulder. Houses sharing a door
    // row collapse into shared east-west alleys, so each row of
    // properties has a clear walkway off the main road.
    for (const f of buildFeederPaths(this.houses)) {
      groundLayer.putTileAt(TILE_INDEX.DIRT, f.tileX, f.tileY);
    }
    // Decorative road shoulder stones — non-collidable sprites along
    // both sides, alternating left/right every 3 rows.
    for (const s of buildRoadStonePlacements(this.houses)) {
      const sprite = this.add.sprite(
        s.tileX * TILE_SIZE,
        s.tileY * TILE_SIZE,
        "road_stone",
      );
      sprite.setOrigin(0, 0);
    }
    // Town square roses — sparse ring around the perimeter +
    // around the statue base. Non-collidable; player walks through.
    for (const r of buildTownSquareRoses()) {
      const sprite = this.add.sprite(
        r.tileX * TILE_SIZE,
        r.tileY * TILE_SIZE,
        "rose",
      );
      sprite.setOrigin(0, 0);
    }
    // Town-square statue — massive 4×4 footprint at the dead centre.
    // Sprite is 64×96 (4×6 tiles); the upper 2 tile rows extend
    // visually above the footprint. All 16 footprint tiles flagged
    // collidable so the player walks around the base; the door tile
    // (1 row south of the footprint) is the interaction tile.
    {
      const statue = buildStatuePlacement();
      for (let dy = 0; dy < 4; dy++) {
        for (let dx = 0; dx < 4; dx++) {
          const tile = groundLayer.getTileAt(
            statue.tileX + dx,
            statue.tileY + dy,
          );
          if (tile) {
            tile.properties = {
              ...(tile.properties ?? {}),
              ge_collide: true,
            };
          }
        }
      }
      const sprite = this.add.sprite(
        statue.tileX * TILE_SIZE,
        (statue.tileY - 2) * TILE_SIZE,
        "statue",
      );
      sprite.setOrigin(0, 0);
    }

    // ---- 2c''''''. Wayfinding signs -----------------------------
    // Wooden signs — both per-house occupant signs and district
    // directional signs. NO label is drawn into the world; the sign
    // is just a sprite. The player walks up cardinal-adjacent and
    // presses E to read the dialog. Sign tiles are flagged
    // collidable so the player can't walk through the post.
    this.signs = buildSignPlacements(this.houses);
    for (const sign of this.signs) {
      const yOffset = sign.sprite === "directional_sign" ? -8 : 0;
      const sprite = this.add.sprite(
        sign.tileX * TILE_SIZE,
        sign.tileY * TILE_SIZE + yOffset,
        sign.sprite,
      );
      sprite.setOrigin(0, 0);
      const tile = groundLayer.getTileAt(sign.tileX, sign.tileY);
      if (tile) {
        tile.properties = {
          ...(tile.properties ?? {}),
          ge_collide: true,
        };
      }
    }

    // ---- 2d. Yard decorations -----------------------------------
    // Per-variant decorative sprites placed in each brand property's
    // bottom row (flower beds, picket fences, veggie patches, crates,
    // potted plants). Non-collidable — purely visual.
    // ---- 2c'. Front walks --------------------------------------
    // Stamp a 2-tile dirt path in front of every house door — the
    // tile the player stands on to enter (doorTileY) plus one more
    // tile south. Reads as a worn front walk and visually links each
    // entity's door to the world's main dirt path. We stamp BEFORE
    // yard sprites so flower beds / crates / etc. layer cleanly on
    // top of the dirt where they overlap.
    for (const h of this.houses) {
      groundLayer.putTileAt(
        TILE_INDEX.DIRT,
        h.doorTileX,
        h.doorTileY,
      );
      groundLayer.putTileAt(
        TILE_INDEX.DIRT,
        h.doorTileX,
        h.doorTileY + 1,
      );
    }

    const yards = buildYardDecorations(this.houses);
    for (const yard of yards) {
      const sprite = this.add.sprite(
        yard.tileX * TILE_SIZE,
        yard.tileY * TILE_SIZE,
        `yard_${yard.type}`,
      );
      sprite.setOrigin(0, 0);
    }

    // ---- 2e. Chickens -------------------------------------------
    // Decorative-only sprites that hop around the barn yards. NOT
    // grid-engine characters — they don't collide with anything, so
    // the player and NPCs can walk past or through them. Each chicken
    // gets its own randomized hop cadence (start offset + per-hop
    // delay) so the flock doesn't move in unison.
    for (const ch of buildChickenPlacements(this.houses)) {
      const sprite = this.add.sprite(
        ch.homeTileX * TILE_SIZE,
        ch.homeTileY * TILE_SIZE,
        "chicken",
      );
      sprite.setOrigin(0, 0);
      this.startChickenHop(sprite, ch.homeTileX, ch.homeTileY);
    }

    // ---- 2f. Bees -----------------------------------------------
    // One bee per brand property that has 2+ flowers. Each picks a
    // random flower, slow-tweens to it, hovers with a wing-flutter
    // bob, picks another. Per-bee start offset 0-2000ms so the swarm
    // doesn't sync.
    for (const bee of buildBeePlacements(this.houses, yards)) {
      const start = bee.flowers[0];
      const sprite = this.add.sprite(
        start.tileX * TILE_SIZE,
        start.tileY * TILE_SIZE - 4,
        "bee",
      );
      sprite.setOrigin(0, 0);
      this.startBeeBuzz(sprite, bee.flowers);
    }

    // ---- 2g. Roof birds -----------------------------------------
    // Cottage entities whose decor has hasBird=true get a small bird
    // sprite perched on their roof ridge. The bird flutters every
    // 6-15s — quick 2-bob lift then settle, with per-bird randomized
    // start offset 0-8000ms so the flock doesn't sync.
    for (const bird of buildRoofBirdPlacements(this.houses)) {
      const sprite = this.add.sprite(bird.pixelX, bird.pixelY, "roofbird");
      sprite.setOrigin(0, 0);
      this.startBirdFlutter(sprite, bird.pixelX, bird.pixelY);
    }

    // ---- 2h. Pets -----------------------------------------------
    // Manor cats sit on the stone-step row beside the door (static).
    // Houseboat seagulls wheel slowly in a 14×8 px ellipse over the
    // cabin roof. Per-seagull randomized orbit start phase + speed
    // jitter so the flock isn't synchronized.
    for (const pet of buildPetPlacements(this.houses)) {
      const sprite = this.add.sprite(pet.pixelX, pet.pixelY, pet.type);
      sprite.setOrigin(0, 0);
      if (pet.type === "seagull") {
        this.startSeagullOrbit(sprite, pet.pixelX, pet.pixelY);
      }
    }

    // ---- 3. NPC sprites (one per entity) ------------------------
    // Painted once during BootScene; each NPC gets its own sprite so
    // grid-engine can move it independently. NPCs share collision
    // with the houses + each other via grid-engine's character layer.
    const npcCharacters = this.npcs.map((npc) => {
      // Each entity has its own walk sheet keyed by entity id. Frame
      // 1 is the down-facing standing pose so the NPC isn't mid-stride
      // when the scene first renders.
      const sprite = this.add.sprite(0, 0, `npc_${npc.entity.id}`, 1);
      sprite.setOrigin(0, 0);
      sprite.setData("npcEntityId", npc.entity.id);
      return {
        id: npc.npcId,
        sprite,
        startPosition: { x: npc.startTileX, y: npc.startTileY },
        speed: 2,
        // grid-engine drives leftFoot → standing → rightFoot through
        // the 3×4 sheet during the random-wander steps.
        walkingAnimationMapping: 0,
      };
    });

    // Wandering civilian sprites + grid-engine entries — per-flavor
    // texture key + walk animation, same mechanic as entity NPCs.
    const flavorCharacters = this.flavorNpcs.map((f) => {
      const sprite = this.add.sprite(0, 0, `npc_${f.flavorId}`, 1);
      sprite.setOrigin(0, 0);
      sprite.setData("flavorId", f.flavorId);
      return {
        id: f.npcId,
        sprite,
        startPosition: { x: f.startTileX, y: f.startTileY },
        speed: 2,
        walkingAnimationMapping: 0,
      };
    });

    // ---- 4. Player sprite + grid-engine --------------------------
    // Frame 1 = standing pose for the down-facing row in our sheet,
    // so the player isn't mid-stride before the first input.
    const player = this.add.sprite(0, 0, "player", 1);
    player.setOrigin(0, 0);
    this.gridEngine.create(map, {
      characters: [
        {
          id: "player",
          sprite: player,
          startPosition: { x: PLAYER_SPAWN.tileX, y: PLAYER_SPAWN.tileY },
          speed: 4,
          // grid-engine cycles through the 3-col × 4-row sheet for us:
          // walking down plays row 0, left plays row 1, right row 2,
          // up row 3 — each cycling leftFoot → standing → rightFoot.
          walkingAnimationMapping: 0,
        },
        ...npcCharacters,
        ...flavorCharacters,
      ],
    });

    // Kick each NPC + flavor villager into a slow wander within their
    // assigned radius. grid-engine handles step pacing + collision
    // against the player and the world tilemap automatically.
    //
    // Each NPC gets:
    //   - a per-NPC randomized step delay (jittered around the base)
    //     so that no two villagers share a tick cadence; and
    //   - a randomized initial offset before the first step so the
    //     whole village doesn't start moving on frame 1.
    // Without these, every NPC steps in unison every NPC_WANDER_DELAY_MS
    // and the world reads as a metronome.
    const startWander = (id: string) => {
      const delay = Phaser.Math.Between(
        Math.round(NPC_WANDER_DELAY_MS * 0.7),
        Math.round(NPC_WANDER_DELAY_MS * 1.5),
      );
      this.gridEngine.moveRandomly(id, delay, NPC_WANDER_RADIUS);
    };
    for (const npc of this.npcs) {
      this.time.delayedCall(
        Phaser.Math.Between(0, NPC_WANDER_DELAY_MS),
        () => startWander(npc.npcId),
      );
    }
    for (const f of this.flavorNpcs) {
      this.time.delayedCall(
        Phaser.Math.Between(0, NPC_WANDER_DELAY_MS),
        () => startWander(f.npcId),
      );
    }

    // ---- 5. Camera ----------------------------------------------
    this.cameras.main.setBounds(
      0,
      0,
      MAP_WIDTH_TILES * TILE_SIZE,
      MAP_HEIGHT_TILES * TILE_SIZE,
    );
    this.cameras.main.startFollow(player, true);
    this.cameras.main.setRoundPixels(true);
    // Integer zoom keeps pixels crisp. 4× means each 16-px tile
    // renders as 64 on-screen pixels — a Zelda-on-modern-monitor
    // feel. Combined with Scale.RESIZE on the game, the canvas
    // fills the container and the camera shows however many tiles
    // fit at this zoom.
    this.cameras.main.setZoom(4);

    // ---- 6. Input -----------------------------------------------
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys("W,A,S,D") as typeof this.wasd;

      // E key — opens the visit card if the player is on a house's
      // door tile, otherwise opens an entity NPC dialog, otherwise a
      // wandering villager's flavor line. House takes priority since
      // the player has to be exactly ON its door.
      this.input.keyboard.on("keydown-E", () => {
        const state = useGameStore.getState();
        // Already in a dialog? Don't stack.
        if (
          state.openedEntityId ||
          state.openedNpcId ||
          state.openedFlavorId ||
          state.openedChurch ||
          state.openedSignId ||
          state.openedBoard
        )
          return;
        if (state.approachedEntityId) {
          state.setOpenedEntity(state.approachedEntityId);
        } else if (state.approachedChurch) {
          state.setOpenedChurch(true);
        } else if (state.approachedBoard) {
          state.setOpenedBoard(true);
        } else if (state.approachedNpcId) {
          state.setOpenedNpc(state.approachedNpcId);
        } else if (state.approachedFlavorId) {
          state.setOpenedFlavor(state.approachedFlavorId);
        } else if (state.approachedSignId) {
          state.setOpenedSign(state.approachedSignId);
        }
      });
    }

    // Reset store state on scene start so a previous session's
    // approach/open flags don't leak.
    useGameStore.getState().reset();
  }

  update() {
    // ---- Movement ----------------------------------------------
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      this.gridEngine.move("player", Direction.LEFT);
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      this.gridEngine.move("player", Direction.RIGHT);
    } else if (this.cursors.up.isDown || this.wasd.W.isDown) {
      this.gridEngine.move("player", Direction.UP);
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      this.gridEngine.move("player", Direction.DOWN);
    }

    // ---- Approach detection ------------------------------------
    // Priority: house door (player ON it) > entity NPC (cardinal-
    // adjacent) > flavor NPC (cardinal-adjacent). Lower priorities
    // clear when a higher one wins so the prompt never stacks.
    const playerPos = this.gridEngine.getPosition("player");
    const approachedHouse = this.houses.find(
      (h) => h.doorTileX === playerPos.x && h.doorTileY === playerPos.y,
    );
    const onChurchDoor =
      !approachedHouse &&
      this.church.doorTileX === playerPos.x &&
      this.church.doorTileY === playerPos.y;
    const onBoardDoor =
      !approachedHouse &&
      !onChurchDoor &&
      this.statue.doorTileX === playerPos.x &&
      this.statue.doorTileY === playerPos.y;

    let approachedNpcEntityId: string | null = null;
    let approachedFlavorId: string | null = null;
    let approachedSignId: string | null = null;
    if (!approachedHouse && !onChurchDoor && !onBoardDoor) {
      for (const npc of this.npcs) {
        const npcPos = this.gridEngine.getPosition(npc.npcId);
        const dx = Math.abs(npcPos.x - playerPos.x);
        const dy = Math.abs(npcPos.y - playerPos.y);
        if (dx + dy === 1) {
          approachedNpcEntityId = npc.entity.id;
          break;
        }
      }
      if (!approachedNpcEntityId) {
        for (const f of this.flavorNpcs) {
          const fPos = this.gridEngine.getPosition(f.npcId);
          const dx = Math.abs(fPos.x - playerPos.x);
          const dy = Math.abs(fPos.y - playerPos.y);
          if (dx + dy === 1) {
            approachedFlavorId = f.flavorId;
            break;
          }
        }
      }
      // Sign adjacency — last in priority so an NPC standing next to
      // a sign still wins. Cardinal-adjacent (dx+dy === 1) so the
      // player must walk right up to a sign to read it.
      if (!approachedNpcEntityId && !approachedFlavorId) {
        for (const s of this.signs) {
          const dx = Math.abs(s.tileX - playerPos.x);
          const dy = Math.abs(s.tileY - playerPos.y);
          if (dx + dy === 1) {
            approachedSignId = s.signId;
            break;
          }
        }
      }
    }

    const newHouseId = approachedHouse?.entity.id ?? null;
    const state = useGameStore.getState();
    if (newHouseId !== state.approachedEntityId) {
      state.setApproachedEntity(newHouseId);
    }
    if (onChurchDoor !== state.approachedChurch) {
      state.setApproachedChurch(onChurchDoor);
    }
    if (onBoardDoor !== state.approachedBoard) {
      state.setApproachedBoard(onBoardDoor);
    }
    if (approachedNpcEntityId !== state.approachedNpcId) {
      state.setApproachedNpc(approachedNpcEntityId);
    }
    if (approachedFlavorId !== state.approachedFlavorId) {
      state.setApproachedFlavor(approachedFlavorId);
    }
    if (approachedSignId !== state.approachedSignId) {
      state.setApproachedSign(approachedSignId);
    }
  }

  /** Run a chicken on a forever-hopping loop. Each hop picks a random
   *  neighbour tile within ±1 of home, tweens to it over ~400ms, then
   *  pauses for a randomized 800-2400ms before the next hop. The
   *  initial start is also offset 0-3000ms so a flock of chickens
   *  doesn't twitch in unison. */
  private startChickenHop(
    sprite: Phaser.GameObjects.Sprite,
    homeX: number,
    homeY: number,
  ) {
    const hop = () => {
      const tx = homeX + Phaser.Math.Between(-1, 1);
      const ty = homeY + Phaser.Math.Between(-1, 1);
      this.tweens.add({
        targets: sprite,
        x: tx * TILE_SIZE,
        y: ty * TILE_SIZE,
        duration: 400,
        ease: "Sine.easeInOut",
        onComplete: () => {
          this.time.delayedCall(Phaser.Math.Between(800, 2400), hop);
        },
      });
    };
    this.time.delayedCall(Phaser.Math.Between(0, 3000), hop);
  }

  /** Run a bee on a forever-flying loop between flower tiles. Each
   *  flight: pick a random flower target, slow-tween to it (1.2-2.2s
   *  Sine ease — feels like buzzing), hover with a 3-cycle wing-flutter
   *  bob (±2px y oscillation), pick the next flower. Initial start is
   *  staggered 0-2000ms so a swarm doesn't pulse in unison. */
  private startBeeBuzz(
    sprite: Phaser.GameObjects.Sprite,
    flowers: ReadonlyArray<{ tileX: number; tileY: number }>,
  ) {
    const fly = () => {
      const target = flowers[Phaser.Math.Between(0, flowers.length - 1)];
      const tx = target.tileX * TILE_SIZE;
      const ty = target.tileY * TILE_SIZE - 4;
      this.tweens.add({
        targets: sprite,
        x: tx,
        y: ty,
        duration: Phaser.Math.Between(1200, 2200),
        ease: "Sine.easeInOut",
        onComplete: () => {
          this.tweens.add({
            targets: sprite,
            y: ty - 2,
            duration: 180,
            ease: "Sine.easeInOut",
            yoyo: true,
            repeat: 2,
            onComplete: fly,
          });
        },
      });
    };
    this.time.delayedCall(Phaser.Math.Between(0, 2000), fly);
  }

  /** Run a roof bird on a forever-flutter loop. Most of the time the
   *  bird is still; every 6-15s it does a quick 2-bob lift (Sine ease,
   *  -5px y, yoyo×2 over 250ms each) then settles back. Per-bird
   *  start offset 0-8000ms so cottages don't all flap on the same
   *  beat. */
  private startBirdFlutter(
    sprite: Phaser.GameObjects.Sprite,
    homeX: number,
    homeY: number,
  ) {
    void homeX; // home position is implicit — sprite never leaves home
    const flutter = () => {
      this.tweens.add({
        targets: sprite,
        y: homeY - 5,
        duration: 250,
        ease: "Sine.easeOut",
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          this.time.delayedCall(
            Phaser.Math.Between(6000, 15000),
            flutter,
          );
        },
      });
    };
    this.time.delayedCall(Phaser.Math.Between(0, 8000), flutter);
  }

  /** Run a seagull on a forever orbiting loop above its houseboat.
   *  Uses Phaser's tween counter to drive a 0→2π angle, mapping it to
   *  an ellipse (rx=14, ry=8) centred on the home pixel coords. Per-
   *  seagull randomized period (8-14s) and start phase so a flock
   *  doesn't wheel in lockstep. */
  private startSeagullOrbit(
    sprite: Phaser.GameObjects.Sprite,
    centreX: number,
    centreY: number,
  ) {
    const period = Phaser.Math.Between(8000, 14000);
    const startPhase = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.tweens.addCounter({
      from: 0,
      to: Math.PI * 2,
      duration: period,
      repeat: -1,
      onUpdate: (tween) => {
        const angle = (tween.getValue() ?? 0) + startPhase;
        sprite.x = centreX + Math.cos(angle) * 14;
        sprite.y = centreY + Math.sin(angle) * 8;
      },
    });
  }
}

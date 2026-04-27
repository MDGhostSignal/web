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
  paintCharacterSheet,
  paintEntityNpcSheet,
  paintFlavorNpcSheet,
  paintHouseForEntity,
  paintTileset,
  paintTree,
} from "./painter";
import { useGameStore } from "./store";
import {
  MAP_HEIGHT_TILES,
  MAP_WIDTH_TILES,
  NPC_WANDER_DELAY_MS,
  NPC_WANDER_RADIUS,
  PLAYER_SPAWN,
  TILE_SIZE,
  buildFlavorNpcPlacements,
  buildHousePlacements,
  buildNpcPlacements,
  buildTreePositions,
  buildWorldTileData,
  type FlavorNpcPlacement,
  type HousePlacement,
  type NpcPlacement,
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
    for (const npc of this.npcs) {
      this.gridEngine.moveRandomly(
        npc.npcId,
        NPC_WANDER_DELAY_MS,
        NPC_WANDER_RADIUS,
      );
    }
    for (const f of this.flavorNpcs) {
      this.gridEngine.moveRandomly(
        f.npcId,
        NPC_WANDER_DELAY_MS,
        NPC_WANDER_RADIUS,
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
          state.openedFlavorId
        )
          return;
        if (state.approachedEntityId) {
          state.setOpenedEntity(state.approachedEntityId);
        } else if (state.approachedNpcId) {
          state.setOpenedNpc(state.approachedNpcId);
        } else if (state.approachedFlavorId) {
          state.setOpenedFlavor(state.approachedFlavorId);
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

    let approachedNpcEntityId: string | null = null;
    let approachedFlavorId: string | null = null;
    if (!approachedHouse) {
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
    }

    const newHouseId = approachedHouse?.entity.id ?? null;
    const state = useGameStore.getState();
    if (newHouseId !== state.approachedEntityId) {
      state.setApproachedEntity(newHouseId);
    }
    if (approachedNpcEntityId !== state.approachedNpcId) {
      state.setApproachedNpc(approachedNpcEntityId);
    }
    if (approachedFlavorId !== state.approachedFlavorId) {
      state.setApproachedFlavor(approachedFlavorId);
    }
  }
}

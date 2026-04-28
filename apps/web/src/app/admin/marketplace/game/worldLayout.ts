import {
  MOCK_BRANDS,
  MOCK_CREATORS,
  type MarketplaceEntity,
} from "@/lib/marketplace-mocks";
import {
  BRAND_HOUSE_FOOTPRINTS,
  brandHouseTypeForEntity,
  CREATOR_HOUSE_FOOTPRINTS,
  creatorHouseTypeForEntity,
  decorForEntity,
  TILE_INDEX,
} from "./painter";

/**
 * Tile-based layout for every entity's property in the world map.
 * Each entity gets a fixed 10×5 tile property slot. The actual house
 * sprite occupies a smaller rectangle within that slot — the rest of
 * the property is garden / entrance / breathing room. Variants (long
 * house, double, farmhouse) override the house footprint per entity.
 *
 * Map layout (60 wide × 40 tall):
 *   - Stone border on the outermost ring.
 *   - Brand quarter: 5 cols × 4 rows of 10×5 properties at (5, 2).
 *   - Horizontal dirt path at row 22 separating the quarters.
 *   - Creator quarter: 5 cols × 2 rows of 10×5 properties at (5, 24).
 */

export const MAP_WIDTH_TILES = 60;
export const MAP_HEIGHT_TILES = 110;
export const TILE_SIZE = 16;

/* =====================================================================
 * District anchors — coordinate regions for each section of the world.
 * Existing brand + creator quarters live in the northern half (rows
 * 1-38). The southern half is partitioned among church (closest to
 * the village), forest (mid), and mountain (furthest south) — chosen
 * so the player progresses brand → creator → meadow → church → forest
 * → mountain as they walk south. Filled in by subsequent turns; this
 * file just owns the coordinate contract.
 * ===================================================================== */

/** End of the existing built area (the meadow with flavor NPCs and
 *  trees). Tree scatter is clamped to this row to keep the new
 *  southern districts intentionally empty until their content lands. */
/** End of the existing northern built area — brand quarter, path,
 *  creator quarter, and the small meadow buffer that holds the
 *  flavor NPCs above the town square. Tree scatter clamps to this
 *  row so the town square + southern districts have clean canvas. */
export const EXISTING_AREA_END_Y = 49;

export const CHURCH_REGION = {
  startY: 73,
  endY: 83,
};

export const FOREST_REGION = {
  startY: 84,
  endY: 96,
};

export const MOUNTAIN_REGION = {
  startY: 97,
  endY: MAP_HEIGHT_TILES - 2,
};

/** Town square — circular cobblestone plaza at the dead centre of
 *  the map. Player spawns here. A massive 4×4 statue stands at the
 *  centre acting as the community board; lavish roses ring the
 *  perimeter. The cobblestone tiles replace grass + the road inside
 *  the circle so the square reads as one continuous paved surface. */
export const TOWN_SQUARE_CENTER_X = 30;
export const TOWN_SQUARE_CENTER_Y = 59;
export const TOWN_SQUARE_RADIUS = 9;

function isInTownSquare(x: number, y: number): boolean {
  const dx = x - TOWN_SQUARE_CENTER_X;
  const dy = y - TOWN_SQUARE_CENTER_Y;
  return dx * dx + dy * dy <= TOWN_SQUARE_RADIUS * TOWN_SQUARE_RADIUS;
}

/* =====================================================================
 * Statue — 4×4 tile footprint at the dead centre of the town square.
 * Sprite is 64×96 (4 wide × 6 tall in tiles); the upper 2 tile rows
 * extend visually above the footprint. Player interaction tile sits
 * one row south of the footprint, aligned with the bronze inscription
 * plaque on the column's front face.
 * ===================================================================== */

export type StatuePlacement = {
  /** Top-left tile of the 4×4 footprint. */
  tileX: number;
  tileY: number;
  /** Tile the player stands on to interact (one row south of base). */
  doorTileX: number;
  doorTileY: number;
};

export function buildStatuePlacement(): StatuePlacement {
  const tileX = TOWN_SQUARE_CENTER_X - 2;
  const tileY = TOWN_SQUARE_CENTER_Y - 2;
  return {
    tileX,
    tileY,
    doorTileX: TOWN_SQUARE_CENTER_X,
    doorTileY: tileY + 4,
  };
}

/* =====================================================================
 * Town square roses — lavish flower sprites placed in a sparse ring
 * around the cobblestone perimeter and clustered around the centre
 * statue. Non-collidable; the player can walk through them. The road
 * entry/exit (cols 29-30) is left clear so the player can enter and
 * leave the square via the main road.
 * ===================================================================== */

export type TownSquareRosePlacement = { tileX: number; tileY: number };

export function buildTownSquareRoses(): TownSquareRosePlacement[] {
  const roses: TownSquareRosePlacement[] = [];
  const cx = TOWN_SQUARE_CENTER_X;
  const cy = TOWN_SQUARE_CENTER_Y;
  const r = TOWN_SQUARE_RADIUS;
  // Outer perimeter ring
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if (x === ROAD_COL || x === ROAD_COL + 1) continue;
      const dx = x - cx;
      const dy = y - cy;
      const d2 = dx * dx + dy * dy;
      const inner = (r - 1.5) * (r - 1.5);
      if (d2 > r * r || d2 < inner) continue;
      if ((x + y) % 2 !== 0) continue;
      roses.push({ tileX: x, tileY: y });
    }
  }
  // Centre ring — one tile outside the statue's 4×4 footprint, on
  // every cardinal + diagonal slot. Skip the door interaction tile so
  // the player can step up to read the board.
  const statue = buildStatuePlacement();
  const centerRing = [
    // North + south rows
    [statue.tileX - 1, statue.tileY - 1],
    [statue.tileX + 1, statue.tileY - 1],
    [statue.tileX + 3, statue.tileY - 1],
    [statue.tileX - 1, statue.tileY + 4],
    [statue.tileX + 2, statue.tileY + 4],
    [statue.tileX + 4, statue.tileY + 4],
    // East + west columns
    [statue.tileX - 1, statue.tileY + 1],
    [statue.tileX - 1, statue.tileY + 3],
    [statue.tileX + 4, statue.tileY + 1],
    [statue.tileX + 4, statue.tileY + 3],
  ];
  for (const [rx, ry] of centerRing) {
    if (rx === statue.doorTileX && ry === statue.doorTileY) continue;
    roses.push({ tileX: rx, tileY: ry });
  }
  return roses;
}

/** Centre column of the north-south road. Picked to align with the
 *  church door (col 29) so the road leads directly to it. Hoisted to
 *  the top of the file because both buildRoadPath and the mountain
 *  peak placer reference it. */
export const ROAD_COL = 29;

/** Per-entity property slot — house + garden + entrance live inside. */
export const PROPERTY_W_TILES = 10;
export const PROPERTY_H_TILES = 5;

/** Tile inset of the house's top-left corner inside its 10×5 property
 *  slot. The variant footprint maps in painter.ts decide each house's
 *  pixel width/height; the inset just keeps every house tucked into
 *  the upper-left of its property leaving the right + bottom strips
 *  for yard decorations. */
const DEFAULT_HOUSE_INSET_X = 1;
const DEFAULT_HOUSE_INSET_Y = 1;

export type HousePlacement = {
  entity: MarketplaceEntity;
  /** Top-left tile of the 10×5 property slot. */
  propertyX: number;
  propertyY: number;
  /** Top-left tile of the actual house sprite (inside the property). */
  tileX: number;
  tileY: number;
  /** House sprite footprint in tiles (varies per variant). */
  houseW: number;
  houseH: number;
  /** Door tile — where the player stands to trigger a visit. */
  doorTileX: number;
  doorTileY: number;
};

/** Property column X positions — 4 cols per row arranged 2-west + 2-east
 *  of the central 2-tile road (cols 29-30). Both quarters share the
 *  same X layout so houses on the same row line up across the road. */
const PROPERTY_COLS_X = [7, 17, 33, 43];

/** Brand quarter — 5 rows × 4 cols = 20 entities. */
const BRAND_ORIGIN_Y = 2;

/** Creator quarter — 3 rows × 4 cols = 12 slots (10 entities, 2
 *  unused). Sits south of the new path row 27. */
const CREATOR_ORIGIN_Y = 29;

/** Look up the tile footprint + door offset for an entity. Brand
 *  entities now pick from a 4-variant set (cottage / manor / barn /
 *  workshop) — see painter's BRAND_HOUSE_FOOTPRINTS. Creators stay on
 *  the default cottage size until their variant pass lands. */
function footprintFor(
  entity: MarketplaceEntity,
  kind: "brand" | "creator",
): { w: number; h: number; doorOffsetX: number } {
  if (kind === "brand") {
    return BRAND_HOUSE_FOOTPRINTS[brandHouseTypeForEntity(entity.id)];
  }
  return CREATOR_HOUSE_FOOTPRINTS[creatorHouseTypeForEntity(entity.id)];
}

function placeOnGrid(
  entities: readonly MarketplaceEntity[],
  colsX: readonly number[],
  originY: number,
  kind: "brand" | "creator",
): HousePlacement[] {
  const cols = colsX.length;
  return entities.map((entity, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const propertyX = colsX[col];
    const propertyY = originY + row * PROPERTY_H_TILES;
    const { w, h, doorOffsetX } = footprintFor(entity, kind);
    // Houses sit in the upper-left of the property leaving the right
    // + bottom strips for garden / yard. Wider variants (manor 5,
    // barn 6, workshop 4) eat into that margin but still leave room.
    const tileX = propertyX + DEFAULT_HOUSE_INSET_X;
    const tileY = propertyY + DEFAULT_HOUSE_INSET_Y;
    return {
      entity,
      propertyX,
      propertyY,
      tileX,
      tileY,
      houseW: w,
      houseH: h,
      doorTileX: tileX + doorOffsetX,
      doorTileY: tileY + h,
    };
  });
}

export function buildHousePlacements(): HousePlacement[] {
  return [
    ...placeOnGrid(MOCK_BRANDS, PROPERTY_COLS_X, BRAND_ORIGIN_Y, "brand"),
    ...placeOnGrid(
      MOCK_CREATORS,
      PROPERTY_COLS_X,
      CREATOR_ORIGIN_Y,
      "creator",
    ),
  ];
}

/* =====================================================================
 * Yard decorations — single-tile sprites placed inside each brand
 * property's bottom strip (row 4 of the 10×5 property). Variant-keyed:
 * cottage = 3-tile flower bed, manor = 5-tile picket-fenced flower
 * garden, barn = 3-tile veggie patch, workshop = crate stack + barrel
 * + potted plant. Non-collidable for v1 — purely decorative.
 * ===================================================================== */

export type YardDecorationType =
  | "flower-pink"
  | "flower-yellow"
  | "flower-white"
  | "flower-blue"
  | "flower-purple"
  | "flower-cyan"
  | "veggie"
  | "crate"
  | "barrel"
  | "fence"
  | "potted-pink"
  | "potted-yellow"
  | "potted-blue"
  | "potted-purple"
  | "lily-pink"
  | "lily-purple"
  | "rope"
  | "watering-can"
  | "easel"
  | "stool";

export type YardDecoration = {
  tileX: number;
  tileY: number;
  type: YardDecorationType;
};

/** Bottom row of the property (relative offset). Row 0 is the property
 *  top, house occupies rows 1-2, NPC stands on row 3, and yard sits
 *  on row 4 — far enough from the door that the wander radius can't
 *  step out of bounds. */
const YARD_ROW_OFFSET = 4;

export function buildYardDecorations(
  houses: readonly HousePlacement[],
): YardDecoration[] {
  const yards: YardDecoration[] = [];
  for (const h of houses) {
    const yardY = h.propertyY + YARD_ROW_OFFSET;
    const yardX = h.propertyX;

    if (h.entity.kind === "brand") {
      switch (brandHouseTypeForEntity(h.entity.id)) {
        case "cottage": {
          const colours: YardDecorationType[] = [
            "flower-pink",
            "flower-yellow",
            "flower-white",
          ];
          for (let i = 0; i < 3; i++) {
            yards.push({ tileX: yardX + 1 + i, tileY: yardY, type: colours[i] });
          }
          break;
        }
        case "manor": {
          yards.push({ tileX: yardX + 1, tileY: yardY, type: "fence" });
          yards.push({ tileX: yardX + 2, tileY: yardY, type: "flower-pink" });
          yards.push({ tileX: yardX + 3, tileY: yardY, type: "flower-yellow" });
          yards.push({ tileX: yardX + 4, tileY: yardY, type: "flower-white" });
          yards.push({ tileX: yardX + 5, tileY: yardY, type: "flower-pink" });
          yards.push({ tileX: yardX + 6, tileY: yardY, type: "fence" });
          break;
        }
        case "barn": {
          for (let i = 0; i < 3; i++) {
            yards.push({ tileX: yardX + 1 + i, tileY: yardY, type: "veggie" });
          }
          break;
        }
        case "workshop": {
          yards.push({ tileX: yardX + 1, tileY: yardY, type: "crate" });
          yards.push({ tileX: yardX + 2, tileY: yardY, type: "barrel" });
          yards.push({ tileX: yardX + 4, tileY: yardY, type: "potted-pink" });
          yards.push({ tileX: yardX + 5, tileY: yardY, type: "potted-yellow" });
          break;
        }
      }
    } else if (h.entity.kind === "creator") {
      switch (creatorHouseTypeForEntity(h.entity.id)) {
        case "cottage": {
          // Cool-coloured flower bed paralleling the brand cottage.
          const colours: YardDecorationType[] = [
            "flower-blue",
            "flower-purple",
            "flower-cyan",
          ];
          for (let i = 0; i < 3; i++) {
            yards.push({ tileX: yardX + 1 + i, tileY: yardY, type: colours[i] });
          }
          break;
        }
        case "houseboat": {
          // Nautical strip — rope coils flanking a pair of lily pads.
          yards.push({ tileX: yardX + 1, tileY: yardY, type: "rope" });
          yards.push({ tileX: yardX + 2, tileY: yardY, type: "lily-pink" });
          yards.push({ tileX: yardX + 3, tileY: yardY, type: "lily-purple" });
          yards.push({ tileX: yardX + 5, tileY: yardY, type: "rope" });
          break;
        }
        case "greenhouse": {
          // Outdoor garden — watering can plus extra potted plants.
          yards.push({ tileX: yardX + 1, tileY: yardY, type: "watering-can" });
          yards.push({ tileX: yardX + 3, tileY: yardY, type: "potted-blue" });
          yards.push({ tileX: yardX + 5, tileY: yardY, type: "potted-purple" });
          break;
        }
        case "tower": {
          // Studio scene — easel + stool side by side in the yard.
          yards.push({ tileX: yardX + 2, tileY: yardY, type: "easel" });
          yards.push({ tileX: yardX + 4, tileY: yardY, type: "stool" });
          break;
        }
      }
    }
  }
  return yards;
}

/* =====================================================================
 * Chickens — small bird-like decorative sprites that hop around the
 * barn yards. Non-grid-engine (no collision with player or NPCs) so
 * they can wander freely without blocking movement.
 * ===================================================================== */

export type ChickenPlacement = {
  /** Home tile — the chicken hops within ±1 tile of this position. */
  homeTileX: number;
  homeTileY: number;
};

/* =====================================================================
 * Bees — tiny decorative sprites that fly between the flower tiles in
 * each brand property. Non-grid-engine, non-collidable. One bee per
 * property that has 2+ flowers (cottages, manors, workshops).
 * ===================================================================== */

const BEE_FLOWER_TYPES: ReadonlySet<YardDecorationType> = new Set([
  "flower-pink",
  "flower-yellow",
  "flower-white",
  "flower-blue",
  "flower-purple",
  "flower-cyan",
  "potted-pink",
  "potted-yellow",
  "potted-blue",
  "potted-purple",
  "lily-pink",
  "lily-purple",
]);

export type BeePlacement = {
  /** Flower tile coords the bee can target. The buzz loop picks a
   *  random one each hop so the bee wanders the property's blooms. */
  flowers: ReadonlyArray<{ tileX: number; tileY: number }>;
};

export function buildBeePlacements(
  houses: readonly HousePlacement[],
  yards: readonly YardDecoration[],
): BeePlacement[] {
  const bees: BeePlacement[] = [];
  for (const h of houses) {
    const flowers = yards.filter(
      (y) =>
        BEE_FLOWER_TYPES.has(y.type) &&
        y.tileX >= h.propertyX &&
        y.tileX < h.propertyX + PROPERTY_W_TILES &&
        y.tileY >= h.propertyY &&
        y.tileY < h.propertyY + PROPERTY_H_TILES,
    );
    if (flowers.length < 2) continue;
    bees.push({
      flowers: flowers.map((f) => ({ tileX: f.tileX, tileY: f.tileY })),
    });
  }
  return bees;
}

/* =====================================================================
 * Pets — variant-specific creatures that bring properties to life.
 * Manors get a sleeping cat on the stone step beside the door.
 * Houseboats get a seagull wheeling slowly overhead in a lazy circle.
 * Other variants are pet-free for now.
 * ===================================================================== */

export type PetType = "cat" | "seagull";

export type PetPlacement = {
  type: PetType;
  /** Pixel coords of sprite top-left. For circling pets the scene
   *  uses these as the orbit centre. */
  pixelX: number;
  pixelY: number;
};

export function buildPetPlacements(
  houses: readonly HousePlacement[],
): PetPlacement[] {
  const pets: PetPlacement[] = [];
  for (const h of houses) {
    if (h.entity.kind === "brand") {
      if (brandHouseTypeForEntity(h.entity.id) === "manor") {
        // Cat sits two tiles right of the door, on the front-walk row.
        // Manor door is centre tile (col 2 of 5), so col 4 is open yard
        // beside the stoop without overlapping the dirt walk under col 2.
        pets.push({
          type: "cat",
          pixelX: (h.tileX + 4) * 16,
          pixelY: h.doorTileY * 16,
        });
      }
    } else if (h.entity.kind === "creator") {
      if (creatorHouseTypeForEntity(h.entity.id) === "houseboat") {
        // Seagull orbits a point ~10 px above the cabin roof, centred
        // horizontally on the boat. The scene tween reads pixelX/Y as
        // the orbit centre; the bird wheels around it.
        pets.push({
          type: "seagull",
          pixelX: (h.tileX + 2) * 16,
          pixelY: h.tileY * 16 - 10,
        });
      }
    }
  }
  return pets;
}

/* =====================================================================
 * Roof birds — small bird sprites that perch on the cottage roof
 * ridge for entities whose decor has hasBird=true. Only cottage-style
 * houses participate (paintHouse no longer bakes the bird into its
 * texture). Each bird's home position is the same pixel coordinates
 * the in-texture bird used to occupy, so the swap is invisible at
 * rest — the difference is they now flutter periodically.
 * ===================================================================== */

export type RoofBirdPlacement = {
  /** Sprite top-left in pixel coords. The bird's body sits at local
   *  (1, 0) within its 16×16 sprite, so this puts the body 22+1 px
   *  from tileX*16 = the ridge centre of the 48-px cottage. */
  pixelX: number;
  pixelY: number;
};

export function buildRoofBirdPlacements(
  houses: readonly HousePlacement[],
): RoofBirdPlacement[] {
  const birds: RoofBirdPlacement[] = [];
  for (const h of houses) {
    if (h.entity.kind === "brand") {
      if (brandHouseTypeForEntity(h.entity.id) !== "cottage") continue;
    } else {
      if (creatorHouseTypeForEntity(h.entity.id) !== "cottage") continue;
    }
    const decor = decorForEntity(h.entity.id, h.entity.kind);
    if (!decor.hasBird) continue;
    birds.push({
      pixelX: h.tileX * 16 + 22,
      pixelY: h.tileY * 16,
    });
  }
  return birds;
}

export function buildChickenPlacements(
  houses: readonly HousePlacement[],
): ChickenPlacement[] {
  const chickens: ChickenPlacement[] = [];
  for (const h of houses) {
    if (h.entity.kind !== "brand") continue;
    if (brandHouseTypeForEntity(h.entity.id) !== "barn") continue;
    // Two chickens per barn — one in the right strip beside the house,
    // one in the bottom-right of the property. Both clear of the door
    // tile + NPC start tile + veggie patch.
    const yardY = h.propertyY + YARD_ROW_OFFSET;
    chickens.push({
      homeTileX: h.propertyX + 7,
      homeTileY: h.propertyY + 2,
    });
    chickens.push({
      homeTileX: h.propertyX + 7,
      homeTileY: yardY,
    });
  }
  return chickens;
}

/* =====================================================================
 * Entity NPCs — one civilian per entity, standing in the property
 * garden just left of the door.
 * ===================================================================== */

export type NpcPlacement = {
  entity: MarketplaceEntity;
  npcId: string;
  startTileX: number;
  startTileY: number;
};

export function buildNpcPlacements(
  houses: HousePlacement[],
): NpcPlacement[] {
  return houses.map((h) => ({
    entity: h.entity,
    npcId: `npc_${h.entity.id}`,
    // One tile west of the door, on the same row — cardinal-adjacent
    // to the door tile so player on the door sees the NPC chat prompt
    // alongside the visit-card prompt.
    startTileX: h.doorTileX - 1,
    startTileY: h.doorTileY,
  }));
}

export const NPC_WANDER_RADIUS = 1;
export const NPC_WANDER_DELAY_MS = 1500;

/** Spawn point — south of the statue inside the town square, facing
 *  the community board. The statue occupies the centre 4×4 of the
 *  square; spawn 4 tiles south so the player lands on cobblestone
 *  with a clear view of the statue/board. */
export const PLAYER_SPAWN = {
  tileX: TOWN_SQUARE_CENTER_X,
  tileY: TOWN_SQUARE_CENTER_Y + 4,
};

/* =====================================================================
 * Tilemap data — stone border, horizontal dirt path, grass meadow.
 * ===================================================================== */

export const PATH_ROW = 27;
const PATH_X_START = 1;
const PATH_X_END = MAP_WIDTH_TILES - 2;

export function buildWorldTileData(): number[][] {
  const data: number[][] = [];
  for (let y = 0; y < MAP_HEIGHT_TILES; y++) {
    const row: number[] = [];
    for (let x = 0; x < MAP_WIDTH_TILES; x++) {
      const isBorder =
        x === 0 ||
        x === MAP_WIDTH_TILES - 1 ||
        y === 0 ||
        y === MAP_HEIGHT_TILES - 1;
      const isPath =
        y === PATH_ROW && x >= PATH_X_START && x <= PATH_X_END;
      const isMountain =
        y >= MOUNTAIN_REGION.startY && y <= MOUNTAIN_REGION.endY;
      const isTownSquare = isInTownSquare(x, y);
      if (isBorder) {
        row.push(TILE_INDEX.STONE);
      } else if (isTownSquare) {
        row.push(TILE_INDEX.COBBLESTONE);
      } else if (isPath) {
        row.push(TILE_INDEX.DIRT);
      } else if (isMountain) {
        row.push(TILE_INDEX.ROCKY_GROUND);
      } else {
        // Grass picker — deterministic hash spread across 4 variants
        // so the meadow + housing quarters read with visible texture
        // variety instead of one flat green. Mostly plain grass; the
        // other variants land at ~1-in-13 to ~1-in-19 density each.
        const h1 = (x * 7 + y * 11) % 17;
        const h2 = (x * 13 + y * 5) % 19;
        const h3 = (x * 11 + y * 17) % 23;
        if (h1 === 0) {
          row.push(TILE_INDEX.GRASS_FLOWER);
        } else if (h2 === 0) {
          row.push(TILE_INDEX.DAISY_GRASS);
        } else if (h3 === 0) {
          row.push(TILE_INDEX.TALL_GRASS);
        } else {
          row.push(TILE_INDEX.GRASS);
        }
      }
    }
    data.push(row);
  }
  return data;
}

export type TreePlacement = { tileX: number; tileY: number };

/* =====================================================================
 * Church — single 5×3 tile (80×48 px) building centred horizontally
 * inside CHURCH_REGION. The door tile sits one row south of the
 * building, used as the player's interaction tile. All 15 tiles under
 * the building footprint get ge_collide flagged in scenes.ts so the
 * walls block movement.
 * ===================================================================== */

export type ChurchPlacement = {
  /** Top-left tile of the 5×3 church footprint. */
  tileX: number;
  tileY: number;
  houseW: number;
  houseH: number;
  /** Tile the player stands on to enter (centre col, one row south). */
  doorTileX: number;
  doorTileY: number;
};

export function buildChurchPlacement(): ChurchPlacement {
  const houseW = 5;
  const houseH = 3;
  // Centre horizontally on the map; sit a couple of rows below the
  // start of CHURCH_REGION so there's a small grass approach.
  const tileX = Math.floor((MAP_WIDTH_TILES - houseW) / 2);
  const tileY = CHURCH_REGION.startY + 2;
  return {
    tileX,
    tileY,
    houseW,
    houseH,
    doorTileX: tileX + 2,
    doorTileY: tileY + houseH,
  };
}

/* =====================================================================
 * Sacred forest — dense tree scatter inside FOREST_REGION with a
 * single stone shrine at the centre. Trees here are denser than the
 * meadow scatter (every ~2nd valid tile rather than every ~30th) so
 * the area reads as forest. The shrine sits in a small clear ring at
 * the centre — trees within 2 tiles of the shrine are skipped to
 * leave breathing room around it.
 * ===================================================================== */

export type ShrinePlacement = { tileX: number; tileY: number };

/** Single shrine placement at the centre of FOREST_REGION. tileX
 *  matches the church-door column (29) so the north-south road runs
 *  in a straight line from the church through the shrine corridor. */
export function buildShrinePlacement(): ShrinePlacement {
  return {
    tileX: 29,
    tileY: Math.floor((FOREST_REGION.startY + FOREST_REGION.endY) / 2),
  };
}

/** Dense tree scatter through FOREST_REGION, leaving a clear ring
 *  around the shrine and the road corridor open. */
export function buildForestTreePlacements(): TreePlacement[] {
  const shrine = buildShrinePlacement();
  const trees: TreePlacement[] = [];
  // Forest doesn't have houses — pass empty array. Only the main
  // road tiles need to be excluded here.
  const roadTiles = buildRoadTileSet([]);
  for (let y = FOREST_REGION.startY; y <= FOREST_REGION.endY; y++) {
    for (let x = 2; x < MAP_WIDTH_TILES - 2; x++) {
      if ((x * 5 + y * 7 + 3) % 4 !== 0) continue;
      if (
        Math.abs(x - shrine.tileX) <= 3 &&
        Math.abs(y - shrine.tileY) <= 3
      ) {
        continue;
      }
      // Skip every road tile (both lanes plus shoulders ±1 col)
      if (roadTiles.has(`${x},${y}`)) continue;
      if (Math.abs(x - ROAD_COL) <= 1 || Math.abs(x - (ROAD_COL + 1)) <= 0) {
        continue;
      }
      trees.push({ tileX: x, tileY: y });
    }
  }
  return trees;
}

/* =====================================================================
 * Wayfinding signs — small wooden signs beside every house showing
 * the occupant's name, plus larger directional signposts at the
 * entrance to each district. Both types are sprites with a Phaser
 * text label overlaid in the scene; the label string lives on the
 * placement so the painter doesn't have to know about text.
 * ===================================================================== */

/** Unified sign placement — both per-house occupant signs and the
 *  larger directional district signs use this shape so the scene can
 *  iterate them with a single approach-detection loop. The sign
 *  itself shows nothing visible at the world level — the label only
 *  appears in a dialog after the player walks up and presses E. */
export type SignPlacement = {
  signId: string;
  tileX: number;
  tileY: number;
  /** Texture key — controls sprite size + plank shape. */
  sprite: "house_sign" | "directional_sign";
  /** Dialog header. */
  title: string;
  /** Dialog body text (a sentence or two). */
  body: string;
};

export function buildSignPlacements(
  houses: readonly HousePlacement[],
): SignPlacement[] {
  const signs: SignPlacement[] = [];

  // Per-house occupant signs — placed horizontally beside the house
  // (NOT in front of the door) so they don't block the feeder road
  // running along the door row. West-side houses get the sign on
  // their EAST wall (one tile east of the house, at house mid-row);
  // east-side houses get it on their WEST wall. That way the sign
  // always faces the road approach but doesn't sit on it.
  for (const h of houses) {
    const isWestSide = h.tileX < ROAD_COL;
    const signX = isWestSide ? h.tileX + h.houseW : h.tileX - 1;
    signs.push({
      signId: `sign_house_${h.entity.id}`,
      tileX: signX,
      tileY: h.tileY + 1,
      sprite: "house_sign",
      title: h.entity.name,
      body:
        h.entity.kind === "creator"
          ? `Home of ${h.entity.name}, a creator in the southern quarter.`
          : `Home of ${h.entity.name}, a brand in the northern quarter.`,
    });
  }

  // Five district directional signs along the central road.
  signs.push(
    {
      signId: "sign_brands",
      tileX: ROAD_COL + 2,
      tileY: 26,
      sprite: "directional_sign",
      title: "↑ Brands",
      body:
        "The brand quarter lies to the north — twenty businesses, each with a small sign by their door.",
    },
    {
      signId: "sign_creators",
      tileX: ROAD_COL + 2,
      tileY: 28,
      sprite: "directional_sign",
      title: "↓ Creators",
      body:
        "The creator quarter lies to the south of the path — ten makers and storytellers.",
    },
    {
      signId: "sign_church",
      tileX: ROAD_COL - 2,
      tileY: 72,
      sprite: "directional_sign",
      title: "↓ The Church",
      body:
        "Continue south to find the church. Stand on the front-step tile and press E to step inside.",
    },
    {
      signId: "sign_forest",
      tileX: ROAD_COL - 2,
      tileY: 83,
      sprite: "directional_sign",
      title: "↓ Sacred Forest",
      body:
        "Beyond this point lies a sacred grove of dense trees. A stone shrine stands at its centre.",
    },
    {
      signId: "sign_mountain",
      tileX: ROAD_COL - 2,
      tileY: 96,
      sprite: "directional_sign",
      title: "↓ The Mountain",
      body:
        "Further south, the land rises into a rocky highland of jagged peaks crowned with snow.",
    },
  );

  return signs;
}

/* =====================================================================
 * Mountain peaks — sparse 16×32 sprites scattered in MOUNTAIN_REGION.
 * Player can walk freely between them; each peak's tile gets
 * ge_collide so the peaks themselves block movement. The peaks
 * descend along the row they're placed in, so buildMountainPeak
 * positions return the BOTTOM tile of the sprite (the player walks
 * around its base).
 * ===================================================================== */

export type MountainPeakPlacement = { tileX: number; tileY: number };

export function buildMountainPeakPlacements(): MountainPeakPlacement[] {
  const peaks: MountainPeakPlacement[] = [];
  // Coprime-hash scatter — same idiom as tree scatter — for a
  // deterministic but irregular distribution. Sprites are 32px tall =
  // 2 tiles, so peaks need their UPPER tile (tileY - 1) inside the
  // mountain region as well; we generate based on the bottom tile and
  // skip rows too close to the top edge.
  for (let y = MOUNTAIN_REGION.startY + 1; y <= MOUNTAIN_REGION.endY; y++) {
    for (let x = 2; x < MAP_WIDTH_TILES - 2; x++) {
      if ((x * 17 + y * 11 + 23) % 19 !== 0) continue;
      // Skip the central road corridor (cols 28-31) so peaks don't
      // land on either lane of the 2-tile road or its shoulders.
      if (x >= ROAD_COL - 1 && x <= ROAD_COL + 2) continue;
      // Avoid clustering — also skip if too close to a previous peak.
      if (peaks.some((p) => Math.abs(p.tileX - x) <= 1 && Math.abs(p.tileY - y) <= 1)) {
        continue;
      }
      peaks.push({ tileX: x, tileY: y });
    }
  }
  return peaks;
}

/* =====================================================================
 * Road network — single straight north-south dirt path at ROAD_COL
 * connecting the southern districts. Existing east-west path at row
 * 22 between brand and creator quarters stays unchanged; the new
 * vertical road extends from the south edge of the creator quarter
 * through meadow → church door → forest (via the cleared corridor) →
 * mountain → southern stone border. Building footprints (church +
 * shrine) are skipped so the road doesn't override their collision.
 * ===================================================================== */

export function buildRoadPath(): Array<{ tileX: number; tileY: number }> {
  const path: Array<{ tileX: number; tileY: number }> = [];
  const church = buildChurchPlacement();
  const shrine = buildShrinePlacement();

  const churchTiles = new Set<string>();
  for (let dy = 0; dy < church.houseH; dy++) {
    for (let dx = 0; dx < church.houseW; dx++) {
      churchTiles.add(`${church.tileX + dx},${church.tileY + dy}`);
    }
  }
  // Shrine occupies its placement tile + tile above. Block both road
  // lanes (ROAD_COL and ROAD_COL+1) at those rows so the road
  // visually parts around the shrine.
  const shrineTiles = new Set<string>([
    `${shrine.tileX},${shrine.tileY}`,
    `${shrine.tileX},${shrine.tileY - 1}`,
    `${shrine.tileX + 1},${shrine.tileY}`,
    `${shrine.tileX + 1},${shrine.tileY - 1}`,
  ]);
  const safe = (x: number, y: number) =>
    !churchTiles.has(`${x},${y}`) && !shrineTiles.has(`${x},${y}`);

  // Two-lane road — both ROAD_COL and ROAD_COL+1 from row 1 (just
  // inside the top stone border) to the southern stone border. Runs
  // through housing quarters too via the gap reserved between west
  // and east property columns. Skip building tiles so collision
  // stays, and skip the town square so cobblestone shows through.
  for (let y = 1; y <= MAP_HEIGHT_TILES - 2; y++) {
    for (const x of [ROAD_COL, ROAD_COL + 1]) {
      if (safe(x, y) && !isInTownSquare(x, y)) {
        path.push({ tileX: x, tileY: y });
      }
    }
  }
  return path;
}

/* =====================================================================
 * Feeder paths — single-tile dirt strips running from every house's
 * door east or west along the door row to reach the main road. Houses
 * on the west side extend east; houses on the east side extend west.
 * Multiple houses sharing a door row produce overlapping strips —
 * which is the point: each property row gets a shared east-west
 * alley off the road. Yard decoration sprites still layer over the
 * dirt without issue.
 * ===================================================================== */

/** Pre-compute every road tile (main road + per-house feeders) into a
 *  Set for fast `has` checks. Used by tree scatter, forest tree
 *  scatter, and road-stone placement so nothing decorative lands on
 *  a walkable path. */
export function buildRoadTileSet(
  houses: readonly HousePlacement[],
): Set<string> {
  const set = new Set<string>();
  for (const r of buildRoadPath()) {
    set.add(`${r.tileX},${r.tileY}`);
  }
  for (const f of buildFeederPaths(houses)) {
    set.add(`${f.tileX},${f.tileY}`);
  }
  return set;
}

export function buildFeederPaths(
  houses: readonly HousePlacement[],
): Array<{ tileX: number; tileY: number }> {
  const tiles: Array<{ tileX: number; tileY: number }> = [];
  for (const h of houses) {
    const y = h.doorTileY;
    if (h.doorTileX < ROAD_COL) {
      for (let x = h.doorTileX + 1; x <= ROAD_COL - 1; x++) {
        if (!isInTownSquare(x, y)) tiles.push({ tileX: x, tileY: y });
      }
    } else if (h.doorTileX > ROAD_COL + 1) {
      for (let x = h.doorTileX - 1; x >= ROAD_COL + 2; x--) {
        if (!isInTownSquare(x, y)) tiles.push({ tileX: x, tileY: y });
      }
    }
  }
  return tiles;
}

/* =====================================================================
 * Road stones — small decorative grey-rock sprites scattered along
 * both shoulders of the road. Non-collidable; purely visual edge
 * markers. Density: one stone every 3 rows on each side, with the
 * sides offset so the stones alternate left/right rather than pair
 * up across the road.
 * ===================================================================== */

export type RoadStonePlacement = { tileX: number; tileY: number };

export function buildRoadStonePlacements(
  houses: readonly HousePlacement[],
): RoadStonePlacement[] {
  const stones: RoadStonePlacement[] = [];
  const church = buildChurchPlacement();
  const shrine = buildShrinePlacement();
  // Build a feeder-tile set so stones never land where a feeder runs.
  // Feeders use cols 28 (west of road) and 31 (east of road) at door
  // rows — exactly where stones want to live — so we have to filter.
  const feederTiles = new Set<string>();
  for (const f of buildFeederPaths(houses)) {
    feederTiles.add(`${f.tileX},${f.tileY}`);
  }
  for (let y = 1; y <= MAP_HEIGHT_TILES - 2; y++) {
    const nearChurch =
      y >= church.tileY - 1 && y <= church.tileY + church.houseH + 1;
    const nearShrine =
      y >= shrine.tileY - 2 && y <= shrine.tileY + 1;
    if (nearChurch || nearShrine) continue;
    if (y % 3 === 0 && !feederTiles.has(`${ROAD_COL - 1},${y}`)) {
      stones.push({ tileX: ROAD_COL - 1, tileY: y });
    }
    if (y % 3 === 1 && !feederTiles.has(`${ROAD_COL + 2},${y}`)) {
      stones.push({ tileX: ROAD_COL + 2, tileY: y });
    }
  }
  return stones;
}

/* =====================================================================
 * Wandering villagers (non-entity NPCs) — relocated to map margins
 * outside every property slot in the new 10×5 grid.
 * ===================================================================== */

export type FlavorNpcVariant = "elder" | "traveler";

export type FlavorNpcPlacement = {
  flavorId: string;
  npcId: string;
  variant: FlavorNpcVariant;
  startTileX: number;
  startTileY: number;
  name: string;
  line: string;
};

export function buildFlavorNpcPlacements(): FlavorNpcPlacement[] {
  return [
    {
      flavorId: "flavor_sigi",
      npcId: "flavor_npc_sigi",
      variant: "elder",
      startTileX: 2,
      startTileY: 27,
      name: "Old Sigi",
      line:
        "Brands keep popping up like mushrooms after rain. Half are gone by next moon.",
    },
    {
      flavorId: "flavor_mira",
      npcId: "flavor_npc_mira",
      variant: "elder",
      startTileX: 57,
      startTileY: 27,
      name: "Old Mira",
      line:
        "I remember when this whole stretch was sheep pasture. Now it's signal towers and signed contracts.",
    },
    {
      flavorId: "flavor_henk",
      npcId: "flavor_npc_henk",
      variant: "elder",
      startTileX: 15,
      startTileY: 46,
      name: "Old Henk",
      line:
        "Brands used to send their own envoy to the village square. Now they send strangers with QR codes.",
    },
    {
      flavorId: "flavor_tessa",
      npcId: "flavor_npc_tessa",
      variant: "traveler",
      startTileX: 30,
      startTileY: 46,
      name: "Wanderer Tessa",
      line:
        "I've walked from one valley to the next. Every creator I meet asks the same thing: who's actually paying these days?",
    },
    {
      flavorId: "flavor_roe",
      npcId: "flavor_npc_roe",
      variant: "traveler",
      startTileX: 45,
      startTileY: 46,
      name: "Wanderer Roe",
      line:
        "The path is freshly raked again. Someone in this town really cares about how the dirt looks.",
    },
    {
      flavorId: "flavor_lin",
      npcId: "flavor_npc_lin",
      variant: "traveler",
      startTileX: 32,
      startTileY: 27,
      name: "Wanderer Lin",
      line:
        "Don't trust a brand that won't tell you who their last creator was. That's what my master used to say.",
    },
  ];
}

/**
 * Deterministic tree scatter. Avoids:
 *   - the entire property zone of every entity (10×5 area)
 *   - the path row, map border, player spawn
 *   - flavor + entity NPC start tiles + a 1-tile buffer around them
 */
export function buildTreePositions(
  houses: HousePlacement[],
  flavorNpcs: FlavorNpcPlacement[] = [],
  entityNpcs: NpcPlacement[] = [],
): TreePlacement[] {
  const occupied = new Set<string>();
  // Exclude the full 10×5 property area for each house — the inside
  // of the property should read as "this entity's land" with no
  // wild trees crowding their garden.
  for (const h of houses) {
    for (let dy = 0; dy < PROPERTY_H_TILES; dy++) {
      for (let dx = 0; dx < PROPERTY_W_TILES; dx++) {
        occupied.add(`${h.propertyX + dx},${h.propertyY + dy}`);
      }
    }
  }
  for (const f of flavorNpcs) {
    occupied.add(`${f.startTileX},${f.startTileY}`);
  }
  for (const n of entityNpcs) {
    occupied.add(`${n.startTileX},${n.startTileY}`);
  }
  const isNearFlavorNpc = (x: number, y: number) =>
    flavorNpcs.some(
      (f) =>
        Math.abs(x - f.startTileX) <= 1 && Math.abs(y - f.startTileY) <= 1,
    );
  const roadTiles = buildRoadTileSet(houses);
  const trees: TreePlacement[] = [];
  // Clamp scatter to the existing northern area (brand + creator +
  // meadow). Southern districts (church, forest, mountain) own their
  // own decoration in subsequent turns; leaving plain grass here so
  // those passes have a clean canvas.
  for (let y = 2; y < EXISTING_AREA_END_Y; y++) {
    for (let x = 2; x < MAP_WIDTH_TILES - 2; x++) {
      if ((x * 13 + y * 7 + 19) % 31 !== 0) continue;
      if (y === PATH_ROW) continue;
      if (
        Math.abs(x - PLAYER_SPAWN.tileX) <= 1 &&
        Math.abs(y - PLAYER_SPAWN.tileY) <= 1
      )
        continue;
      if (occupied.has(`${x},${y}`)) continue;
      if (roadTiles.has(`${x},${y}`)) continue;
      if (isNearFlavorNpc(x, y)) continue;
      trees.push({ tileX: x, tileY: y });
    }
  }
  return trees;
}

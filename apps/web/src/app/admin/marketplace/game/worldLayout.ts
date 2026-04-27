import {
  MOCK_BRANDS,
  MOCK_CREATORS,
  type MarketplaceEntity,
} from "@/lib/marketplace-mocks";
import { TILE_INDEX } from "./painter";

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
export const MAP_HEIGHT_TILES = 40;
export const TILE_SIZE = 16;

/** Per-entity property slot — house + garden + entrance live inside. */
export const PROPERTY_W_TILES = 10;
export const PROPERTY_H_TILES = 5;

/** Default house footprint (cottage / long / double). The farmhouse
 *  variant overrides via per-placement houseW/houseH. */
const DEFAULT_HOUSE_W_TILES = 3;
const DEFAULT_HOUSE_H_TILES = 2;
/** Tile inset of the house's top-left corner inside its property. */
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

const BRAND_ORIGIN_X = 5;
const BRAND_ORIGIN_Y = 2;
const BRAND_COLS = 5;

const CREATOR_ORIGIN_X = 5;
const CREATOR_ORIGIN_Y = 24;
const CREATOR_COLS = 5;

function placeOnGrid(
  entities: readonly MarketplaceEntity[],
  originX: number,
  originY: number,
  cols: number,
): HousePlacement[] {
  return entities.map((entity, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const propertyX = originX + col * PROPERTY_W_TILES;
    const propertyY = originY + row * PROPERTY_H_TILES;
    // Default cottage / long / double — sit in the upper-left corner
    // of the property leaving the right + bottom strips for garden.
    const tileX = propertyX + DEFAULT_HOUSE_INSET_X;
    const tileY = propertyY + DEFAULT_HOUSE_INSET_Y;
    return {
      entity,
      propertyX,
      propertyY,
      tileX,
      tileY,
      houseW: DEFAULT_HOUSE_W_TILES,
      houseH: DEFAULT_HOUSE_H_TILES,
      // Door pixel sits in the right half of the cottage facade
      // (col 1 of a 3-tile-wide house) so the door tile is one row
      // below + one tile in from the house's left edge.
      doorTileX: tileX + 1,
      doorTileY: tileY + DEFAULT_HOUSE_H_TILES,
    };
  });
}

export function buildHousePlacements(): HousePlacement[] {
  return [
    ...placeOnGrid(MOCK_BRANDS, BRAND_ORIGIN_X, BRAND_ORIGIN_Y, BRAND_COLS),
    ...placeOnGrid(
      MOCK_CREATORS,
      CREATOR_ORIGIN_X,
      CREATOR_ORIGIN_Y,
      CREATOR_COLS,
    ),
  ];
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

/** Spawn point — on the dirt path, between the two quarters. */
export const PLAYER_SPAWN = {
  tileX: 30,
  tileY: 22,
};

/* =====================================================================
 * Tilemap data — stone border, horizontal dirt path, grass meadow.
 * ===================================================================== */

export const PATH_ROW = 22;
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
      if (isBorder) {
        row.push(TILE_INDEX.STONE);
      } else if (isPath) {
        row.push(TILE_INDEX.DIRT);
      } else {
        const isFlower = (x * 7 + y * 11) % 17 === 0;
        row.push(isFlower ? TILE_INDEX.GRASS_FLOWER : TILE_INDEX.GRASS);
      }
    }
    data.push(row);
  }
  return data;
}

export type TreePlacement = { tileX: number; tileY: number };

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
      startTileY: 22,
      name: "Old Sigi",
      line:
        "Brands keep popping up like mushrooms after rain. Half are gone by next moon.",
    },
    {
      flavorId: "flavor_mira",
      npcId: "flavor_npc_mira",
      variant: "elder",
      startTileX: 57,
      startTileY: 22,
      name: "Old Mira",
      line:
        "I remember when this whole stretch was sheep pasture. Now it's signal towers and signed contracts.",
    },
    {
      flavorId: "flavor_henk",
      npcId: "flavor_npc_henk",
      variant: "elder",
      startTileX: 15,
      startTileY: 36,
      name: "Old Henk",
      line:
        "Brands used to send their own envoy to the village square. Now they send strangers with QR codes.",
    },
    {
      flavorId: "flavor_tessa",
      npcId: "flavor_npc_tessa",
      variant: "traveler",
      startTileX: 30,
      startTileY: 36,
      name: "Wanderer Tessa",
      line:
        "I've walked from one valley to the next. Every creator I meet asks the same thing: who's actually paying these days?",
    },
    {
      flavorId: "flavor_roe",
      npcId: "flavor_npc_roe",
      variant: "traveler",
      startTileX: 45,
      startTileY: 36,
      name: "Wanderer Roe",
      line:
        "The path is freshly raked again. Someone in this town really cares about how the dirt looks.",
    },
    {
      flavorId: "flavor_lin",
      npcId: "flavor_npc_lin",
      variant: "traveler",
      startTileX: 30,
      startTileY: 22,
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
  const trees: TreePlacement[] = [];
  for (let y = 2; y < MAP_HEIGHT_TILES - 2; y++) {
    for (let x = 2; x < MAP_WIDTH_TILES - 2; x++) {
      if ((x * 13 + y * 7 + 19) % 31 !== 0) continue;
      if (y === PATH_ROW) continue;
      if (
        Math.abs(x - PLAYER_SPAWN.tileX) <= 1 &&
        Math.abs(y - PLAYER_SPAWN.tileY) <= 1
      )
        continue;
      if (occupied.has(`${x},${y}`)) continue;
      if (isNearFlavorNpc(x, y)) continue;
      trees.push({ tileX: x, tileY: y });
    }
  }
  return trees;
}

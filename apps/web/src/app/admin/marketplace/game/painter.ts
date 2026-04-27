/**
 * Pure-canvas pixel art for the Phaser world. Each painter returns a
 * Canvas element that BootScene registers as a Phaser texture via
 * `this.textures.addCanvas(key, canvas)`. No external assets needed
 * for the foundation phase — when a polished tilesheet (Kenney /
 * LPC) is ready, swap to `this.load.spritesheet(...)` calls in
 * BootScene and these painters retire.
 *
 * Color-index 2D arrays mirror the convention already in
 * /sprites.ts on the marketplace's prior R3F scene. 0 = transparent.
 */

export type Palette = readonly (string | null)[];

/**
 * Render a color-index 2D grid into a fresh canvas at native size.
 * Phaser's pixelArt: true mode handles the upscaling at render time —
 * we never want to bake scaling into the source canvas (kills crispness).
 */
function paintGrid(
  pixels: readonly (readonly number[])[],
  palette: Palette,
): HTMLCanvasElement {
  const h = pixels.length;
  const w = pixels[0]?.length ?? 0;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { alpha: true });
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < h; y++) {
    const row = pixels[y];
    for (let x = 0; x < w; x++) {
      const idx = row[x];
      const color = palette[idx];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

/* ---- Tileset ----------------------------------------------------------
 * Single horizontal strip, N tiles wide × 16px tall. Indices in the
 * tilemap data array reference these tiles by position:
 *   0 — grass (default)
 *   1 — grass with flower (decoration variant)
 *   2 — dirt path
 *   3 — water (river)
 *   4 — stone (mountain border)
 *   5 — bridge (wooden planks over water)
 * --------------------------------------------------------------------- */

const TILE_PALETTE: Palette = [
  null,
  "#5fa55f", // 1 — grass mid
  "#4a8a4a", // 2 — grass dark (specks)
  "#7bbf7b", // 3 — grass light (highlight)
  "#a87a4a", // 4 — dirt mid
  "#8a5e34", // 5 — dirt dark
  "#c89860", // 6 — dirt light
  "#3a7d92", // 7 — water mid
  "#5fa3b8", // 8 — water light
  "#1f4d5e", // 9 — water dark
  "#f0e060", // 10 — flower yellow
  "#e85070", // 11 — flower pink
  "#7a7a7e", // 12 — stone mid
  "#52525a", // 13 — stone shadow
  "#a0a0a6", // 14 — stone highlight
  "#a8743a", // 15 — bridge plank mid
  "#6b4520", // 16 — bridge plank dark
];

// 16×16 grass tile — sparse darker specks for organic texture, designed
// to tile cleanly (left/right edges and top/bottom edges balance).
const GRASS: readonly (readonly number[])[] = [
  [1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1],
  [1, 3, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
  [1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1],
  [1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 1],
  [1, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 1],
  [1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1],
];

// Grass with a small flower — variant 1 of the same tile shape.
const GRASS_FLOWER: readonly (readonly number[])[] = (() => {
  const base = GRASS.map((r) => r.slice());
  base[6][7] = 11; // pink flower
  base[5][7] = 10; // yellow centre
  return base;
})();

// 16×16 dirt path tile.
const DIRT: readonly (readonly number[])[] = [
  [4, 4, 5, 4, 4, 4, 4, 5, 4, 4, 4, 4, 5, 4, 4, 4],
  [4, 6, 4, 4, 4, 4, 4, 4, 4, 4, 6, 4, 4, 4, 4, 4],
  [4, 4, 4, 4, 4, 4, 5, 4, 4, 4, 4, 4, 4, 4, 5, 4],
  [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  [5, 4, 4, 4, 6, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 4, 4, 4, 4],
  [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 6],
  [4, 4, 4, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  [4, 4, 4, 4, 4, 4, 4, 4, 5, 4, 4, 4, 4, 4, 4, 4],
  [4, 6, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 6, 4, 4, 4],
  [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  [4, 4, 4, 4, 4, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 4],
  [4, 4, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  [4, 4, 4, 4, 4, 4, 5, 4, 4, 4, 4, 4, 4, 4, 4, 4],
];

// 16×16 water tile.
const WATER: readonly (readonly number[])[] = [
  [7, 8, 7, 7, 7, 7, 8, 7, 7, 7, 8, 7, 7, 7, 7, 7],
  [7, 7, 7, 9, 7, 7, 7, 7, 7, 7, 7, 7, 9, 7, 7, 7],
  [7, 7, 7, 7, 7, 8, 7, 7, 8, 7, 7, 7, 7, 7, 7, 8],
  [9, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
  [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 9, 7, 7, 8, 7],
  [7, 7, 8, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
  [7, 7, 7, 7, 7, 7, 9, 7, 7, 7, 7, 7, 7, 7, 7, 7],
  [7, 7, 7, 7, 8, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 9],
  [8, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
  [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 8, 7, 7, 7, 7, 7],
  [7, 7, 7, 7, 7, 9, 7, 7, 7, 7, 7, 7, 7, 7, 9, 7],
  [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
  [7, 8, 7, 7, 7, 7, 7, 7, 8, 7, 7, 7, 7, 7, 7, 7],
  [7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
  [9, 7, 7, 7, 7, 7, 7, 9, 7, 7, 7, 7, 7, 8, 7, 7],
  [7, 7, 7, 7, 8, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7],
];

// 16×16 stone tile — chunky highlights and shadows so the mountain
// border reads as solid masonry rather than dirt.
const STONE: readonly (readonly number[])[] = [
  [13, 12, 12, 14, 12, 12, 13, 12, 12, 12, 14, 12, 13, 12, 12, 12],
  [12, 12, 14, 12, 12, 12, 12, 12, 14, 12, 12, 12, 12, 14, 12, 13],
  [12, 13, 12, 12, 12, 13, 12, 12, 12, 12, 12, 13, 12, 12, 12, 12],
  [12, 12, 12, 12, 14, 12, 12, 12, 12, 14, 12, 12, 12, 12, 13, 12],
  [14, 12, 12, 12, 12, 12, 12, 13, 12, 12, 12, 12, 12, 12, 12, 12],
  [12, 12, 13, 12, 12, 12, 12, 12, 12, 12, 12, 12, 14, 12, 12, 12],
  [12, 12, 12, 12, 12, 14, 12, 12, 12, 13, 12, 12, 12, 12, 12, 13],
  [12, 14, 12, 12, 13, 12, 12, 12, 12, 12, 12, 12, 12, 12, 14, 12],
  [12, 12, 12, 12, 12, 12, 12, 14, 12, 12, 12, 13, 12, 12, 12, 12],
  [13, 12, 12, 12, 12, 12, 12, 12, 12, 12, 14, 12, 12, 12, 12, 12],
  [12, 12, 14, 12, 12, 13, 12, 12, 12, 12, 12, 12, 12, 12, 12, 14],
  [12, 12, 12, 12, 12, 12, 12, 14, 12, 12, 12, 12, 13, 12, 12, 12],
  [12, 14, 12, 12, 12, 12, 12, 12, 12, 13, 12, 12, 12, 12, 12, 12],
  [12, 12, 12, 13, 12, 14, 12, 12, 12, 12, 12, 12, 14, 12, 12, 13],
  [13, 12, 12, 12, 12, 12, 12, 12, 14, 12, 12, 12, 12, 12, 12, 12],
  [12, 12, 14, 12, 12, 12, 13, 12, 12, 12, 12, 14, 12, 12, 13, 12],
];

// 16×16 bridge tile — horizontal planks with seam shadows. Reads as
// crossable wood when laid over water along the path row.
const BRIDGE: readonly (readonly number[])[] = [
  [16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16],
  [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
  [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
  [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
  [16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16],
  [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
  [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
  [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
  [16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16],
  [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
  [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
  [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
  [16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16],
  [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
  [15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15, 15],
  [16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16],
];

const TILE_ORDER = [GRASS, GRASS_FLOWER, DIRT, WATER, STONE, BRIDGE];

/**
 * Paint the full tileset as a 64×16 strip (4 tiles wide × 1 tall).
 * Phaser's tilemap loader uses the tile index from the data array to
 * locate the corresponding 16×16 frame on this strip.
 */
export function paintTileset(): HTMLCanvasElement {
  const tileSize = 16;
  const c = document.createElement("canvas");
  c.width = tileSize * TILE_ORDER.length;
  c.height = tileSize;
  const ctx = c.getContext("2d", { alpha: true });
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;
  TILE_ORDER.forEach((tile, i) => {
    const inner = paintGrid(tile, TILE_PALETTE);
    ctx.drawImage(inner, i * tileSize, 0);
  });
  return c;
}

export const TILE_INDEX = {
  GRASS: 0,
  GRASS_FLOWER: 1,
  DIRT: 2,
  WATER: 3,
  STONE: 4,
  BRIDGE: 5,
} as const;

/** Tile indices that block grid-engine movement. Used in scenes.ts to
 *  set ge_collide on every matching tile via tilemapLayer.forEachTile. */
export const COLLIDABLE_TILE_INDICES: readonly number[] = [
  TILE_INDEX.WATER,
  TILE_INDEX.STONE,
];

/* =====================================================================
 * Houses — large 32×32 cottage (occupies a 2×2 tile footprint).
 *
 * Painted procedurally rather than as a literal pixel grid so that
 * per-entity variants (chimney side, flowerpot bloom, banner, etc.)
 * can be layered on with cheap fillRect calls. Style references:
 * Stardew Valley cottage tiles, LttP Kakariko houses, Tiny Town.
 * ===================================================================== */

/** House sprite dimensions. Cottages now occupy a 3×2 tile footprint
 *  (48×32 px) so the front facade has room for proper detail. */
export const HOUSE_PX_W = 48;
export const HOUSE_PX_H = 32;
/** Width of the flat roof ridge at row 0. Roof slopes outward from
 *  here to the full width at the eaves. */
const ROOF_RIDGE_W = 10;

export type HouseDecor = {
  /** Hex color for the bloom on each window-sill flowerpot. */
  flowerColor: string;
  /** Hex color for the small banner draped over the door frame. */
  bannerColor: string;
  /** Side of the roof the chimney sits on. */
  chimneySide: "left" | "right";
  /** Whether a small bird perches on the roof apex. */
  hasBird: boolean;
};

export type HousePaletteVariant = {
  roofMid: string;
  roofShadow: string;
  roofHigh: string;
  /** Rim/eaves trim under the roof — slightly darker than roofShadow. */
  roofRim: string;
  wallMid: string;
  wallShadow: string;
  wallHigh: string;
};

const WOOD_DARK = "#3d2a18";
const WOOD_MID = "#6b4226";
const WOOD_HIGH = "#8c5a2c";
const WINDOW_DARK = "#1f2c3a";
const WINDOW_GLASS = "#7eb9d1";
const WINDOW_GLEAM = "#ffffff";
const FOLIAGE_DARK = "#2a4a28";
const FOLIAGE_MID = "#4a8a48";
const POT_TERRACOTTA = "#a05a30";
const POT_SHADOW = "#6b3a1c";
const SMOKE_LIGHT = "#e6e0d0";
const SMOKE_MID = "#b6aa92";
const STONE_MID = "#7a7a7e";
const STONE_DARK = "#52525a";
const OUTLINE = "#1a1208";
const BIRD_BODY = "#2a2018";
const BIRD_BEAK = "#e6a040";
const BANNER_FRINGE = "#1a1208";

function fill(
  ctx: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function paintRoof(
  ctx: CanvasRenderingContext2D,
  p: HousePaletteVariant,
) {
  // Trapezoidal roof with a flat ridge at the top. Linearly widens
  // from ROOF_RIDGE_W at row 0 to HOUSE_PX_W at the eaves (row 13).
  const rows = 14;
  for (let row = 0; row < rows; row++) {
    const t = row / (rows - 1); // 0 at ridge, 1 at base
    const w = Math.round(
      ROOF_RIDGE_W + (HOUSE_PX_W - ROOF_RIDGE_W) * t,
    );
    const x = Math.floor((HOUSE_PX_W - w) / 2);
    fill(ctx, p.roofShadow, x, row, w, 1);
    fill(ctx, p.roofMid, x + 1, row, w - 2, 1);
    if (row >= 2 && row <= 9) {
      fill(
        ctx,
        p.roofHigh,
        x + 2,
        row,
        Math.max(2, Math.floor((w - 4) / 2)),
        1,
      );
    }
  }
  // Shingle seams — short vertical dashes spaced across the roof.
  for (let col = 6; col < HOUSE_PX_W - 6; col += 7) {
    for (let row = 5; row < 12; row += 4) {
      fill(ctx, p.roofShadow, col, row, 1, 2);
    }
  }
  fill(ctx, p.roofRim, 0, 13, HOUSE_PX_W, 1);
  fill(ctx, OUTLINE, 0, 14, HOUSE_PX_W, 1);
}

function paintWalls(
  ctx: CanvasRenderingContext2D,
  p: HousePaletteVariant,
) {
  // Walls span rows 15..29 (15 rows) across the full 48-px width.
  fill(ctx, OUTLINE, 0, 15, 1, 15);
  fill(ctx, OUTLINE, HOUSE_PX_W - 1, 15, 1, 15);
  fill(ctx, p.wallMid, 1, 15, HOUSE_PX_W - 2, 15);
  // Two horizontal plank shadows.
  fill(ctx, p.wallShadow, 1, 22, HOUSE_PX_W - 2, 1);
  fill(ctx, p.wallShadow, 1, 27, HOUSE_PX_W - 2, 1);
  fill(ctx, p.wallHigh, 1, 15, 1, 15);
}

function paintWindow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
) {
  // 6×6 window with 4-pane mullion + sill. Outlined in dark wood.
  fill(ctx, OUTLINE, x - 1, y - 1, 8, 8);
  fill(ctx, WINDOW_DARK, x, y, 6, 6);
  fill(ctx, WINDOW_GLASS, x + 1, y + 1, 2, 2);
  fill(ctx, WINDOW_GLASS, x + 4, y + 1, 1, 2);
  fill(ctx, WINDOW_GLASS, x + 1, y + 4, 2, 1);
  fill(ctx, WINDOW_GLASS, x + 4, y + 4, 1, 1);
  fill(ctx, WINDOW_GLEAM, x + 1, y + 1, 1, 1);
  // Window sill — 1px overhang below.
  fill(ctx, WOOD_HIGH, x - 1, y + 6, 8, 1);
  fill(ctx, WOOD_DARK, x - 1, y + 7, 8, 1);
}

function paintFlowerpot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bloom: string,
) {
  // 4×3 pot sitting on the windowsill at (x, y) with blooms above.
  fill(ctx, POT_SHADOW, x, y + 1, 4, 2);
  fill(ctx, POT_TERRACOTTA, x, y, 4, 1);
  fill(ctx, POT_TERRACOTTA, x + 1, y + 1, 2, 1);
  // Stems + foliage tuft (1 row above the pot).
  fill(ctx, FOLIAGE_DARK, x, y - 1, 4, 1);
  fill(ctx, FOLIAGE_MID, x + 1, y - 1, 2, 1);
  // Three blooms on top.
  fill(ctx, bloom, x, y - 2, 1, 1);
  fill(ctx, bloom, x + 2, y - 2, 1, 1);
  fill(ctx, bloom, x + 3, y - 3, 1, 1);
}

function paintDoor(
  ctx: CanvasRenderingContext2D,
  banner: string,
) {
  // 8×11 door centered horizontally on a 48-px facade.
  const dx = Math.floor((HOUSE_PX_W - 8) / 2);
  const dy = 19;
  const dw = 8;
  const dh = 11;
  // Frame outline.
  fill(ctx, WOOD_DARK, dx - 1, dy - 1, dw + 2, dh + 2);
  // Door body.
  fill(ctx, WOOD_MID, dx, dy, dw, dh);
  // Plank seams.
  fill(ctx, WOOD_DARK, dx + 3, dy + 1, 1, dh - 2);
  // Highlight along left edge.
  fill(ctx, WOOD_HIGH, dx, dy + 1, 1, dh - 2);
  // Doorknob — single brass dot.
  fill(ctx, "#e8c878", dx + dw - 2, dy + Math.floor(dh / 2), 1, 1);
  // Banner draped above the door — trapezoidal with a fringe edge.
  fill(ctx, BANNER_FRINGE, dx - 2, dy - 3, dw + 4, 1);
  fill(ctx, banner, dx - 1, dy - 2, dw + 2, 2);
  fill(ctx, BANNER_FRINGE, dx, dy, 1, 1);
  fill(ctx, BANNER_FRINGE, dx + dw - 1, dy, 1, 1);
}

function paintFoundation(ctx: CanvasRenderingContext2D) {
  // Two rows of cobblestone foundation at rows 30-31.
  fill(ctx, OUTLINE, 0, 30, HOUSE_PX_W, 1);
  fill(ctx, STONE_MID, 0, 31, HOUSE_PX_W, 1);
  for (let x = 3; x < HOUSE_PX_W; x += 4) {
    fill(ctx, STONE_DARK, x, 31, 1, 1);
  }
}

function paintChimney(
  ctx: CanvasRenderingContext2D,
  side: "left" | "right",
) {
  // 4×6 chimney sticking out of the roof slope. Positioned at the
  // x where the chimney top row actually meets the slope, so it
  // doesn't float in the sky above the new flat-ridge roof.
  const top = 3;
  // At row `top` the roof body covers a band centered on the canvas.
  // Solve the trapezoid math: w = ridge + (full-ridge) * t.
  const t = top / 13;
  const slopeW = Math.round(
    ROOF_RIDGE_W + (HOUSE_PX_W - ROOF_RIDGE_W) * t,
  );
  const slopeX = Math.floor((HOUSE_PX_W - slopeW) / 2);
  const cx = side === "left" ? slopeX + 2 : slopeX + slopeW - 6;
  fill(ctx, OUTLINE, cx - 1, top, 6, 8);
  fill(ctx, STONE_MID, cx, top + 1, 4, 6);
  fill(ctx, STONE_DARK, cx + 1, top + 2, 1, 4);
  fill(ctx, STONE_DARK, cx + 3, top + 4, 1, 2);
  fill(ctx, OUTLINE, cx - 1, top, 6, 1);
  // A puff of smoke rising above the chimney.
  fill(ctx, SMOKE_MID, cx + 1, top - 2, 2, 1);
  fill(ctx, SMOKE_LIGHT, cx, top - 4, 3, 2);
}

function paintBird(ctx: CanvasRenderingContext2D) {
  // Tiny 3×2 bird perched at the centre of the flat ridge.
  const cx = Math.floor(HOUSE_PX_W / 2) - 1;
  fill(ctx, BIRD_BODY, cx, 0, 3, 2);
  fill(ctx, BIRD_BEAK, cx + 3, 1, 1, 1);
  fill(ctx, BIRD_BODY, cx - 1, 1, 1, 1);
}

/**
 * Procedurally paint a 32×32 cottage. Per-entity variation comes from
 * the `decor` argument so each entity's house feels unique without a
 * hand-painted asset per id.
 */
export function paintHouse(
  palette: HousePaletteVariant,
  decor: HouseDecor,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = HOUSE_PX_W;
  c.height = HOUSE_PX_H;
  const ctx = c.getContext("2d", { alpha: true });
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;

  paintRoof(ctx, palette);
  paintChimney(ctx, decor.chimneySide);
  if (decor.hasBird) paintBird(ctx);
  paintWalls(ctx, palette);
  // Two windows in the upper wall band, set wide on the 48-px facade.
  paintWindow(ctx, 5, 17);
  paintWindow(ctx, HOUSE_PX_W - 13, 17);
  paintFlowerpot(ctx, 6, 25, decor.flowerColor);
  paintFlowerpot(ctx, HOUSE_PX_W - 12, 25, decor.flowerColor);
  paintDoor(ctx, decor.bannerColor);
  paintFoundation(ctx);
  return c;
}

/** Brand and creator base palettes. Decor adds the per-entity flavor. */
export const HOUSE_PALETTES = {
  brand: {
    roofMid: "#d97a3a",
    roofShadow: "#8c4a1c",
    roofHigh: "#f5a060",
    roofRim: "#5a2f10",
    wallMid: "#e8d8b0",
    wallShadow: "#a88a58",
    wallHigh: "#fff0c8",
  } satisfies HousePaletteVariant,
  creator: {
    roofMid: "#3a7d92",
    roofShadow: "#1f4d5e",
    roofHigh: "#7fc0d2",
    roofRim: "#103040",
    wallMid: "#dde4ea",
    wallShadow: "#8ea0ae",
    wallHigh: "#ffffff",
  } satisfies HousePaletteVariant,
} as const;

/** Pluck a value from a list deterministically by string hash. */
function hashPick<T>(seed: string, choices: readonly T[]): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return choices[Math.abs(h) % choices.length];
}

const FLOWER_BLOOMS = [
  "#e85070", // pink
  "#f0e060", // yellow
  "#7050d0", // purple
  "#e84030", // red
  "#ffffff", // white
] as const;

const BANNER_COLORS_BRAND = [
  "#a83020",
  "#c46a18",
  "#7a4e10",
  "#a8782a",
] as const;

const BANNER_COLORS_CREATOR = [
  "#2a4f8a",
  "#3a6f5a",
  "#5a3a7a",
  "#284f6e",
] as const;

/**
 * Build the deterministic decor for a given entity id. Two entities
 * with adjacent ids will get slightly different houses; each entity
 * always gets the same house across reloads.
 */
export function decorForEntity(
  id: string,
  kind: "brand" | "creator",
): HouseDecor {
  return {
    flowerColor: hashPick(`${id}:flower`, FLOWER_BLOOMS),
    bannerColor: hashPick(
      `${id}:banner`,
      kind === "brand" ? BANNER_COLORS_BRAND : BANNER_COLORS_CREATOR,
    ),
    chimneySide: hashPick(`${id}:chimney`, ["left", "right"] as const),
    hasBird: hashPick(`${id}:bird`, [true, false, false] as const),
  };
}

/* ---- Long house variant -----------------------------------------------
 * Wider-feeling 32×32 cottage with a shorter main roof so the walls
 * read as 1.5 floors. A small gabled dormer projects above the roof
 * line carrying a second-floor window. Two ground-floor windows flank
 * the door. Chimney + roof bird (when rolled) still apply.
 * --------------------------------------------------------------------- */

function paintLongHouseRoof(
  ctx: CanvasRenderingContext2D,
  p: HousePaletteVariant,
) {
  // Shorter main roof — rows 4..11 (8 rows) over the 48-px facade,
  // with a wider flat ridge so the silhouette reads as long-and-low.
  const ridge = 16;
  const baseY = 4;
  const heightRows = 8;
  for (let i = 0; i < heightRows; i++) {
    const row = baseY + i;
    const t = i / (heightRows - 1);
    const w = Math.round(ridge + (HOUSE_PX_W - ridge) * t);
    const x = Math.floor((HOUSE_PX_W - w) / 2);
    fill(ctx, p.roofShadow, x, row, w, 1);
    fill(ctx, p.roofMid, x + 1, row, w - 2, 1);
    if (i >= 2 && i <= 6) {
      fill(
        ctx,
        p.roofHigh,
        x + 2,
        row,
        Math.max(2, Math.floor((w - 4) / 2)),
        1,
      );
    }
  }
  for (let col = 6; col < HOUSE_PX_W - 6; col += 7) {
    for (let row = baseY + 2; row < baseY + heightRows; row += 3) {
      fill(ctx, p.roofShadow, col, row, 1, 1);
    }
  }
  fill(ctx, p.roofRim, 0, 12, HOUSE_PX_W, 1);
  fill(ctx, OUTLINE, 0, 13, HOUSE_PX_W, 1);
}

function paintDormer(
  ctx: CanvasRenderingContext2D,
  p: HousePaletteVariant,
) {
  // 10-wide dormer centered on the 48-px facade. Mini gable above the
  // main roof (rows 0..3 narrowing) sitting on a small wall face
  // (rows 4..10) carrying the second-floor window.
  const dw = 10;
  const dx = Math.floor((HOUSE_PX_W - dw) / 2);
  // Mini gable apex at row 0.
  for (let row = 0; row < 4; row++) {
    const inset = 3 - row;
    fill(ctx, p.roofShadow, dx + inset, row, dw - inset * 2, 1);
    fill(
      ctx,
      p.roofMid,
      dx + inset + 1,
      row,
      Math.max(0, dw - inset * 2 - 2),
      1,
    );
  }
  // Dormer wall face (rows 4..10).
  fill(ctx, OUTLINE, dx, 4, 1, 7);
  fill(ctx, OUTLINE, dx + dw - 1, 4, 1, 7);
  fill(ctx, p.wallMid, dx + 1, 4, dw - 2, 7);
  fill(ctx, p.wallHigh, dx + 1, 4, 1, 7);
  fill(ctx, p.wallShadow, dx + 1, 10, dw - 2, 1);
  // Tiny attic window.
  fill(ctx, OUTLINE, dx + 2, 5, dw - 4, 4);
  fill(ctx, WINDOW_DARK, dx + 3, 6, dw - 6, 2);
  fill(ctx, WINDOW_GLASS, dx + 3, 6, 1, 1);
  fill(ctx, WINDOW_GLEAM, dx + 3, 6, 1, 1);
  // Sill over the eaves.
  fill(ctx, WOOD_HIGH, dx + 1, 11, dw - 2, 1);
}

function paintLongHouseWalls(
  ctx: CanvasRenderingContext2D,
  p: HousePaletteVariant,
) {
  // Wall band rows 14..29 (16 rows tall — one row taller than cottage).
  fill(ctx, OUTLINE, 0, 14, 1, 16);
  fill(ctx, OUTLINE, HOUSE_PX_W - 1, 14, 1, 16);
  fill(ctx, p.wallMid, 1, 14, HOUSE_PX_W - 2, 16);
  fill(ctx, p.wallShadow, 1, 21, HOUSE_PX_W - 2, 1);
  fill(ctx, p.wallShadow, 1, 27, HOUSE_PX_W - 2, 1);
  fill(ctx, p.wallHigh, 1, 14, 1, 16);
}

export function paintLongHouse(
  palette: HousePaletteVariant,
  decor: HouseDecor,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = HOUSE_PX_W;
  c.height = HOUSE_PX_H;
  const ctx = c.getContext("2d", { alpha: true });
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;

  paintLongHouseRoof(ctx, palette);
  paintChimney(ctx, decor.chimneySide);
  paintDormer(ctx, palette);
  if (decor.hasBird) paintBird(ctx);
  paintLongHouseWalls(ctx, palette);
  // Wider 48-px facade fits 3 ground-floor windows: two flanking the
  // door and one tucked just under the dormer's overhang. The dormer
  // already carries the upstairs window, giving the long house its
  // signature multi-window front.
  paintWindow(ctx, 3, 17);
  paintWindow(ctx, HOUSE_PX_W - 9, 17);
  paintFlowerpot(ctx, 4, 25, decor.flowerColor);
  paintFlowerpot(ctx, HOUSE_PX_W - 8, 25, decor.flowerColor);
  paintDoor(ctx, decor.bannerColor);
  paintFoundation(ctx);
  return c;
}

/* ---- House-type dispatch ---------------------------------------------
 * Each entity gets one of three architectural templates. The other two
 * (double / farm) ship in subsequent chunks; for now they fall back to
 * the cottage so the world keeps rendering while work is in progress.
 * --------------------------------------------------------------------- */

export type HouseType = "long" | "double" | "farm";

export function houseTypeForEntity(id: string): HouseType {
  return hashPick(`${id}:htype`, ["long", "double", "farm"] as const);
}

/** Build a full house texture for an entity — palette by kind + decor. */
export function paintHouseForEntity(
  id: string,
  kind: "brand" | "creator",
): HTMLCanvasElement {
  const palette = HOUSE_PALETTES[kind];
  const decor = decorForEntity(id, kind);
  switch (houseTypeForEntity(id)) {
    case "long":
      return paintLongHouse(palette, decor);
    // TODO chunk 2/3 — replace these placeholders with real variants.
    case "double":
    case "farm":
      return paintHouse(palette, decor);
  }
}

/* ---- Tree -------------------------------------------------------------
 * 16×16 deciduous tree with transparent background — placed as a sprite
 * (not a tile) so it can sit decoratively over a grass tile while the
 * grass tile underneath gets ge_collide flipped on for blocking.
 * --------------------------------------------------------------------- */

const TREE_PALETTE: Palette = [
  null,
  "#1f3a1c", // 1 — foliage outline
  "#3a7038", // 2 — foliage shadow
  "#5fa55f", // 3 — foliage mid
  "#84c47e", // 4 — foliage highlight
  "#3a2515", // 5 — trunk outline
  "#6b4628", // 6 — trunk mid
  "#8a5a32", // 7 — trunk highlight
];

const TREE: readonly (readonly number[])[] = [
  [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 3, 4, 3, 3, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 3, 3, 4, 3, 3, 3, 3, 3, 1, 0, 0, 0],
  [0, 0, 1, 3, 4, 3, 3, 3, 3, 4, 3, 3, 3, 1, 0, 0],
  [0, 1, 3, 3, 3, 3, 4, 3, 3, 3, 3, 3, 4, 3, 1, 0],
  [0, 1, 3, 4, 3, 3, 3, 3, 3, 4, 3, 3, 3, 3, 1, 0],
  [0, 1, 2, 3, 3, 3, 3, 4, 3, 3, 3, 3, 3, 2, 1, 0],
  [0, 1, 3, 3, 4, 3, 2, 2, 2, 3, 3, 4, 3, 3, 1, 0],
  [0, 0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 0, 0],
  [0, 0, 0, 1, 3, 4, 3, 2, 2, 3, 4, 3, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 3, 3, 2, 2, 3, 3, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 5, 6, 7, 5, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 5, 6, 6, 5, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 5, 7, 6, 5, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 5, 5, 5, 5, 5, 5, 0, 0, 0, 0, 0],
];

export function paintTree(): HTMLCanvasElement {
  return paintGrid(TREE, TREE_PALETTE);
}

/* =====================================================================
 * Character spritesheets — 16×16 frames in a 3×4 grid (48×64 total)
 * laid out in grid-engine's default order: cols = leftFoot/standing/
 * rightFoot, rows = down/left/right/up. The sprite art is identical
 * across rows for now (front-facing) so all four directions read as
 * the same character; a later pass adds proper profile/back views.
 * Animating just the leg pose still reads as walking.
 * ===================================================================== */

export const CHAR_FRAME_PX = 16;
export const CHAR_SHEET_COLS = 3;
export const CHAR_SHEET_ROWS = 4;

export type CharPalette = {
  /** Hair / cap top. */
  hairMid: string;
  hairShadow: string;
  skin: string;
  skinShadow: string;
  /** Tunic body. */
  tunicMid: string;
  tunicShadow: string;
  /** Trousers below the belt. */
  trouserMid: string;
  trouserDark: string;
  /** Boots / belt accent. */
  boot: string;
  /** Pixel outline; usually near-black. */
  outline: string;
};

type Pose = "left" | "stand" | "right";

function drawCharFrame(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  pose: Pose,
  p: CharPalette,
) {
  // Head + cap (rows 0..6).
  fill(ctx, p.outline, ox + 4, oy, 8, 1);
  fill(ctx, p.hairMid, ox + 3, oy + 1, 10, 2);
  fill(ctx, p.hairShadow, ox + 3, oy + 3, 10, 1);
  fill(ctx, p.outline, ox + 2, oy + 1, 1, 3);
  fill(ctx, p.outline, ox + 13, oy + 1, 1, 3);
  // Face band.
  fill(ctx, p.outline, ox + 2, oy + 4, 12, 1);
  fill(ctx, p.skin, ox + 3, oy + 5, 10, 2);
  fill(ctx, p.skinShadow, ox + 3, oy + 7, 10, 1);
  fill(ctx, p.outline, ox + 5, oy + 5, 1, 1);
  fill(ctx, p.outline, ox + 10, oy + 5, 1, 1);
  fill(ctx, p.outline, ox + 2, oy + 5, 1, 3);
  fill(ctx, p.outline, ox + 13, oy + 5, 1, 3);
  // Tunic torso (rows 8..11) + belt (row 12).
  fill(ctx, p.outline, ox + 3, oy + 8, 10, 1);
  fill(ctx, p.tunicMid, ox + 3, oy + 9, 10, 3);
  fill(ctx, p.tunicShadow, ox + 3, oy + 11, 10, 1);
  fill(ctx, p.outline, ox + 2, oy + 8, 1, 4);
  fill(ctx, p.outline, ox + 13, oy + 8, 1, 4);
  fill(ctx, p.boot, ox + 2, oy + 12, 12, 1);
  // Legs / boots (rows 13..15) — pose drives which foot leads.
  // Standing both feet land on row 15. Left = left foot lands a row
  // earlier than right (stride forward); right is the mirror.
  const leftDrop = pose === "left" ? 0 : pose === "right" ? 1 : 0;
  const rightDrop = pose === "right" ? 0 : pose === "left" ? 1 : 0;
  // Left leg: cols 4..7.
  fill(ctx, p.trouserMid, ox + 4, oy + 13, 3, 2);
  fill(ctx, p.trouserDark, ox + 4, oy + 14, 3, 1);
  fill(ctx, p.boot, ox + 4, oy + 15 - leftDrop, 3, 1);
  fill(ctx, p.outline, ox + 3, oy + 13, 1, 3);
  fill(ctx, p.outline, ox + 7, oy + 13, 1, 3);
  // Right leg: cols 8..11.
  fill(ctx, p.trouserMid, ox + 9, oy + 13, 3, 2);
  fill(ctx, p.trouserDark, ox + 9, oy + 14, 3, 1);
  fill(ctx, p.boot, ox + 9, oy + 15 - rightDrop, 3, 1);
  fill(ctx, p.outline, ox + 8, oy + 13, 1, 3);
  fill(ctx, p.outline, ox + 12, oy + 13, 1, 3);
  // Arms — short stubs at the sides, slightly swinging with stride.
  const leftArmDy = pose === "left" ? -1 : pose === "right" ? 1 : 0;
  const rightArmDy = pose === "right" ? -1 : pose === "left" ? 1 : 0;
  fill(ctx, p.tunicShadow, ox + 1, oy + 9 + leftArmDy, 1, 2);
  fill(ctx, p.skin, ox + 1, oy + 11 + leftArmDy, 1, 1);
  fill(ctx, p.tunicShadow, ox + 14, oy + 9 + rightArmDy, 1, 2);
  fill(ctx, p.skin, ox + 14, oy + 11 + rightArmDy, 1, 1);
}

/** Paint a full 48×64 walk sheet for one character palette. */
export function paintCharacterSheet(p: CharPalette): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = CHAR_FRAME_PX * CHAR_SHEET_COLS;
  c.height = CHAR_FRAME_PX * CHAR_SHEET_ROWS;
  const ctx = c.getContext("2d", { alpha: true });
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;
  const poses: Pose[] = ["left", "stand", "right"];
  for (let row = 0; row < CHAR_SHEET_ROWS; row++) {
    for (let col = 0; col < CHAR_SHEET_COLS; col++) {
      drawCharFrame(
        ctx,
        col * CHAR_FRAME_PX,
        row * CHAR_FRAME_PX,
        poses[col],
        p,
      );
    }
  }
  return c;
}

export const PLAYER_CHAR_PALETTE: CharPalette = {
  hairMid: "#3a7d3a",
  hairShadow: "#2a5d2a",
  skin: "#f5c39b",
  skinShadow: "#d49a73",
  tunicMid: "#5fa55f",
  tunicShadow: "#3e7a3e",
  trouserMid: "#4a3a8a",
  trouserDark: "#2a2058",
  boot: "#6b4226",
  outline: "#1a1208",
};

/** Cheap perceptual darken — used to derive shadow tones from a base
 *  hex without needing per-color shadow constants. */
function darkenHex(hex: string, drop = 40): string {
  const h = hex.replace("#", "");
  const r = Math.max(0, parseInt(h.slice(0, 2), 16) - drop);
  const g = Math.max(0, parseInt(h.slice(2, 4), 16) - drop);
  const b = Math.max(0, parseInt(h.slice(4, 6), 16) - drop);
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const NPC_HAIR_BRAND = [
  "#a85a36",
  "#7a3a20",
  "#d4a05a",
  "#5a3818",
  "#c8a87a",
  "#3a2a18",
] as const;
const NPC_HAIR_CREATOR = [
  "#2a2018",
  "#1a1208",
  "#3a2a4a",
  "#4a2a36",
  "#5a4a3a",
  "#9a8aa5",
] as const;
const NPC_TUNIC_BRAND = [
  "#c45040",
  "#b86a28",
  "#d8a040",
  "#a8483a",
  "#8a4d20",
  "#a83020",
] as const;
const NPC_TUNIC_CREATOR = [
  "#3e6fb0",
  "#2a5a78",
  "#3a7d92",
  "#5a3a7a",
  "#1f4d5e",
  "#284f6e",
] as const;
const NPC_SKIN_TONES = [
  ["#f5c39b", "#d49a73"],
  ["#e8b890", "#c08a60"],
  ["#c89072", "#9a6848"],
  ["#8a5a3a", "#5a3820"],
] as const;
const NPC_TROUSERS = [
  ["#3a3a4a", "#1f1f2a"],
  ["#5a4a36", "#36281a"],
  ["#2a3a5a", "#1a2438"],
  ["#3a2a3a", "#241828"],
] as const;

/** Deterministic CharPalette for an entity NPC — same id → same look
 *  every reload, so each marketplace entity has a recognisable
 *  villager standing by their door. */
export function paletteForEntityNpc(
  id: string,
  kind: "brand" | "creator",
): CharPalette {
  const hair = hashPick(
    `${id}:npchair`,
    kind === "brand" ? NPC_HAIR_BRAND : NPC_HAIR_CREATOR,
  );
  const tunic = hashPick(
    `${id}:npctunic`,
    kind === "brand" ? NPC_TUNIC_BRAND : NPC_TUNIC_CREATOR,
  );
  const skin = hashPick(`${id}:npcskin`, NPC_SKIN_TONES);
  const trouser = hashPick(`${id}:npctrouser`, NPC_TROUSERS);
  return {
    hairMid: hair,
    hairShadow: darkenHex(hair),
    skin: skin[0],
    skinShadow: skin[1],
    tunicMid: tunic,
    tunicShadow: darkenHex(tunic),
    trouserMid: trouser[0],
    trouserDark: trouser[1],
    boot: "#3d2a18",
    outline: "#1a1208",
  };
}

/** Convenience — full walk sheet for the entity NPC tied to an id. */
export function paintEntityNpcSheet(
  id: string,
  kind: "brand" | "creator",
): HTMLCanvasElement {
  return paintCharacterSheet(paletteForEntityNpc(id, kind));
}

/* ---- Flavor (wandering villager) palettes -------------------------- */

const FLAVOR_HAIR_ELDER = [
  "#c8c8d2",
  "#9a9aa5",
  "#e0e0e8",
  "#a8a8b0",
  "#b0a098",
] as const;
const FLAVOR_HAIR_TRAVELER = [
  "#d4a05a",
  "#c89060",
  "#b8884a",
  "#e0b870",
  "#7a4a20",
] as const;
const FLAVOR_TUNIC_ELDER = [
  "#7a4275",
  "#5a3036",
  "#4a3818",
  "#3a4a2a",
  "#5a4870",
] as const;
const FLAVOR_TUNIC_TRAVELER = [
  "#c89c34",
  "#7a6020",
  "#a87a30",
  "#5a4820",
  "#8a5a30",
] as const;

/** Deterministic CharPalette for a wandering villager — hashed from
 *  flavorId so each civilian on the map looks distinct, with the
 *  variant biasing them toward elder (silver tones) or traveler
 *  (sandy/road-worn) palettes. */
export function paletteForFlavorNpc(
  id: string,
  variant: "elder" | "traveler",
): CharPalette {
  const hair = hashPick(
    `${id}:fhair`,
    variant === "elder" ? FLAVOR_HAIR_ELDER : FLAVOR_HAIR_TRAVELER,
  );
  const tunic = hashPick(
    `${id}:ftunic`,
    variant === "elder" ? FLAVOR_TUNIC_ELDER : FLAVOR_TUNIC_TRAVELER,
  );
  const skin = hashPick(`${id}:fskin`, NPC_SKIN_TONES);
  const trouser = hashPick(`${id}:ftrouser`, NPC_TROUSERS);
  return {
    hairMid: hair,
    hairShadow: darkenHex(hair),
    skin: skin[0],
    skinShadow: skin[1],
    tunicMid: tunic,
    tunicShadow: darkenHex(tunic),
    trouserMid: trouser[0],
    trouserDark: trouser[1],
    boot: "#3d2a18",
    outline: "#1a1208",
  };
}

export function paintFlavorNpcSheet(
  id: string,
  variant: "elder" | "traveler",
): HTMLCanvasElement {
  return paintCharacterSheet(paletteForFlavorNpc(id, variant));
}

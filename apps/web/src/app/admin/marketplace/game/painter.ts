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
  "#8a8276", // 17 — rocky ground mid (mountain floor)
  "#5a5550", // 18 — rocky ground dark
  "#a8a298", // 19 — rocky ground light
  "#4a8048", // 20 — tall-grass mid (darker, mossier base)
  "#356030", // 21 — tall-grass dark blade
  "#6aaa55", // 22 — tall-grass blade highlight
  "#f4f4ee", // 23 — daisy petal white
  "#e8c040", // 24 — daisy centre yellow
  "#c8c8b0", // 25 — cobblestone mid (warm pale grey)
  "#909078", // 26 — cobblestone dark (mortar)
  "#e0e0c8", // 27 — cobblestone highlight
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

// 16×16 rocky ground tile — walkable mountain terrain. Mid-grey base
// with occasional dark/light pebble specks.
const ROCKY_GROUND: readonly (readonly number[])[] = [
  [17, 17, 18, 17, 17, 17, 19, 17, 17, 18, 17, 17, 17, 17, 19, 17],
  [17, 19, 17, 17, 18, 17, 17, 17, 17, 17, 17, 18, 17, 17, 17, 17],
  [17, 17, 17, 17, 17, 17, 17, 19, 17, 17, 17, 17, 17, 19, 17, 18],
  [18, 17, 17, 19, 17, 17, 17, 17, 17, 17, 18, 17, 17, 17, 17, 17],
  [17, 17, 17, 17, 17, 17, 18, 17, 17, 19, 17, 17, 17, 17, 17, 17],
  [17, 17, 18, 17, 19, 17, 17, 17, 17, 17, 17, 17, 17, 17, 18, 17],
  [17, 17, 17, 17, 17, 17, 17, 17, 19, 17, 17, 17, 17, 17, 17, 17],
  [19, 17, 17, 17, 17, 18, 17, 17, 17, 17, 17, 17, 19, 17, 17, 17],
  [17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 18, 17, 17, 17, 17],
  [17, 18, 17, 17, 17, 17, 19, 17, 17, 17, 17, 17, 17, 17, 17, 18],
  [17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 19, 17, 17],
  [17, 17, 17, 19, 17, 17, 17, 17, 18, 17, 17, 17, 17, 17, 17, 17],
  [17, 17, 17, 17, 17, 17, 17, 17, 17, 17, 19, 17, 17, 17, 18, 17],
  [18, 17, 17, 17, 17, 17, 17, 19, 17, 17, 17, 17, 17, 17, 17, 17],
  [17, 17, 19, 17, 17, 17, 17, 17, 17, 17, 17, 18, 17, 17, 17, 17],
  [17, 17, 17, 17, 18, 17, 17, 17, 17, 19, 17, 17, 17, 17, 17, 17],
];

// 16×16 tall grass — darker mossy base with vertical blade tufts.
// Uses palette indices 20-22 (mid + dark blade + highlight).
const TALL_GRASS: readonly (readonly number[])[] = [
  [20, 20, 21, 20, 20, 20, 20, 21, 20, 20, 20, 20, 21, 20, 20, 20],
  [20, 22, 21, 20, 20, 20, 21, 20, 20, 20, 20, 21, 22, 20, 20, 20],
  [20, 20, 20, 20, 21, 20, 20, 20, 20, 21, 20, 20, 20, 20, 21, 20],
  [20, 20, 20, 20, 20, 20, 20, 22, 20, 20, 20, 20, 20, 22, 20, 20],
  [21, 20, 22, 20, 20, 20, 21, 20, 20, 20, 20, 21, 20, 20, 20, 20],
  [20, 20, 20, 20, 20, 21, 20, 20, 22, 20, 20, 20, 20, 20, 20, 21],
  [20, 21, 20, 22, 20, 20, 20, 20, 20, 20, 20, 21, 20, 20, 22, 20],
  [20, 20, 20, 20, 20, 20, 20, 20, 21, 20, 22, 20, 20, 20, 20, 20],
  [20, 20, 21, 20, 20, 22, 20, 20, 20, 20, 20, 20, 21, 20, 20, 20],
  [22, 20, 20, 20, 20, 20, 20, 21, 20, 20, 20, 20, 20, 20, 20, 22],
  [20, 20, 20, 21, 20, 20, 22, 20, 20, 20, 21, 20, 20, 22, 20, 20],
  [20, 20, 20, 20, 20, 20, 20, 20, 20, 21, 20, 20, 20, 20, 20, 20],
  [21, 20, 22, 20, 20, 21, 20, 20, 22, 20, 20, 20, 20, 20, 21, 20],
  [20, 20, 20, 20, 22, 20, 20, 20, 20, 20, 20, 21, 22, 20, 20, 20],
  [20, 21, 20, 20, 20, 20, 20, 21, 20, 20, 20, 20, 20, 20, 20, 21],
  [20, 20, 20, 20, 20, 21, 20, 20, 20, 22, 20, 20, 21, 20, 20, 20],
];

// 16×16 daisy grass — regular grass base with white + yellow daisies.
const DAISY_GRASS: readonly (readonly number[])[] = [
  [1, 1, 1, 2, 1, 1, 23, 1, 1, 1, 1, 1, 1, 2, 1, 1],
  [1, 23, 1, 1, 1, 23, 24, 23, 1, 1, 23, 23, 1, 1, 23, 23],
  [23, 24, 23, 1, 1, 1, 23, 1, 1, 1, 23, 24, 1, 1, 24, 23],
  [1, 23, 1, 1, 1, 1, 1, 1, 23, 23, 1, 23, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 3, 1, 23, 24, 23, 1, 1, 1, 2, 1, 1],
  [1, 1, 23, 23, 1, 1, 1, 1, 23, 1, 1, 1, 1, 1, 1, 1],
  [1, 23, 24, 23, 1, 1, 1, 1, 1, 1, 1, 1, 23, 23, 1, 1],
  [1, 1, 23, 1, 3, 1, 1, 23, 1, 1, 1, 1, 23, 24, 23, 1],
  [1, 1, 1, 1, 1, 1, 23, 24, 23, 1, 1, 1, 1, 23, 1, 1],
  [1, 1, 1, 2, 1, 1, 1, 23, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 23, 23, 1, 1, 1, 1, 23],
  [23, 23, 1, 1, 1, 1, 1, 1, 23, 24, 23, 1, 1, 1, 23, 24],
  [24, 23, 1, 1, 23, 1, 1, 1, 1, 23, 1, 1, 1, 1, 23, 23],
  [23, 1, 1, 23, 23, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 23, 24, 23, 1, 1, 1, 1, 23, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 23, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

// 16×16 cobblestone — pale warm-grey paved stone with sparse darker
// mortar specks + occasional highlights. Walkable (used in the town
// square plaza).
const COBBLESTONE: readonly (readonly number[])[] = [
  [25, 25, 27, 25, 26, 25, 25, 25, 27, 25, 25, 26, 25, 27, 25, 25],
  [25, 27, 25, 25, 25, 27, 25, 25, 25, 26, 25, 25, 25, 25, 27, 26],
  [26, 25, 25, 25, 27, 25, 26, 25, 25, 25, 25, 27, 25, 25, 25, 25],
  [25, 25, 26, 25, 25, 25, 25, 25, 26, 25, 27, 25, 26, 25, 25, 25],
  [27, 25, 25, 25, 25, 26, 25, 27, 25, 25, 25, 25, 25, 25, 26, 25],
  [25, 25, 27, 25, 26, 25, 25, 25, 25, 27, 25, 26, 25, 25, 25, 27],
  [25, 25, 25, 25, 25, 25, 26, 25, 25, 25, 26, 25, 25, 27, 25, 25],
  [25, 26, 25, 27, 25, 25, 25, 25, 27, 25, 25, 25, 25, 25, 25, 26],
  [25, 25, 25, 25, 25, 27, 25, 25, 25, 26, 25, 25, 27, 25, 25, 25],
  [26, 25, 25, 27, 25, 25, 26, 25, 25, 25, 25, 27, 25, 25, 26, 25],
  [25, 27, 25, 25, 25, 25, 25, 27, 25, 25, 25, 25, 25, 25, 25, 25],
  [25, 25, 26, 25, 27, 25, 25, 25, 26, 25, 27, 25, 25, 26, 25, 27],
  [27, 25, 25, 25, 25, 25, 26, 25, 25, 27, 25, 25, 25, 25, 25, 25],
  [25, 25, 25, 26, 25, 27, 25, 25, 25, 25, 26, 25, 27, 25, 25, 25],
  [25, 26, 25, 25, 27, 25, 25, 25, 27, 25, 25, 25, 25, 25, 27, 25],
  [25, 25, 25, 25, 25, 25, 26, 25, 25, 25, 25, 27, 25, 26, 25, 25],
];

const TILE_ORDER = [
  GRASS,
  GRASS_FLOWER,
  DIRT,
  WATER,
  STONE,
  BRIDGE,
  ROCKY_GROUND,
  TALL_GRASS,
  DAISY_GRASS,
  COBBLESTONE,
];

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
  ROCKY_GROUND: 6,
  TALL_GRASS: 7,
  DAISY_GRASS: 8,
  COBBLESTONE: 9,
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

/** Tiny roof bird as its own sprite — same 5×2 silhouette as the
 *  in-texture paintBird, painted into a 16×16 transparent canvas with
 *  body at local (1, 0) so the bird tail sits at x=0. Layered on top
 *  of the cottage roof so it can flutter via Phaser tween without
 *  leaving a frozen pixel behind in the house texture. */
export function paintRoofBird(): HTMLCanvasElement {
  const { c, ctx } = newYardCanvas();
  if (!ctx) return c;
  const BX = 1;
  fill(ctx, BIRD_BODY, BX, 0, 3, 2);
  fill(ctx, BIRD_BEAK, BX + 3, 1, 1, 1);
  fill(ctx, BIRD_BODY, BX - 1, 1, 1, 1);
  return c;
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
  // Bird is no longer baked into the cottage texture — it's a separate
  // sprite layer (paintRoofBird) so it can flutter via Phaser tween.
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

/** Per-entity wall + roof wash overlays. Each entity deterministically
 *  picks one wall wash and one roof wash from its kind's pool, layering
 *  it over the base HOUSE_PALETTES to produce a unique-looking facade
 *  while staying inside the brand/creator colour family. Most variant
 *  painters honour these (cottage, manor, workshop, houseboat, tower);
 *  barn + greenhouse use their own fixed palettes by design and ignore
 *  the wash. */

type WallWash = Pick<HousePaletteVariant, "wallMid" | "wallShadow" | "wallHigh">;
type RoofWash = Pick<HousePaletteVariant, "roofMid" | "roofShadow" | "roofHigh" | "roofRim">;

const BRAND_WALL_WASHES: readonly WallWash[] = [
  { wallMid: "#e8d8b0", wallShadow: "#a88a58", wallHigh: "#fff0c8" }, // cream (default)
  { wallMid: "#eed0b0", wallShadow: "#a87850", wallHigh: "#ffe4c8" }, // peach
  { wallMid: "#f0e0a8", wallShadow: "#a89048", wallHigh: "#fff8c8" }, // butter
  { wallMid: "#dec898", wallShadow: "#a07c40", wallHigh: "#f8e0b0" }, // sand
];

const BRAND_ROOF_WASHES: readonly RoofWash[] = [
  { roofMid: "#d97a3a", roofShadow: "#8c4a1c", roofHigh: "#f5a060", roofRim: "#5a2f10" }, // rust (default)
  { roofMid: "#c8602c", roofShadow: "#7a3818", roofHigh: "#e88a48", roofRim: "#4a2008" }, // terracotta
  { roofMid: "#d89030", roofShadow: "#8c5a18", roofHigh: "#f0b048", roofRim: "#5a3010" }, // ochre
  { roofMid: "#b04830", roofShadow: "#702818", roofHigh: "#d07050", roofRim: "#3a1208" }, // brick
];

const CREATOR_WALL_WASHES: readonly WallWash[] = [
  { wallMid: "#dde4ea", wallShadow: "#8ea0ae", wallHigh: "#ffffff" }, // pearl-grey (default)
  { wallMid: "#d8e8e8", wallShadow: "#8eaaae", wallHigh: "#f4ffff" }, // mint-grey
  { wallMid: "#d0d8e8", wallShadow: "#8090a8", wallHigh: "#f0f8ff" }, // lavender-grey
  { wallMid: "#dadee8", wallShadow: "#9098a8", wallHigh: "#fafaff" }, // moonstone
];

const CREATOR_ROOF_WASHES: readonly RoofWash[] = [
  { roofMid: "#3a7d92", roofShadow: "#1f4d5e", roofHigh: "#7fc0d2", roofRim: "#103040" }, // teal (default)
  { roofMid: "#2a6082", roofShadow: "#143850", roofHigh: "#5ea0c8", roofRim: "#082030" }, // ocean
  { roofMid: "#4f6890", roofShadow: "#2a3858", roofHigh: "#90a8c8", roofRim: "#181f30" }, // slate
  { roofMid: "#286860", roofShadow: "#103a38", roofHigh: "#6ea0a0", roofRim: "#082018" }, // sea-green
];

function washedPaletteFor(
  id: string,
  kind: "brand" | "creator",
): HousePaletteVariant {
  const base = HOUSE_PALETTES[kind];
  const walls = kind === "brand" ? BRAND_WALL_WASHES : CREATOR_WALL_WASHES;
  const roofs = kind === "brand" ? BRAND_ROOF_WASHES : CREATOR_ROOF_WASHES;
  return {
    ...base,
    ...hashPick(`${id}:wall`, walls),
    ...hashPick(`${id}:roof`, roofs),
  };
}

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

/* ---------------------------------------------------------------------
 * Barn variant — 96×32 (6×2 tiles). Red plank walls, dark slate roof,
 * large sliding double door with X-brace right-of-centre, small hayloft
 * window with hay tuft, weathervane spike on the roof apex. No regular
 * walls-windows. Brand quarter only.
 * --------------------------------------------------------------------- */

const BARN_PX_W = 96;
const BARN_PX_H = 32;
/** Door tile offset (0-indexed within the house's tile footprint). The
 *  big sliding door spans tiles 3-4 (px 48-79), so the player stands on
 *  the leftmost tile of the door pair. */
const BARN_DOOR_TILE_X = 3;

const BARN_ROOF_DARK = "#2a2229";
const BARN_ROOF_MID = "#3a313a";
const BARN_ROOF_HIGH = "#5a4d56";
const BARN_RED_DARK = "#5a1612";
const BARN_RED_MID = "#922820";
const BARN_RED_TRIM = "#c24530";
const BARN_DOOR_DARK = "#3d2a18";
const BARN_DOOR_MID = "#5c3820";
const BARN_DOOR_BRACE = "#a47340";
const BARN_HAY = "#d8b04a";
const BARN_HAY_DARK = "#9a7a2a";
const BARN_VANE = "#1a1208";

function paintBarnRoof(ctx: CanvasRenderingContext2D) {
  // Slate slab spanning full width, rows 2-12. Rows 0-1 reserved for
  // the weathervane spike rising above the roofline.
  for (let r = 2; r < 13; r++) {
    fill(ctx, BARN_ROOF_MID, 0, r, BARN_PX_W, 1);
  }
  fill(ctx, BARN_ROOF_HIGH, 0, 2, BARN_PX_W, 1);
  fill(ctx, BARN_ROOF_DARK, 0, 12, BARN_PX_W, 1);
  // Vertical plank seams every 8px — gives the slate a slight texture
  for (let x = 8; x < BARN_PX_W; x += 8) {
    fill(ctx, BARN_ROOF_DARK, x, 2, 1, 10);
  }
  // Hayloft window — small dark recess at centre top with hay tufts
  // poking out below it.
  const wx = (BARN_PX_W - 8) / 2; // 44
  const wy = 4;
  fill(ctx, OUTLINE, wx, wy, 8, 6);
  fill(ctx, "#0d0a0e", wx + 1, wy + 1, 6, 4);
  fill(ctx, BARN_HAY_DARK, wx + 1, wy + 5, 6, 1);
  fill(ctx, BARN_HAY, wx + 2, wy + 5, 4, 1);
  fill(ctx, BARN_HAY, wx, wy + 6, 1, 1);
  fill(ctx, BARN_HAY, wx + 7, wy + 6, 1, 1);
}

function paintBarnWalls(ctx: CanvasRenderingContext2D) {
  for (let r = 13; r < BARN_PX_H - 2; r++) {
    fill(ctx, BARN_RED_MID, 0, r, BARN_PX_W, 1);
  }
  // Trim band right under the roof eaves
  fill(ctx, BARN_RED_TRIM, 0, 13, BARN_PX_W, 1);
  // Vertical plank seams — every 6px keeps the planks visible at zoom
  for (let x = 5; x < BARN_PX_W; x += 6) {
    fill(ctx, BARN_RED_DARK, x, 14, 1, 16);
  }
  // Stone foundation — 2px band along the bottom edge
  fill(ctx, STONE_DARK, 0, BARN_PX_H - 2, BARN_PX_W, 1);
  fill(ctx, STONE_MID, 0, BARN_PX_H - 1, BARN_PX_W, 1);
}

function paintBarnDoor(ctx: CanvasRenderingContext2D) {
  // Big sliding double door at tiles 3-4 (px 48-79), 32×16. The
  // doorway runs from row 14 (right under the eaves trim) to row 29
  // (sitting on the foundation).
  const DX = 48;
  const DY = 14;
  const DW = 32;
  const DH = 16;
  fill(ctx, OUTLINE, DX - 1, DY, DW + 2, DH);
  fill(ctx, BARN_DOOR_DARK, DX, DY, DW, DH);
  fill(ctx, BARN_DOOR_MID, DX + 1, DY + 1, DW - 2, DH - 2);
  // Vertical seam between the two leaves
  fill(ctx, BARN_DOOR_DARK, DX + DW / 2 - 1, DY, 2, DH);
  // X-brace per leaf — 14×14 inner area, draw both diagonals
  for (let i = 0; i < 14; i++) {
    fill(ctx, BARN_DOOR_BRACE, DX + 1 + i, DY + 1 + i, 1, 1);
    fill(ctx, BARN_DOOR_BRACE, DX + 14 - i, DY + 1 + i, 1, 1);
    fill(ctx, BARN_DOOR_BRACE, DX + 17 + i, DY + 1 + i, 1, 1);
    fill(ctx, BARN_DOOR_BRACE, DX + 30 - i, DY + 1 + i, 1, 1);
  }
  // Door handles — small dark squares in the centre of each leaf
  fill(ctx, OUTLINE, DX + DW / 2 - 4, DY + DH / 2, 2, 2);
  fill(ctx, OUTLINE, DX + DW / 2 + 2, DY + DH / 2, 2, 2);
  // Sliding rail directly above the door
  fill(ctx, BARN_VANE, DX - 2, DY - 1, DW + 4, 1);
}

function paintBarnWeathervane(ctx: CanvasRenderingContext2D, decor: HouseDecor) {
  const cx = BARN_PX_W / 2; // 48
  fill(ctx, BARN_VANE, cx, 0, 1, 4);
  fill(ctx, BARN_VANE, cx - 2, 1, 5, 1);
  if (decor.hasBird) {
    fill(ctx, BIRD_BODY, cx + 2, 1, 3, 1);
    fill(ctx, BIRD_BODY, cx + 4, 0, 1, 1);
    fill(ctx, BIRD_BEAK, cx + 5, 1, 1, 1);
  }
}

export function paintBarn(
  _palette: HousePaletteVariant,
  decor: HouseDecor,
): HTMLCanvasElement {
  // Barn uses its own fixed red+slate palette regardless of brand wash —
  // the silhouette is the read, not the colour. _palette is accepted for
  // a uniform variant signature.
  const c = document.createElement("canvas");
  c.width = BARN_PX_W;
  c.height = BARN_PX_H;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;
  paintBarnRoof(ctx);
  paintBarnWalls(ctx);
  paintBarnDoor(ctx);
  paintBarnWeathervane(ctx, decor);
  return c;
}

/* ---------------------------------------------------------------------
 * Manor variant — 80×32 (5×2 tiles). "Old-money" brand house: pitched
 * main roof with a central gable pediment rising above it (with a round
 * attic eye), double-leaf central door with brass knockers + lintel
 * banner, two tall windows on each side, twin chimneys at each roof
 * end, stone-step approach. Brand quarter only.
 * --------------------------------------------------------------------- */

const MANOR_PX_W = 80;
const MANOR_PX_H = 32;

function paintManorRoof(ctx: CanvasRenderingContext2D, p: HousePaletteVariant) {
  // Main horizontal roof body — rows 4-13 spanning full width.
  for (let r = 4; r < 13; r++) {
    fill(ctx, p.roofMid, 0, r, MANOR_PX_W, 1);
  }
  fill(ctx, p.roofHigh, 0, 4, MANOR_PX_W, 1);
  fill(ctx, p.roofShadow, 0, 13, MANOR_PX_W, 1);
  fill(ctx, p.roofRim, 0, 14, MANOR_PX_W, 1);
  // Shingle seams every 6px
  for (let x = 6; x < MANOR_PX_W; x += 6) {
    fill(ctx, p.roofShadow, x, 5, 1, 8);
  }
  // Central gable pediment — triangle rising rows 0-7, base 24px wide
  // centred at x=40, peak at row 0. Width tapers from 24→4 over 8 rows.
  for (let r = 0; r < 8; r++) {
    const halfW = 12 - Math.floor(r * 1.4);
    if (halfW <= 0) break;
    const w = halfW * 2;
    const x = (MANOR_PX_W - w) / 2;
    fill(ctx, p.roofMid, x, r, w, 1);
    // Pediment edge highlight (top) + side shadow
    if (r === 0) fill(ctx, p.roofHigh, x, r, w, 1);
    fill(ctx, p.roofShadow, x, r, 1, 1);
    fill(ctx, p.roofShadow, x + w - 1, r, 1, 1);
  }
  // Round attic eye at the centre of the pediment (rows 4-6)
  const eyeX = MANOR_PX_W / 2 - 2;
  fill(ctx, OUTLINE, eyeX, 4, 4, 4);
  fill(ctx, "#0f0a08", eyeX + 1, 5, 2, 2);
  fill(ctx, WINDOW_GLEAM, eyeX + 1, 5, 1, 1);
}

function paintManorWalls(ctx: CanvasRenderingContext2D, p: HousePaletteVariant) {
  for (let r = 15; r < MANOR_PX_H - 2; r++) {
    fill(ctx, p.wallMid, 0, r, MANOR_PX_W, 1);
  }
  // Edge shadows + top highlight band
  fill(ctx, p.wallShadow, 0, 15, 1, MANOR_PX_H - 17);
  fill(ctx, p.wallShadow, MANOR_PX_W - 1, 15, 1, MANOR_PX_H - 17);
  fill(ctx, p.wallHigh, 1, 15, MANOR_PX_W - 2, 1);
  // Stone foundation
  fill(ctx, STONE_DARK, 0, MANOR_PX_H - 2, MANOR_PX_W, 1);
  fill(ctx, STONE_MID, 0, MANOR_PX_H - 1, MANOR_PX_W, 1);
}

function paintManorWindow(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // 8×7 window with cross mullions + sill
  fill(ctx, OUTLINE, x, y, 8, 7);
  fill(ctx, WINDOW_GLASS, x + 1, y + 1, 6, 5);
  fill(ctx, WINDOW_DARK, x + 3, y + 1, 2, 5);
  fill(ctx, WINDOW_DARK, x + 1, y + 3, 6, 1);
  fill(ctx, WINDOW_GLEAM, x + 2, y + 2, 1, 1);
  fill(ctx, WINDOW_GLEAM, x + 5, y + 4, 1, 1);
  // Sill
  fill(ctx, WOOD_DARK, x - 1, y + 7, 10, 1);
}

function paintManorDoor(
  ctx: CanvasRenderingContext2D,
  decor: HouseDecor,
) {
  // Double-leaf central door — 14×13, centred at x=40
  const DX = MANOR_PX_W / 2 - 7;
  const DY = 17;
  const DW = 14;
  const DH = 13;
  fill(ctx, OUTLINE, DX - 1, DY - 1, DW + 2, DH + 1);
  fill(ctx, WOOD_DARK, DX, DY, DW, DH);
  fill(ctx, WOOD_MID, DX + 1, DY, DW - 2, DH - 1);
  // Vertical seam between leaves
  fill(ctx, WOOD_DARK, DX + DW / 2 - 1, DY, 2, DH);
  // Brass knockers — one per leaf
  fill(ctx, BIRD_BEAK, DX + 3, DY + 5, 1, 1);
  fill(ctx, BIRD_BEAK, DX + DW - 4, DY + 5, 1, 1);
  // Top lintel + draped banner
  fill(ctx, WOOD_DARK, DX - 2, DY - 2, DW + 4, 1);
  const bannerW = 10;
  const bannerX = DX + (DW - bannerW) / 2;
  fill(ctx, decor.bannerColor, bannerX, DY - 4, bannerW, 2);
  fill(ctx, BANNER_FRINGE, bannerX, DY - 2, bannerW, 1);
  // Stone steps in front
  fill(ctx, STONE_MID, DX - 2, MANOR_PX_H - 1, DW + 4, 1);
  fill(ctx, STONE_DARK, DX - 1, MANOR_PX_H - 2, DW + 2, 1);
}

function paintManorChimneys(
  ctx: CanvasRenderingContext2D,
  p: HousePaletteVariant,
  decor: HouseDecor,
) {
  // Twin chimneys — one near each end of the main roof. They rise
  // rows 0-4, 4px wide. Smoke puff sits inside the cap row (we can't
  // paint above row 0).
  const positions = [{ x: 6 }, { x: MANOR_PX_W - 10 }];
  for (let i = 0; i < positions.length; i++) {
    const { x } = positions[i];
    fill(ctx, p.roofShadow, x, 0, 4, 5);
    fill(ctx, OUTLINE, x - 1, 0, 6, 1);
    fill(ctx, p.roofHigh, x + 1, 1, 1, 1);
    // One side gets the chimney's primary smoke wisp; alternate for
    // visual asymmetry, biased by decor.chimneySide.
    const smokeOnLeft = decor.chimneySide === "left";
    if ((i === 0) === smokeOnLeft) {
      fill(ctx, SMOKE_LIGHT, x + 1, 0, 2, 1);
      fill(ctx, SMOKE_MID, x + 2, 0, 1, 1);
    }
  }
}

export function paintManor(
  palette: HousePaletteVariant,
  decor: HouseDecor,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = MANOR_PX_W;
  c.height = MANOR_PX_H;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;
  paintManorRoof(ctx, palette);
  paintManorWalls(ctx, palette);
  paintManorChimneys(ctx, palette, decor);
  // 4 symmetric windows — 2 left, 2 right of the central door.
  paintManorWindow(ctx, 6, 17);
  paintManorWindow(ctx, 20, 17);
  paintManorWindow(ctx, MANOR_PX_W - 28, 17);
  paintManorWindow(ctx, MANOR_PX_W - 14, 17);
  paintManorDoor(ctx, decor);
  return c;
}

/* ---------------------------------------------------------------------
 * Workshop variant — 64×32 (4×2 tiles). Active brand atelier:
 * asymmetric stepped roof (raised gable LEFT over a wide multi-pane
 * shopfront bay window with a striped awning, lower roof RIGHT),
 * centred door with overhead awning + hanging shop sign on a wrought-
 * iron bracket, tall smoking chimney at far right. Brand quarter only.
 * --------------------------------------------------------------------- */

const WORKSHOP_PX_W = 64;
const WORKSHOP_PX_H = 32;
const WORKSHOP_AWNING_LIGHT = "#c0a060";
const WORKSHOP_AWNING_MID = "#a07040";

function paintWorkshopRoof(
  ctx: CanvasRenderingContext2D,
  p: HousePaletteVariant,
) {
  // Right (lower) roof — rows 6-13 spanning px 32-63.
  for (let r = 6; r < 13; r++) {
    fill(ctx, p.roofMid, 32, r, 32, 1);
  }
  fill(ctx, p.roofHigh, 32, 6, 32, 1);
  fill(ctx, p.roofShadow, 32, 13, 32, 1);
  for (let x = 38; x < 64; x += 6) {
    fill(ctx, p.roofShadow, x, 7, 1, 6);
  }
  // Left (raised) shopfront roof — rows 2-13 spanning px 0-31.
  for (let r = 2; r < 13; r++) {
    fill(ctx, p.roofMid, 0, r, 32, 1);
  }
  fill(ctx, p.roofHigh, 0, 2, 32, 1);
  fill(ctx, p.roofShadow, 0, 13, 32, 1);
  for (let x = 6; x < 32; x += 6) {
    fill(ctx, p.roofShadow, x, 3, 1, 10);
  }
  // Vertical step between the two roof heights at x=32
  fill(ctx, OUTLINE, 31, 2, 1, 4);
  fill(ctx, p.roofShadow, 32, 2, 1, 4);
  fill(ctx, p.roofRim, 0, 14, WORKSHOP_PX_W, 1);
}

function paintWorkshopWalls(
  ctx: CanvasRenderingContext2D,
  p: HousePaletteVariant,
) {
  for (let r = 15; r < WORKSHOP_PX_H - 2; r++) {
    fill(ctx, p.wallMid, 0, r, WORKSHOP_PX_W, 1);
  }
  fill(ctx, p.wallShadow, 0, 15, 1, WORKSHOP_PX_H - 17);
  fill(ctx, p.wallShadow, WORKSHOP_PX_W - 1, 15, 1, WORKSHOP_PX_H - 17);
  fill(ctx, p.wallHigh, 1, 15, WORKSHOP_PX_W - 2, 1);
  fill(ctx, STONE_DARK, 0, WORKSHOP_PX_H - 2, WORKSHOP_PX_W, 1);
  fill(ctx, STONE_MID, 0, WORKSHOP_PX_H - 1, WORKSHOP_PX_W, 1);
}

function paintWorkshopShopfront(ctx: CanvasRenderingContext2D) {
  // Wide multi-pane bay window LEFT side — 28×12 at (2, 16).
  const X = 2;
  const Y = 16;
  const W = 28;
  const H = 12;
  fill(ctx, OUTLINE, X, Y, W, H);
  fill(ctx, WINDOW_GLASS, X + 1, Y + 1, W - 2, H - 2);
  // Cross mullion divides into 4 main panes
  fill(ctx, WINDOW_DARK, X + W / 2 - 1, Y + 1, 2, H - 2);
  fill(ctx, WINDOW_DARK, X + 1, Y + H / 2 - 1, W - 2, 2);
  // Inner thin vertical mullions for "small panes" feel
  fill(ctx, WINDOW_DARK, X + 7, Y + 1, 1, H - 2);
  fill(ctx, WINDOW_DARK, X + 20, Y + 1, 1, H - 2);
  // Glass gleam highlights
  fill(ctx, WINDOW_GLEAM, X + 3, Y + 2, 1, 1);
  fill(ctx, WINDOW_GLEAM, X + 16, Y + 2, 1, 1);
  fill(ctx, WINDOW_GLEAM, X + 10, Y + 7, 1, 1);
  // Wood sill below
  fill(ctx, WOOD_DARK, X - 1, Y + H, W + 2, 1);
  // Striped awning above the window — alternating light/dark stripes
  for (let i = 0; i < W + 2; i += 4) {
    const col = (i / 4) % 2 === 0 ? WORKSHOP_AWNING_LIGHT : WOOD_DARK;
    fill(ctx, col, X - 1 + i, Y - 2, 4, 2);
  }
}

function paintWorkshopDoor(
  ctx: CanvasRenderingContext2D,
  decor: HouseDecor,
) {
  // Door on RIGHT half centred on tile col 2 (px 32-47).
  const DX = 36;
  const DY = 17;
  const DW = 12;
  const DH = 13;
  fill(ctx, OUTLINE, DX - 1, DY - 1, DW + 2, DH + 1);
  fill(ctx, WOOD_DARK, DX, DY, DW, DH);
  fill(ctx, WOOD_MID, DX + 1, DY, DW - 2, DH - 1);
  // Vertical plank seams on the door
  fill(ctx, WOOD_DARK, DX + Math.floor(DW / 3), DY, 1, DH);
  fill(ctx, WOOD_DARK, DX + Math.floor((DW * 2) / 3), DY, 1, DH);
  // Brass door knob
  fill(ctx, BIRD_BEAK, DX + DW - 3, DY + DH / 2, 1, 1);
  // Striped awning over the door
  for (let i = 0; i < DW + 2; i += 3) {
    const col = (i / 3) % 2 === 0 ? WORKSHOP_AWNING_MID : WOOD_DARK;
    fill(ctx, col, DX - 1 + i, DY - 2, 3, 2);
  }
  // Wrought-iron bracket extending right of the door, with hanging sign
  const BX = DX + DW + 2;
  fill(ctx, OUTLINE, BX, DY - 6, 1, 4); // vertical drop from roof
  fill(ctx, OUTLINE, BX, DY - 6, 5, 1); // horizontal arm
  // Hanging shop sign — banner-coloured small rectangle
  fill(ctx, OUTLINE, BX + 1, DY - 5, 6, 4);
  fill(ctx, decor.bannerColor, BX + 2, DY - 4, 4, 2);
  fill(ctx, "#ffffff", BX + 3, DY - 3, 1, 1);
  // Stone step in front of the door
  fill(ctx, STONE_MID, DX - 1, WORKSHOP_PX_H - 1, DW + 2, 1);
}

function paintWorkshopChimney(
  ctx: CanvasRenderingContext2D,
  p: HousePaletteVariant,
) {
  // Tall chimney at far right, rises rows 0-7 — taller than other
  // variants since the workshop is "active". Smoke wisp inside the
  // cap row (we can't paint above row 0).
  const X = 56;
  fill(ctx, p.roofShadow, X, 0, 4, 8);
  fill(ctx, OUTLINE, X - 1, 0, 6, 1);
  fill(ctx, p.roofHigh, X + 1, 1, 1, 1);
  fill(ctx, SMOKE_LIGHT, X + 1, 0, 2, 1);
  fill(ctx, SMOKE_MID, X + 2, 0, 1, 1);
}

export function paintWorkshop(
  palette: HousePaletteVariant,
  decor: HouseDecor,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = WORKSHOP_PX_W;
  c.height = WORKSHOP_PX_H;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;
  paintWorkshopRoof(ctx, palette);
  paintWorkshopWalls(ctx, palette);
  paintWorkshopChimney(ctx, palette);
  paintWorkshopShopfront(ctx);
  paintWorkshopDoor(ctx, decor);
  return c;
}

/* ---------------------------------------------------------------------
 * Houseboat variant — 80×32 (5×2 tiles). Creator quarter only.
 * Beached-boat silhouette: dark blue-black wood hull tapering at the
 * bottom, deck railing across the waist, cabin with porthole windows,
 * central double-leaf door, mast rising above the roof carrying a
 * pennant flag fluttering to the right.
 * --------------------------------------------------------------------- */

const HOUSEBOAT_PX_W = 80;
const HOUSEBOAT_PX_H = 32;
const HULL_DARK = "#141923";
const HULL_MID = "#243042";
const HULL_HIGH = "#3a4456";
const RAIL_WHITE = "#f4f4f8";
const RAIL_SHADOW = "#a8acb8";
const PENNANT_RED = "#c83830";
const PENNANT_DARK = "#8a1820";
const MAST_WOOD = "#3a2818";
const PORTHOLE_BRASS = "#a87340";

function paintHouseboatMast(ctx: CanvasRenderingContext2D) {
  // Mast rises rows 0-3 above the cabin roof at x=40 (centre)
  fill(ctx, MAST_WOOD, 40, 0, 1, 4);
  // Pennant flag — triangular, fluttering right from the mast top
  fill(ctx, PENNANT_DARK, 41, 1, 7, 1);
  fill(ctx, PENNANT_RED, 41, 1, 6, 1);
  fill(ctx, PENNANT_DARK, 41, 2, 5, 1);
  fill(ctx, PENNANT_RED, 41, 2, 4, 1);
  fill(ctx, PENNANT_DARK, 41, 3, 3, 1);
  fill(ctx, PENNANT_RED, 41, 3, 2, 1);
}

function paintHouseboatRoof(ctx: CanvasRenderingContext2D, p: HousePaletteVariant) {
  // Low-pitched cabin roof — narrow at top, widening to the eaves.
  fill(ctx, p.roofMid, 4, 4, 72, 1);
  fill(ctx, p.roofMid, 2, 5, 76, 1);
  fill(ctx, p.roofMid, 0, 6, 80, 1);
  fill(ctx, p.roofMid, 0, 7, 80, 1);
  fill(ctx, p.roofHigh, 4, 4, 72, 1);
  fill(ctx, p.roofShadow, 0, 7, 80, 1);
  fill(ctx, p.roofRim, 0, 8, 80, 1);
}

function paintHouseboatCabin(ctx: CanvasRenderingContext2D, p: HousePaletteVariant) {
  for (let r = 9; r < 16; r++) {
    fill(ctx, p.wallMid, 0, r, 80, 1);
  }
  fill(ctx, p.wallShadow, 0, 9, 1, 7);
  fill(ctx, p.wallShadow, 79, 9, 1, 7);
  fill(ctx, p.wallHigh, 1, 9, 78, 1);
}

function paintPorthole(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // 6×6 porthole window — round-ish frame with brass ring + glass gleam
  fill(ctx, OUTLINE, x + 1, y, 4, 1);
  fill(ctx, OUTLINE, x, y + 1, 1, 4);
  fill(ctx, OUTLINE, x + 5, y + 1, 1, 4);
  fill(ctx, OUTLINE, x + 1, y + 5, 4, 1);
  fill(ctx, WINDOW_GLASS, x + 1, y + 1, 4, 4);
  fill(ctx, PORTHOLE_BRASS, x + 2, y, 2, 1);
  fill(ctx, PORTHOLE_BRASS, x, y + 2, 1, 2);
  fill(ctx, PORTHOLE_BRASS, x + 5, y + 2, 1, 2);
  fill(ctx, PORTHOLE_BRASS, x + 2, y + 5, 2, 1);
  fill(ctx, WINDOW_GLEAM, x + 2, y + 2, 1, 1);
}

function paintHouseboatDoor(ctx: CanvasRenderingContext2D, decor: HouseDecor) {
  // Double-leaf cabin door at centre, 14×6, rows 10-15 (lower cabin)
  const DX = 33;
  const DY = 10;
  const DW = 14;
  const DH = 6;
  fill(ctx, OUTLINE, DX - 1, DY - 1, DW + 2, DH + 1);
  fill(ctx, WOOD_DARK, DX, DY, DW, DH);
  fill(ctx, WOOD_MID, DX + 1, DY, DW - 2, DH - 1);
  fill(ctx, WOOD_DARK, DX + DW / 2 - 1, DY, 2, DH);
  fill(ctx, BIRD_BEAK, DX + 3, DY + DH - 2, 1, 1);
  fill(ctx, BIRD_BEAK, DX + DW - 4, DY + DH - 2, 1, 1);
  // Lintel banner draped above the door
  const bannerW = 8;
  const bannerX = DX + (DW - bannerW) / 2;
  fill(ctx, decor.bannerColor, bannerX, DY - 2, bannerW, 1);
  fill(ctx, BANNER_FRINGE, bannerX, DY - 1, bannerW, 1);
}

function paintHouseboatDeck(ctx: CanvasRenderingContext2D) {
  // Deck rail rows 16-17 — white rail line with vertical posts
  fill(ctx, OUTLINE, 0, 16, 80, 1);
  fill(ctx, RAIL_WHITE, 0, 17, 80, 1);
  for (const px of [4, 20, 36, 52, 68]) {
    fill(ctx, RAIL_SHADOW, px, 16, 1, 2);
  }
}

function paintHouseboatHull(ctx: CanvasRenderingContext2D) {
  // Hull rows 18-31, tapering inward. Each row narrows from full
  // width at row 18 to 80-12=68 at row 31 (~6px inset each side).
  for (let r = 18; r < 32; r++) {
    const t = (r - 18) / 13;
    const inset = Math.round(t * 6);
    const w = HOUSEBOAT_PX_W - inset * 2;
    const x = inset;
    fill(ctx, HULL_MID, x, r, w, 1);
    fill(ctx, HULL_DARK, x, r, 1, 1);
    fill(ctx, HULL_DARK, x + w - 1, r, 1, 1);
    // Plank seam highlight every 3rd row — top of plank lighter
    if ((r - 18) % 3 === 0) {
      fill(ctx, HULL_HIGH, x + 1, r, w - 2, 1);
    } else if ((r - 18) % 3 === 2) {
      fill(ctx, HULL_DARK, x + 1, r, w - 2, 1);
    }
  }
  // Anchor charm at lower-left of hull — small dark anchor silhouette
  fill(ctx, OUTLINE, 9, 24, 1, 4);
  fill(ctx, OUTLINE, 7, 27, 5, 1);
  fill(ctx, OUTLINE, 8, 26, 1, 1);
  fill(ctx, OUTLINE, 10, 26, 1, 1);
}

export function paintHouseboat(
  palette: HousePaletteVariant,
  decor: HouseDecor,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = HOUSEBOAT_PX_W;
  c.height = HOUSEBOAT_PX_H;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;
  paintHouseboatMast(ctx);
  paintHouseboatRoof(ctx, palette);
  paintHouseboatCabin(ctx, palette);
  // Two portholes flanking the central door
  paintPorthole(ctx, 8, 10);
  paintPorthole(ctx, 66, 10);
  paintHouseboatDoor(ctx, decor);
  paintHouseboatDeck(ctx);
  paintHouseboatHull(ctx);
  return c;
}

/* ---------------------------------------------------------------------
 * Greenhouse variant — 64×32 (4×2 tiles). Creator quarter only.
 * Conservatory-style structure: peaked glass roof with copper finial
 * at the apex, white-frame mullion grid over translucent green glass,
 * plant silhouettes visible inside the glass walls, central glass-
 * paned door, brick foundation. Uses its own glass+frame palette
 * regardless of the creator wash — the silhouette is the read.
 * --------------------------------------------------------------------- */

const GREENHOUSE_PX_W = 64;
const GREENHOUSE_PX_H = 32;
const GH_FRAME_WHITE = "#f4f4f4";
const GH_FRAME_DARK = "#6a6a72";
const GH_GLASS = "#c8e8d0";
const GH_BRICK = "#a04030";
const GH_BRICK_DARK = "#6a2818";
const GH_FINIAL = "#c89030";
const GH_PLANT_DARK = "#2a4a28";
const GH_PLANT_MID = "#4a8a48";

function paintGreenhouseRoof(ctx: CanvasRenderingContext2D) {
  // Peaked glass roof rows 0-9. Row 0 is the apex (4px wide, copper
  // finial). Width grows linearly to full 64px at row 9.
  for (let r = 0; r < 10; r++) {
    const halfW = Math.round(2 + (r * 30) / 9);
    const w = halfW * 2;
    const x = (GREENHOUSE_PX_W - w) / 2;
    fill(ctx, GH_FRAME_DARK, x, r, w, 1);
    if (w > 2) fill(ctx, GH_GLASS, x + 1, r, w - 2, 1);
    if (r === 0) fill(ctx, GH_FINIAL, x, r, w, 1);
  }
  // Vertical mullions running through the panes — only paint where
  // the roof actually exists at each row.
  for (const mx of [16, 32, 48]) {
    for (let r = 1; r < 10; r++) {
      const halfW = Math.round(2 + (r * 30) / 9);
      const w = halfW * 2;
      const xStart = (GREENHOUSE_PX_W - w) / 2;
      if (mx > xStart && mx < xStart + w - 1) {
        fill(ctx, GH_FRAME_DARK, mx, r, 1, 1);
      }
    }
  }
  // Trim band between roof and walls
  fill(ctx, GH_FRAME_DARK, 0, 10, GREENHOUSE_PX_W, 1);
}

function paintGreenhouseWalls(ctx: CanvasRenderingContext2D) {
  // Glass wall body rows 11-27
  fill(ctx, GH_GLASS, 0, 11, GREENHOUSE_PX_W, 17);
  // Outer frame (dark trim + white inner edge)
  fill(ctx, GH_FRAME_DARK, 0, 11, 1, 17);
  fill(ctx, GH_FRAME_DARK, GREENHOUSE_PX_W - 1, 11, 1, 17);
  fill(ctx, GH_FRAME_WHITE, 1, 11, 1, 17);
  fill(ctx, GH_FRAME_WHITE, GREENHOUSE_PX_W - 2, 11, 1, 17);
  // Vertical mullions every 16px
  for (const mx of [16, 32, 48]) {
    fill(ctx, GH_FRAME_DARK, mx, 11, 1, 17);
  }
  // Mid horizontal mullion
  fill(ctx, GH_FRAME_DARK, 0, 19, GREENHOUSE_PX_W, 1);
  // Diagonal glass gleam highlights, one per pane
  for (const px of [4, 20, 36, 52]) {
    fill(ctx, "#ffffff", px, 13, 1, 1);
    fill(ctx, "#ffffff", px + 1, 14, 1, 1);
    fill(ctx, "#ffffff", px, 21, 1, 1);
    fill(ctx, "#ffffff", px + 1, 22, 1, 1);
  }
}

function paintGreenhousePlants(ctx: CanvasRenderingContext2D, decor: HouseDecor) {
  // Three plant silhouettes visible through the glass — clear of the
  // central door area at px 18-30.
  // Left pane: big leafy plant (px 3-10)
  fill(ctx, GH_PLANT_DARK, 4, 14, 6, 13);
  fill(ctx, GH_PLANT_MID, 5, 15, 4, 11);
  fill(ctx, GH_PLANT_DARK, 3, 17, 1, 7);
  fill(ctx, GH_PLANT_DARK, 10, 17, 1, 7);
  // Bloom on top — uses the entity's hashed flower colour
  fill(ctx, OUTLINE, 6, 13, 3, 2);
  fill(ctx, decor.flowerColor, 6, 13, 3, 1);
  // Right pane: smaller bushy plant (px 36-40)
  fill(ctx, GH_PLANT_DARK, 36, 18, 4, 9);
  fill(ctx, GH_PLANT_MID, 37, 19, 2, 7);
  fill(ctx, decor.flowerColor, 36, 20, 1, 1);
  fill(ctx, decor.flowerColor, 39, 22, 1, 1);
  // Far right pane: tall thin stem (px 52-56)
  fill(ctx, GH_PLANT_DARK, 53, 12, 2, 15);
  fill(ctx, GH_PLANT_MID, 54, 13, 1, 13);
  fill(ctx, decor.flowerColor, 52, 13, 1, 1);
  fill(ctx, decor.flowerColor, 56, 13, 1, 1);
}

function paintGreenhouseDoor(ctx: CanvasRenderingContext2D) {
  // Glass-paned central door — px 18-30, rows 16-29
  const DX = 18;
  const DY = 16;
  const DW = 12;
  const DH = 14;
  fill(ctx, GH_FRAME_DARK, DX - 1, DY - 1, DW + 2, DH + 1);
  fill(ctx, GH_FRAME_WHITE, DX, DY, DW, DH);
  fill(ctx, GH_GLASS, DX + 1, DY + 1, DW - 2, DH - 2);
  // Cross mullion divides the glass into 4 panes
  fill(ctx, GH_FRAME_DARK, DX + DW / 2 - 1, DY, 2, DH);
  fill(ctx, GH_FRAME_DARK, DX, DY + DH / 2 - 1, DW, 2);
  // Glass gleams
  fill(ctx, "#ffffff", DX + 2, DY + 2, 1, 1);
  fill(ctx, "#ffffff", DX + DW - 4, DY + DH - 4, 1, 1);
  // Brass knob
  fill(ctx, BIRD_BEAK, DX + DW - 3, DY + DH / 2 + 1, 1, 1);
}

function paintGreenhouseFoundation(ctx: CanvasRenderingContext2D) {
  // Brick foundation rows 28-29 — but only outside the door's footprint
  // (door extends to row 29 so a brick under the door would obscure it).
  fill(ctx, GH_BRICK, 0, 28, 18, 1);
  fill(ctx, GH_BRICK, 30, 28, GREENHOUSE_PX_W - 30, 1);
  fill(ctx, GH_BRICK_DARK, 0, 29, 18, 1);
  fill(ctx, GH_BRICK_DARK, 30, 29, GREENHOUSE_PX_W - 30, 1);
}

export function paintGreenhouse(
  _palette: HousePaletteVariant,
  decor: HouseDecor,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = GREENHOUSE_PX_W;
  c.height = GREENHOUSE_PX_H;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;
  paintGreenhouseRoof(ctx);
  paintGreenhouseWalls(ctx);
  paintGreenhousePlants(ctx, decor);
  paintGreenhouseFoundation(ctx);
  paintGreenhouseDoor(ctx);
  return c;
}

/* ---------------------------------------------------------------------
 * Tower variant — 48×32 (3×2 tiles). Creator quarter only. Narrow
 * studio: steep pitched roof with antenna spike + dish at the apex,
 * attic studio window high in the gable, vertical board-and-batten
 * siding, central door with a small herb-shelf above it.
 * --------------------------------------------------------------------- */

const TOWER_PX_W = 48;
const TOWER_PX_H = 32;
const TOWER_ANTENNA = "#1a1208";
const TOWER_DISH = "#a8acb8";
const HERB_POT = "#a05a30";
const HERB_LEAF = "#4a8a48";

function paintTowerRoof(ctx: CanvasRenderingContext2D, p: HousePaletteVariant) {
  // Steep pitched roof, rows 2-13 (steeper than cottage). Apex at row
  // 2 (4px wide), eaves at row 13 (full 48px).
  for (let r = 2; r < 14; r++) {
    const halfW = Math.round(2 + ((r - 2) * 22) / 11);
    const w = halfW * 2;
    const x = (TOWER_PX_W - w) / 2;
    fill(ctx, p.roofMid, x, r, w, 1);
    fill(ctx, p.roofShadow, x, r, 1, 1);
    fill(ctx, p.roofShadow, x + w - 1, r, 1, 1);
  }
  fill(ctx, p.roofHigh, (TOWER_PX_W - 4) / 2, 2, 4, 1);
  fill(ctx, p.roofShadow, 0, 13, TOWER_PX_W, 1);
  fill(ctx, p.roofRim, 0, 14, TOWER_PX_W, 1);
  // Attic studio window — small dark recess in the gable, rows 6-9
  const wx = (TOWER_PX_W - 6) / 2;
  fill(ctx, OUTLINE, wx, 6, 6, 4);
  fill(ctx, WINDOW_GLASS, wx + 1, 7, 4, 2);
  fill(ctx, WINDOW_DARK, wx + 3, 7, 1, 2);
  fill(ctx, WINDOW_GLEAM, wx + 1, 7, 1, 1);
}

function paintTowerAntenna(ctx: CanvasRenderingContext2D) {
  // Spike rising rows 0-2 above the roof apex
  const cx = TOWER_PX_W / 2;
  fill(ctx, TOWER_ANTENNA, cx, 0, 1, 3);
  // Small dish/disc on top
  fill(ctx, TOWER_ANTENNA, cx - 1, 0, 1, 1);
  fill(ctx, TOWER_DISH, cx + 1, 0, 2, 1);
  fill(ctx, TOWER_ANTENNA, cx + 3, 0, 1, 1);
}

function paintTowerWalls(ctx: CanvasRenderingContext2D, p: HousePaletteVariant) {
  for (let r = 15; r < TOWER_PX_H - 2; r++) {
    fill(ctx, p.wallMid, 0, r, TOWER_PX_W, 1);
  }
  fill(ctx, p.wallShadow, 0, 15, 1, TOWER_PX_H - 17);
  fill(ctx, p.wallShadow, TOWER_PX_W - 1, 15, 1, TOWER_PX_H - 17);
  fill(ctx, p.wallHigh, 1, 15, TOWER_PX_W - 2, 1);
  // Vertical battens — thin dark stripes at regular intervals for
  // board-and-batten siding texture
  for (const bx of [6, 14, 33, 41]) {
    fill(ctx, p.wallShadow, bx, 16, 1, TOWER_PX_H - 18);
  }
  // Stone foundation
  fill(ctx, STONE_DARK, 0, TOWER_PX_H - 2, TOWER_PX_W, 1);
  fill(ctx, STONE_MID, 0, TOWER_PX_H - 1, TOWER_PX_W, 1);
}

function paintTowerDoor(ctx: CanvasRenderingContext2D, decor: HouseDecor) {
  // Single narrow door centred at x=24 (tile col 1), rows 18-29
  const DX = 19;
  const DY = 18;
  const DW = 10;
  const DH = 12;
  fill(ctx, OUTLINE, DX - 1, DY - 1, DW + 2, DH + 1);
  fill(ctx, WOOD_DARK, DX, DY, DW, DH);
  fill(ctx, WOOD_MID, DX + 1, DY, DW - 2, DH - 1);
  // Vertical plank seam down the centre
  fill(ctx, WOOD_DARK, DX + DW / 2, DY, 1, DH);
  // Brass knob
  fill(ctx, BIRD_BEAK, DX + DW - 3, DY + DH / 2, 1, 1);
  // Lintel + draped banner
  fill(ctx, WOOD_DARK, DX - 2, DY - 2, DW + 4, 1);
  const bannerW = 6;
  const bannerX = DX + (DW - bannerW) / 2;
  fill(ctx, decor.bannerColor, bannerX, DY - 4, bannerW, 2);
  fill(ctx, BANNER_FRINGE, bannerX, DY - 2, bannerW, 1);
  // Stone step
  fill(ctx, STONE_MID, DX - 1, TOWER_PX_H - 1, DW + 2, 1);
}

function paintTowerHerbShelf(ctx: CanvasRenderingContext2D) {
  // Small herb-pot shelf mounted on the wall just left of the door.
  // Shelf board at row 17 (2px wide), pot + sprig above.
  const SX = 4;
  const SY = 17;
  // Shelf bracket + plank
  fill(ctx, WOOD_DARK, SX, SY, 8, 1);
  fill(ctx, WOOD_MID, SX, SY - 1, 8, 1);
  // Three small herb pots in a row
  for (const px of [SX, SX + 3, SX + 6]) {
    fill(ctx, OUTLINE, px, SY - 3, 2, 2);
    fill(ctx, HERB_POT, px, SY - 3, 2, 2);
    // Tiny sprig
    fill(ctx, HERB_LEAF, px, SY - 4, 2, 1);
    fill(ctx, HERB_LEAF, px, SY - 5, 1, 1);
  }
}

export function paintTower(
  palette: HousePaletteVariant,
  decor: HouseDecor,
): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = TOWER_PX_W;
  c.height = TOWER_PX_H;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;
  paintTowerAntenna(ctx);
  paintTowerRoof(ctx, palette);
  paintTowerWalls(ctx, palette);
  paintTowerHerbShelf(ctx);
  paintTowerDoor(ctx, decor);
  return c;
}

/* ---- House-type dispatch ---------------------------------------------
 * Brand entities pick from 4 variants (cottage, manor, barn, workshop).
 * Manor + workshop ship in subsequent turns; for now they fall back to
 * the cottage so the world keeps rendering. Creators stay on the older
 * 3-template picker until their variant pass lands.
 * --------------------------------------------------------------------- */

export type HouseType = "long" | "double" | "farm";

export function houseTypeForEntity(id: string): HouseType {
  return hashPick(`${id}:htype`, ["long", "double", "farm"] as const);
}

export type BrandHouseType = "cottage" | "manor" | "barn" | "workshop";

export function brandHouseTypeForEntity(id: string): BrandHouseType {
  return hashPick(
    `${id}:bhtype`,
    ["cottage", "manor", "barn", "workshop"] as const,
  );
}

/** Tile footprint + door tile offset for each brand variant. Read by
 *  worldLayout to size each property's house and pick the door tile. */
export const BRAND_HOUSE_FOOTPRINTS: Record<
  BrandHouseType,
  { w: number; h: number; doorOffsetX: number }
> = {
  cottage: { w: 3, h: 2, doorOffsetX: 1 },
  manor: { w: 5, h: 2, doorOffsetX: 2 },
  barn: { w: 6, h: 2, doorOffsetX: BARN_DOOR_TILE_X },
  workshop: { w: 4, h: 2, doorOffsetX: 2 },
};

export type CreatorHouseType = "cottage" | "houseboat" | "greenhouse" | "tower";

export function creatorHouseTypeForEntity(id: string): CreatorHouseType {
  return hashPick(
    `${id}:chtype`,
    ["cottage", "houseboat", "greenhouse", "tower"] as const,
  );
}

export const CREATOR_HOUSE_FOOTPRINTS: Record<
  CreatorHouseType,
  { w: number; h: number; doorOffsetX: number }
> = {
  cottage: { w: 3, h: 2, doorOffsetX: 1 },
  houseboat: { w: 5, h: 2, doorOffsetX: 2 },
  greenhouse: { w: 4, h: 2, doorOffsetX: 1 },
  tower: { w: 3, h: 2, doorOffsetX: 1 },
};

/** Build a full house texture for an entity — palette by kind + decor.
 *  The palette here is the kind's base wash overlaid with the entity's
 *  hashed wall + roof wash, so two cottages with the same banner +
 *  chimney still read as distinct buildings. */
export function paintHouseForEntity(
  id: string,
  kind: "brand" | "creator",
): HTMLCanvasElement {
  const palette = washedPaletteFor(id, kind);
  const decor = decorForEntity(id, kind);
  if (kind === "brand") {
    switch (brandHouseTypeForEntity(id)) {
      case "barn":
        return paintBarn(palette, decor);
      case "manor":
        return paintManor(palette, decor);
      case "workshop":
        return paintWorkshop(palette, decor);
      case "cottage":
        return paintHouse(palette, decor);
    }
  }
  switch (creatorHouseTypeForEntity(id)) {
    case "houseboat":
      return paintHouseboat(palette, decor);
    case "greenhouse":
      return paintGreenhouse(palette, decor);
    case "tower":
      return paintTower(palette, decor);
    case "cottage":
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

/* =====================================================================
 * Yard decorations — single-tile (16×16) sprites placed inside each
 * brand property's yard strip. Non-collidable for v1; the player can
 * walk through flower beds + veggie patches. Picket fence + crates
 * read as solid but don't block movement yet (collision can be added
 * later by flagging the underlying tile ge_collide in scenes.ts).
 * ===================================================================== */

const YARD_PX = 16;
const SOIL_DARK = "#3a2418";
const SOIL_MID = "#5a3820";
const STEM = "#3a6a30";
const STEM_HIGH = "#6aaa55";
const LEAF_DARK = "#2a4a28";
const LEAF_MID = "#4a8a48";
const CARROT_TOP = "#d97a3a";
const CABBAGE_LIGHT = "#a8d090";
const CABBAGE_DARK = "#5a8a4a";
const FENCE_WOOD = "#c8a878";
const FENCE_SHADOW = "#8a6c40";
const FENCE_DARK = "#5a3a18";
const CRATE_LIGHT = "#a87340";
const CRATE_MID = "#7a4f28";
const CRATE_DARK = "#3d2a18";
const BARREL_BAND = "#1a1208";

function newYardCanvas(): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null } {
  const c = document.createElement("canvas");
  c.width = YARD_PX;
  c.height = YARD_PX;
  const ctx = c.getContext("2d");
  if (ctx) ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

/** 3-flower bed — dirt strip with three stems + parametrised blossoms. */
export function paintFlowerBed(blossomColor: string): HTMLCanvasElement {
  const { c, ctx } = newYardCanvas();
  if (!ctx) return c;
  // Soil base — bottom 7px
  fill(ctx, SOIL_DARK, 0, 9, YARD_PX, 7);
  fill(ctx, SOIL_MID, 1, 10, YARD_PX - 2, 5);
  // Three flower stems at x=3, 8, 13
  const stems = [3, 8, 13];
  for (const sx of stems) {
    fill(ctx, STEM, sx, 5, 1, 5);
    // Leaf nub
    fill(ctx, STEM_HIGH, sx + 1, 7, 1, 1);
    // Blossom — 3×3 with darker outline ring
    fill(ctx, OUTLINE, sx - 1, 2, 3, 3);
    fill(ctx, blossomColor, sx - 1, 2, 3, 2);
    fill(ctx, "#ffffff", sx, 2, 1, 1);
  }
  return c;
}

/** Vegetable patch — soil with three rows of alternating carrot tops
 *  and small cabbage rounds. */
export function paintVeggiePatch(): HTMLCanvasElement {
  const { c, ctx } = newYardCanvas();
  if (!ctx) return c;
  fill(ctx, SOIL_DARK, 0, 0, YARD_PX, YARD_PX);
  fill(ctx, SOIL_MID, 1, 1, YARD_PX - 2, YARD_PX - 2);
  // Furrow lines — darker bands at rows 4, 9, 14
  for (const fy of [4, 9, 14]) {
    fill(ctx, SOIL_DARK, 0, fy, YARD_PX, 1);
  }
  // Row 1 (rows 0-3): carrot tops at cols 2, 7, 12
  for (const cx of [2, 7, 12]) {
    fill(ctx, STEM, cx, 1, 1, 3);
    fill(ctx, STEM_HIGH, cx + 1, 2, 1, 1);
    fill(ctx, CARROT_TOP, cx, 0, 1, 1);
  }
  // Row 2 (rows 5-8): cabbage rounds at cols 3, 9, 13
  for (const cx of [3, 9, 13]) {
    fill(ctx, CABBAGE_DARK, cx - 1, 6, 3, 2);
    fill(ctx, CABBAGE_LIGHT, cx, 6, 1, 1);
  }
  // Row 3 (rows 10-13): more carrot tops
  for (const cx of [2, 7, 12]) {
    fill(ctx, STEM, cx, 11, 1, 3);
    fill(ctx, STEM_HIGH, cx + 1, 12, 1, 1);
    fill(ctx, CARROT_TOP, cx, 10, 1, 1);
  }
  return c;
}

/** Two stacked wooden crates (bottom 12×8, top 8×6), with X-brace on
 *  each face. */
export function paintCrateStack(): HTMLCanvasElement {
  const { c, ctx } = newYardCanvas();
  if (!ctx) return c;
  // Bottom crate — 12×8 at (2, 8)
  fill(ctx, OUTLINE, 1, 8, 14, 8);
  fill(ctx, CRATE_MID, 2, 8, 12, 7);
  fill(ctx, CRATE_LIGHT, 3, 9, 10, 1);
  // X-brace
  for (let i = 0; i < 7; i++) {
    fill(ctx, CRATE_DARK, 2 + Math.floor(i * 11 / 7), 8 + i, 1, 1);
    fill(ctx, CRATE_DARK, 13 - Math.floor(i * 11 / 7), 8 + i, 1, 1);
  }
  // Top crate — 8×6 at (4, 2)
  fill(ctx, OUTLINE, 3, 2, 10, 6);
  fill(ctx, CRATE_MID, 4, 2, 8, 5);
  fill(ctx, CRATE_LIGHT, 5, 3, 6, 1);
  for (let i = 0; i < 5; i++) {
    fill(ctx, CRATE_DARK, 4 + Math.floor(i * 7 / 5), 2 + i, 1, 1);
    fill(ctx, CRATE_DARK, 11 - Math.floor(i * 7 / 5), 2 + i, 1, 1);
  }
  return c;
}

/** Wooden barrel — vertical staves with three dark iron bands. */
export function paintBarrel(): HTMLCanvasElement {
  const { c, ctx } = newYardCanvas();
  if (!ctx) return c;
  // Outline (oval-ish, rectangular for simplicity)
  fill(ctx, OUTLINE, 4, 2, 8, 13);
  // Stave body
  fill(ctx, CRATE_MID, 5, 2, 6, 13);
  // Vertical stave seams — darker
  fill(ctx, CRATE_DARK, 7, 3, 1, 11);
  fill(ctx, CRATE_DARK, 9, 3, 1, 11);
  // Stave highlight
  fill(ctx, CRATE_LIGHT, 6, 3, 1, 11);
  // Three iron bands (top, middle, bottom)
  fill(ctx, BARREL_BAND, 4, 3, 8, 1);
  fill(ctx, BARREL_BAND, 4, 8, 8, 1);
  fill(ctx, BARREL_BAND, 4, 13, 8, 1);
  return c;
}

/** Horizontal picket fence segment — wooden pickets with pointed tops
 *  joined by two horizontal rails. */
export function paintPicketFence(): HTMLCanvasElement {
  const { c, ctx } = newYardCanvas();
  if (!ctx) return c;
  // Two horizontal rails
  fill(ctx, FENCE_SHADOW, 0, 7, YARD_PX, 1);
  fill(ctx, FENCE_WOOD, 0, 8, YARD_PX, 1);
  fill(ctx, FENCE_SHADOW, 0, 12, YARD_PX, 1);
  fill(ctx, FENCE_WOOD, 0, 13, YARD_PX, 1);
  // Pickets — at x = 1, 5, 9, 13. Each 2px wide, pointed top.
  for (const px of [1, 5, 9, 13]) {
    // Pointed top — single dark pixel
    fill(ctx, FENCE_DARK, px, 3, 2, 1);
    // Picket body
    fill(ctx, FENCE_WOOD, px, 4, 2, 12);
    fill(ctx, FENCE_SHADOW, px + 1, 4, 1, 12);
  }
  return c;
}

/** Small road shoulder stone — rounded grey rock at the bottom of a
 *  16×16 transparent canvas. Decorative only; non-collidable. */
export function paintRoadStone(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 16;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;
  // Dark outline + body
  fill(ctx, OUTLINE, 4, 10, 9, 5);
  fill(ctx, "#7a7a7e", 5, 11, 7, 4);
  fill(ctx, "#a0a0a6", 6, 11, 5, 1);
  fill(ctx, "#52525a", 6, 14, 5, 1);
  // Highlight gleam top-left
  fill(ctx, "#bcbcc2", 6, 11, 1, 1);
  return c;
}

/** Small house sign — wooden plank on a vertical stake. 16×16 with
 *  the plank in the upper half and the stake in the lower half. The
 *  occupant name is layered as Phaser text above the plank in the
 *  scene; this just draws the wooden frame. */
export function paintHouseSign(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 16;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;
  // Stake — vertical post in the lower half
  fill(ctx, "#3d2a18", 7, 8, 2, 8);
  fill(ctx, "#5c3820", 7, 8, 1, 8);
  // Plank — horizontal sign face at the top, slightly wider than stake
  fill(ctx, "#3d2a18", 1, 1, 14, 7);
  fill(ctx, "#a87340", 2, 2, 12, 5);
  fill(ctx, "#c89860", 2, 2, 12, 1);
  fill(ctx, "#5c3820", 2, 6, 12, 1);
  // Two small nails fixing plank to stake
  fill(ctx, "#1a1208", 6, 5, 1, 1);
  fill(ctx, "#1a1208", 9, 5, 1, 1);
  return c;
}

/** Larger directional signpost for district wayfinding. 16×24 with
 *  a wider plank (room for "TO THE FOREST →") on a taller stake.
 *  Like paintHouseSign, just draws the frame; the label is overlaid
 *  via Phaser text in the scene. */
export function paintDirectionalSign(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 24;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;
  // Tall stake — bottom half
  fill(ctx, "#3d2a18", 7, 12, 2, 12);
  fill(ctx, "#5c3820", 7, 12, 1, 12);
  // Wider plank
  fill(ctx, "#3d2a18", 0, 1, 16, 11);
  fill(ctx, "#a87340", 1, 2, 14, 9);
  fill(ctx, "#c89860", 1, 2, 14, 1);
  fill(ctx, "#5c3820", 1, 10, 14, 1);
  // Nails fixing plank to stake
  fill(ctx, "#1a1208", 5, 9, 1, 1);
  fill(ctx, "#1a1208", 10, 9, 1, 1);
  return c;
}

/** Church — 80×48 sprite (5×3 tiles). Central bell tower with a
 *  cross, slate-blue pitched roof flaring outward over a cream-stone
 *  nave with two stained-glass windows flanking heavy double doors.
 *  Painted with its own ecclesiastical palette (slate roof + cream
 *  stone + jewel-tone glass) to set it apart from any house. Both
 *  ground tiles under the building are flagged collidable in the
 *  scene; the door tile (centre, 1 row south of the building) is
 *  the player's interaction tile. */
export function paintChurch(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 80;
  c.height = 48;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;

  const ROOF_DARK = "#1a1828";
  const ROOF_MID = "#3a3858";
  const ROOF_HIGH = "#5a5878";
  const WALL_MID = "#e8d8b0";
  const WALL_SHADOW = "#a88a58";
  const WALL_HIGH = "#fff0c8";
  const GLASS_BLUE = "#3a6090";
  const GLASS_GOLD = "#e0a830";
  const GLASS_RED = "#a02830";
  const DOOR_DARK = "#3d2a18";
  const DOOR_MID = "#5c3820";
  const DOOR_TRIM = "#a87340";

  // Cross at top — vertical 1×4 + horizontal 3×1 arm
  fill(ctx, ROOF_DARK, 39, 0, 1, 4);
  fill(ctx, ROOF_DARK, 38, 1, 3, 1);

  // Bell tower roof — pitched, tapers from 4px at row 4 to 16px at row 11
  for (let r = 4; r < 12; r++) {
    const t = (r - 4) / 7;
    const halfW = Math.round(2 + t * 6);
    const w = halfW * 2;
    const x = 40 - halfW;
    fill(ctx, ROOF_MID, x, r, w, 1);
    if (r === 4) fill(ctx, ROOF_HIGH, x, r, w, 1);
    fill(ctx, ROOF_DARK, x, r, 1, 1);
    fill(ctx, ROOF_DARK, x + w - 1, r, 1, 1);
  }

  // Bell tower walls — rows 12-19, x=32-47
  fill(ctx, OUTLINE, 31, 12, 18, 8);
  fill(ctx, WALL_MID, 32, 12, 16, 8);
  fill(ctx, WALL_HIGH, 32, 12, 16, 1);
  fill(ctx, WALL_SHADOW, 32, 12, 1, 8);
  fill(ctx, WALL_SHADOW, 47, 12, 1, 8);
  // Arched bell window with bell silhouette
  fill(ctx, OUTLINE, 36, 13, 8, 6);
  fill(ctx, ROOF_DARK, 37, 14, 6, 4);
  fill(ctx, GLASS_GOLD, 38, 14, 4, 3);
  fill(ctx, OUTLINE, 39, 17, 2, 1);

  // Nave roof — slopes outward from tower base (24 px wide) to full
  // 80px width over rows 20-27
  for (let r = 20; r < 28; r++) {
    const t = (r - 20) / 7;
    const w = Math.round(24 + t * 56);
    const x = (80 - w) / 2;
    fill(ctx, ROOF_MID, x, r, w, 1);
    if (r === 20) fill(ctx, ROOF_HIGH, x, r, w, 1);
    fill(ctx, ROOF_DARK, x, r, 1, 1);
    fill(ctx, ROOF_DARK, x + w - 1, r, 1, 1);
  }
  fill(ctx, ROOF_DARK, 0, 28, 80, 1);

  // Nave walls — rows 29-43
  for (let r = 29; r < 44; r++) {
    fill(ctx, WALL_MID, 0, r, 80, 1);
  }
  fill(ctx, WALL_HIGH, 1, 29, 78, 1);
  fill(ctx, WALL_SHADOW, 0, 29, 1, 15);
  fill(ctx, WALL_SHADOW, 79, 29, 1, 15);

  // Stone foundation rows 44-47
  fill(ctx, STONE_MID, 0, 44, 80, 1);
  fill(ctx, STONE_DARK, 0, 45, 80, 3);

  // Stained-glass left window — 12×12, jewel tones, gold cross on blue
  fill(ctx, OUTLINE, 8, 30, 12, 12);
  fill(ctx, GLASS_BLUE, 9, 31, 10, 10);
  fill(ctx, GLASS_GOLD, 13, 31, 2, 10);
  fill(ctx, GLASS_GOLD, 9, 35, 10, 2);
  fill(ctx, GLASS_RED, 13, 35, 2, 2);
  fill(ctx, WOOD_DARK, 7, 42, 14, 1);

  // Stained-glass right window — mirror of left
  fill(ctx, OUTLINE, 60, 30, 12, 12);
  fill(ctx, GLASS_BLUE, 61, 31, 10, 10);
  fill(ctx, GLASS_GOLD, 65, 31, 2, 10);
  fill(ctx, GLASS_GOLD, 61, 35, 10, 2);
  fill(ctx, GLASS_RED, 65, 35, 2, 2);
  fill(ctx, WOOD_DARK, 59, 42, 14, 1);

  // Heavy double doors — central, 16×14, with iron studs + brass rings
  fill(ctx, OUTLINE, 31, 29, 18, 15);
  fill(ctx, DOOR_DARK, 32, 30, 16, 14);
  fill(ctx, DOOR_MID, 33, 30, 14, 13);
  fill(ctx, DOOR_DARK, 39, 30, 2, 14); // central seam
  // Arched top — knock the upper corners
  fill(ctx, OUTLINE, 33, 30, 1, 1);
  fill(ctx, OUTLINE, 46, 30, 1, 1);
  // Iron studs (decorative reinforcements)
  fill(ctx, OUTLINE, 35, 33, 1, 1);
  fill(ctx, OUTLINE, 35, 38, 1, 1);
  fill(ctx, OUTLINE, 44, 33, 1, 1);
  fill(ctx, OUTLINE, 44, 38, 1, 1);
  // Brass ring handles
  fill(ctx, DOOR_TRIM, 36, 36, 1, 1);
  fill(ctx, DOOR_TRIM, 43, 36, 1, 1);

  return c;
}

/** Sacred shrine — 16×24 sprite of a small stone altar topped with a
 *  pair of standing megaliths and a glowing offering bowl. Designed
 *  to read as a focal point at the centre of the sacred forest.
 *  Collidable like a tree; the player walks around it. */
export function paintShrine(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 24;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;

  const STONE_OUTLINE = "#1a1208";
  const STONE_LIGHT = "#9a948c";
  const STONE_MID = "#6a6660";
  const STONE_DARK = "#3a3530";
  const MOSS = "#3a6a30";
  const GLOW_INNER = "#fff4c8";
  const GLOW_OUTER = "#f0c870";
  const BOWL_DARK = "#2a2018";
  const BOWL_RIM = "#5a4838";

  // Two flanking standing-stone megaliths (rows 0-13) — narrow uprights
  // forming a small portal effect either side of the altar.
  // Left megalith: x=2-4
  fill(ctx, STONE_OUTLINE, 1, 2, 4, 14);
  fill(ctx, STONE_DARK, 2, 2, 2, 13);
  fill(ctx, STONE_MID, 2, 2, 1, 13);
  fill(ctx, MOSS, 2, 14, 2, 1);
  // Right megalith: x=11-13
  fill(ctx, STONE_OUTLINE, 11, 2, 4, 14);
  fill(ctx, STONE_DARK, 12, 2, 2, 13);
  fill(ctx, STONE_MID, 13, 2, 1, 13);
  fill(ctx, MOSS, 12, 14, 2, 1);

  // Altar base — wider stone block, rows 16-22
  fill(ctx, STONE_OUTLINE, 1, 15, 14, 8);
  fill(ctx, STONE_MID, 2, 16, 12, 6);
  fill(ctx, STONE_LIGHT, 2, 16, 12, 1);
  fill(ctx, STONE_DARK, 2, 21, 12, 1);
  // Altar plinth top
  fill(ctx, STONE_LIGHT, 4, 14, 8, 1);
  fill(ctx, STONE_OUTLINE, 4, 13, 8, 1);

  // Moss accents at the base
  fill(ctx, MOSS, 2, 22, 1, 1);
  fill(ctx, MOSS, 13, 22, 1, 1);
  fill(ctx, MOSS, 7, 22, 2, 1);

  // Offering bowl on top — small dark bowl with glowing centre
  fill(ctx, BOWL_DARK, 6, 11, 4, 2);
  fill(ctx, BOWL_RIM, 5, 11, 1, 1);
  fill(ctx, BOWL_RIM, 10, 11, 1, 1);
  // Glow inside the bowl
  fill(ctx, GLOW_OUTER, 6, 10, 4, 1);
  fill(ctx, GLOW_INNER, 7, 10, 2, 1);
  // Halo above the bowl — soft ascending glow
  fill(ctx, GLOW_OUTER, 7, 9, 2, 1);
  fill(ctx, GLOW_INNER, 7, 8, 2, 1);
  return c;
}

/** Mountain peak — 16×32 sprite (taller than wide so it reads as a
 *  vertical landmark). Dark rock silhouette with stepped highlights
 *  on the sun side and a snow cap on the top third. Painted with
 *  transparent margins so it sits over the rocky ground naturally. */
export function paintMountainPeak(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 32;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;

  const ROCK_DARK = "#3a3530";
  const ROCK_MID = "#5a5550";
  const ROCK_HIGH = "#7a7570";
  const SNOW_DARK = "#dde0e0";
  const SNOW_LIGHT = "#ffffff";

  // Triangular peak silhouette — narrow at top, widening to base.
  // Each row r in [2, 31] has a half-width t * 7 where t is row
  // progress. Outline pixels at left/right edges create the silhouette.
  for (let r = 2; r < 32; r++) {
    const t = (r - 2) / 29;
    const halfW = Math.round(1 + t * 7);
    const w = halfW * 2;
    const x = 8 - halfW;
    fill(ctx, OUTLINE, x, r, w, 1);
    fill(ctx, ROCK_MID, x + 1, r, w - 2, 1);
    // Sun-side highlight on the right slope
    if (w >= 4) fill(ctx, ROCK_HIGH, x + w - 2, r, 1, 1);
    // Shadow on the left slope
    if (w >= 6) fill(ctx, ROCK_DARK, x + 1, r, 1, 1);
  }
  // Snow cap on the top ~10 rows — overrides rock with snow.
  for (let r = 2; r < 12; r++) {
    const t = (r - 2) / 29;
    const halfW = Math.round(1 + t * 7);
    const w = halfW * 2;
    const x = 8 - halfW;
    if (w >= 4) {
      fill(ctx, SNOW_DARK, x + 1, r, w - 2, 1);
      // Drips of snow extending a bit further down
      if (r === 11 && w >= 6) {
        fill(ctx, SNOW_LIGHT, x + 2, r, 1, 1);
        fill(ctx, SNOW_LIGHT, x + w - 3, r, 1, 1);
      }
    } else {
      fill(ctx, SNOW_DARK, x, r, w, 1);
    }
    fill(ctx, SNOW_LIGHT, x + Math.floor(w / 2), r, 1, 1);
  }
  // Bottom shadow band — roots of the mountain
  fill(ctx, ROCK_DARK, 1, 30, 14, 2);
  return c;
}

/** Sleeping orange tabby — small curled-up cat viewed from the side.
 *  Body 10px wide × 4px tall with head bump on the left, tail
 *  wrapped around the right end. Eyes are closed (single dark dash).
 *  Positioned on manor stone steps as a "the manor is lived-in" tell. */
export function paintCat(): HTMLCanvasElement {
  const { c, ctx } = newYardCanvas();
  if (!ctx) return c;
  // Body oval
  fill(ctx, OUTLINE, 3, 10, 11, 5);
  fill(ctx, "#d97a3a", 3, 11, 11, 3);
  fill(ctx, "#f5a060", 4, 11, 9, 1);
  // Tabby stripes
  fill(ctx, "#a85820", 6, 12, 1, 2);
  fill(ctx, "#a85820", 9, 12, 1, 2);
  fill(ctx, "#a85820", 11, 12, 1, 2);
  // Head bump on the left
  fill(ctx, OUTLINE, 2, 9, 4, 4);
  fill(ctx, "#d97a3a", 3, 10, 2, 2);
  // Ears
  fill(ctx, OUTLINE, 2, 8, 1, 1);
  fill(ctx, OUTLINE, 4, 8, 1, 1);
  // Closed eye (sleeping)
  fill(ctx, "#1a0f08", 4, 11, 1, 1);
  // Curled tail wrapping around the right end
  fill(ctx, OUTLINE, 14, 11, 1, 3);
  fill(ctx, "#d97a3a", 13, 14, 1, 1);
  fill(ctx, OUTLINE, 12, 14, 1, 1);
  return c;
}

/** Flying seagull — minimal "M" silhouette of a gull mid-flight, all
 *  white body with grey wing tips. Painted at the centre of a 16×16
 *  canvas so a circular orbit tween reads as wheeling above the
 *  houseboat. */
export function paintSeagull(): HTMLCanvasElement {
  const { c, ctx } = newYardCanvas();
  if (!ctx) return c;
  // Body — small 2×2 white blob in the centre
  fill(ctx, OUTLINE, 7, 7, 3, 2);
  fill(ctx, "#ffffff", 7, 7, 3, 1);
  fill(ctx, "#dddde0", 7, 8, 3, 1);
  // Beak
  fill(ctx, BIRD_BEAK, 10, 8, 1, 1);
  // Left wing — "M" upstroke
  fill(ctx, "#a8acb8", 4, 7, 3, 1);
  fill(ctx, OUTLINE, 3, 6, 2, 1);
  // Right wing — "M" upstroke
  fill(ctx, "#a8acb8", 10, 7, 3, 1);
  fill(ctx, OUTLINE, 12, 6, 2, 1);
  return c;
}

/** Massive town-square statue — 64×96 sprite (4 wide × 6 tall in
 *  tiles). The bottom 4 rows form the 4×4 footprint that gets
 *  flagged collidable in the scene; the top 2 rows visually extend
 *  above the footprint so the figure reads as very tall.
 *  Composition (top → bottom): gold halo + robed serene figure →
 *  capital cornice → fluted column shaft with bronze inscription
 *  plaque → stepped foundation. */
export function paintStatue(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 96;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;

  const MARBLE_DARK = "#a8a098";
  const MARBLE_MID = "#d8d4c8";
  const MARBLE_LIGHT = "#f4f0e0";
  const COLUMN_DARK = "#8a8276";
  const COLUMN_MID = "#c0b8a8";
  const COLUMN_LIGHT = "#e0d8c4";
  const HALO_GOLD = "#f0c040";
  const HALO_GOLD_LIGHT = "#fae085";
  const ROBE_SHADOW = "#9090a8";
  const ROBE_FOLD = "#c0c0d0";
  const FACE = "#f0e0c8";
  const FACE_SHADOW = "#a89060";
  const BRONZE = "#3a2818";
  const BRONZE_TRIM = "#8a6030";

  // Foundation steps — three tiers widening to the bottom
  fill(ctx, OUTLINE, 0, 90, 64, 6);
  fill(ctx, MARBLE_DARK, 1, 90, 62, 6);
  fill(ctx, MARBLE_MID, 1, 90, 62, 1);
  fill(ctx, OUTLINE, 4, 84, 56, 6);
  fill(ctx, MARBLE_DARK, 5, 84, 54, 6);
  fill(ctx, MARBLE_MID, 5, 84, 54, 1);
  fill(ctx, OUTLINE, 8, 78, 48, 6);
  fill(ctx, MARBLE_DARK, 9, 78, 46, 6);
  fill(ctx, MARBLE_MID, 9, 78, 46, 1);

  // Column shaft — tall narrow centre column with vertical fluting
  fill(ctx, OUTLINE, 21, 30, 22, 48);
  fill(ctx, COLUMN_MID, 22, 30, 20, 48);
  fill(ctx, COLUMN_LIGHT, 23, 30, 18, 1);
  fill(ctx, COLUMN_LIGHT, 25, 30, 1, 48);
  fill(ctx, COLUMN_LIGHT, 31, 30, 1, 48);
  fill(ctx, COLUMN_LIGHT, 37, 30, 1, 48);
  fill(ctx, COLUMN_DARK, 22, 30, 1, 48);
  fill(ctx, COLUMN_DARK, 41, 30, 1, 48);

  // Capital — cornice / decorative top of the column
  fill(ctx, OUTLINE, 17, 28, 30, 4);
  fill(ctx, MARBLE_DARK, 18, 28, 28, 4);
  fill(ctx, MARBLE_MID, 18, 28, 28, 1);
  fill(ctx, OUTLINE, 19, 24, 26, 4);
  fill(ctx, MARBLE_MID, 20, 24, 24, 4);
  fill(ctx, MARBLE_LIGHT, 20, 24, 24, 1);

  // Halo — gold ring arching above the head
  fill(ctx, HALO_GOLD, 24, 2, 16, 1);
  fill(ctx, HALO_GOLD, 23, 3, 18, 1);
  fill(ctx, HALO_GOLD_LIGHT, 28, 2, 8, 1);
  fill(ctx, HALO_GOLD, 22, 4, 1, 1);
  fill(ctx, HALO_GOLD, 41, 4, 1, 1);
  fill(ctx, HALO_GOLD, 21, 5, 1, 4);
  fill(ctx, HALO_GOLD, 42, 5, 1, 4);

  // Head — small oval with closed serene eyes + mouth
  fill(ctx, OUTLINE, 27, 4, 10, 1);
  fill(ctx, OUTLINE, 26, 5, 12, 6);
  fill(ctx, FACE, 27, 5, 10, 6);
  fill(ctx, FACE_SHADOW, 27, 9, 10, 1);
  fill(ctx, OUTLINE, 29, 7, 2, 1);
  fill(ctx, OUTLINE, 33, 7, 2, 1);
  fill(ctx, OUTLINE, 31, 9, 2, 1);

  // Robed body — shoulders, mid-robe folds, widening base
  fill(ctx, OUTLINE, 23, 11, 18, 1);
  fill(ctx, ROBE_SHADOW, 23, 12, 18, 1);
  fill(ctx, MARBLE_LIGHT, 24, 12, 16, 1);
  fill(ctx, OUTLINE, 22, 13, 20, 1);
  fill(ctx, MARBLE_LIGHT, 23, 13, 18, 5);
  fill(ctx, ROBE_FOLD, 26, 14, 1, 8);
  fill(ctx, ROBE_FOLD, 32, 14, 1, 8);
  fill(ctx, ROBE_FOLD, 37, 14, 1, 8);
  fill(ctx, OUTLINE, 21, 18, 22, 1);
  fill(ctx, MARBLE_LIGHT, 22, 18, 20, 4);
  fill(ctx, MARBLE_DARK, 23, 14, 1, 6);
  fill(ctx, MARBLE_DARK, 40, 14, 1, 6);
  fill(ctx, OUTLINE, 20, 22, 24, 1);
  fill(ctx, MARBLE_LIGHT, 21, 22, 22, 2);
  fill(ctx, ROBE_SHADOW, 21, 23, 22, 1);

  // Bronze inscription plaque on the front of the column — visual
  // hint that this is the community board (text rendered in the
  // dialog when the player interacts).
  fill(ctx, OUTLINE, 25, 50, 14, 22);
  fill(ctx, BRONZE, 26, 51, 12, 20);
  fill(ctx, BRONZE_TRIM, 26, 51, 12, 1);
  fill(ctx, BRONZE_TRIM, 26, 70, 12, 1);
  fill(ctx, BRONZE_TRIM, 26, 51, 1, 20);
  fill(ctx, BRONZE_TRIM, 37, 51, 1, 20);
  fill(ctx, BRONZE_TRIM, 28, 55, 8, 1);
  fill(ctx, BRONZE_TRIM, 28, 60, 8, 1);
  fill(ctx, BRONZE_TRIM, 28, 65, 8, 1);

  return c;
}

/** Lavish rose — much more elaborate than the simple flower-bed.
 *  Multi-layered crimson petals with a yellow stamen + highlight, on
 *  a tall green stem with a leaf, planted in a small dirt patch.
 *  Used to ring the town square perimeter and cluster around the
 *  statue at its centre. */
export function paintRose(): HTMLCanvasElement {
  const { c, ctx } = newYardCanvas();
  if (!ctx) return c;

  const ROSE_DARK = "#6a0808";
  const ROSE_MID = "#c01820";
  const ROSE_LIGHT = "#e84840";
  const ROSE_GLEAM = "#ffa090";
  const STAMEN = "#f0c040";
  const STEM_GREEN = "#2a5028";
  const LEAF_GREEN_DARK = "#356030";
  const LEAF_GREEN_MID = "#4a8048";

  // Bloom outer outline (rows 1-7, cols 3-12) — petals form a rounded
  // diamond silhouette
  fill(ctx, ROSE_DARK, 5, 1, 6, 1);
  fill(ctx, ROSE_DARK, 4, 2, 8, 1);
  fill(ctx, ROSE_DARK, 3, 3, 10, 1);
  fill(ctx, ROSE_DARK, 3, 4, 10, 1);
  fill(ctx, ROSE_DARK, 3, 5, 10, 1);
  fill(ctx, ROSE_DARK, 4, 6, 8, 1);
  fill(ctx, ROSE_DARK, 5, 7, 6, 1);
  // Mid red petal layer
  fill(ctx, ROSE_MID, 5, 2, 6, 1);
  fill(ctx, ROSE_MID, 4, 3, 8, 1);
  fill(ctx, ROSE_MID, 4, 4, 8, 1);
  fill(ctx, ROSE_MID, 4, 5, 8, 1);
  fill(ctx, ROSE_MID, 5, 6, 6, 1);
  // Light pink inner heart
  fill(ctx, ROSE_LIGHT, 6, 3, 4, 3);
  // Yellow stamen + bright gleam highlight
  fill(ctx, STAMEN, 7, 4, 2, 1);
  fill(ctx, ROSE_GLEAM, 7, 3, 1, 1);
  // Stem — 5-tile vertical green at col 8
  fill(ctx, STEM_GREEN, 8, 8, 1, 5);
  // Leaf bump on left side at rows 9-11
  fill(ctx, LEAF_GREEN_DARK, 5, 10, 3, 1);
  fill(ctx, LEAF_GREEN_DARK, 6, 11, 2, 1);
  fill(ctx, LEAF_GREEN_MID, 6, 10, 2, 1);
  // Small dirt patch at base
  fill(ctx, SOIL_DARK, 5, 13, 7, 3);
  fill(ctx, SOIL_MID, 6, 14, 5, 1);
  return c;
}

/** Lily pad — small flat green disc with a notch wedge cut out and a
 *  parametrised bloom centred on it. Used for houseboat yards. */
export function paintLilyPad(blossomColor: string): HTMLCanvasElement {
  const { c, ctx } = newYardCanvas();
  if (!ctx) return c;
  // Pad — 10×3 oval at (3, 9)
  fill(ctx, OUTLINE, 3, 9, 10, 4);
  fill(ctx, LEAF_DARK, 3, 10, 10, 2);
  fill(ctx, LEAF_MID, 4, 10, 8, 1);
  fill(ctx, STEM_HIGH, 5, 10, 2, 1);
  // Notch wedge on the right
  fill(ctx, "#0d0a08", 11, 11, 1, 1);
  // Bloom
  fill(ctx, OUTLINE, 7, 5, 3, 4);
  fill(ctx, blossomColor, 7, 5, 3, 3);
  fill(ctx, "#ffffff", 8, 5, 1, 1);
  return c;
}

/** Coiled rope — concentric warm-rope bands with a tail leading off.
 *  Used for houseboat yards as nautical flavor. */
export function paintRopeCoil(): HTMLCanvasElement {
  const { c, ctx } = newYardCanvas();
  if (!ctx) return c;
  // Outer ring
  fill(ctx, OUTLINE, 4, 9, 8, 4);
  fill(ctx, "#8c6a40", 4, 10, 8, 2);
  fill(ctx, "#a87340", 5, 10, 6, 1);
  // Inner ring shadow
  fill(ctx, "#5a3a18", 5, 11, 6, 1);
  // Centre notch (where rope ends are tucked)
  fill(ctx, OUTLINE, 7, 11, 2, 1);
  // Tail leading off to the right
  fill(ctx, "#a87340", 11, 11, 4, 1);
  fill(ctx, "#5a3a18", 11, 12, 4, 1);
  return c;
}

/** Metal watering can with curved handle and spout. Used for
 *  greenhouse yards. */
export function paintWateringCan(): HTMLCanvasElement {
  const { c, ctx } = newYardCanvas();
  if (!ctx) return c;
  // Body
  fill(ctx, OUTLINE, 4, 7, 7, 7);
  fill(ctx, "#a8acb8", 5, 7, 5, 6);
  fill(ctx, "#c8ccd0", 5, 7, 1, 6);
  fill(ctx, "#6a6a72", 9, 8, 1, 5);
  // Top arc handle
  fill(ctx, OUTLINE, 5, 5, 5, 1);
  fill(ctx, OUTLINE, 5, 6, 1, 1);
  fill(ctx, OUTLINE, 9, 6, 1, 1);
  // Spout (right side, with rose head)
  fill(ctx, OUTLINE, 11, 8, 3, 1);
  fill(ctx, "#a8acb8", 11, 9, 3, 1);
  fill(ctx, OUTLINE, 11, 10, 3, 1);
  // Water trickle from spout
  fill(ctx, WINDOW_GLASS, 14, 9, 1, 2);
  return c;
}

/** Artist's easel — tripod stand with a canvas. Used for tower yards
 *  to suggest a creative studio. */
export function paintEasel(): HTMLCanvasElement {
  const { c, ctx } = newYardCanvas();
  if (!ctx) return c;
  // Tripod legs
  fill(ctx, "#5a3a18", 7, 14, 1, 2);
  fill(ctx, "#5a3a18", 4, 13, 1, 3);
  fill(ctx, "#5a3a18", 11, 13, 1, 3);
  fill(ctx, "#3a2818", 4, 12, 8, 1);
  // Top spike (mast running up from tripod centre to canvas top)
  fill(ctx, "#3a2818", 7, 4, 1, 4);
  fill(ctx, "#3a2818", 8, 4, 1, 4);
  // Canvas
  fill(ctx, OUTLINE, 4, 5, 8, 7);
  fill(ctx, "#f4f0e8", 5, 6, 6, 5);
  // Paint smears
  fill(ctx, "#c83830", 6, 7, 2, 1);
  fill(ctx, "#3a7d92", 8, 9, 2, 1);
  return c;
}

/** Three-legged wooden stool. Used for tower yards beside the easel. */
export function paintStool(): HTMLCanvasElement {
  const { c, ctx } = newYardCanvas();
  if (!ctx) return c;
  // Seat
  fill(ctx, OUTLINE, 4, 9, 8, 3);
  fill(ctx, WOOD_MID, 5, 9, 6, 2);
  fill(ctx, WOOD_HIGH, 5, 9, 6, 1);
  // Legs
  fill(ctx, WOOD_DARK, 5, 12, 1, 4);
  fill(ctx, WOOD_DARK, 10, 12, 1, 4);
  // Crossbar
  fill(ctx, WOOD_DARK, 6, 14, 4, 1);
  return c;
}

/** Tiny bee — 4×4 yellow+black body with two wing tufts, painted
 *  centred inside a 16×16 transparent canvas. Reads as a hovering
 *  insect at the camera zoom; positioned above flower tiles by the
 *  bee buzz tween in the world scene. */
export function paintBee(): HTMLCanvasElement {
  const { c, ctx } = newYardCanvas();
  if (!ctx) return c;
  // Wing tufts — pale grey-white pixels just above the body
  fill(ctx, "#e0e4f0", 5, 5, 2, 2);
  fill(ctx, "#e0e4f0", 9, 5, 2, 2);
  // Body outline
  fill(ctx, OUTLINE, 6, 6, 4, 3);
  // Yellow body fill
  fill(ctx, "#f0c040", 6, 6, 4, 3);
  // Two black bands across the abdomen
  fill(ctx, OUTLINE, 7, 6, 1, 3);
  fill(ctx, OUTLINE, 9, 6, 1, 3);
  return c;
}

/** Small chicken — 8×8 sprite centred inside a 16×16 transparent
 *  canvas so it reads as the right scale when placed on a tile. White
 *  body, red comb, yellow beak, black eye, two thin legs. */
export function paintChicken(): HTMLCanvasElement {
  const { c, ctx } = newYardCanvas();
  if (!ctx) return c;
  // Body — 6×4 white oval at (5, 7)
  fill(ctx, OUTLINE, 5, 7, 6, 4);
  fill(ctx, "#f4eee0", 6, 7, 4, 3);
  fill(ctx, "#ffffff", 6, 7, 2, 1);
  // Tail tuft (back-left) — small upward feather
  fill(ctx, OUTLINE, 4, 6, 1, 2);
  fill(ctx, "#f4eee0", 4, 7, 1, 1);
  // Head — 2×2 above body, right-facing
  fill(ctx, OUTLINE, 9, 5, 2, 2);
  fill(ctx, "#ffffff", 9, 5, 2, 2);
  // Comb — 1px red on top of head
  fill(ctx, "#c83830", 9, 4, 2, 1);
  // Beak — yellow point projecting right
  fill(ctx, "#f0c040", 11, 6, 1, 1);
  // Eye — black dot
  fill(ctx, OUTLINE, 10, 5, 1, 1);
  // Legs — two 1×2 yellow lines below body
  fill(ctx, "#c89030", 6, 11, 1, 2);
  fill(ctx, "#c89030", 9, 11, 1, 2);
  return c;
}

/** Small terracotta pot with a leafy green plant + a parametrised
 *  blossom. Used flanking the workshop door. */
export function paintPottedPlant(blossomColor: string): HTMLCanvasElement {
  const { c, ctx } = newYardCanvas();
  if (!ctx) return c;
  // Pot — 8×5 at (4, 10), terracotta
  fill(ctx, OUTLINE, 3, 10, 10, 6);
  fill(ctx, POT_TERRACOTTA, 4, 10, 8, 5);
  fill(ctx, POT_SHADOW, 4, 14, 8, 1);
  // Pot rim
  fill(ctx, "#8c4a20", 3, 9, 10, 1);
  // Plant body — leafy green clump
  fill(ctx, LEAF_DARK, 5, 4, 6, 6);
  fill(ctx, LEAF_MID, 6, 5, 4, 4);
  fill(ctx, LEAF_MID, 4, 6, 1, 2);
  fill(ctx, LEAF_MID, 11, 6, 1, 2);
  // Blossom on top
  fill(ctx, OUTLINE, 7, 2, 3, 3);
  fill(ctx, blossomColor, 7, 2, 3, 2);
  fill(ctx, "#ffffff", 8, 2, 1, 1);
  return c;
}

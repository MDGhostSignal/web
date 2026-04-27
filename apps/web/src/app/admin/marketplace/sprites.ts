/**
 * Programmatic pixel-art sprites for the marketplace town. Each sprite
 * is a 2D color-index grid; colours come from a per-sprite palette so
 * brand vs creator buildings differ by hue without duplicating shape
 * data. Sprite arrays read top-to-bottom, left-to-right — the same
 * convention used by NES / SNES tile editors.
 *
 * v0 ships these procedurally rendered sprites; pass 3 swaps to a
 * Kenney CC0 atlas if/when the user drops one into the assets folder.
 *
 * Palette index conventions:
 *   0 = transparent
 *   1 = wall (mid)
 *   2 = wall (light)
 *   3 = wall (shadow)
 *   4 = roof (mid)
 *   5 = roof (light)
 *   6 = roof (shadow)
 *   7 = window
 *   8 = door
 *   9 = trim / detail
 *  10 = ground / base shadow
 */

export type Palette = readonly (string | null)[];

export type SpriteDef = {
  width: number;
  height: number;
  /** 2D color-index grid, [row][col]. */
  pixels: readonly (readonly number[])[];
  palette: Palette;
};

/* ---- Palettes ------------------------------------------------------- */

/** Brand cottage — warm orange roof, cream walls, golden trim. */
export const BRAND_PALETTE: Palette = [
  null,
  "#d8c8a8", // wall mid
  "#f0e2bf", // wall light
  "#b6a378", // wall shadow
  "#d97a3a", // roof mid (brand orange family)
  "#f59758", // roof light
  "#9c5524", // roof shadow
  "#3d2a18", // window
  "#5a3a22", // door
  "#fbad25", // trim — admin accent
  "#000000aa", // base shadow (rgba painted as solid; alpha handled per-pixel)
];

/** Creator cottage — cool teal/blue roof, off-white walls, cyan trim. */
export const CREATOR_PALETTE: Palette = [
  null,
  "#cdd9dc", // wall mid
  "#e6eef0", // wall light
  "#8fa1a7", // wall shadow
  "#3a7d92", // roof mid (creator cyan family)
  "#5fa3b8", // roof light
  "#1f4d5e", // roof shadow
  "#142631", // window
  "#1f3a4a", // door
  "#64c8ff", // trim — admin info / creator
  "#000000aa", // base shadow
];

/** Plaza fountain — neutral stone with amber glow. */
export const PLAZA_PALETTE: Palette = [
  null,
  "#7a7a82", // stone mid
  "#a8a8b0", // stone light
  "#48484e", // stone shadow
  "#fbad25", // glow mid (admin accent)
  "#ffd07a", // glow light
  "#a86a18", // glow shadow
  "#1f1f24", // dark detail
  "#1f1f24", // (unused)
  "#ffc043", // accent strong
  "#000000aa",
];

/* ---- Shared base shapes -------------------------------------------- */
/**
 * Two-roof cottage: 16×16, the classic JRPG town building. We share the
 * shape between brand + creator and just swap palettes. Simple gabled
 * roof, single door, two windows. Designed to read at a glance from the
 * isometric camera angle.
 *
 * Pixel grid (T = transparent / 0):
 *   row 0:  T T T T T T 4 4 4 4 T T T T T T   ← roof peak
 *   ...
 */
const COTTAGE_SHAPE: readonly (readonly number[])[] = [
  // 0
  [0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0],
  // 1
  [0, 0, 0, 0, 0, 4, 5, 5, 5, 5, 4, 0, 0, 0, 0, 0],
  // 2
  [0, 0, 0, 0, 4, 5, 5, 5, 5, 5, 5, 4, 0, 0, 0, 0],
  // 3
  [0, 0, 0, 4, 5, 5, 5, 5, 5, 5, 5, 5, 4, 0, 0, 0],
  // 4
  [0, 0, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 0, 0],
  // 5
  [0, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 0],
  // 6
  [4, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 4],
  // 7
  [9, 1, 1, 2, 1, 1, 7, 7, 1, 1, 7, 7, 1, 1, 1, 9],
  // 8
  [9, 1, 2, 2, 1, 1, 7, 7, 1, 1, 7, 7, 1, 2, 1, 9],
  // 9
  [9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 9],
  // 10
  [9, 1, 1, 1, 1, 1, 1, 8, 8, 1, 1, 1, 2, 1, 1, 9],
  // 11
  [9, 1, 1, 2, 1, 1, 1, 8, 8, 1, 1, 1, 1, 1, 1, 9],
  // 12
  [9, 1, 1, 1, 1, 1, 1, 8, 8, 1, 1, 1, 1, 1, 1, 9],
  // 13
  [9, 3, 3, 3, 3, 3, 3, 8, 8, 3, 3, 3, 3, 3, 3, 9],
  // 14
  [0, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 0],
  // 15
  [0, 0, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0],
];

export const SPRITE_BRAND_COTTAGE: SpriteDef = {
  width: 16,
  height: 16,
  pixels: COTTAGE_SHAPE,
  palette: BRAND_PALETTE,
};

export const SPRITE_CREATOR_COTTAGE: SpriteDef = {
  width: 16,
  height: 16,
  pixels: COTTAGE_SHAPE,
  palette: CREATOR_PALETTE,
};

/** Central plaza fountain — 16×16 stone basin with a glowing core. */
export const SPRITE_PLAZA_FOUNTAIN: SpriteDef = {
  width: 16,
  height: 16,
  palette: PLAZA_PALETTE,
  pixels: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 9, 9, 9, 9, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 9, 9, 4, 5, 5, 4, 9, 9, 0, 0, 0, 0],
    [0, 0, 0, 9, 4, 5, 5, 5, 5, 5, 5, 4, 9, 0, 0, 0],
    [0, 0, 9, 4, 5, 5, 5, 5, 5, 5, 5, 5, 4, 9, 0, 0],
    [0, 0, 9, 4, 5, 5, 5, 5, 5, 5, 5, 5, 4, 9, 0, 0],
    [0, 9, 1, 1, 1, 2, 2, 2, 2, 2, 2, 1, 1, 1, 9, 0],
    [0, 9, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 9, 0],
    [0, 9, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 9, 0],
    [0, 9, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 9, 0],
    [0, 9, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 9, 0],
    [0, 9, 1, 1, 1, 2, 2, 2, 2, 2, 2, 1, 1, 1, 9, 0],
    [0, 0, 9, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 9, 0, 0],
    [0, 0, 0, 9, 3, 3, 3, 3, 3, 3, 3, 3, 9, 0, 0, 0],
    [0, 0, 0, 0, 9, 9, 3, 3, 3, 3, 9, 9, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 9, 9, 9, 9, 0, 0, 0, 0, 0, 0],
  ],
};

/* ---- Renderer ------------------------------------------------------- */

/**
 * Bake a SpriteDef into an offscreen <canvas> at integer scale. The
 * resulting canvas is what gets handed to a three.js `CanvasTexture`
 * (with `magFilter = NearestFilter`) on the React side.
 *
 * `scale` is the pixel-to-pixel multiplier; 8 is a good baseline so
 * the sprite has internal headroom before the HD-2D upscale pass kicks
 * in. Even multipliers keep edges crisp.
 */
export function renderSpriteToCanvas(
  def: SpriteDef,
  scale = 8,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = def.width * scale;
  canvas.height = def.height * scale;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < def.height; y++) {
    const row = def.pixels[y];
    for (let x = 0; x < def.width; x++) {
      const idx = row[x];
      const color = def.palette[idx];
      if (!color) continue;
      // Last palette slot conventionally encodes the base shadow with
      // its alpha baked in via #rrggbbaa. Canvas2D handles that
      // natively, so no special-case needed here.
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return canvas;
}

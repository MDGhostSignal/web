// Obstacle data model — single source of truth for impassable
// geometry in each "room" of the world.
//
// Two collision sources, checked in order:
//   1. A pixel mask (transparent PNG painted over the room's backdrop)
//      — pixel-perfect, used for the village.
//   2. A rect fallback list — useful for interiors where authoring a
//      whole mask PNG would be overkill.
//
// All coords are WORLD coords (post-VILLAGE_SCALE), the same space
// used by `sprite.x`, `sprite.y`, `ownPos.x * TILE`. Animals + the
// player pass their foot point straight through.

export type ObstacleRect = {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Optional human label — surfaces in the debug overlay so we can
   *  spot which rect needs nudging when the player gets stuck. */
  label?: string;
};

/** Which "room" the obstacle list belongs to. The village is mask-
 *  backed; every building interior is keyed `interior:<id>`. Keeping
 *  this a string union (rather than a discriminated object) means
 *  obstacle data lives off-screen of the runtime location state. */
export type ObstacleLocation = "village" | `interior:${string}`;

/** Rect fallback per location. Empty for `village` because the mask
 *  handles it; interior rect lists are populated from each building's
 *  `interior.obstacles`. */
export const OBSTACLES: Partial<Record<ObstacleLocation, ObstacleRect[]>> = {
  village: [],
};

/** Replace the rect list for one location. Used when entering a
 *  building interior so the active obstacles match the building's
 *  config. */
export function setRects(loc: ObstacleLocation, rects: ObstacleRect[]) {
  OBSTACLES[loc] = rects;
}

/** Pixel-accurate collision mask. Authored as a transparent PNG over
 *  the room's backdrop — painted (opaque) pixels block movement,
 *  clear pixels allow it. Lookup is O(1) via flat byte array. */
export type ObstacleMask = {
  /** PNG-native width (e.g. 768 for the village). */
  width: number;
  /** PNG-native height (e.g. 1024 for the village). */
  height: number;
  /** World-pixel scale applied to the mask (mirrors VILLAGE_SCALE).
   *  World coord → mask coord: divide by this. */
  worldScale: number;
  /** length = width * height. 1 = blocked, 0 = clear. */
  data: Uint8Array;
};

const MASKS: Partial<Record<ObstacleLocation, ObstacleMask>> = {};

/** Register a pixel mask for a room. Called by the scene after the
 *  collision PNG is loaded and decoded. */
export function registerMask(loc: ObstacleLocation, mask: ObstacleMask) {
  MASKS[loc] = mask;
}

export function getMask(loc: ObstacleLocation): ObstacleMask | undefined {
  return MASKS[loc];
}

/** Is the given world-coord point blocked for this room?
 *  Animals + the player call this with their FOOT anchor (sprite x,y
 *  at origin 0.5/0.9). Mask wins over rects if both are present. */
export function isBlocked(
  x: number,
  y: number,
  loc: ObstacleLocation,
): boolean {
  const mask = MASKS[loc];
  if (mask) {
    const mx = Math.floor(x / mask.worldScale);
    const my = Math.floor(y / mask.worldScale);
    if (mx < 0 || my < 0 || mx >= mask.width || my >= mask.height) {
      // Outside the painting → treat as blocked so animals/players
      // can't wander into the void.
      return true;
    }
    if (mask.data[my * mask.width + mx]) return true;
  }
  const rects = OBSTACLES[loc];
  if (rects) {
    for (const r of rects) {
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        return true;
      }
    }
  }
  return false;
}

/** Move (fromX, fromY) → (toX, toY) against the room's obstacles.
 *
 *  If the destination is blocked, attempt to slide along whichever
 *  single axis is still free (axis-separated resolution). That gives
 *  the classic SNES "wall-slide" behavior — walk diagonally into a
 *  wall, keep moving along the wall, no stick.
 *
 *  Returns the resolved position. Same as (toX, toY) when nothing is
 *  in the way. */
export function resolveMove(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  loc: ObstacleLocation,
): { x: number; y: number } {
  if (!isBlocked(toX, toY, loc)) return { x: toX, y: toY };
  if (!isBlocked(toX, fromY, loc)) return { x: toX, y: fromY };
  if (!isBlocked(fromX, toY, loc)) return { x: fromX, y: toY };
  return { x: fromX, y: fromY };
}

/** Spiral out from (x, y) and return the nearest point that isn't
 *  blocked. Used to nudge animal spawn anchors out of buildings,
 *  fences, etc., when the village mask has changed under them.
 *  Returns the original point when it's already free. Returns null if
 *  no free point is found within `maxRadius` world px (very unlikely
 *  on the village, but fences off completely would trip it). */
export function nudgeToFree(
  x: number,
  y: number,
  loc: ObstacleLocation,
  maxRadius = 320,
  step = 12,
): { x: number; y: number } | null {
  if (!isBlocked(x, y, loc)) return { x, y };
  // Sample 16 directions per ring, growing the ring by `step` each
  // pass. 16 keeps the spiral dense enough that we don't miss narrow
  // walkable corridors between two blockers.
  const samples = 16;
  for (let r = step; r <= maxRadius; r += step) {
    for (let i = 0; i < samples; i++) {
      const a = (i / samples) * Math.PI * 2;
      const cx = x + Math.cos(a) * r;
      const cy = y + Math.sin(a) * r;
      if (!isBlocked(cx, cy, loc)) return { x: cx, y: cy };
    }
  }
  return null;
}

/** Sample N candidate targets near (homeX, homeY) and return the
 *  first one that isn't blocked, or null if all candidates fail.
 *  Animal FSMs use this so they don't wander into walls. */
export function pickFreeTarget(
  homeX: number,
  homeY: number,
  minR: number,
  maxR: number,
  loc: ObstacleLocation,
  attempts = 8,
): { x: number; y: number } | null {
  for (let i = 0; i < attempts; i++) {
    const r = minR + Math.random() * (maxR - minR);
    const a = Math.random() * Math.PI * 2;
    const x = homeX + Math.cos(a) * r;
    const y = homeY + Math.sin(a) * r;
    if (!isBlocked(x, y, loc)) return { x, y };
  }
  return null;
}

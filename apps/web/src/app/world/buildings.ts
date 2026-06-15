// Building registry — every enterable structure in the village.
// One entry per building; each entry owns its door trigger zone (in
// village world coords) and the geometry of its interior "room"
// (texture key, scale, bounds, spawn, exit trigger).
//
// The church was the prototype — keeping its constants here lets us
// add new buildings as data, not as another round of copy-pasted
// `enter()` / `exit()` methods. Each interior PNG the user provides
// becomes one entry in BUILDINGS.

import type { ObstacleRect } from "./obstacles";

export type DoorTrigger = {
  /** World-coord trigger center on the village backdrop. */
  x: number;
  y: number;
  /** Detection radius in world px. Players entering this disc see
   *  the "Press E — Enter <name>" prompt. */
  radius: number;
};

export type BuildingInterior = {
  /** Phaser texture key — registered by `this.load.image(...)`. */
  texKey: string;
  /** Display scale relative to the source PNG. Mirrors VILLAGE_SCALE
   *  for consistency, but a building can override it (e.g., a tiny
   *  interior rendered larger for readability). */
  scale: number;
  /** Source PNG dimensions (native px, pre-scale). */
  pngWidth: number;
  pngHeight: number;
  /** Top-left corner of the interior backdrop in WORLD coords. */
  worldX: number;
  worldY: number;
  /** Player spawn point inside the interior, world coords. */
  spawn: { x: number; y: number };
  /** Exit triggers inside the interior, world coords. Multi-room
   *  interiors can list more than one — every trigger fires the same
   *  "leave the building" action. */
  exits: DoorTrigger[];
  /** Wall buffer in px — keeps the player away from the painted PNG
   *  edges so they don't clip into stone walls. */
  wallMargin: number;
  /** Optional rect obstacles inside the interior. Cheaper than a
   *  whole pixel mask for small rooms. */
  obstacles?: ObstacleRect[];
};

export type Building = {
  /** Unique slug — used as the `interior:<id>` location key. */
  id: string;
  /** Player-facing name. Surfaces in the "Press E — Enter <name>"
   *  prompt and the React HUD pill button. */
  displayName: string;
  /** Short note on what the building is, where it sits on the map,
   *  and what role it plays in the village. Not surfaced in-game
   *  yet — lives here so future sessions and PRs can refer to a
   *  building by id without re-deriving its purpose from the art. */
  description: string;
  /** Door trigger on the village backdrop. */
  door: DoorTrigger;
  /** Interior data — populated once the user provides the interior
   *  PNG. When undefined, the door trigger still fires but pressing
   *  E reports "Interior coming soon" rather than teleporting. */
  interior?: BuildingInterior;
};

// World constants mirror WorldClient.tsx so this file can compute
// world-space offsets at the top level. Keep these in sync if
// VILLAGE_SCALE / world tile size / world dims change.
const TILE = 32;
const WORLD_W_TILES = 72;
const VILLAGE_SCALE = 3;

/** Helper: a building interior anchored to the top-center of the
 *  world, mirroring how the church facade column sits on the village
 *  painting. Used by buildings whose facade is at the top edge. */
function topCenterInterior(opts: {
  texKey: string;
  pngWidth: number;
  pngHeight: number;
  spawnPng: { x: number; y: number };
  /** One or more exit trigger points in PNG-native coords. The first
   *  element is treated as the canonical "main" door (used by the
   *  spawn-just-above-the-door convention). Each gets a default
   *  radius via `exitRadius` unless overridden per-entry. */
  exitsPng: Array<{ x: number; y: number; radius?: number }>;
  exitRadius?: number;
  wallMargin?: number;
}): BuildingInterior {
  const scale = VILLAGE_SCALE;
  const worldW = opts.pngWidth * scale;
  const worldX = (WORLD_W_TILES * TILE) / 2 - worldW / 2;
  const worldY = 0;
  const defaultRadius = opts.exitRadius ?? 72;
  return {
    texKey: opts.texKey,
    scale,
    pngWidth: opts.pngWidth,
    pngHeight: opts.pngHeight,
    worldX,
    worldY,
    spawn: {
      x: worldX + opts.spawnPng.x * scale,
      y: worldY + opts.spawnPng.y * scale,
    },
    exits: opts.exitsPng.map((e) => ({
      x: worldX + e.x * scale,
      y: worldY + e.y * scale,
      radius: e.radius ?? defaultRadius,
    })),
    wallMargin: opts.wallMargin ?? 32,
  };
}

/** Helper for door triggers authored in PNG-native village coords.
 *  Source painting is 768 × 1024; multiplied by VILLAGE_SCALE so the
 *  registry table stays readable when eyeballing the source PNG. */
function vdoor(x: number, y: number, radius = 56): DoorTrigger {
  return { x: x * VILLAGE_SCALE, y: y * VILLAGE_SCALE, radius };
}

/** Registry of every interactable building in the world. Door coords
 *  derived from the alpha-scan of `village-doors.png` (run on
 *  2026-06-15). New buildings: add an entry here, drop the interior
 *  PNG in /public/world/sprites/, preload it in WorldClient, and fill
 *  in the `interior` field. Order below mirrors a natural
 *  top-left → bottom-right walk of the village. */
export const BUILDINGS: Building[] = [
  {
    id: "town-hall",
    displayName: "Town Hall",
    description:
      "Top-left, the largest building on the map. Community gathering and village governance.",
    door: vdoor(152, 142),
    interior: topCenterInterior({
      texKey: "town-hall-interior",
      // 609 × 321 — multi-room layout: library upstairs, three
      // connected rooms below (left bedroom, center living + fire-
      // place, right twin bedroom). Single continuous interior for
      // the MVP — the player walks freely through the visual gaps.
      pngWidth: 609,
      pngHeight: 321,
      // Main entrance at the bottom-center room's door tile. The
      // bottom-left and bottom-right rooms each have their own door
      // tile too — all three drop the player back at the village
      // door on press-E.
      spawnPng: { x: 305, y: 305 },
      exitsPng: [
        { x: 305, y: 318 },
        { x: 110, y: 315 },
        { x: 505, y: 315 },
      ],
      exitRadius: 40,
      wallMargin: 20,
    }),
  },
  {
    id: "church",
    displayName: "Church",
    description: "Top-center. The first building wired in; serves as the interior pattern for the rest.",
    door: vdoor(368, 140),
    interior: topCenterInterior({
      texKey: "hm-church-interior",
      pngWidth: 240,
      pngHeight: 465,
      spawnPng: { x: 120, y: 425 },
      exitsPng: [{ x: 120, y: 455 }],
      exitRadius: 72,
      wallMargin: 32,
    }),
  },
  {
    id: "tiny-home",
    displayName: "Tiny Home",
    description: "Top-right corner — the small tall house.",
    door: vdoor(600, 219),
    interior: topCenterInterior({
      texKey: "tiny-home-interior",
      pngWidth: 256,
      pngHeight: 208,
      // Door painted at bottom-center of the interior; spawn the
      // player just above so they're facing into the room, exit
      // trigger sits on the door tile itself.
      spawnPng: { x: 128, y: 180 },
      exitsPng: [{ x: 128, y: 198 }],
      exitRadius: 36,
      wallMargin: 24,
    }),
  },
  {
    id: "shed",
    displayName: "The Shed",
    description: "Tiny brown shack in the middle-right of the plaza area.",
    door: vdoor(584, 603),
    interior: topCenterInterior({
      texKey: "shed-interior",
      pngWidth: 192,
      pngHeight: 208,
      spawnPng: { x: 96, y: 188 },
      exitsPng: [{ x: 96, y: 200 }],
      exitRadius: 30,
      wallMargin: 22,
    }),
  },
  {
    id: "inn",
    displayName: "The Inn",
    description:
      'Bottom-left, leftmost of the four bottom-row buildings. Originally described as "the house"; using "The Inn" as a working name.',
    door: vdoor(152, 861),
    interior: topCenterInterior({
      texKey: "inn-interior",
      // 256 × 419 — two-room layout (tavern on the lower half,
      // bedrooms on the upper half). Treated as one continuous tall
      // room for the MVP; player walks through the visual divider.
      pngWidth: 256,
      pngHeight: 419,
      // Door painted at the bottom-center of the lower (tavern) room.
      // Second exit at top-center of the upper (bedroom) room so the
      // player doesn't have to walk all the way down to leave.
      spawnPng: { x: 128, y: 400 },
      exitsPng: [
        { x: 128, y: 414 },
        { x: 128, y: 10 },
      ],
      exitRadius: 36,
      wallMargin: 22,
    }),
  },
  {
    id: "general-store",
    displayName: "General Store",
    description:
      "Bottom row, between the Inn and the Smith. Working name; swap if the building turns out to be something else.",
    door: vdoor(279, 861),
    interior: topCenterInterior({
      texKey: "general-store-interior",
      // 256 × 419 — two-room layout. Lower room looks more like a
      // diner (tables with plates) than a general store; flag in
      // case the building's role / name wants revisiting.
      pngWidth: 256,
      pngHeight: 419,
      spawnPng: { x: 128, y: 400 },
      exitsPng: [
        { x: 128, y: 414 },
        { x: 128, y: 10 },
      ],
      exitRadius: 36,
      wallMargin: 22,
    }),
  },
  {
    id: "smith",
    displayName: "Village Smith",
    description: "Bottom row, third from the left. Identified by the hammer-symbol sign outside.",
    door: vdoor(407, 861),
    interior: topCenterInterior({
      texKey: "smith-interior",
      // 256 × 401 — two-room layout (forge + living upstairs;
      // workshop downstairs). Same single-continuous-room treatment
      // as the Inn for the MVP.
      pngWidth: 256,
      pngHeight: 401,
      spawnPng: { x: 128, y: 380 },
      exitsPng: [
        { x: 128, y: 396 },
        { x: 128, y: 10 },
      ],
      exitRadius: 36,
      wallMargin: 22,
    }),
  },
  {
    id: "stable",
    displayName: "The Stable",
    description: "Bottom-right, largest of the four bottom-row buildings. Identified by the cow on the sign.",
    door: vdoor(600, 875),
    interior: topCenterInterior({
      texKey: "stable-interior",
      // 256 × 360 — single tall room with stalls down the middle,
      // feed/storage along the right edge, door at bottom-center.
      pngWidth: 256,
      pngHeight: 360,
      spawnPng: { x: 128, y: 340 },
      exitsPng: [{ x: 128, y: 354 }],
      exitRadius: 34,
      wallMargin: 22,
    }),
  },
];

/** Look up a building by id. Returns null when the id isn't known —
 *  useful for tolerating stale location state from localStorage. */
export function getBuilding(id: string): Building | null {
  return BUILDINGS.find((b) => b.id === id) ?? null;
}

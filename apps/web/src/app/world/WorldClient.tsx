"use client";

import { useEffect, useRef, useState } from "react";
import { Client, Room } from "colyseus.js";

import styles from "./world.module.css";
import { CharacterCard, type CharacterCardData } from "./CharacterCard";
import {
  OBSTACLES,
  getMask,
  nudgeToFree,
  pickFreeTarget,
  registerMask,
  resolveMove,
  setRects,
  type ObstacleLocation,
} from "./obstacles";
import { BUILDINGS, getBuilding } from "./buildings";

/**
 * WorldClient — Phase 1 MVP (manual broadcast variant).
 *
 * Boots Phaser, connects to the Colyseus `world` room, listens for
 * full-snapshot "state" messages broadcast at 10 Hz by the server,
 * renders every player as a colored circle, and sends WASD movement
 * back as "move" messages.
 *
 * We deliberately bypass @colyseus/schema delta sync for the MVP —
 * decorator transforms are inconsistent between server (tsc) and
 * client (Next.js / SWC), and the wire-protocol mismatch was eating
 * days. JSON broadcast is plenty efficient at 50 players × ~80 bytes
 * × 10 Hz. Phase 3 can swap back to schema if we ever need it.
 */

// Default to 127.0.0.1 (not "localhost") in dev — some browser
// extensions (notably MetaMask) hook fetch/WebSocket on the literal
// string "localhost" but ignore the numeric loopback. Override via
// NEXT_PUBLIC_GAME_SERVER_URL once a real prod server is deployed.
const SERVER_URL =
  process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? "ws://127.0.0.1:2567";

/** Sentinel for players who haven't taken the XQ (and so have no
 *  archetype to render). Distinct from the 8 codes so the avatar
 *  paint can swap to a neutral gray + plain circle head — a clear
 *  visual signal that "you're not classified yet, take the quiz". */
const NEUTRAL_ARCHETYPE = "NEUTRAL";

const ARCHETYPE_COLOR: Record<string, number> = {
  "C-P-C": 0xfbad25,
  "C-P-L": 0xff7bad,
  "C-S-C": 0xd66157,
  "C-S-L": 0x00b29c,
  "X-P-C": 0x9f71af,
  "X-P-L": 0xfa7b3f,
  "X-S-C": 0x4dc9ae,
  "X-S-L": 0x7c58d6,
  [NEUTRAL_ARCHETYPE]: 0x9aa0a8, // desaturated stone gray
};

/** Head-shape mark per archetype — mirrors the XQCharacterMark system
 *  used on the spectrum map and persona reveal. Floated above each
 *  avatar so users can read someone's archetype from across the
 *  plaza, even when the body tint is muddied by skin underlay. */
type MarkShape = "circle" | "oval" | "square" | "round-rect" | "diamond" | "triangle" | "hexagon" | "pentagon";
const ARCHETYPE_SHAPE: Record<string, MarkShape> = {
  "C-P-C": "circle",       // Steward
  "C-P-L": "oval",         // Shepherd
  "C-S-C": "square",       // Conservator
  "C-S-L": "round-rect",   // InstBuilder
  "X-P-C": "diamond",      // Artisan
  "X-P-L": "triangle",     // Catalyst
  "X-S-C": "hexagon",      // Designer
  "X-S-L": "pentagon",     // Architect
  [NEUTRAL_ARCHETYPE]: "circle", // plain head — no archetype yet
};

const TILE = 32;
// World sized to match the Harvest Moon village background at 3×
// native scale (768 × 1024 × 3 = 2304 × 3072 px → 72 × 96 tiles).
const WORLD_W_TILES = 72;
const WORLD_H_TILES = 96;
const VILLAGE_SCALE = 3;
const SPEED = 6;
const SEND_INTERVAL_MS = 100;

// Each building's door + interior geometry lives in `buildings.ts`.
// Interior rendering, enter/exit, and the action prompt all read from
// that registry — adding a new building means adding one entry there
// plus preloading its interior PNG below.

const ARCHETYPE_CODES = [
  "C-P-C",
  "C-P-L",
  "C-S-C",
  "C-S-L",
  "X-P-C",
  "X-P-L",
  "X-S-C",
  "X-S-L",
];

/** Kept around for any debug surface that still wants a random
 *  colorful avatar (e.g., the /x-deck demo card carousel). Live
 *  connection paths now default to NEUTRAL when no XQ identity is
 *  attached — a clear "take the quiz" cue rather than a fake one. */
function pickArchetype(): string {
  return ARCHETYPE_CODES[Math.floor(Math.random() * ARCHETYPE_CODES.length)];
}
void pickArchetype; // suppress unused-var lint while still exporting intent

/** Authoritative-snapshot shape received from the server. Matches
 *  `apps/game-server/src/rooms/WorldRoom.ts` PlayerData. */
type ServerPlayer = {
  sessionId: string;
  userId: string;
  /** When the player joined via /studio/world with a valid Supabase
   *  token, this is their auth.users.id. Null for guests. Used by the
   *  E-key card to fetch the player's real RQ + XQ summary. */
  authUserId: string | null;
  displayName: string;
  archetype: string;
  rqCode: string | null;
  memberType: "brand" | "creator" | "other" | "guest";
  organization: string | null;
  x: number;
  y: number;
  facing: "down" | "up" | "left" | "right";
  moving: boolean;
};

type StateMessage = { players: ServerPlayer[] };

/** Client-only ambient NPC — a chicken that idles in place, gets
 *  scared when a player walks close, runs for a few seconds, finds a
 *  new spot to settle, and idles again. No server sync; each client
 *  animates its own chickens. */
type ChickenState = "idle" | "scared" | "wander";
type Chicken = {
  sprite: Phaser.GameObjects.Image;
  state: ChickenState;
  /** ms left until the chicken transitions out of its current state. */
  timer: number;
  /** Velocity in tiles/sec for x,y while running. */
  vx: number;
  vy: number;
  /** Target world position we're heading toward in wander. */
  targetX: number;
  targetY: number;
  /** Idle bob tween — paused while moving so manual y updates aren't
   *  fought by the tween. */
  bob: Phaser.Tweens.Tween | null;
  /** Walk-frame cycle event — created while moving, destroyed at rest. */
  walkCycle: Phaser.Time.TimerEvent | null;
  /** Frame index into the chicken's walk-anim frame list. */
  walkIndex: number;
  /** Frame keys to cycle through when running. Hen and chick use
   *  different keys — passed in at construction. */
  walkFrames: string[];
  idleFrame: string;
  /** Detection radius — how close a player has to be to spook this
   *  chicken. Bigger for the hen, smaller for the chick. */
  triggerRadius: number;
  /** Running speed in world pixels per second. */
  speed: number;
  /** Anchor we wander back to after being scared, so chickens don't
   *  walk halfway across the map over time. */
  homeX: number;
  homeY: number;
};

/** Wandering dog NPC. Roams in a small radius around its home
 *  anchor, pauses, picks a new spot, repeats. No proximity reaction;
 *  the dog is friendly. */
type DogState = "idle" | "walking" | "scared";
/** What the dog is doing during an idle bout — affects which anim
 *  plays + how long the bout lasts. Picked by weighted random when
 *  entering the idle state. */
type DogIdleAction = "stand" | "sit" | "scratch" | "bark" | "jump" | "sleep";
type DogFacing = "down" | "up" | "left" | "right";
type Dog = {
  sprite: Phaser.GameObjects.Sprite;
  state: DogState;
  /** Active idle behavior (meaningful only while state === "idle"). */
  idleAction: DogIdleAction;
  /** Last walk-facing — used to detect direction change mid-walk so
   *  we can swap to the right anim without flickering on frame 0. */
  facing: DogFacing;
  timer: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  homeX: number;
  homeY: number;
  bob: Phaser.Tweens.Tween | null;
};

/** Stationary-ish cow NPC. Grazes in place with an idle bob; when a
 *  player walks close, ambles a few seconds in the opposite direction,
 *  then settles back to idle. Less skittish than a chicken — moves
 *  slow and short. */
type CowState = "idle" | "walking";
type Cow = {
  sprite: Phaser.GameObjects.Image;
  state: CowState;
  timer: number;
  vx: number;
  vy: number;
  homeX: number;
  homeY: number;
  bob: Phaser.Tweens.Tween | null;
};

/** Wandering horse NPC — single instance for now, lives in the
 *  grass plot in front of the village barn. State machine drives the
 *  full sprite sheet: idle in 4 cardinal facings, multi-directional
 *  walk (down/up/side), occasional gallop bursts, and a "look at the
 *  camera" alert pose. No proximity reaction; horses are placid. */
type HorseState = "idle" | "walk" | "gallop" | "alert";
type HorseFacing = "down" | "up" | "left" | "right";
type Horse = {
  sprite: Phaser.GameObjects.Sprite;
  state: HorseState;
  /** Cardinal facing direction. Drives idle frame + walk animation. */
  facing: HorseFacing;
  /** ms left until the horse transitions out of its current state. */
  timer: number;
  /** Velocity in world px/sec while moving (walk OR gallop). */
  vx: number;
  vy: number;
  /** World target we're heading toward while moving. */
  targetX: number;
  targetY: number;
  /** Anchor we drift back to so the horse doesn't roam across the
   *  whole map over time. */
  homeX: number;
  homeY: number;
  /** Movement speed in world px/sec. Walk = ~40, gallop = ~100. */
  speed: number;
  /** Idle bob tween. Paused during movement so the manual y-update
   *  isn't fought by the tween. */
  bob: Phaser.Tweens.Tween | null;
};

type ChatMessage = {
  sessionId: string;
  displayName: string;
  archetype: string;
  body: string;
  at: number;
};

/** A keypress-triggered action the player can take right now —
 *  surfaced by the Phaser scene whenever the player stands inside a
 *  trigger zone (any building door, interior exit). Consumed by the
 *  React HUD to render the on-screen action button. */
type WorldAction =
  | { kind: "enter-building"; buildingId: string; label: string }
  | { kind: "exit-building"; label: string }
  | { kind: "mount-horse"; label: string }
  | { kind: "dismount-horse"; label: string }
  | { kind: "talk-player"; sessionId: string; label: string }
  | null;

/** Which "room" the local player is currently rendered in. Village +
 *  one room per enterable building. */
type WorldLocation =
  | { kind: "village" }
  | { kind: "interior"; buildingId: string };

const VILLAGE: WorldLocation = { kind: "village" };

/** Convert a `WorldLocation` to the obstacle-module key. */
function obstacleKey(loc: WorldLocation): ObstacleLocation {
  return loc.kind === "village" ? "village" : `interior:${loc.buildingId}`;
}

/** Identity handed in by `/studio/world`. When present, joinOptions
 *  use these values; the server validates `token` via Supabase in
 *  WorldRoom.onAuth and the player shows up with their real name +
 *  XQ archetype. Public `/world` keeps working without props. */
export type WorldIdentity = {
  token?: string;
  displayName?: string;
  archetype?: string;
};

export default function WorldClient({
  identity,
  windowed = false,
}: {
  identity?: WorldIdentity;
  /** When true, the world renders inside its parent container instead
   *  of as a full-viewport fixed canvas. Used by /studio/world so the
   *  Studio header stays visible above the game. The CSS adds
   *  `transform: translateZ(0)` to the root so fixed HUD children
   *  (chat form, action button, character-card backdrop) become
   *  containing-block-relative to the windowed root instead of the
   *  viewport. */
  windowed?: boolean;
} = {}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  // Stash identity on a ref so the Phaser scene (which only runs the
  // outer useEffect once) can read the latest value at connect time
  // without re-running the effect on prop change.
  const identityRef = useRef<WorldIdentity | undefined>(identity);
  identityRef.current = identity;
  const gameRef = useRef<unknown>(null);
  /** Set inside the Phaser scene's create(). The HUD's chat form calls
   *  this on submit. */
  const sendChatRef = useRef<((body: string) => void) | null>(null);
  /** Set inside the Phaser scene's create(). The HUD's action button
   *  calls this when clicked; the scene resolves it to enter/exit. */
  const triggerActionRef = useRef<(() => void) | null>(null);
  const [chatDraft, setChatDraft] = useState("");
  const [action, setAction] = useState<WorldAction>(null);
  /** When non-null, the character-card overlay is open. The scene
   *  posts the data via setCardRef when `I` is pressed (own card)
   *  or when the player E's another character (chunk 2). */
  const [card, setCard] = useState<CharacterCardData | null>(null);
  const setCardRef = useRef<((c: CharacterCardData | null) => void) | null>(null);
  /** Tells the Phaser scene to suppress its keyboard handlers while
   *  the chat input is focused — otherwise E/O/W/A/S/D/M/R/T/C all
   *  trigger world actions instead of typing. */
  const setChatFocusRef = useRef<((focused: boolean) => void) | null>(null);
  /** Direct handle on the chat input — we blur it after Enter so the
   *  player can move again without an extra click. */
  const chatInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    if (gameRef.current) return;

    let destroyed = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      const Phaser = (await import("phaser")).default;
      if (destroyed || !hostRef.current) return;

      class WorldScene extends Phaser.Scene {
        client!: Client;
        room: Room | null = null;
        avatars = new Map<string, Phaser.GameObjects.Container>();
        targets = new Map<string, { x: number; y: number }>();
        ownSessionId: string | null = null;
        // Spawn just south of the plaza fountain — the village's
        // meeting place at the center of the map. World center is
        // tile (36, 48); the fountain sits there. Spawn at (36, 51)
        // drops the player ~3 tiles below it, facing the rest of
        // the plaza.
        ownPos = { x: 36, y: 51 };
        ownFacing: "down" | "up" | "left" | "right" = "down";
        ownArchetype = "X-S-L";
        lastSendAt = 0;

        statusText!: Phaser.GameObjects.Text;
        hintText!: Phaser.GameObjects.Text;
        /** Ambient chicken NPCs — client-only state, no server sync. */
        chickens: Chicken[] = [];
        /** Ambient horse NPC(s) — same client-only pattern as chickens. */
        horses: Horse[] = [];
        /** Horse the local player is currently riding. null when on
         *  foot. While mounted, the player's avatar tracks the
         *  horse position + movement is 2× speed and the horse's
         *  own FSM pauses. */
        mountedHorse: Horse | null = null;
        /** Grazing cows — proximity-flee FSM. */
        cows: Cow[] = [];
        /** Wandering dogs — short walk + pause FSM. */
        dogs: Dog[] = [];

        // === Room state ===
        /** Which room the local player is in. Drives backdrop swap,
         *  camera + movement bounds, and who's visible. */
        location: WorldLocation = VILLAGE;
        /** Village backdrop — hidden while the player is in an
         *  interior. */
        villageBg: Phaser.GameObjects.Image | null = null;
        /** GhostSignal statue at the town-square centerpiece. Hidden
         *  while the player is in an interior, same lifecycle as
         *  villageBg. */
        statue: Phaser.GameObjects.Image | null = null;
        /** One image per building interior, keyed by building id.
         *  Created at scene start, hidden until the player enters. */
        interiorBgs = new Map<string, Phaser.GameObjects.Image>();
        /** Floating "Press E" prompt above the local avatar — shown
         *  whenever an action is available. */
        pressPrompt: Phaser.GameObjects.Text | null = null;
        /** Whatever action is currently available to the player. The
         *  scene re-evaluates this every frame in `update()` and
         *  forwards it to the React HUD via `onAction`. */
        currentAction: WorldAction = null;
        /** React HUD callback for action prompt changes. Set by the
         *  parent component after the scene boots. */
        onAction: (next: WorldAction) => void = () => {};
        /** Focus the React chat input. Wired by the parent component
         *  after the scene boots; used by the Enter key handler so
         *  hitting Enter while the world has focus opens the chat box. */
        focusChat: () => void = () => {};
        /** Last full snapshot of the local player from the server.
         *  Captured each `state` broadcast so the character-card
         *  overlay can read displayName + archetype on demand. */
        lastSelfPlayer: ServerPlayer | null = null;
        /** Most recent full snapshot per session id — used to open
         *  the character card for OTHER players the local user walks
         *  up to. Updated every `state` broadcast. */
        playerSnapshots = new Map<string, ServerPlayer>();
        /** Open the inventory / own character card. Wired from React. */
        openOwnCard: () => void = () => {};
        /** Open the character card for another player. Wired from
         *  React; called from tryAction when a `talk-player` action
         *  is resolved. */
        openOtherCard: (sessionId: string) => void = () => {};
        /** Village-tile position to restore when the player exits the
         *  active building. Captured at the moment of entry. */
        villageReturnTile = { x: 0, y: 0 };

        keys!: {
          up: Phaser.Input.Keyboard.Key;
          down: Phaser.Input.Keyboard.Key;
          left: Phaser.Input.Keyboard.Key;
          right: Phaser.Input.Keyboard.Key;
          w: Phaser.Input.Keyboard.Key;
          a: Phaser.Input.Keyboard.Key;
          s: Phaser.Input.Keyboard.Key;
          d: Phaser.Input.Keyboard.Key;
          e: Phaser.Input.Keyboard.Key;
        };

        // === Background music ===
        /** "The Village" by Eric Matyas, looped at low volume. Pauses
         *  when muted rather than stopping so toggling unmute resumes
         *  in-place. */
        bgm: Phaser.Sound.BaseSound | null = null;
        bgmMuted = false;
        bgmVolume = 0.32;
        /** Small top-right indicator + click-to-toggle mute. */
        bgmIndicator: Phaser.GameObjects.Text | null = null;

        // === Weather ===
        weather: "clear" | "rain" | "snow" = "clear";
        /** ms epoch when the current weather event ends. 0 = clear. */
        weatherUntil = 0;
        /** ms epoch when we next roll the weather dice. */
        weatherNextRollAt = 0;
        /** Drifting clouds, always present. Each moves east; wraps
         *  back to the west when off-screen. */
        clouds: Array<{
          sprite: Phaser.GameObjects.Image;
          vx: number;
        }> = [];
        rainOverlay: Phaser.GameObjects.TileSprite | null = null;
        snowOverlay: Phaser.GameObjects.TileSprite | null = null;
        precipFrameIdx = 0;
        precipFrameTimer = 0;
        /** Top-right weather text. */
        weatherIndicator: Phaser.GameObjects.Text | null = null;

        // === Obstacle debug overlay ===
        /** Rect-fallback overlay (used for interiors). Mask-backed
         *  rooms get their own image overlay instead. Toggle with `O`. */
        obstacleDebugGfx: Phaser.GameObjects.Graphics | null = null;
        /** Tinted copy of village-collision.png sitting over the
         *  village backdrop. Toggled by `O`. */
        villageMaskOverlay: Phaser.GameObjects.Image | null = null;
        obstacleDebugVisible = false;

        constructor() {
          super("world");
        }

        preload() {
          // LPC universal walk-cycle: 9 frames × 4 directions, 64×64
          // each. Rows are up / left / down / right (LPC standard).
          this.load.spritesheet("lpc-walk", "/world/sprites/body-male/walk.png", {
            frameWidth: 64,
            frameHeight: 64,
          });
          // ArMM1998 Zelda-like overworld atlas (CC0). The whole atlas
          // ships as one PNG; we define named sub-frames at scene
          // create time so we can iterate coords in JS without
          // re-extracting individual PNGs.
          this.load.image("armm", "/world/sprites/pipoya/overworld-armm.png");
          // SNES Harvest Moon village map — used as a background
          // landmark while we iterate on the world art direction.
          this.load.image(
            "hm-village",
            "/world/sprites/SNES - Harvest Moon - Backgrounds - Village (Summer).png",
          );
          // Pixel-perfect collision mask painted over the village
          // (same 768 × 1024 dims). Opaque pixels = blocked. Decoded
          // into a Uint8Array in create() and registered as the
          // village obstacle source.
          this.load.image(
            "village-collision",
            "/world/sprites/village-collision.png",
          );
          // GhostSignal statue — town-square centerpiece. Native
          // 600×513 stone figure holding the GhostSignal logo plaque.
          this.load.image("gs-statue", "/world/sprites/statue.png");
          // Harvest Moon chicken sheet — mature + baby chick poses.
          this.load.image(
            "hm-chickens",
            "/world/sprites/SNES - Harvest Moon - Animals - Chicken.png",
          );
          // Harvest Moon horse sheet — 344×224, rows of front / back /
          // side / baby poses. We use row 3 (side view) for the
          // wandering horse: 8 cells at 43-px pitch, native cell
          // ~43×37 starting at y=78. Frame 0 is idle; 1–4 are the
          // walk cycle; 5–7 are gallop poses we don't use yet.
          this.load.image(
            "hm-horse",
            "/world/sprites/SNES - Harvest Moon - Animals - Horse.png",
          );
          // Harvest Moon cow sheet — 414×627, ~17 rows of cow poses
          // at varying pitches. For the MVP we only use one frame:
          // band 0 cell 0, a side-on grazing cow at 30 × 25 native.
          this.load.image(
            "hm-cow",
            "/world/sprites/SNES - Harvest Moon - Animals - Cow.png",
          );
          // Harvest Moon Kero (dog) sheet — 413×141, 5 rows of dog
          // poses at 30-px pitch. Single idle frame used for the MVP
          // guard-dog near the Town Hall door.
          this.load.image(
            "hm-dog",
            "/world/sprites/SNES - Harvest Moon - Animals - Kero _ Dog.png",
          );
          // Interior backdrops for every building in the registry that
          // already has its PNG provided. Buildings without an
          // interior block silently skip preload (their door triggers
          // will still fire; pressing E reports "coming soon").
          this.load.image(
            "hm-church-interior",
            "/world/sprites/SNES - Harvest Moon - Backgrounds - Church.png",
          );
          this.load.image(
            "tiny-home-interior",
            "/world/sprites/toprighthouse.png",
          );
          this.load.image("inn-interior", "/world/sprites/theinn.png");
          this.load.image(
            "shed-interior",
            "/world/sprites/SNES - Harvest Moon - Backgrounds - Tool Shed.png",
          );
          this.load.image("smith-interior", "/world/sprites/smith.png");
          this.load.image(
            "general-store-interior",
            "/world/sprites/housenexcttotheinn.png",
          );
          this.load.image("town-hall-interior", "/world/sprites/townhall.png");
          this.load.image("stable-interior", "/world/sprites/stable.png");

          // Background music — "The Village" by Eric Matyas
          // (soundimage.org), royalty-free with attribution.
          this.load.audio("bgm-village", "/world/audio/the-village-loop.ogg");

          // Weather sheets — 256-wide HM rips.
          // Clouds: 256×512 single sheet with 3 cloud shapes at
          // different y positions. Registered as sub-frames for drift.
          this.load.image(
            "hm-clouds",
            "/world/sprites/SNES - Harvest Moon - Miscellaneous - Summer Clouds.png",
          );
          // Rain + snow: 256×1538 = 3 frames × 512 tall (with 1px
          // dividers between). Cycle through frames at ~6 fps and
          // tile across the viewport for endless precipitation.
          this.load.image(
            "hm-rain",
            "/world/sprites/SNES - Harvest Moon - Miscellaneous - Rain.png",
          );
          this.load.image(
            "hm-snow",
            "/world/sprites/SNES - Harvest Moon - Miscellaneous - Snow.png",
          );
        }

        create() {
          this.cameras.main.setBackgroundColor("#0b0f12");

          const worldW = WORLD_W_TILES * TILE;
          const worldH = WORLD_H_TILES * TILE;

          // Register chicken-sheet frames (mature hen + baby chick).
          this.registerHarvestMoonFrames();

          // === Harvest Moon village background ===
          // Filled to the exact world bounds — no cropping. The world
          // dimensions (72 × 96 tiles = 2304 × 3072 px) are 3 × the
          // native map size (768 × 1024 px), so the map fits perfectly
          // pixel-aligned at scale 3.
          const village = this.add.image(0, 0, "hm-village");
          village.setOrigin(0, 0);
          village.setScale(VILLAGE_SCALE);
          village.setDepth(-10);
          this.villageBg = village;

          // === GhostSignal statue ===
          // Town-square centerpiece. The village backdrop has a
          // grassy circle at its exact center; the statue sits there
          // with its base anchored to that point (origin 0.5, 1.0).
          // Scale 0.5 sizes it ~3-4 character-heights tall — big
          // enough to read as a landmark, small enough not to block
          // half the plaza. Depth between backdrop (-10) and avatars
          // (+10) so players render in front of it as they walk past.
          // The village backdrop's grassy plaza isn't at the literal
          // mathematical map center — it's offset west. Nudge the
          // statue accordingly so it lands on the plaza disc.
          const STATUE_CX = (WORLD_W_TILES * TILE) / 2 - 300; // 852
          const STATUE_CY = (WORLD_H_TILES * TILE) / 2; // 1536
          const statue = this.add.image(STATUE_CX, STATUE_CY, "gs-statue");
          statue.setOrigin(0.5, 1);
          statue.setScale(0.5);
          statue.setDepth(5);
          this.statue = statue;

          // === Village collision mask ===
          // Decode the painted PNG into a flat alpha array and hand it
          // off to the obstacle module. After this runs, every
          // isBlocked()/resolveMove() call for the village hits the
          // mask, not the (empty) rect fallback.
          this.decodeAndRegisterVillageMask();
          // Add the same image as a tinted, hidden overlay used by the
          // `O` debug toggle. Cheaper and more accurate than re-drawing
          // rects with Graphics.
          const maskOverlay = this.add.image(0, 0, "village-collision");
          maskOverlay.setOrigin(0, 0);
          maskOverlay.setScale(VILLAGE_SCALE);
          maskOverlay.setDepth(9999);
          maskOverlay.setAlpha(0.42);
          maskOverlay.setTint(0xff2a2a);
          maskOverlay.setVisible(false);
          this.villageMaskOverlay = maskOverlay;

          // === Harvest Moon chickens ===
          // Mature hen + baby chick near the world spawn point. Each
          // runs its own idle → scared → wander state machine
          // (see updateChickens) so they react when a player gets close.
          // Chickens are now positioned in front of the church (door
          // at native 368, 140 → world 1104, 420). Player spawn is
          // here too, so they're the first NPCs you see.
          this.chickens.push(
            this.spawnChicken({
              x: 1070,
              y: 540,
              idleFrame: "hen",
              walkFrames: ["hen-walk1", "hen-walk2"],
              triggerRadius: 110,
              speed: 180,
              bobAmp: 4,
              bobMs: 900,
            }),
          );
          this.chickens.push(
            this.spawnChicken({
              x: 1130,
              y: 570,
              idleFrame: "chick",
              walkFrames: ["chick", "chick-walk"],
              triggerRadius: 80,
              speed: 140,
              bobAmp: 3,
              bobMs: 700,
            }),
          );

          // === Horse animations — one per facing + gallop + alert ===
          // 6 fps for walk reads as a slow plodding stroll matched to
          // the 40 px/s movement speed. Down + up walks have 8 frames
          // each (full sheet rows); side has the 4 dedicated walk
          // frames (1-4 of row 3, 0 is idle, 5-7 are gallop).
          this.anims.create({
            key: "horse-walk-down",
            frames: Array.from({ length: 8 }, (_, i) => ({
              key: "hm-horse",
              frame: `horse-d${i}`,
            })),
            frameRate: 6,
            repeat: -1,
          });
          this.anims.create({
            key: "horse-walk-up",
            frames: Array.from({ length: 8 }, (_, i) => ({
              key: "hm-horse",
              frame: `horse-u${i}`,
            })),
            frameRate: 6,
            repeat: -1,
          });
          this.anims.create({
            key: "horse-walk-side",
            frames: [
              { key: "hm-horse", frame: "horse-s1" },
              { key: "hm-horse", frame: "horse-s2" },
              { key: "hm-horse", frame: "horse-s3" },
              { key: "hm-horse", frame: "horse-s4" },
            ],
            frameRate: 6,
            repeat: -1,
          });
          // Gallop — only side view exists for this. Faster fps + 3
          // distinct stride frames + back to first for a tight loop.
          this.anims.create({
            key: "horse-gallop-side",
            frames: [
              { key: "hm-horse", frame: "horse-s5" },
              { key: "hm-horse", frame: "horse-s6" },
              { key: "hm-horse", frame: "horse-s7" },
              { key: "hm-horse", frame: "horse-s6" },
            ],
            frameRate: 10,
            repeat: -1,
          });
          // Alert / "looking at you" — slow 2-frame bob between the
          // two head-turn poses from row 4. Played briefly during
          // idle as a sign-of-life touch.
          this.anims.create({
            key: "horse-alert",
            frames: [
              { key: "hm-horse", frame: "horse-r3" },
              { key: "hm-horse", frame: "horse-r4" },
            ],
            frameRate: 2.5,
            repeat: -1,
          });

          // === Wandering horse ===
          // Lives in the grass plot in front of the village barn
          // (native village ~620, 570 → world ~1860, 1710). One
          // instance; idles most of the time, takes a short stroll
          // every few seconds, then settles again.
          this.horses.push(
            this.spawnHorse({
              x: 1860,
              y: 1710,
              speed: 40, // px/sec — placid stroll
              wanderRadius: 110,
            }),
          );

          // Register a single cow frame — band 0 cell 0 of the sheet.
          // Stationary grazers; we don't need the walk cycle yet.
          this.textures.get("hm-cow").add("cow-idle", 0, 0, 0, 30, 25);

          // Two cows out by the Stable (bottom-right of the village,
          // door at native ~600, 875 → world 1800, 2625). Anchors
          // sit in the open grass south + west of the building; the
          // spawn nudger will move them out of any blocker.
          // 7 cows in the fenced pasture around the Stable (bottom-
          // right of the village, door at native 600, 875 → world
          // 1800, 2625). nudgeToFree moves any that land inside a
          // fence or the building.
          this.spawnCow(1700, 2700);
          this.spawnCow(1880, 2760);
          this.spawnCow(1740, 2780);
          this.spawnCow(1820, 2820);
          this.spawnCow(1680, 2680);
          this.spawnCow(1940, 2710);
          this.spawnCow(1860, 2880);

          // Dog sheet — 413 × 141, 5 rows. Cells per row vary in
          // pitch (row 1 = 26-px, others = 30-px). User-mapped poses:
          //   Row 0 (y=0,  h=24): cells 0-5 jump-play, 6-13 stand-idle
          //   Row 1 (y=30, h=22, 26-px pitch): 0 bark, 1-2 scratch,
          //     3-4 pee (skip), 5-7 walk-down, 8-13 face-left-idle
          //   Row 2 (y=59, h=24): 0-1 sit-idle, 2-3 sound, 4 sit-bone
          //   Row 3 (y=88, h=24): 0-3 walk-up, 11-13 jump-back (skip)
          //   Row 4 (y=119,h=22): 0-2 roll, 6-9 sleep
          const dogTex = this.textures.get("hm-dog");
          const dadd = (name: string, x: number, y: number, w = 30, h = 24) =>
            dogTex.add(name, 0, x, y, w, h);

          // Walk cycles (one per cardinal facing).
          dadd("dog-walk-down-0", 130, 30, 26, 22);
          dadd("dog-walk-down-1", 156, 30, 26, 22);
          dadd("dog-walk-down-2", 182, 30, 26, 22);
          dadd("dog-walk-up-0", 0, 88);
          dadd("dog-walk-up-1", 30, 88);
          dadd("dog-walk-up-2", 60, 88);
          dadd("dog-walk-up-3", 90, 88);
          // Side-view cycle from row 1 "facing left, looking around"
          // cells (8-11). Faces LEFT natively; flipX for right.
          dadd("dog-walk-side-0", 208, 30, 26, 22);
          dadd("dog-walk-side-1", 234, 30, 26, 22);
          dadd("dog-walk-side-2", 260, 30, 26, 22);
          dadd("dog-walk-side-3", 286, 30, 26, 22);

          // Stand-idle (front view) — slow bob through 8 frames.
          for (let i = 0; i < 8; i++) dadd(`dog-stand-${i}`, 180 + i * 30, 0);
          // Sit-idle — 2 frames cycled slowly.
          dadd("dog-sit-0", 0, 59);
          dadd("dog-sit-1", 30, 59);
          // Scratch — 2 frames brisk.
          dadd("dog-scratch-0", 26, 30, 26, 22);
          dadd("dog-scratch-1", 52, 30, 26, 22);
          // Bark — single frame held for a beat.
          dadd("dog-bark", 0, 30, 26, 22);
          // Jump-play — 6 frames quick.
          for (let i = 0; i < 6; i++) dadd(`dog-jump-${i}`, i * 30, 0);
          // Sleep — 4 frames very slow.
          for (let i = 0; i < 4; i++) dadd(`dog-sleep-${i}`, 180 + i * 30, 119, 30, 22);
          // Static fallback idle = first stand frame.
          dadd("dog-idle", 180, 0);

          const dogAnim = (
            key: string,
            frames: string[],
            frameRate: number,
            repeat = -1,
          ) =>
            this.anims.create({
              key,
              frames: frames.map((f) => ({ key: "hm-dog", frame: f })),
              frameRate,
              repeat,
            });
          dogAnim("dog-walk-down", ["dog-walk-down-0", "dog-walk-down-1", "dog-walk-down-2"], 6);
          dogAnim("dog-walk-up", ["dog-walk-up-0", "dog-walk-up-1", "dog-walk-up-2", "dog-walk-up-3"], 6);
          dogAnim("dog-walk-side", ["dog-walk-side-0", "dog-walk-side-1", "dog-walk-side-2", "dog-walk-side-3"], 6);
          dogAnim(
            "dog-stand",
            ["dog-stand-0", "dog-stand-1", "dog-stand-2", "dog-stand-3", "dog-stand-4", "dog-stand-5", "dog-stand-6", "dog-stand-7"],
            3,
          );
          dogAnim("dog-sit", ["dog-sit-0", "dog-sit-1"], 1.5);
          dogAnim("dog-scratch", ["dog-scratch-0", "dog-scratch-1"], 6);
          dogAnim("dog-jump", ["dog-jump-0", "dog-jump-1", "dog-jump-2", "dog-jump-3", "dog-jump-4", "dog-jump-5"], 8);
          dogAnim("dog-sleep", ["dog-sleep-0", "dog-sleep-1", "dog-sleep-2", "dog-sleep-3"], 1.5);
          // Dog in front of the Tiny Home (top-right, door at native
          // 600, 219 → world 1800, 657). Just south of the door so
          // the player can see them as they approach.
          this.spawnDog(1820, 730);

          // Soft world-border vignette so the camera bounds don't read
          // as a hard wall — a dark frame around the playable area.
          const vG = this.add.graphics();
          vG.lineStyle(8, 0x0b0f12, 0.7);
          vG.strokeRect(-4, -4, worldW + 8, worldH + 8);
          vG.setDepth(-8);

          this.cameras.main.setBounds(0, 0, worldW, worldH);
          this.cameras.main.centerOn(worldW / 2, worldH / 2);

          // === Background music ===
          // Restore prior mute/volume from localStorage, then start
          // the loop. Phaser's SoundManager defers the actual playback
          // until the first user gesture if the browser blocks
          // autoplay — no special handling needed here.
          try {
            const v = window.localStorage.getItem("world.bgm.volume");
            if (v !== null) {
              const parsed = Number(v);
              if (!Number.isNaN(parsed)) this.bgmVolume = parsed;
            }
            this.bgmMuted =
              window.localStorage.getItem("world.bgm.muted") === "1";
          } catch {
            // ignore
          }
          this.bgm = this.sound.add("bgm-village", {
            loop: true,
            volume: this.bgmMuted ? 0 : this.bgmVolume,
          });
          this.bgm.play();

          // Top-right mute indicator — click or M to toggle.
          this.bgmIndicator = this.add
            .text(this.scale.width - 18, 14, this.bgmMuted ? "🔇" : "🔊", {
              fontFamily: "Inter, ui-monospace, monospace",
              fontSize: "14px",
              color: "#9aa0a8",
            })
            .setScrollFactor(0)
            .setOrigin(1, 0)
            .setDepth(1000)
            .setInteractive({ useHandCursor: true });
          this.bgmIndicator.on("pointerdown", () => this.toggleBgmMute());
          this.scale.on("resize", () => {
            this.bgmIndicator?.setX(this.scale.width - 18);
          });
          const mKey = this.input.keyboard!.addKey(
            Phaser.Input.Keyboard.KeyCodes.M,
            false,
          );
          mKey.on("down", () => this.toggleBgmMute());

          // === Weather setup ===
          this.setupWeather();

          // LPC walk animations — 9 frames per direction, 10 fps.
          // Row layout: 0=up, 1=left, 2=down, 3=right (9 frames each).
          const rows: Array<["up" | "left" | "down" | "right", number]> = [
            ["up", 0],
            ["left", 1],
            ["down", 2],
            ["right", 3],
          ];
          for (const [dir, row] of rows) {
            const startFrame = row * 9 + 1; // skip frame 0 (idle pose)
            this.anims.create({
              key: `walk-${dir}`,
              frames: this.anims.generateFrameNumbers("lpc-walk", {
                start: startFrame,
                end: startFrame + 7,
              }),
              frameRate: 10,
              repeat: -1,
            });
            this.anims.create({
              key: `idle-${dir}`,
              frames: [{ key: "lpc-walk", frame: row * 9 }],
              frameRate: 1,
              repeat: 0,
            });
          }

          this.statusText = this.add
            .text(16, 14, "Connecting…", {
              fontFamily: "Inter, ui-monospace, monospace",
              fontSize: "12px",
              color: "#9aa0a8",
            })
            .setScrollFactor(0)
            .setDepth(1000);
          this.hintText = this.add
            .text(16, this.scale.height - 28, "WASD / arrows to move · M: mute", {
              fontFamily: "Inter, ui-monospace, monospace",
              fontSize: "11px",
              color: "#6b727b",
            })
            .setScrollFactor(0)
            .setDepth(1000);
          this.scale.on("resize", () => {
            this.hintText.setY(this.scale.height - 28);
          });

          const kb = this.input.keyboard!;
          // IMPORTANT: pass `enableCapture = false` (second arg) to
          // every addKey() call. The default `true` makes Phaser call
          // `preventDefault()` at the window level on those keys —
          // which silently steals them from focused text inputs (the
          // chat box can't type E/W/A/S/D/O/M/R/T/C otherwise). With
          // capture off, key events still flow to Phaser's Key
          // objects normally but propagate to inputs as well.
          this.keys = {
            up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP, false),
            down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN, false),
            left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT, false),
            right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT, false),
            w: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W, false),
            a: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A, false),
            s: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S, false),
            d: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D, false),
            e: kb.addKey(Phaser.Input.Keyboard.KeyCodes.E, false),
          };
          // Single-shot E handler (keyDown event, not held). The
          // per-frame check in update() can't use .isDown alone —
          // that'd re-trigger on every frame the player holds E.
          this.keys.e.on("down", () => this.tryAction());

          // Enter while the world has focus → open the chat input.
          // When the chat input is already focused, keyboard.enabled
          // is false (set by the chat focus handler) so this fires
          // only when we're "in the world."
          const enterKey = kb.addKey(
            Phaser.Input.Keyboard.KeyCodes.ENTER,
            false,
          );
          enterKey.on("down", () => this.focusChat());

          // Inventory / own character card — press I to toggle.
          const iKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.I, false);
          iKey.on("down", () => this.openOwnCard());

          // Obstacle debug overlay — O toggles red rects on top of
          // every blocker in the current room. Used while authoring
          // village obstacles in Phase 1c.
          const oKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.O, false);
          oKey.on("down", () => this.toggleObstacleDebug());
          if (typeof window !== "undefined") {
            try {
              if (window.localStorage.getItem("world.debug.obstacles") === "1") {
                this.obstacleDebugVisible = true;
              }
            } catch {
              // localStorage can throw in some embedded contexts; ignore.
            }
          }

          // === Building interior backdrops ===
          // One hidden image per building that has an interior PNG
          // wired in. enterBuilding() flips visibility on/off.
          for (const b of BUILDINGS) {
            if (!b.interior) continue;
            if (!this.textures.exists(b.interior.texKey)) continue;
            const bg = this.add.image(
              b.interior.worldX,
              b.interior.worldY,
              b.interior.texKey,
            );
            bg.setOrigin(0, 0);
            bg.setScale(b.interior.scale);
            bg.setDepth(-10);
            bg.setVisible(false);
            this.interiorBgs.set(b.id, bg);
          }

          // First obstacle-overlay paint after the scene is set up.
          this.drawObstacleDebug();

          // Floating "Press E" prompt that hovers above the local
          // avatar whenever an action is in range. Camera-space; we
          // move it manually each frame in updatePrompt().
          this.pressPrompt = this.add
            .text(0, 0, "Press E", {
              fontFamily: "Inter, ui-monospace, monospace",
              fontSize: "12px",
              color: "#ffffff",
              backgroundColor: "rgba(11, 15, 18, 0.82)",
              padding: { x: 8, y: 4 },
              stroke: "#0b0f12",
              strokeThickness: 2,
            })
            .setOrigin(0.5, 1)
            .setDepth(1000)
            .setVisible(false);

          this.connect();
        }

        async connect() {
          this.client = new Client(SERVER_URL);
          try {
            // Identity comes from /studio/world via identityRef. Public
            // /world keeps the random-Guest path so passers-by can
            // still wander in. The server (re-)validates `token` in
            // WorldRoom.onAuth — what we put here is only a hint.
            const ident = identityRef.current;
            // No XQ identity → neutral gray character (per "if no XQ/RQ
            // filled out, give them a standard gray figure"). The
            // server enforces the same default in its onAuth fallback.
            const archetype = ident?.archetype ?? NEUTRAL_ARCHETYPE;
            const displayName =
              ident?.displayName?.trim() ||
              `Guest-${Math.floor(Math.random() * 9999)
                .toString()
                .padStart(4, "0")}`;
            const joinOptions: {
              archetype: string;
              displayName: string;
              token?: string;
            } = { archetype, displayName };
            if (ident?.token) joinOptions.token = ident.token;
            // 8s timeout race surfaces a stuck WebSocket upgrade as an
            // error in the HUD instead of an infinite "Connecting…".
            const room = await Promise.race([
              this.client.joinOrCreate("world", joinOptions),
              new Promise<never>((_, reject) =>
                setTimeout(
                  () =>
                    reject(
                      new Error(
                        "joinOrCreate timeout — WebSocket upgrade blocked",
                      ),
                    ),
                  8000,
                ),
              ),
            ]);
            const joined = room as Room;
            this.room = joined;
            this.ownSessionId = joined.sessionId;
            this.ownArchetype = archetype;
            this.statusText.setText(
              `Connected · ${joined.sessionId.slice(0, 6)} · ${archetype} · waiting…`,
            );
            joined.onMessage("state", (msg: StateMessage) => {
              this.applySnapshot(msg.players);
            });
            joined.onMessage("chat", (msg: ChatMessage) => {
              this.spawnBubble(msg);
            });
          } catch (err) {
            console.error("[WorldScene] join failed", err);
            this.statusText.setText(
              `Game server unreachable — start apps/game-server (npm run dev). ${
                err instanceof Error ? err.message : ""
              }`,
            );
            this.statusText.setColor("#d66157");
          }
        }

        applySnapshot(players: ServerPlayer[]) {
          const seen = new Set<string>();
          for (const player of players) {
            seen.add(player.sessionId);
            // Cache the local player's most recent snapshot so the
            // character-card overlay can read displayName + archetype
            // without a separate roundtrip.
            if (player.sessionId === this.ownSessionId) {
              this.lastSelfPlayer = player;
            }
            this.playerSnapshots.set(player.sessionId, player);
            if (!this.avatars.has(player.sessionId)) {
              this.spawnAvatar(player);
            } else if (player.sessionId !== this.ownSessionId) {
              this.targets.set(player.sessionId, { x: player.x, y: player.y });
              this.applyFacing(
                this.avatars.get(player.sessionId)!,
                player.facing,
                player.moving,
              );
            }
          }
          this.avatars.forEach((avatar, sessionId) => {
            if (!seen.has(sessionId)) {
              avatar.destroy();
              this.avatars.delete(sessionId);
              this.targets.delete(sessionId);
            }
          });
          this.statusText.setText(
            `Connected · ${(this.ownSessionId ?? "").slice(0, 6)} · ${this.ownArchetype} · players ${this.avatars.size}`,
          );
        }

        spawnAvatar(player: ServerPlayer) {
          const color = ARCHETYPE_COLOR[player.archetype] ?? 0xffffff;
          const isOwn = player.sessionId === this.ownSessionId;
          const container = this.add.container(player.x * TILE, player.y * TILE);

          // Halo behind, drop shadow exactly under the feet, LPC sprite
          // lifted so its feet line up with the shadow.
          // LPC frames put the feet at y=56 inside a 64-tall cell. With
          // the sprite center at y=-24 (and origin 0.5/0.5), the feet
          // land at container y=0 — same point the server reports as
          // the tile position. Shadow sits there too.
          //
          // Halo center sits at the character's belly height and the
          // radius is big enough to fully encompass the head AND the
          // shadow, so the character reads as a single glowing figure.
          const SPRITE_Y = -24;
          const halo = this.add.ellipse(0, -22, 56, 76, color, 0.22);
          const shadow = this.add.ellipse(0, 2, 36, 10, 0x000000, 0.5);

          const sprite = this.add.sprite(0, SPRITE_Y, "lpc-walk", 18);
          sprite.setOrigin(0.5, 0.5);
          sprite.setTint(color);
          const glow = this.add.sprite(0, SPRITE_Y, "lpc-walk", 18);
          glow.setOrigin(0.5, 0.5);
          glow.setTintFill(color);
          glow.setAlpha(0.32);
          glow.setBlendMode(Phaser.BlendModes.ADD);
          // YOU avatars get a brighter ring and bolder label.
          if (isOwn) {
            halo.setFillStyle(color, 0.32);
          }
          const label = this.add.text(
            0,
            -78,
            isOwn ? `YOU · ${player.displayName}` : player.displayName,
            {
              fontFamily: "Inter, sans-serif",
              fontSize: isOwn ? "12px" : "11px",
              fontStyle: isOwn ? "700" : "500",
              color: isOwn ? "#ffffff" : "#e0e3e8",
              stroke: "#0b0f12",
              strokeThickness: 3,
            },
          );
          label.setOrigin(0.5, 1);

          // Archetype identity badge — oversized so the archetype
          // logo reads as the character's head. Sits just above the
          // LPC sprite (whose top edge is around y=-56) so the badge
          // visually replaces the body's actual head. The YOU/name
          // label sits above the badge.
          const badge = this.buildBadge(player.archetype, color);
          badge.setPosition(0, -48);

          // Order: halo (back), shadow (under feet), sprite, glow
          // overlay, label, badge (front). The glow must sit
          // immediately above the sprite for the ADD blend to
          // multiply against the body, not the label or badge.
          container.add([halo, shadow, sprite, glow, label, badge]);
          container.setDepth(10);
          this.avatars.set(player.sessionId, container);
          this.targets.set(player.sessionId, { x: player.x, y: player.y });
          container.setData("facing", player.facing);
          container.setData("moving", player.moving);
          this.applyFacing(container, player.facing, player.moving);

          // Halo pulse — gentle alpha breathing on all avatars.
          this.tweens.add({
            targets: halo,
            alpha: { from: isOwn ? 0.28 : 0.18, to: isOwn ? 0.45 : 0.32 },
            duration: 1800,
            ease: "Sine.inOut",
            yoyo: true,
            repeat: -1,
          });
          // Subtle sprite Y-bob when idle gives the world a heartbeat.
          // We tween the sprite + glow overlay together so they stay
          // in lockstep visually.
          this.tweens.add({
            targets: [sprite, glow],
            y: { from: SPRITE_Y, to: SPRITE_Y - 2 },
            duration: 1400,
            ease: "Sine.inOut",
            yoyo: true,
            repeat: -1,
          });

          if (isOwn) {
            this.cameras.main.centerOn(player.x * TILE, player.y * TILE);
            this.cameras.main.startFollow(container, true, 0.2, 0.2);
            this.ownPos = { x: player.x, y: player.y };
          }
        }

        /** Set the sprite + glow overlay to the correct walk/idle
         *  animation for the given facing direction. Both sprites
         *  share the same animation key so frames stay in sync. */
        applyFacing(
          container: Phaser.GameObjects.Container,
          facing: string,
          moving: boolean,
        ) {
          // Container children: [halo, shadow, sprite, glow, label, badge]
          const sprite = container.list[2] as
            | Phaser.GameObjects.Sprite
            | undefined;
          const glow = container.list[3] as
            | Phaser.GameObjects.Sprite
            | undefined;
          if (!sprite || !glow) return;
          const dir =
            facing === "up" || facing === "left" || facing === "right"
              ? facing
              : "down";
          const key = `${moving ? "walk" : "idle"}-${dir}`;
          if (sprite.anims.currentAnim?.key !== key) {
            sprite.anims.play(key, true);
            glow.anims.play(key, true);
          }
          container.setData("facing", dir);
          container.setData("moving", moving);
        }

        update(_time: number, deltaMs: number) {
          if (!this.room || !this.ownSessionId) return;
          const dt = deltaMs / 1000;

          // Ambient chickens — proximity-scared, run-away, resettle.
          // Only roam in the village; hidden + frozen indoors.
          if (this.location.kind === "village") {
            this.updateChickens(dt);
            this.updateHorses(dt);
            this.updateCows(dt);
            this.updateDogs(dt);
          }
          this.updateWeather(dt);

          // Local input → predicted position
          let vx = 0;
          let vy = 0;
          if (this.keys.left.isDown || this.keys.a.isDown) vx -= 1;
          if (this.keys.right.isDown || this.keys.d.isDown) vx += 1;
          if (this.keys.up.isDown || this.keys.w.isDown) vy -= 1;
          if (this.keys.down.isDown || this.keys.s.isDown) vy += 1;
          const moving = vx !== 0 || vy !== 0;
          // Per-location movement bounds (tile coords). Interior
          // bounds keep the player inside the church PNG with a
          // small wall buffer; village uses the full world.
          const bounds = this.movementBoundsTiles();
          if (moving) {
            const len = Math.hypot(vx, vy);
            vx /= len;
            vy /= len;
            // Two-stage clamp: first slide against obstacles (so the
            // player wall-slides along house edges/fences), then
            // box-clamp to the room's outer bounds.
            // 2× speed while mounted on the horse — "doubling my
            // movement speed on the map" per the feature spec.
            const speed = this.mountedHorse ? SPEED * 2 : SPEED;
            const proposedX = this.ownPos.x + vx * speed * dt;
            const proposedY = this.ownPos.y + vy * speed * dt;
            const resolved = resolveMove(
              this.ownPos.x * TILE,
              this.ownPos.y * TILE,
              proposedX * TILE,
              proposedY * TILE,
              obstacleKey(this.location),
            );
            // Animal-blocking: if the resolved point sits inside an
            // NPC body circle, fall back to axis-separated movement
            // so the player slides past instead of phasing through.
            // Skipped while mounted — the rider IS inside the horse's
            // foot circle by definition, so it'd lock movement.
            let nx = resolved.x;
            let ny = resolved.y;
            if (
              this.location.kind === "village" &&
              !this.mountedHorse &&
              this.isInAnyAnimal(nx, ny)
            ) {
              const fromX = this.ownPos.x * TILE;
              const fromY = this.ownPos.y * TILE;
              if (!this.isInAnyAnimal(resolved.x, fromY)) {
                ny = fromY;
              } else if (!this.isInAnyAnimal(fromX, resolved.y)) {
                nx = fromX;
              } else {
                nx = fromX;
                ny = fromY;
              }
            }
            this.ownPos.x = clamp(nx / TILE, bounds.minX, bounds.maxX);
            this.ownPos.y = clamp(ny / TILE, bounds.minY, bounds.maxY);
            if (Math.abs(vx) > Math.abs(vy)) {
              this.ownFacing = vx > 0 ? "right" : "left";
            } else {
              this.ownFacing = vy > 0 ? "down" : "up";
            }
            const ownAvatar = this.avatars.get(this.ownSessionId);
            if (ownAvatar) {
              ownAvatar.x = this.ownPos.x * TILE;
              // While mounted, the rider sprite sits on the horse's
              // back — visually offset upward by ~26 px so feet rest
              // on the saddle instead of the ground.
              ownAvatar.y = this.ownPos.y * TILE - (this.mountedHorse ? 26 : 0);
              this.applyFacing(ownAvatar, this.ownFacing, true);
            }
            // Drag the horse along with the rider so it stays under
            // the player avatar. Anim chosen by velocity facing.
            if (this.mountedHorse) {
              const h = this.mountedHorse;
              h.sprite.x = this.ownPos.x * TILE;
              h.sprite.y = this.ownPos.y * TILE;
              h.vx = vx * SPEED * 2;
              h.vy = vy * SPEED * 2;
              h.facing = this.horseFacingFromVelocity(h.vx, h.vy);
              this.applyHorseMovingAnim(h);
            }
          } else {
            // Stopped moving — switch own avatar to idle in current facing.
            const ownAvatar = this.avatars.get(this.ownSessionId);
            if (ownAvatar) this.applyFacing(ownAvatar, this.ownFacing, false);
            // Mounted + idle → horse stops too.
            if (this.mountedHorse) {
              this.mountedHorse.sprite.anims.stop();
              this.applyHorseIdleFrame(this.mountedHorse);
            }
          }

          const now = performance.now();
          if (now - this.lastSendAt >= SEND_INTERVAL_MS) {
            this.lastSendAt = now;
            this.room.send("move", {
              x: this.ownPos.x,
              y: this.ownPos.y,
              facing: this.ownFacing,
              moving,
            });
          }

          this.avatars.forEach((avatar, sessionId) => {
            if (sessionId === this.ownSessionId) return;
            const target = this.targets.get(sessionId);
            if (!target) return;
            const tx = target.x * TILE;
            const ty = target.y * TILE;
            avatar.x += (tx - avatar.x) * Math.min(1, dt * 12);
            avatar.y += (ty - avatar.y) * Math.min(1, dt * 12);
          });

          // Action prompts (E to enter / exit). Re-evaluated every
          // frame so they pop on/off as the player walks in and out
          // of trigger zones.
          this.updateActionPrompt();
        }

        setupWeather() {
          // Register cloud sub-frames (3 distinct shapes on one sheet).
          const c = this.textures.get("hm-clouds");
          c.add("cloud-sm", 0, 8, 18, 106, 60);
          c.add("cloud-md", 0, 104, 152, 128, 75);
          c.add("cloud-lg", 0, 5, 328, 163, 87);

          // Register rain + snow frames (3 frames each, 256×512 each
          // with 1-px dividers between).
          const r = this.textures.get("hm-rain");
          r.add("rain-0", 0, 0, 0, 256, 512);
          r.add("rain-1", 0, 0, 513, 256, 512);
          r.add("rain-2", 0, 0, 1026, 256, 512);
          const s = this.textures.get("hm-snow");
          s.add("snow-0", 0, 0, 0, 256, 512);
          s.add("snow-1", 0, 0, 513, 256, 512);
          s.add("snow-2", 0, 0, 1026, 256, 512);

          // Spawn 5 drifting clouds at random world positions + speeds.
          const worldW = WORLD_W_TILES * TILE;
          const worldH = WORLD_H_TILES * TILE;
          const cloudFrames = ["cloud-sm", "cloud-md", "cloud-lg"];
          for (let i = 0; i < 5; i++) {
            const frame = cloudFrames[i % cloudFrames.length];
            const sprite = this.add.image(
              Math.random() * worldW,
              Math.random() * (worldH * 0.6), // stay in the top 60% of world
              "hm-clouds",
              frame,
            );
            sprite.setOrigin(0.5, 0.5);
            sprite.setScale(VILLAGE_SCALE);
            sprite.setDepth(50); // above ground, below HUD
            sprite.setAlpha(0.45); // gentle, painted-cloud feel
            this.clouds.push({
              sprite,
              vx: 8 + Math.random() * 14, // 8–22 world px/sec
            });
          }

          // Full-viewport rain + snow TileSprites, hidden initially.
          // Use the camera-space origin so they don't scroll with the
          // world.
          this.rainOverlay = this.add
            .tileSprite(0, 0, this.scale.width, this.scale.height, "hm-rain", "rain-0")
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(9000)
            .setAlpha(0.7)
            .setVisible(false);
          this.snowOverlay = this.add
            .tileSprite(0, 0, this.scale.width, this.scale.height, "hm-snow", "snow-0")
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(9000)
            .setAlpha(0.85)
            .setVisible(false);
          this.scale.on("resize", () => {
            this.rainOverlay?.setSize(this.scale.width, this.scale.height);
            this.snowOverlay?.setSize(this.scale.width, this.scale.height);
            this.weatherIndicator?.setX(this.scale.width - 44);
          });

          // Weather indicator (top-right, just left of the mute icon).
          this.weatherIndicator = this.add
            .text(this.scale.width - 44, 14, "☀", {
              fontFamily: "Inter, ui-monospace, monospace",
              fontSize: "14px",
              color: "#9aa0a8",
            })
            .setScrollFactor(0)
            .setOrigin(1, 0)
            .setDepth(1000);

          // Dev shortcuts: R/T/C force weather; useful for testing
          // without waiting for the scheduler to fire.
          const kb = this.input.keyboard!;
          kb.addKey(Phaser.Input.Keyboard.KeyCodes.R, false).on("down", () =>
            this.startWeather("rain", 60_000),
          );
          kb.addKey(Phaser.Input.Keyboard.KeyCodes.T, false).on("down", () =>
            this.startWeather("snow", 60_000),
          );
          kb.addKey(Phaser.Input.Keyboard.KeyCodes.C, false).on("down", () =>
            this.stopWeather(),
          );

          // Restore scheduler state from localStorage so refreshing
          // doesn't reset the 4-hour roll cycle.
          try {
            const nextRoll = window.localStorage.getItem(
              "world.weather.nextRollAt",
            );
            this.weatherNextRollAt = nextRoll ? Number(nextRoll) : 0;
            const activeUntil = window.localStorage.getItem(
              "world.weather.until",
            );
            const activeKind = window.localStorage.getItem(
              "world.weather.kind",
            );
            if (
              activeUntil &&
              activeKind &&
              Number(activeUntil) > Date.now() &&
              (activeKind === "rain" || activeKind === "snow")
            ) {
              this.startWeather(
                activeKind,
                Number(activeUntil) - Date.now(),
                /* persist */ false,
              );
            }
          } catch {
            // ignore
          }
        }

        /** Begin a weather event. duration is in ms. Persists to
         *  localStorage by default so the event survives a refresh. */
        startWeather(kind: "rain" | "snow", durationMs: number, persist = true) {
          this.weather = kind;
          this.weatherUntil = Date.now() + durationMs;
          if (kind === "rain") {
            this.rainOverlay?.setVisible(true);
            this.snowOverlay?.setVisible(false);
            this.weatherIndicator?.setText("🌧");
          } else {
            this.snowOverlay?.setVisible(true);
            this.rainOverlay?.setVisible(false);
            this.weatherIndicator?.setText("❄");
          }
          if (persist) {
            try {
              window.localStorage.setItem("world.weather.kind", kind);
              window.localStorage.setItem(
                "world.weather.until",
                String(this.weatherUntil),
              );
            } catch {
              // ignore
            }
          }
        }

        stopWeather() {
          this.weather = "clear";
          this.weatherUntil = 0;
          this.rainOverlay?.setVisible(false);
          this.snowOverlay?.setVisible(false);
          this.weatherIndicator?.setText("☀");
          try {
            window.localStorage.removeItem("world.weather.kind");
            window.localStorage.removeItem("world.weather.until");
          } catch {
            // ignore
          }
        }

        /** Per-frame weather update — drives cloud drift, rain/snow
         *  frame cycle, event expiry, and the 4-hour scheduler. */
        updateWeather(dt: number) {
          // Cloud drift.
          const worldW = WORLD_W_TILES * TILE;
          for (const cl of this.clouds) {
            cl.sprite.x += cl.vx * dt;
            // Wrap around west when fully off-screen east.
            if (cl.sprite.x > worldW + 200) {
              cl.sprite.x = -200;
              cl.sprite.y = Math.random() * (WORLD_H_TILES * TILE * 0.6);
            }
          }

          // Precipitation frame cycle (~6 fps). Only active when
          // there's weather AND the player is outside.
          const showPrecip =
            this.weather !== "clear" && this.location.kind === "village";
          if (this.rainOverlay)
            this.rainOverlay.setVisible(showPrecip && this.weather === "rain");
          if (this.snowOverlay)
            this.snowOverlay.setVisible(showPrecip && this.weather === "snow");
          if (showPrecip) {
            this.precipFrameTimer += dt * 1000;
            if (this.precipFrameTimer >= 160) {
              this.precipFrameTimer = 0;
              this.precipFrameIdx = (this.precipFrameIdx + 1) % 3;
              const key =
                this.weather === "rain"
                  ? `rain-${this.precipFrameIdx}`
                  : `snow-${this.precipFrameIdx}`;
              const layer =
                this.weather === "rain" ? this.rainOverlay : this.snowOverlay;
              layer?.setFrame(key);
            }
          }

          // Event expiry.
          if (this.weather !== "clear" && Date.now() > this.weatherUntil) {
            this.stopWeather();
          }

          // Scheduler — roll every 4 hours. ~25% chance per roll of a
          // 20–40 min weather event; rain in summer/spring, snow in
          // winter (we don't have a season system yet, so 60/40
          // rain/snow weighted toward rain).
          const now = Date.now();
          if (this.weatherNextRollAt === 0) {
            this.weatherNextRollAt = now + 4 * 60 * 60 * 1000;
          }
          if (now >= this.weatherNextRollAt) {
            const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
            this.weatherNextRollAt = now + FOUR_HOURS_MS;
            try {
              window.localStorage.setItem(
                "world.weather.nextRollAt",
                String(this.weatherNextRollAt),
              );
            } catch {
              // ignore
            }
            if (this.weather === "clear" && Math.random() < 0.25) {
              const kind: "rain" | "snow" =
                Math.random() < 0.6 ? "rain" : "snow";
              const duration = (20 + Math.random() * 20) * 60 * 1000;
              this.startWeather(kind, duration);
            }
          }
        }

        toggleBgmMute() {
          this.bgmMuted = !this.bgmMuted;
          // Set volume on the underlying WebAudio node; works for the
          // base type, but TS only sees BaseSound's surface. Cast.
          (this.bgm as Phaser.Sound.WebAudioSound | null)?.setVolume(
            this.bgmMuted ? 0 : this.bgmVolume,
          );
          this.bgmIndicator?.setText(this.bgmMuted ? "🔇" : "🔊");
          try {
            window.localStorage.setItem(
              "world.bgm.muted",
              this.bgmMuted ? "1" : "0",
            );
          } catch {
            // ignore
          }
        }

        toggleObstacleDebug() {
          this.obstacleDebugVisible = !this.obstacleDebugVisible;
          try {
            window.localStorage.setItem(
              "world.debug.obstacles",
              this.obstacleDebugVisible ? "1" : "0",
            );
          } catch {
            // ignore
          }
          this.drawObstacleDebug();
        }

        /** Refresh the debug overlay for the current room. Mask-backed
         *  rooms show the painted mask tinted red; rect-backed rooms
         *  draw the rect list with Graphics. Idempotent — re-call on
         *  enter/exit interior so the right source shows. */
        drawObstacleDebug() {
          // Always re-init the rect-graphics layer (cheap).
          if (!this.obstacleDebugGfx) {
            this.obstacleDebugGfx = this.add.graphics();
            this.obstacleDebugGfx.setDepth(10_000);
          }
          const g = this.obstacleDebugGfx;
          g.clear();

          const loc = obstacleKey(this.location);
          const showing = this.obstacleDebugVisible;
          const mask = getMask(loc);

          // Mask-backed rooms (e.g., village).
          if (this.villageMaskOverlay) {
            this.villageMaskOverlay.setVisible(showing && loc === "village");
          }

          // Rect fallback for rooms without a mask (e.g., interiors).
          if (!showing || mask) return;
          const rects = OBSTACLES[loc] ?? [];
          g.fillStyle(0xff2a2a, 0.28);
          g.lineStyle(2, 0xff2a2a, 0.9);
          for (const r of rects) {
            g.fillRect(r.x, r.y, r.w, r.h);
            g.strokeRect(r.x, r.y, r.w, r.h);
          }
        }

        /** Decode village-collision.png alpha into a flat Uint8Array
         *  and register it as the village obstacle mask. Drawn once at
         *  scene start using an offscreen canvas; ~786 KB of memory
         *  for instant O(1) lookups thereafter. */
        decodeAndRegisterVillageMask() {
          const src = this.textures.get("village-collision");
          const img = src.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
          const w = img.width;
          const h = img.height;
          const canvas =
            typeof OffscreenCanvas !== "undefined"
              ? new OffscreenCanvas(w, h)
              : Object.assign(document.createElement("canvas"), { width: w, height: h });
          const ctx = (canvas as HTMLCanvasElement).getContext("2d");
          if (!ctx) return;
          ctx.drawImage(img as CanvasImageSource, 0, 0);
          const rgba = ctx.getImageData(0, 0, w, h).data;
          const mask = new Uint8Array(w * h);
          // Threshold at alpha >= 128 — solid red pixels are 255,
          // anti-aliased edges anything between, transparent background
          // is 0. 128 keeps the painted shape and ignores feathering.
          for (let i = 0; i < mask.length; i++) {
            mask[i] = rgba[i * 4 + 3] >= 128 ? 1 : 0;
          }
          registerMask("village", {
            width: w,
            height: h,
            worldScale: VILLAGE_SCALE,
            data: mask,
          });
        }

        /** Per-location player-clamp rectangle in TILE coordinates.
         *  Interior bounds keep the player inside the church PNG
         *  with a small wall buffer; village uses the full world. */
        movementBoundsTiles(): { minX: number; minY: number; maxX: number; maxY: number } {
          if (this.location.kind === "interior") {
            const b = getBuilding(this.location.buildingId);
            if (b?.interior) {
              const m = b.interior.wallMargin;
              const x0 = b.interior.worldX;
              const y0 = b.interior.worldY;
              const w = b.interior.pngWidth * b.interior.scale;
              const h = b.interior.pngHeight * b.interior.scale;
              return {
                minX: (x0 + m) / TILE,
                minY: (y0 + m) / TILE,
                maxX: (x0 + w - m) / TILE,
                maxY: (y0 + h - m) / TILE,
              };
            }
          }
          return { minX: 0, minY: 0, maxX: WORLD_W_TILES, maxY: WORLD_H_TILES };
        }

        /** Check every trigger zone in the current room. If the local
         *  player is inside one, expose a `WorldAction` so the React
         *  HUD can render a button and `tryAction()` knows what to do
         *  on E. Also positions the floating "Press E" prompt above
         *  the player's head. */
        updateActionPrompt() {
          const px = this.ownPos.x * TILE;
          const py = this.ownPos.y * TILE;
          let next: WorldAction = null;

          if (this.location.kind === "village") {
            // Mounted — only action available is dismount.
            if (this.mountedHorse) {
              next = { kind: "dismount-horse", label: "Dismount" };
            } else {
              // Horse mount trigger — closest horse within ~70 px.
              for (const horse of this.horses) {
                const dx = px - horse.sprite.x;
                const dy = py - horse.sprite.y;
                if (Math.hypot(dx, dy) < 70) {
                  next = { kind: "mount-horse", label: "Mount Horse" };
                  break;
                }
              }
            }
            // Building doors second — only if no horse action above.
            if (!next) {
              for (const b of BUILDINGS) {
                const dx = px - b.door.x;
                const dy = py - b.door.y;
                if (Math.hypot(dx, dy) < b.door.radius) {
                  next = {
                    kind: "enter-building",
                    buildingId: b.id,
                    label: `Enter ${b.displayName}`,
                  };
                  break;
                }
              }
            }
            // Player-to-player talk trigger — closest other character
            // within 72 px. Building doors take priority so doorstep
            // huddles don't accidentally hide the door action.
            if (!next) {
              let nearestSid: string | null = null;
              let nearestD = Infinity;
              this.avatars.forEach((avatar, sid) => {
                if (sid === this.ownSessionId) return;
                const dx = px - avatar.x;
                const dy = py - avatar.y;
                const d = Math.hypot(dx, dy);
                if (d < 72 && d < nearestD) {
                  nearestSid = sid;
                  nearestD = d;
                }
              });
              if (nearestSid) {
                const snap = this.playerSnapshots.get(nearestSid);
                next = {
                  kind: "talk-player",
                  sessionId: nearestSid,
                  label: `Talk to ${snap?.displayName ?? "player"}`,
                };
              }
            }
          } else {
            // Interior — any exit trigger fires the same leave action.
            const b = getBuilding(this.location.buildingId);
            if (b?.interior) {
              for (const ex of b.interior.exits) {
                const dx = px - ex.x;
                const dy = py - ex.y;
                if (Math.hypot(dx, dy) < ex.radius) {
                  next = { kind: "exit-building", label: `Leave ${b.displayName}` };
                  break;
                }
              }
            }
          }

          // Floating "Press E" above the player. Position on the
          // local avatar each frame so it tracks during movement.
          if (this.pressPrompt && this.ownSessionId) {
            const ownAvatar = this.avatars.get(this.ownSessionId);
            if (next && ownAvatar) {
              this.pressPrompt.setText(`Press E — ${next.label}`);
              this.pressPrompt.setPosition(ownAvatar.x, ownAvatar.y - 96);
              this.pressPrompt.setVisible(true);
            } else {
              this.pressPrompt.setVisible(false);
            }
          }

          // Only push to React when the prompt actually changed —
          // avoids re-rendering the HUD every frame. Building id is
          // part of the identity since two doors in a row should
          // re-render the pill.
          const prevKey = actionKey(this.currentAction);
          const nextKey = actionKey(next);
          if (prevKey !== nextKey) {
            this.currentAction = next;
            this.onAction(next);
          }
        }

        /** Resolve whatever action is currently in range. Fired by
         *  the E key OR the on-screen button. Silently no-ops if
         *  nothing's available. */
        tryAction() {
          const a = this.currentAction;
          if (!a) return;
          if (a.kind === "enter-building") this.enterBuilding(a.buildingId);
          else if (a.kind === "exit-building") this.exitBuilding();
          else if (a.kind === "mount-horse") this.mountNearestHorse();
          else if (a.kind === "dismount-horse") this.dismountHorse();
          else if (a.kind === "talk-player") this.openOtherCard(a.sessionId);
        }

        /** Swap to a building's interior "room": hide village +
         *  chickens + other-player avatars, show interior backdrop,
         *  teleport local avatar to interior spawn, re-bound the
         *  camera. Single-player visual for now — other clients in
         *  the village will see this player at the interior coords. */
        enterBuilding(buildingId: string) {
          const b = getBuilding(buildingId);
          if (!b?.interior) {
            // Door fires but interior isn't wired — flash a hint and
            // bail. Lets us land the trigger-zone passes before each
            // interior PNG arrives without dead-end keypresses.
            this.flashHint(`(${b?.displayName ?? "Interior"} coming soon)`);
            return;
          }
          if (this.location.kind === "interior") return;
          const bg = this.interiorBgs.get(b.id);
          if (!bg) {
            this.flashHint(`(${b.displayName} interior asset missing)`);
            return;
          }
          this.location = { kind: "interior", buildingId: b.id };

          // Save where we were so we can put the player back outside
          // the door on exit.
          this.villageReturnTile = { x: this.ownPos.x, y: this.ownPos.y };

          // Hide village layer + ambient NPCs + other players.
          this.villageBg?.setVisible(false);
          this.statue?.setVisible(false);
          for (const ch of this.chickens) ch.sprite.setVisible(false);
          for (const horse of this.horses) horse.sprite.setVisible(false);
          this.avatars.forEach((avatar, sessionId) => {
            if (sessionId !== this.ownSessionId) avatar.setVisible(false);
          });
          bg.setVisible(true);

          // Per-interior obstacle rects.
          setRects(`interior:${b.id}`, b.interior.obstacles ?? []);

          // Teleport local player to interior spawn.
          this.ownPos = {
            x: b.interior.spawn.x / TILE,
            y: b.interior.spawn.y / TILE,
          };
          this.ownFacing = "up";
          const ownAvatar = this.avatars.get(this.ownSessionId!);
          if (ownAvatar) {
            ownAvatar.x = b.interior.spawn.x;
            ownAvatar.y = b.interior.spawn.y;
            this.applyFacing(ownAvatar, this.ownFacing, false);
          }

          // Camera bounded to interior + framed on the spawn.
          const w = b.interior.pngWidth * b.interior.scale;
          const h = b.interior.pngHeight * b.interior.scale;
          this.cameras.main.setBounds(
            b.interior.worldX,
            b.interior.worldY,
            w,
            h,
          );
          this.cameras.main.centerOn(b.interior.spawn.x, b.interior.spawn.y);

          this.hintText.setText("WASD / arrows to move · E to leave");
          this.drawObstacleDebug();
        }

        /** Reverse `enterBuilding`: hide active interior, show village
         *  + chickens + other avatars, drop the player back on the
         *  doorstep where they entered. */
        exitBuilding() {
          if (this.location.kind !== "interior") return;
          const bg = this.interiorBgs.get(this.location.buildingId);
          bg?.setVisible(false);
          this.location = VILLAGE;

          this.villageBg?.setVisible(true);
          this.statue?.setVisible(true);
          for (const ch of this.chickens) ch.sprite.setVisible(true);
          for (const horse of this.horses) horse.sprite.setVisible(true);
          this.avatars.forEach((avatar) => avatar.setVisible(true));

          this.ownPos = { ...this.villageReturnTile };
          this.ownFacing = "down";
          const ownAvatar = this.avatars.get(this.ownSessionId!);
          if (ownAvatar) {
            ownAvatar.x = this.ownPos.x * TILE;
            ownAvatar.y = this.ownPos.y * TILE;
            this.applyFacing(ownAvatar, this.ownFacing, false);
          }

          const worldW = WORLD_W_TILES * TILE;
          const worldH = WORLD_H_TILES * TILE;
          this.cameras.main.setBounds(0, 0, worldW, worldH);
          this.cameras.main.centerOn(this.ownPos.x * TILE, this.ownPos.y * TILE);

          this.hintText.setText("WASD / arrows to move · M: mute");
          this.drawObstacleDebug();
        }

        /** Briefly replace the bottom-left hint text. Used by
         *  enterBuilding to surface "coming soon" when an interior
         *  isn't wired yet. */
        flashHint(text: string, ms = 1800) {
          if (!this.hintText) return;
          const prev = this.hintText.text;
          this.hintText.setText(text);
          this.time.delayedCall(ms, () => {
            if (this.hintText.text === text) this.hintText.setText(prev);
          });
        }

        /** Mount the closest horse within trigger range. The horse's
         *  own FSM pauses while mounted; the player drives both the
         *  avatar and the horse position. */
        mountNearestHorse() {
          if (this.mountedHorse) return;
          const px = this.ownPos.x * TILE;
          const py = this.ownPos.y * TILE;
          let best: Horse | null = null;
          let bestD = Infinity;
          for (const h of this.horses) {
            const dx = px - h.sprite.x;
            const dy = py - h.sprite.y;
            const d = Math.hypot(dx, dy);
            if (d < 70 && d < bestD) {
              best = h;
              bestD = d;
            }
          }
          if (!best) return;
          // Freeze the horse's AI: cancel any animation + bob, reset
          // velocity, mark idle so updateHorses leaves it alone.
          best.bob?.stop();
          best.bob = null;
          best.sprite.anims.stop();
          best.vx = 0;
          best.vy = 0;
          best.state = "idle";
          best.timer = Number.POSITIVE_INFINITY;
          this.mountedHorse = best;
          // Snap the player onto the horse position.
          this.ownPos = { x: best.sprite.x / TILE, y: best.sprite.y / TILE };
          const ownAvatar = this.avatars.get(this.ownSessionId!);
          if (ownAvatar) {
            ownAvatar.x = best.sprite.x;
            ownAvatar.y = best.sprite.y;
          }
          this.flashHint("Mounted — 2× speed. E to dismount.");
        }

        /** Step off the horse. Returns control to the AI FSM. */
        dismountHorse() {
          const horse = this.mountedHorse;
          if (!horse) return;
          this.mountedHorse = null;
          // Hand the horse back to its FSM with a fresh idle timer.
          horse.timer = 1500 + Math.random() * 2000;
          horse.state = "idle";
          this.startHorseBob(horse);
          this.applyHorseIdleFrame(horse);
          this.flashHint("Dismounted.");
        }

        /** Define named frames on the loaded ArMM1998 atlas so
         *  add.image(x, y, "armm", "name") works. Coords measured from
         *  the 640×576 source overlay grid; tweak in this single
         *  table to re-aim a sprite. CC0 — ArMM1998 via OpenGameArt.
         *  https://opengameart.org/content/zelda-like-tilesets-and-sprites */
        /** Create a chicken NPC at (x, y) and wire up its idle bob.
         *  Returned object holds all per-chicken state for the
         *  updateChickens loop. */
        spawnChicken(opts: {
          x: number;
          y: number;
          /** Phaser texture key — defaults to the HM chicken sheet,
           *  overridable for other chicken-shaped animals (golden
           *  chicken, future variants) so they share the FSM. */
          textureKey?: string;
          idleFrame: string;
          walkFrames: string[];
          triggerRadius: number;
          speed: number;
          bobAmp: number;
          bobMs: number;
        }): Chicken {
          // Nudge the spawn out of any blocker so the chicken doesn't
          // appear inside a wall or fence. Home anchor follows the
          // spawn so wander targets stay near the (nudged) origin.
          const safe = nudgeToFree(opts.x, opts.y, "village") ?? {
            x: opts.x,
            y: opts.y,
          };
          opts.x = safe.x;
          opts.y = safe.y;
          const sprite = this.add.image(
            opts.x,
            opts.y,
            opts.textureKey ?? "hm-chickens",
            opts.idleFrame,
          );
          sprite.setOrigin(0.5, 0.9);
          sprite.setScale(VILLAGE_SCALE);
          sprite.setDepth(-3);
          const ch: Chicken = {
            sprite,
            state: "idle",
            timer: 0,
            vx: 0,
            vy: 0,
            targetX: opts.x,
            targetY: opts.y,
            bob: null,
            walkCycle: null,
            walkIndex: 0,
            walkFrames: opts.walkFrames,
            idleFrame: opts.idleFrame,
            triggerRadius: opts.triggerRadius,
            speed: opts.speed,
            homeX: opts.x,
            homeY: opts.y,
          };
          this.startChickenBob(ch, opts.bobAmp, opts.bobMs);
          return ch;
        }

        /** Start (or restart) the idle Y-bob on a chicken. */
        startChickenBob(ch: Chicken, amp = 4, durationMs = 900) {
          ch.bob?.stop();
          const baseY = ch.sprite.y;
          ch.bob = this.tweens.add({
            targets: ch.sprite,
            y: { from: baseY, to: baseY - amp },
            duration: durationMs,
            ease: "Sine.inOut",
            yoyo: true,
            repeat: -1,
          });
        }

        /** Switch to the "running" pose while moving. We use a single
         *  static frame — the Harvest Moon sheet's nominal "walk"
         *  frames are actually different pose snapshots, not a clean
         *  cycle, so swapping them produces visible flicker. The
         *  chicken's apparent motion comes from its world position
         *  changing each frame; the sprite stays one pose. */
        startChickenWalk(ch: Chicken) {
          ch.walkCycle?.remove();
          ch.walkCycle = null;
          ch.sprite.setFrame(ch.walkFrames[0]);
        }

        stopChickenWalk(ch: Chicken) {
          ch.walkCycle?.remove();
          ch.walkCycle = null;
          ch.sprite.setFrame(ch.idleFrame);
        }

        /** Spawn a wandering dog near (x, y). Walks short distances
         *  inside its home radius, pauses, picks a new target. */
        spawnDog(x: number, y: number) {
          const safe = nudgeToFree(x, y, "village") ?? { x, y };
          const sprite = this.add.sprite(safe.x, safe.y, "hm-dog", "dog-idle");
          sprite.setOrigin(0.5, 0.9);
          sprite.setScale(VILLAGE_SCALE);
          sprite.setDepth(-3);
          const dog: Dog = {
            sprite,
            state: "idle",
            idleAction: "stand",
            facing: "down",
            timer: 0,
            vx: 0,
            vy: 0,
            targetX: safe.x,
            targetY: safe.y,
            homeX: safe.x,
            homeY: safe.y,
            bob: null,
          };
          // First idle bout starts the moment we spawn so the dog has
          // a meaningful pose from frame 1.
          this.startDogIdle(dog);
          this.dogs.push(dog);
          return dog;
        }

        /** Pick a weighted idle behavior + start its animation. */
        startDogIdle(dog: Dog) {
          dog.state = "idle";
          dog.vx = 0;
          dog.vy = 0;
          // Weighted dice. Tuned to make the dog feel alive but
          // not chaotic — mostly stands, occasionally varies.
          const roll = Math.random();
          let action: DogIdleAction;
          if (roll < 0.5) action = "stand";
          else if (roll < 0.68) action = "sit";
          else if (roll < 0.8) action = "scratch";
          else if (roll < 0.9) action = "bark";
          else if (roll < 0.96) action = "jump";
          else action = "sleep";
          dog.idleAction = action;

          // Anim + duration per action.
          const sp = dog.sprite;
          switch (action) {
            case "stand":
              sp.anims.play("dog-stand", true);
              dog.timer = 3000 + Math.random() * 3000;
              break;
            case "sit":
              sp.anims.play("dog-sit", true);
              dog.timer = 4000 + Math.random() * 4000;
              break;
            case "scratch":
              sp.anims.play("dog-scratch", true);
              dog.timer = 1500 + Math.random() * 1000;
              break;
            case "bark":
              sp.anims.stop();
              sp.setFrame("dog-bark");
              dog.timer = 900 + Math.random() * 600;
              break;
            case "jump":
              sp.anims.play("dog-jump", true);
              dog.timer = 750 + Math.random() * 800;
              break;
            case "sleep":
              sp.anims.play("dog-sleep", true);
              dog.timer = 8000 + Math.random() * 7000;
              break;
          }
        }

        /** Convert a velocity vector to the closest cardinal facing.
         *  Same logic as the horse — diagonals snap to whichever axis
         *  dominates. */
        dogFacingFromVelocity(vx: number, vy: number): DogFacing {
          if (Math.abs(vx) >= Math.abs(vy)) {
            return vx >= 0 ? "right" : "left";
          }
          return vy >= 0 ? "down" : "up";
        }

        /** Play the walk animation that matches the dog's current
         *  facing. side faces LEFT natively, flipX for right. */
        applyDogWalkAnim(dog: Dog) {
          const sp = dog.sprite;
          switch (dog.facing) {
            case "down":
              sp.setFlipX(false);
              sp.anims.play("dog-walk-down", true);
              break;
            case "up":
              sp.setFlipX(false);
              sp.anims.play("dog-walk-up", true);
              break;
            case "right":
              sp.setFlipX(true);
              sp.anims.play("dog-walk-side", true);
              break;
            case "left":
            default:
              sp.setFlipX(false);
              sp.anims.play("dog-walk-side", true);
              break;
          }
        }

        /** Per-frame dog update. Two states: idle (running one of
         *  the ambient behaviors) and walking (heading to a target).
         *  Idle bouts pick a new behavior 70% of the time and start
         *  a wander 30% of the time, so the dog has long stretches
         *  of varied poses interspersed with movement. */
        updateDogs(dt: number) {
          const DOG_SPEED = 55; // px/sec when wandering
          const DOG_FLEE_SPEED = 130; // px/sec when scared
          const DOG_RADIUS = 130; // wander radius around home
          const DOG_TRIGGER_R = 140; // proximity radius for flee
          const DOG_WALK_CAP = 4000;
          const DOG_FLEE_MS = 1800;
          for (const dog of this.dogs) {
            // Proximity flee — checked in idle AND walking so the dog
            // bolts the moment a player gets close, regardless of
            // what behavior was running.
            if (dog.state !== "scared") {
              for (const avatar of this.avatars.values()) {
                const dx = avatar.x - dog.sprite.x;
                const dy = avatar.y - dog.sprite.y;
                const d = Math.hypot(dx, dy);
                if (d > 0 && d < DOG_TRIGGER_R) {
                  // Vector AWAY from the player.
                  dog.vx = (-dx / d) * DOG_FLEE_SPEED;
                  dog.vy = (-dy / d) * DOG_FLEE_SPEED;
                  dog.state = "scared";
                  dog.timer = DOG_FLEE_MS + Math.random() * 1000;
                  dog.facing = this.dogFacingFromVelocity(dog.vx, dog.vy);
                  this.applyDogWalkAnim(dog);
                  break;
                }
              }
              if (dog.state === "scared") continue;
            }

            if (dog.state === "scared") {
              const px = dog.sprite.x + dog.vx * dt;
              const py = dog.sprite.y + dog.vy * dt;
              const r = resolveMove(dog.sprite.x, dog.sprite.y, px, py, "village");
              if (r.x === dog.sprite.x && r.y === dog.sprite.y) {
                // Wall-slide produced nothing — end early so the dog
                // doesn't grind against a fence forever.
                dog.timer = 0;
              } else {
                dog.sprite.x = r.x;
                dog.sprite.y = r.y;
              }
              dog.timer -= dt * 1000;
              const newFacing = this.dogFacingFromVelocity(dog.vx, dog.vy);
              if (newFacing !== dog.facing) {
                dog.facing = newFacing;
                this.applyDogWalkAnim(dog);
              }
              if (dog.timer <= 0) this.startDogIdle(dog);
              continue;
            }

            if (dog.state === "idle") {
              dog.timer -= dt * 1000;
              if (dog.timer > 0) continue;
              // Sleep + sit make the dog less likely to immediately
              // jump up and run; bias toward more idle. Everything
              // else has a normal split.
              const sleepy = dog.idleAction === "sleep" || dog.idleAction === "sit";
              const walkChance = sleepy ? 0.15 : 0.35;
              if (Math.random() > walkChance) {
                // Stay idle, pick a new behavior.
                this.startDogIdle(dog);
                continue;
              }
              // Pick a wander target. If everywhere's blocked, fall
              // back to another idle bout.
              const target = pickFreeTarget(
                dog.homeX,
                dog.homeY,
                20,
                DOG_RADIUS,
                "village",
                10,
              );
              if (!target) {
                this.startDogIdle(dog);
                continue;
              }
              dog.targetX = target.x;
              dog.targetY = target.y;
              const dx = dog.targetX - dog.sprite.x;
              const dy = dog.targetY - dog.sprite.y;
              const d = Math.max(0.001, Math.hypot(dx, dy));
              dog.vx = (dx / d) * DOG_SPEED;
              dog.vy = (dy / d) * DOG_SPEED;
              dog.facing = this.dogFacingFromVelocity(dog.vx, dog.vy);
              dog.state = "walking";
              dog.timer = DOG_WALK_CAP;
              this.applyDogWalkAnim(dog);
              continue;
            }

            // walking state
            const px = dog.sprite.x + dog.vx * dt;
            const py = dog.sprite.y + dog.vy * dt;
            const r = resolveMove(dog.sprite.x, dog.sprite.y, px, py, "village");
            if (r.x === dog.sprite.x && r.y === dog.sprite.y) {
              dog.timer = 0;
            } else {
              dog.sprite.x = r.x;
              dog.sprite.y = r.y;
            }
            dog.timer -= dt * 1000;
            // Re-evaluate facing so a dog turning a corner swaps
            // anims cleanly instead of moonwalking.
            const newFacing = this.dogFacingFromVelocity(dog.vx, dog.vy);
            if (newFacing !== dog.facing) {
              dog.facing = newFacing;
              this.applyDogWalkAnim(dog);
            }
            const remaining = Math.hypot(
              dog.targetX - dog.sprite.x,
              dog.targetY - dog.sprite.y,
            );
            if (remaining < 4 || dog.timer <= 0) {
              this.startDogIdle(dog);
            }
          }
        }

        /** Spawn a grazing cow near (x, y) with the proximity-flee
         *  FSM. Nudged out of any blocker on spawn. */
        spawnCow(x: number, y: number) {
          const safe = nudgeToFree(x, y, "village") ?? { x, y };
          const sprite = this.add.image(safe.x, safe.y, "hm-cow", "cow-idle");
          sprite.setOrigin(0.5, 0.9);
          sprite.setScale(VILLAGE_SCALE);
          sprite.setDepth(-3);
          const cow: Cow = {
            sprite,
            state: "idle",
            timer: 0,
            vx: 0,
            vy: 0,
            homeX: safe.x,
            homeY: safe.y,
            bob: null,
          };
          this.startCowBob(cow);
          this.cows.push(cow);
          return cow;
        }

        startCowBob(cow: Cow) {
          cow.bob?.stop();
          const baseY = cow.sprite.y;
          cow.bob = this.tweens.add({
            targets: cow.sprite,
            y: { from: baseY, to: baseY - 3 },
            duration: 2200 + Math.random() * 400,
            ease: "Sine.inOut",
            yoyo: true,
            repeat: -1,
          });
        }

        /** Per-frame cow update. idle → check player distance →
         *  ambling-away if close → idle again. Slow speed, short
         *  duration; cows are placid. */
        updateCows(dt: number) {
          const COW_TRIGGER_R = 130; // px; bigger than the chicken's
          const COW_SPEED = 40; // px/sec; slow amble
          const COW_FLEE_MS = 1400;
          for (const cow of this.cows) {
            if (cow.state === "idle") {
              for (const avatar of this.avatars.values()) {
                const dx = avatar.x - cow.sprite.x;
                const dy = avatar.y - cow.sprite.y;
                const d = Math.hypot(dx, dy);
                if (d > 0 && d < COW_TRIGGER_R) {
                  // Pick a slow vector away from the player.
                  cow.vx = (-dx / d) * COW_SPEED;
                  cow.vy = (-dy / d) * COW_SPEED;
                  cow.state = "walking";
                  cow.timer = COW_FLEE_MS;
                  cow.bob?.stop();
                  cow.bob = null;
                  cow.sprite.setFlipX(cow.vx < 0);
                  break;
                }
              }
            } else if (cow.state === "walking") {
              const px = cow.sprite.x + cow.vx * dt;
              const py = cow.sprite.y + cow.vy * dt;
              const r = resolveMove(cow.sprite.x, cow.sprite.y, px, py, "village");
              // If wall-slide produced no movement, end the flee early
              // so the cow doesn't grind against a fence.
              if (r.x === cow.sprite.x && r.y === cow.sprite.y) {
                cow.timer = 0;
              } else {
                cow.sprite.x = r.x;
                cow.sprite.y = r.y;
              }
              cow.timer -= dt * 1000;
              if (cow.timer <= 0) {
                cow.state = "idle";
                cow.vx = 0;
                cow.vy = 0;
                this.startCowBob(cow);
              }
            }
          }
        }

        /** Is the given world-coord point inside any animal's foot
         *  circle? Used to keep player movement out of NPC bodies. */
        isInAnyAnimal(x: number, y: number): boolean {
          // Foot-circle radii (world px). Tuned by sprite size at
          // VILLAGE_SCALE = 3.
          const HIT = { chicken: 18, horse: 36, cow: 30, dog: 22 };
          for (const ch of this.chickens) {
            const dx = x - ch.sprite.x;
            const dy = y - ch.sprite.y;
            if (dx * dx + dy * dy < HIT.chicken * HIT.chicken) return true;
          }
          for (const horse of this.horses) {
            // Mounted horse moves WITH the player — checking it
            // against player position would always return true and
            // freeze movement.
            if (horse === this.mountedHorse) continue;
            const dx = x - horse.sprite.x;
            const dy = y - horse.sprite.y;
            if (dx * dx + dy * dy < HIT.horse * HIT.horse) return true;
          }
          for (const cow of this.cows) {
            const dx = x - cow.sprite.x;
            const dy = y - cow.sprite.y;
            if (dx * dx + dy * dy < HIT.cow * HIT.cow) return true;
          }
          for (const dog of this.dogs) {
            const dx = x - dog.sprite.x;
            const dy = y - dog.sprite.y;
            if (dx * dx + dy * dy < HIT.dog * HIT.dog) return true;
          }
          return false;
        }

        /** Create a horse NPC at (x, y). Side-view sprite faces LEFT
         *  natively; we flipX it when facing right. Spawns idle with
         *  a slow Y-bob so it feels alive at rest. */
        spawnHorse(opts: {
          x: number;
          y: number;
          speed: number;
          wanderRadius: number;
        }): Horse {
          // Nudge spawn out of any blocker (the horse's pasture moves
          // as the mask gets edited; the seed coord may now sit on a
          // fence or building wall).
          const safe = nudgeToFree(opts.x, opts.y, "village") ?? {
            x: opts.x,
            y: opts.y,
          };
          opts.x = safe.x;
          opts.y = safe.y;
          const sprite = this.add.sprite(opts.x, opts.y, "hm-horse", "horse-s0");
          sprite.setOrigin(0.5, 0.9);
          sprite.setScale(VILLAGE_SCALE);
          sprite.setDepth(-3);
          const horse: Horse = {
            sprite,
            state: "idle",
            facing: "left",
            // Wait a beat after spawn before the first stroll so the
            // page doesn't load with the horse already mid-action.
            timer: 2500 + Math.random() * 2000,
            vx: 0,
            vy: 0,
            targetX: opts.x,
            targetY: opts.y,
            homeX: opts.x,
            homeY: opts.y,
            speed: opts.speed,
            bob: null,
          };
          this.startHorseBob(horse);
          // Stash radius on the object so updateHorses can read it
          // without widening the Horse type for one number.
          sprite.setData("wanderRadius", opts.wanderRadius);
          return horse;
        }

        /** Start (or restart) the idle Y-bob — gentler than the
         *  chickens' bob (horses are heavier). */
        startHorseBob(horse: Horse) {
          horse.bob?.stop();
          const baseY = horse.sprite.y;
          horse.bob = this.tweens.add({
            targets: horse.sprite,
            y: { from: baseY, to: baseY - 2 },
            duration: 1500,
            ease: "Sine.inOut",
            yoyo: true,
            repeat: -1,
          });
        }

        /** Convert a velocity vector to the closest cardinal facing.
         *  Diagonals snap to whichever axis dominates — keeps the
         *  walk animation cleanly tied to one row of the sheet
         *  rather than constantly flickering between two. */
        horseFacingFromVelocity(vx: number, vy: number): HorseFacing {
          if (Math.abs(vx) >= Math.abs(vy)) {
            return vx >= 0 ? "right" : "left";
          }
          return vy >= 0 ? "down" : "up";
        }

        /** Set the idle frame + flip that matches the horse's current
         *  facing so it freezes naturally when it stops. */
        applyHorseIdleFrame(horse: Horse) {
          switch (horse.facing) {
            case "down":
              horse.sprite.setFrame("horse-d0");
              horse.sprite.setFlipX(false);
              break;
            case "up":
              horse.sprite.setFrame("horse-u0");
              horse.sprite.setFlipX(false);
              break;
            case "right":
              horse.sprite.setFrame("horse-s0");
              horse.sprite.setFlipX(true);
              break;
            case "left":
            default:
              horse.sprite.setFrame("horse-s0");
              horse.sprite.setFlipX(false);
              break;
          }
        }

        /** Play the walk / gallop animation that matches the current
         *  facing + state, and handle the side-view flipX. */
        applyHorseMovingAnim(horse: Horse) {
          const isGallop = horse.state === "gallop";
          switch (horse.facing) {
            case "down":
              horse.sprite.setFlipX(false);
              horse.sprite.anims.play(
                isGallop ? "horse-walk-down" : "horse-walk-down",
                true,
              );
              break;
            case "up":
              horse.sprite.setFlipX(false);
              horse.sprite.anims.play(
                isGallop ? "horse-walk-up" : "horse-walk-up",
                true,
              );
              break;
            case "right":
              horse.sprite.setFlipX(true);
              horse.sprite.anims.play(
                isGallop ? "horse-gallop-side" : "horse-walk-side",
                true,
              );
              break;
            case "left":
            default:
              horse.sprite.setFlipX(false);
              horse.sprite.anims.play(
                isGallop ? "horse-gallop-side" : "horse-walk-side",
                true,
              );
              break;
          }
        }

        /** After an idle bout, choose what to do next. Rolls match a
         *  real horse's day: stand around most of the time, walk a
         *  bit, occasionally look up alert, rarely burst into a short
         *  gallop. */
        pickHorseNextState(horse: Horse) {
          const roll = Math.random();
          const radius = (horse.sprite.getData("wanderRadius") as number) ?? 100;
          horse.bob?.stop();
          horse.bob = null;

          if (roll < 0.1) {
            // Alert pose — turn head, look at viewer for a beat.
            horse.state = "alert";
            horse.timer = 1800 + Math.random() * 1200;
            horse.sprite.setFlipX(false);
            horse.sprite.anims.play("horse-alert", true);
            return;
          }

          if (roll < 0.15) {
            // Short gallop — farther target, faster speed. Side view
            // only (we don't have gallop frames for down/up), so
            // bias the target horizontally so the side anim fits.
            // pickFreeTarget rejects blocked spots; if every candidate
            // hits a wall, fall through to a regular walk instead so
            // the horse never freezes wedged against a fence.
            const dir = Math.random() < 0.5 ? -1 : 1;
            const cand = pickFreeTarget(
              horse.homeX + dir * (radius * 0.9),
              horse.homeY,
              0,
              30,
              "village",
            );
            if (cand) {
              horse.targetX = cand.x;
              horse.targetY = cand.y;
              const dx = horse.targetX - horse.sprite.x;
              const dy = horse.targetY - horse.sprite.y;
              const d = Math.max(0.001, Math.hypot(dx, dy));
              const gallopSpeed = horse.speed * 2.6;
              horse.vx = (dx / d) * gallopSpeed;
              horse.vy = (dy / d) * gallopSpeed;
              horse.facing = dir > 0 ? "right" : "left";
              horse.state = "gallop";
              horse.timer = 1500 + Math.random() * 1000;
              this.applyHorseMovingAnim(horse);
              return;
            }
            // fall through to walk
          }

          // Walk to a random spot near home that isn't blocked. If
          // every candidate is fenced in, stay idle for a beat.
          const target = pickFreeTarget(
            horse.homeX,
            horse.homeY,
            30,
            radius,
            "village",
            12,
          );
          if (!target) {
            horse.state = "idle";
            horse.timer = 2000 + Math.random() * 2000;
            this.startHorseBob(horse);
            return;
          }
          horse.targetX = target.x;
          horse.targetY = target.y;
          const dx = horse.targetX - horse.sprite.x;
          const dy = horse.targetY - horse.sprite.y;
          const d = Math.max(0.001, Math.hypot(dx, dy));
          horse.vx = (dx / d) * horse.speed;
          horse.vy = (dy / d) * horse.speed;
          horse.facing = this.horseFacingFromVelocity(horse.vx, horse.vy);
          horse.state = "walk";
          // Hard cap on walk duration so we always come back to idle
          // even if the target becomes unreachable.
          horse.timer = 6000;
          this.applyHorseMovingAnim(horse);
        }

        /** Per-frame horse update. Four states drive the loop —
         *  idle → walk / gallop / alert → idle again. Walks pick
         *  their direction from the velocity vector so the right
         *  row of the sheet plays as the horse turns. */
        updateHorses(dt: number) {
          for (const horse of this.horses) {
            if (horse.state === "idle") {
              horse.timer -= dt * 1000;
              if (horse.timer <= 0) this.pickHorseNextState(horse);
              continue;
            }

            if (horse.state === "alert") {
              horse.timer -= dt * 1000;
              if (horse.timer <= 0) {
                horse.state = "idle";
                horse.sprite.anims.stop();
                this.applyHorseIdleFrame(horse);
                horse.timer = 3000 + Math.random() * 4000;
                this.startHorseBob(horse);
              }
              continue;
            }

            // walk or gallop — same movement code, different anims
            // and speeds (already baked into vx/vy + anim selection).
            // Resolve against obstacles so the horse wall-slides
            // rather than ghosting through a fence.
            {
              const px = horse.sprite.x + horse.vx * dt;
              const py = horse.sprite.y + horse.vy * dt;
              const r = resolveMove(
                horse.sprite.x,
                horse.sprite.y,
                px,
                py,
                "village",
              );
              horse.sprite.x = r.x;
              horse.sprite.y = r.y;
            }
            horse.timer -= dt * 1000;

            // Re-evaluate facing every frame so turn-as-you-walk
            // animates cleanly. Only switch the played anim when
            // the facing actually changes (prevents per-frame
            // anims.play() resets that'd freeze on frame 0).
            const newFacing = this.horseFacingFromVelocity(horse.vx, horse.vy);
            if (newFacing !== horse.facing) {
              horse.facing = newFacing;
              this.applyHorseMovingAnim(horse);
            }

            const dx = horse.targetX - horse.sprite.x;
            const dy = horse.targetY - horse.sprite.y;
            const remaining = Math.hypot(dx, dy);
            if (remaining < 4 || horse.timer <= 0) {
              horse.state = "idle";
              horse.vx = 0;
              horse.vy = 0;
              horse.sprite.anims.stop();
              this.applyHorseIdleFrame(horse);
              // Gallops earn a longer rest afterwards.
              horse.timer = 4000 + Math.random() * 5000;
              this.startHorseBob(horse);
            }
          }
        }

        /** Per-frame chicken update — proximity detection, scared
         *  running, wander to new home, idle. Called from update(). */
        updateChickens(dt: number) {
          for (const ch of this.chickens) {
            if (ch.state === "idle") {
              // Look for any nearby player. If close enough, panic.
              for (const avatar of this.avatars.values()) {
                const dx = avatar.x - ch.sprite.x;
                const dy = avatar.y - ch.sprite.y;
                if (Math.hypot(dx, dy) < ch.triggerRadius) {
                  // Run AWAY from the player (perpendicular bias so we
                  // don't head straight into a wall).
                  const len = Math.max(0.001, Math.hypot(dx, dy));
                  ch.vx = (-dx / len) * ch.speed;
                  ch.vy = (-dy / len) * ch.speed;
                  ch.state = "scared";
                  ch.timer = 1800 + Math.random() * 1400; // 1.8–3.2 s
                  ch.bob?.stop();
                  ch.bob = null;
                  this.startChickenWalk(ch);
                  break;
                }
              }
            } else if (ch.state === "scared") {
              // Resolve against obstacles so the chicken bounces off
              // a fence/wall instead of fleeing through it.
              const px = ch.sprite.x + ch.vx * dt;
              const py = ch.sprite.y + ch.vy * dt;
              const r = resolveMove(ch.sprite.x, ch.sprite.y, px, py, "village");
              ch.sprite.x = r.x;
              ch.sprite.y = r.y;
              ch.sprite.setFlipX(ch.vx < 0);
              ch.timer -= dt * 1000;
              if (ch.timer <= 0) {
                // Pick a free resting spot near home base. If the
                // chicken's home is itself fenced in (e.g., user moved
                // a fence over it), accept whatever spot is closest
                // by falling back to the current sprite position.
                const target = pickFreeTarget(
                  ch.homeX,
                  ch.homeY,
                  60,
                  160,
                  "village",
                  10,
                );
                if (target) {
                  ch.targetX = target.x;
                  ch.targetY = target.y;
                  ch.state = "wander";
                  ch.timer = 4000;
                } else {
                  ch.state = "idle";
                  this.startChickenBob(
                    ch,
                    ch.idleFrame === "chick" ? 3 : 4,
                    ch.idleFrame === "chick" ? 700 : 900,
                  );
                  this.stopChickenWalk(ch);
                }
              }
            } else if (ch.state === "wander") {
              const dx = ch.targetX - ch.sprite.x;
              const dy = ch.targetY - ch.sprite.y;
              const d = Math.hypot(dx, dy);
              if (d < 4 || ch.timer <= 0) {
                ch.state = "idle";
                ch.vx = 0;
                ch.vy = 0;
                ch.sprite.setFlipX(false);
                this.stopChickenWalk(ch);
                // Resume the idle bob at the new resting position.
                this.startChickenBob(ch, ch.idleFrame === "chick" ? 3 : 4,
                  ch.idleFrame === "chick" ? 700 : 900);
              } else {
                const slowerSpeed = ch.speed * 0.55;
                const px = ch.sprite.x + (dx / d) * slowerSpeed * dt;
                const py = ch.sprite.y + (dy / d) * slowerSpeed * dt;
                const r = resolveMove(ch.sprite.x, ch.sprite.y, px, py, "village");
                // If the wall-slide made zero progress, give up on
                // this target so we don't spin in place against a wall.
                if (r.x === ch.sprite.x && r.y === ch.sprite.y) {
                  ch.timer = 0;
                } else {
                  ch.sprite.x = r.x;
                  ch.sprite.y = r.y;
                }
                ch.sprite.setFlipX(dx < 0);
                ch.timer -= dt * 1000;
              }
            }
          }
        }

        /** Register named sub-frames on the Harvest Moon chicken sheet
         *  so we can place specific poses via add.image(x, y, "hm-chickens",
         *  "hen") without re-cropping PNGs.
         *
         *  Sheet is 312×46, two 23-px rows of ~16×23 cells. Mature hens
         *  (white with red combs) on the left; baby chicks (yellow) on
         *  the right. */
        registerHarvestMoonFrames() {
          const t = this.textures.get("hm-chickens");
          // Sheet is 312×46 — that's 13 columns × 2 rows of 24×23
          // cells (NOT 16-wide, an easy mistake from the eye).
          t.add("hen", 0, 0, 0, 24, 23);
          t.add("hen-walk1", 0, 24, 0, 24, 23);
          t.add("hen-walk2", 0, 48, 0, 24, 23);
          t.add("chick", 0, 240, 0, 24, 23);
          t.add("chick-walk", 0, 264, 0, 24, 23);

          // Horse sheet — 344×224. Alpha-scan revealed all six row
          // bands sit on a uniform 40-px X-pitch (the right 24 px is
          // padding), but each row has its own native top + height.
          // Cell heights are chosen so the horse's FEET land at
          // sprite-origin (0.5, 0.9) consistently across rows — when
          // the horse turns from down → side → up, its hooves don't
          // jump vertically.
          //
          // Frame keys:
          //   horse-d0..d7 — walking-DOWN cycle (toward camera)
          //   horse-u0..u7 — walking-UP cycle (away from camera)
          //   horse-s0     — side idle
          //   horse-s1..s4 — side walk cycle
          //   horse-s5..s7 — side gallop cycle (faster, longer stride)
          //   horse-r0..r4 — extra side poses; r3..r4 = head-turn
          //                  "looking at viewer" alert pose
          const h = this.textures.get("hm-horse");
          // Row 1 — facing camera (walks down). y=0..25 content; cell
          // h=28 to land feet at the origin anchor.
          for (let i = 0; i < 8; i++) h.add(`horse-d${i}`, 0, i * 40, 0, 40, 28);
          // Row 2 — back to camera (walks up). y=38..67 content.
          for (let i = 0; i < 8; i++) h.add(`horse-u${i}`, 0, i * 40, 38, 40, 32);
          // Row 3 — side view (walks left natively, flipX for right).
          // y=78..107 content. 8 cells: s0 idle, s1-s4 walk, s5-s7 gallop.
          for (let i = 0; i < 8; i++) h.add(`horse-s${i}`, 0, i * 40, 78, 40, 30);
          // Row 4 — additional side poses. r0..r2 are subtle idle
          // variations; r3..r4 are the "head turned to look at you"
          // alert frames. 5 cells. y=120..143 content.
          for (let i = 0; i < 5; i++) h.add(`horse-r${i}`, 0, i * 40, 120, 40, 25);
        }

        /** Generate the procedural pixel-art tile textures once and
         *  register them with Phaser's texture manager. Called from
         *  create() before any rendering. The textures are intentionally
         *  chunky (32×32 pixels, restricted palette) for the SNES-era
         *  ALttP aesthetic. */
        bakeTileTextures() {
          // === Grass tile (32×32) ===
          // 4-color palette: base, mid, light, dark.
          const grassG = this.make.graphics({ x: 0, y: 0 }, false);
          grassG.fillStyle(0x3e5a26, 1); // base
          grassG.fillRect(0, 0, 32, 32);
          // Mid-tone variation — 8×8 patches at fixed pseudo-random spots
          grassG.fillStyle(0x4d6e2e, 1);
          const midSpots = [[2, 4], [14, 2], [22, 12], [6, 18], [24, 24]];
          for (const [x, y] of midSpots) grassG.fillRect(x, y, 6, 4);
          // Light blade pixels — single 1×2 pixels for grass-blade feel.
          grassG.fillStyle(0x8aa66a, 1);
          const bladeSpots = [
            [3, 2], [11, 6], [17, 4], [25, 8], [29, 14],
            [5, 14], [13, 18], [21, 20], [7, 24], [19, 28],
            [27, 27],
          ];
          for (const [x, y] of bladeSpots) grassG.fillRect(x, y, 1, 2);
          // Dark shadow pixels — sparse, give depth.
          grassG.fillStyle(0x2a3f1a, 1);
          const darkSpots = [[8, 10], [18, 22], [27, 4]];
          for (const [x, y] of darkSpots) grassG.fillRect(x, y, 2, 2);
          grassG.generateTexture("tile-grass", 32, 32);
          grassG.destroy();

          // === Stone path tile (32×32) ===
          // 4 irregular flagstones with dark mortar between.
          const stoneG = this.make.graphics({ x: 0, y: 0 }, false);
          stoneG.fillStyle(0x3a3530, 1); // mortar base
          stoneG.fillRect(0, 0, 32, 32);
          // Flagstone 1 — top-left
          stoneG.fillStyle(0x8c8478, 1);
          stoneG.fillRect(1, 1, 14, 14);
          stoneG.fillStyle(0x6b6358, 1); // shadow edge
          stoneG.fillRect(1, 13, 14, 2);
          stoneG.fillRect(13, 1, 2, 14);
          stoneG.fillStyle(0xa39b8c, 1); // highlight
          stoneG.fillRect(1, 1, 14, 1);
          stoneG.fillRect(1, 1, 1, 14);
          // Flagstone 2 — top-right
          stoneG.fillStyle(0x807868, 1);
          stoneG.fillRect(17, 1, 14, 14);
          stoneG.fillStyle(0x605848, 1);
          stoneG.fillRect(17, 13, 14, 2);
          stoneG.fillRect(29, 1, 2, 14);
          stoneG.fillStyle(0x988e7e, 1);
          stoneG.fillRect(17, 1, 14, 1);
          stoneG.fillRect(17, 1, 1, 14);
          // Flagstone 3 — bottom-left
          stoneG.fillStyle(0x887e6e, 1);
          stoneG.fillRect(1, 17, 14, 14);
          stoneG.fillStyle(0x685e4e, 1);
          stoneG.fillRect(1, 29, 14, 2);
          stoneG.fillRect(13, 17, 2, 14);
          stoneG.fillStyle(0xa0958a, 1);
          stoneG.fillRect(1, 17, 14, 1);
          stoneG.fillRect(1, 17, 1, 14);
          // Flagstone 4 — bottom-right
          stoneG.fillStyle(0x847a6c, 1);
          stoneG.fillRect(17, 17, 14, 14);
          stoneG.fillStyle(0x645a4c, 1);
          stoneG.fillRect(17, 29, 14, 2);
          stoneG.fillRect(29, 17, 2, 14);
          stoneG.fillStyle(0x9c918c, 1);
          stoneG.fillRect(17, 17, 14, 1);
          stoneG.fillRect(17, 17, 1, 14);
          stoneG.generateTexture("tile-stone", 32, 32);
          stoneG.destroy();

          // === Cottage sprite (40×44) ===
          // Pitched roof + wood walls + door + window — classic JRPG
          // village cottage. Wall + roof colors are mid-tone so we can
          // tint per-zone if needed.
          const cottageG = this.make.graphics({ x: 0, y: 0 }, false);
          // Roof base
          cottageG.fillStyle(0x5a2e22, 1);
          cottageG.fillTriangle(0, 22, 20, 2, 40, 22);
          // Roof highlight
          cottageG.fillStyle(0x7a3e2e, 1);
          cottageG.fillTriangle(2, 20, 20, 4, 22, 20);
          // Roof shadow line
          cottageG.fillStyle(0x3a1e16, 1);
          cottageG.fillRect(0, 22, 40, 2);
          // Walls
          cottageG.fillStyle(0xb89a72, 1);
          cottageG.fillRect(4, 24, 32, 20);
          // Wall shading right side
          cottageG.fillStyle(0x8c7456, 1);
          cottageG.fillRect(30, 24, 6, 20);
          // Wall outline
          cottageG.fillStyle(0x40362a, 1);
          cottageG.fillRect(4, 43, 32, 1);
          cottageG.fillRect(4, 24, 1, 20);
          cottageG.fillRect(35, 24, 1, 20);
          // Door
          cottageG.fillStyle(0x40362a, 1);
          cottageG.fillRect(16, 30, 8, 14);
          cottageG.fillStyle(0x6a5642, 1);
          cottageG.fillRect(17, 31, 6, 12);
          // Door knob
          cottageG.fillStyle(0xe6c060, 1);
          cottageG.fillRect(21, 37, 1, 1);
          // Window
          cottageG.fillStyle(0x40362a, 1);
          cottageG.fillRect(7, 28, 6, 6);
          cottageG.fillStyle(0xa8c8e0, 1);
          cottageG.fillRect(8, 29, 4, 4);
          cottageG.fillStyle(0x40362a, 1);
          cottageG.fillRect(27, 28, 6, 6);
          cottageG.fillStyle(0xa8c8e0, 1);
          cottageG.fillRect(28, 29, 4, 4);
          // Window light spot
          cottageG.fillStyle(0xfff4c8, 1);
          cottageG.fillRect(9, 30, 1, 1);
          cottageG.fillRect(29, 30, 1, 1);
          cottageG.generateTexture("tile-cottage", 40, 44);
          cottageG.destroy();

          // === Banner sprite (24×64) ===
          // Stone plinth + tall pole + flag rectangle. Flag is plain
          // white so we can per-banner tint to the zone accent color.
          const bannerG = this.make.graphics({ x: 0, y: 0 }, false);
          // Plinth (stone)
          bannerG.fillStyle(0x6b6358, 1);
          bannerG.fillRect(4, 54, 16, 10);
          bannerG.fillStyle(0x8c8478, 1);
          bannerG.fillRect(4, 54, 16, 2);
          bannerG.fillStyle(0x4a4338, 1);
          bannerG.fillRect(4, 62, 16, 2);
          // Pole
          bannerG.fillStyle(0x40362a, 1);
          bannerG.fillRect(11, 8, 2, 48);
          // Flag (white — caller tints per zone)
          bannerG.fillStyle(0xffffff, 1);
          bannerG.fillRect(13, 10, 10, 18);
          // Flag shadow / fold
          bannerG.fillStyle(0xcccccc, 1);
          bannerG.fillRect(13, 26, 10, 2);
          // Pole top finial
          bannerG.fillStyle(0xe6c060, 1);
          bannerG.fillRect(11, 6, 2, 2);
          bannerG.generateTexture("tile-banner", 24, 64);
          bannerG.destroy();

          // === Tree sprite (48×56) ===
          // Chunky bushy canopy + brown trunk. Built once, placed many
          // times. Two color shells for that "shaded volume" feel.
          const treeG = this.make.graphics({ x: 0, y: 0 }, false);
          // Trunk
          treeG.fillStyle(0x4a2e1a, 1);
          treeG.fillRect(20, 38, 8, 14);
          treeG.fillStyle(0x301d0e, 1);
          treeG.fillRect(20, 50, 8, 2);
          // Canopy — outer (darkest)
          treeG.fillStyle(0x1f3a18, 1);
          treeG.fillCircle(24, 22, 22);
          // Canopy — mid
          treeG.fillStyle(0x2f5a24, 1);
          treeG.fillCircle(24, 22, 19);
          // Canopy — light spot
          treeG.fillStyle(0x4a7a36, 1);
          treeG.fillCircle(20, 18, 12);
          // Highlight blob top-left
          treeG.fillStyle(0x6a9a48, 1);
          treeG.fillCircle(18, 14, 5);
          treeG.generateTexture("tile-tree", 48, 56);
          treeG.destroy();
        }

        /** Stone-paved path between two world points. Rendered as a
         *  tileSprite of the stone-tile texture for the proper "Zelda
         *  flagstone path" feel — no flat colored rectangles. */
        buildPath(x1: number, y1: number, x2: number, y2: number) {
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.hypot(dx, dy);
          const cx = (x1 + x2) / 2;
          const cy = (y1 + y2) / 2;
          const angle = Math.atan2(dy, dx);
          const path = this.add.tileSprite(cx, cy, len, 64, "tile-stone");
          path.setRotation(angle);
          path.setDepth(-9);
        }

        /** Build a themed sub-zone with: a circular floor of distinct
         *  ground color, a landmark cluster of primitive shapes
         *  matching the zone's identity, a wordmark, and a soft glow.
         *  Zones differ visually so the user navigates by landmark,
         *  not by reading text. */
        buildZone(opts: {
          x: number;
          y: number;
          label: string;
          color: number;
          ground: number;
          kind: "atelier" | "pavilion" | "grove" | "forum";
        }) {
          const { x, y, label, color, ground, kind } = opts;

          // Distinct floor tint per zone — warm for brands, cool for
          // ateliers, green for grove, dusk-pink for forum.
          this.add
            .circle(x, y, 170, ground, 0.92)
            .setStrokeStyle(1, color, 0.35)
            .setDepth(-8);

          // Inner accent ring + soft glow disc.
          this.add
            .circle(x, y, 170, color, 0)
            .setStrokeStyle(1, color, 0.18)
            .setDepth(-7);
          this.add.circle(x, y, 130, color, 0.06).setDepth(-7);

          // === Zone-specific landmark ===
          if (kind === "atelier") {
            // 4 ArMM1998 houses arranged as a creator workshop district.
            // 2 big houses flanking + 2 small cottages — classic
            // Zelda-village layout. Scaled 3× source so each building
            // is properly imposing next to a 60-px-tall character.
            const buildings: Array<[number, number, string, number]> = [
              [-110, -50, "house-a",       3.0],
              [110,  -50, "house-b",       3.0],
              [-100,  90, "cottage-small", 2.5],
              [100,   90, "cottage-small", 2.5],
            ];
            for (const [ox, oy, frame, scale] of buildings) {
              const b = this.add.image(x + ox, y + oy, "armm", frame);
              b.setOrigin(0.5, 0.85);
              b.setScale(scale);
              b.setDepth(-6 + oy * 0.0001);
            }
          } else if (kind === "pavilion") {
            // Brand Pavilions: 2 detailed houses + market stall + a
            // formation of blue banners. SNES-fair-style square.
            const houseL = this.add.image(x - 110, y - 50, "armm", "house-a");
            houseL.setOrigin(0.5, 0.85).setScale(3.0).setDepth(-6);
            const houseR = this.add.image(x + 110, y - 50, "armm", "house-b");
            houseR.setOrigin(0.5, 0.85).setScale(3.0).setDepth(-6);
            // Market stall centered
            const stall = this.add.image(x, y + 50, "armm", "market-stall");
            stall.setOrigin(0.5, 0.85).setScale(2.5).setDepth(-5);
            // 5 banner poles flanking
            const bannerXs = [-180, -100, 0, 100, 180];
            for (const bx of bannerXs) {
              const banner = this.add.image(x + bx, y + 130, "armm", "banner-blue");
              banner.setOrigin(0.5, 0.95).setScale(2.0).setDepth(-4);
              banner.setTint(color);
              this.tweens.add({
                targets: banner,
                x: { from: x + bx - 1, to: x + bx + 1 },
                duration: 1500 + Math.random() * 400,
                ease: "Sine.inOut",
                yoyo: true,
                repeat: -1,
              });
            }
          } else if (kind === "grove") {
            // Round green canopy trees in the Zelda-overworld style,
            // clustered + understory bushes + a boulder + log for
            // natural-feel decor.
            const layout: Array<[number, number, string, number]> = [
              [   0,  -90, "tree-round", 2.8],
              [ -90,  -50, "tree-round", 2.4],
              [  90,  -50, "tree-round", 2.4],
              [-110,   20, "tree-round", 2.2],
              [ 110,   20, "tree-round", 2.2],
              [ -50,   80, "tree-round", 2.0],
              [  50,   80, "tree-round", 2.0],
            ];
            for (const [ox, oy, frame, scale] of layout) {
              const t = this.add.image(x + ox, y + oy, "armm", frame);
              t.setOrigin(0.5, 0.85);
              t.setScale(scale);
              t.setDepth(-5 + oy * 0.0001);
            }
            // Bushes scattered as understory
            const bushes: Array<[number, number, string]> = [
              [ -70, 120, "bush-a"], [ 70, 120, "bush-b"],
              [-140,  80, "bush-b"], [140,  80, "bush-a"],
              [   0, 140, "bush-a"], [-30, -30, "bush-b"],
            ];
            for (const [ox, oy, frame] of bushes) {
              const b = this.add.image(x + ox, y + oy, "armm", frame);
              b.setOrigin(0.5, 0.7);
              b.setScale(2.2);
              b.setDepth(-4);
            }
            // A boulder + log as ground props
            const boulder = this.add.image(x + 30, y - 10, "armm", "boulder");
            boulder.setOrigin(0.5, 0.85).setScale(2.0).setDepth(-4);
            const log = this.add.image(x - 60, y + 50, "armm", "log");
            log.setOrigin(0.5, 0.85).setScale(2.0).setDepth(-4);
          } else if (kind === "forum") {
            // Forum: a stone gate + 4 cone-roofed towers around a
            // central statue. Reads as a civic square with monuments.
            const statue = this.add.image(x, y, "armm", "statue");
            statue.setOrigin(0.5, 0.85).setScale(3.0).setDepth(-5);
            const gate = this.add.image(x, y - 110, "armm", "stone-gate");
            gate.setOrigin(0.5, 0.85).setScale(2.5).setDepth(-6);
            // 4 small towers at compass points
            for (const [ox, oy] of [[-130, -30], [130, -30], [-130, 100], [130, 100]]) {
              const tower = this.add.image(x + ox, y + oy, "armm", "tower-cone");
              tower.setOrigin(0.5, 0.85).setScale(2.0).setDepth(-6);
            }
          }

          // Wordmark below the zone — mono uppercase, accent color.
          this.add
            .text(x, y + 190, label, {
              fontFamily: "Inter, ui-monospace, monospace",
              fontSize: "12px",
              fontStyle: "700",
              color: hex(color),
            })
            .setOrigin(0.5)
            .setDepth(-3);
        }

        /** Build an archetype badge (~32 px) in the right head-shape
         *  for the given code, in the accent color. Sized to read as
         *  the character's "head" — the archetype is the dominant
         *  visual feature, not the LPC body underneath. Returns a
         *  container with a soft glow + the shape outline + a small
         *  inner dot, so it reads as a logo not a noise dot. */
        buildBadge(code: string, color: number): Phaser.GameObjects.Container {
          const c = this.add.container(0, 0);
          const shape = ARCHETYPE_SHAPE[code] ?? "circle";

          // Soft circular glow behind every badge regardless of shape.
          const glow = this.add.circle(0, 0, 20, color, 0.32);
          c.add(glow);

          const g = this.add.graphics();
          g.lineStyle(2, color, 1);
          g.fillStyle(0x0b0f12, 0.92);
          const r = 12;
          if (shape === "circle") {
            g.fillCircle(0, 0, r);
            g.strokeCircle(0, 0, r);
          } else if (shape === "oval") {
            g.fillEllipse(0, 0, r * 2.2, r * 1.6);
            g.strokeEllipse(0, 0, r * 2.2, r * 1.6);
          } else if (shape === "square") {
            g.fillRect(-r, -r, r * 2, r * 2);
            g.strokeRect(-r, -r, r * 2, r * 2);
          } else if (shape === "round-rect") {
            g.fillRoundedRect(-r * 1.1, -r * 0.9, r * 2.2, r * 1.8, 3);
            g.strokeRoundedRect(-r * 1.1, -r * 0.9, r * 2.2, r * 1.8, 3);
          } else if (shape === "diamond") {
            const d = r * 1.15;
            const pts = [0, -d, d, 0, 0, d, -d, 0];
            g.fillPoints(pairs(pts), true);
            g.strokePoints(pairs(pts), true);
          } else if (shape === "triangle") {
            const d = r * 1.15;
            const pts = [0, -d, d, d * 0.85, -d, d * 0.85];
            g.fillPoints(pairs(pts), true);
            g.strokePoints(pairs(pts), true);
          } else if (shape === "hexagon") {
            const pts: number[] = [];
            for (let i = 0; i < 6; i++) {
              const a = (Math.PI / 3) * i - Math.PI / 2;
              pts.push(Math.cos(a) * r, Math.sin(a) * r);
            }
            g.fillPoints(pairs(pts), true);
            g.strokePoints(pairs(pts), true);
          } else if (shape === "pentagon") {
            const pts: number[] = [];
            for (let i = 0; i < 5; i++) {
              const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
              pts.push(Math.cos(a) * r, Math.sin(a) * r);
            }
            g.fillPoints(pairs(pts), true);
            g.strokePoints(pairs(pts), true);
          }
          c.add(g);

          // Inner dot — the "face anchor" from the mark system.
          c.add(this.add.circle(0, 0, 3, color, 1));

          return c;
        }

        /** Compose the central Plaza — concentric paved pad, fountain
         *  rim with pulsing water, four corner light pillars, and a
         *  quiet "PLAZA · GHOSTSIGNAL" wordmark inscribed on the
         *  outer ring. All drawn with Phaser primitives — no tileset
         *  yet. Phase 3 swaps these for proper LPC tiles. */
        buildPlaza(cx: number, cy: number) {
          const accent = 0x7c58d6;

          // 1) Outer paved disc — large, very soft.
          this.add
            .circle(cx, cy, 220, 0x1f2632, 0.85)
            .setStrokeStyle(1, 0x3a414b, 0.5)
            .setDepth(-9);
          // 2) Concentric ring at ~160 with archetype-violet hairline.
          this.add
            .circle(cx, cy, 160, accent, 0)
            .setStrokeStyle(1, accent, 0.32)
            .setDepth(-8);
          // 3) Inner stone pad.
          this.add
            .circle(cx, cy, 120, 0x252c39, 0.9)
            .setStrokeStyle(1, accent, 0.18)
            .setDepth(-7);

          // 4) Compass-direction paving slabs radiating out.
          const slab = (angleRad: number) => {
            const dist = 180;
            const px = cx + Math.cos(angleRad) * dist;
            const py = cy + Math.sin(angleRad) * dist;
            const slabShape = this.add.rectangle(px, py, 56, 28, 0x1f2632, 0.75);
            slabShape.setStrokeStyle(1, accent, 0.18);
            slabShape.setRotation(angleRad + Math.PI / 2);
            slabShape.setDepth(-8);
          };
          slab(0);
          slab(Math.PI / 2);
          slab(Math.PI);
          slab(-Math.PI / 2);

          // 5) Real ArMM1998 stone fountain as the plaza centerpiece.
          const fountain = this.add.image(cx, cy, "armm", "fountain-a");
          fountain.setOrigin(0.5, 0.65);
          fountain.setScale(3.0);
          fountain.setDepth(-5);
          // Subtle accent-tinted underlay so the fountain glows in
          // the plaza accent color.
          this.add.ellipse(cx, cy + 12, 180, 36, accent, 0.18).setDepth(-7);

          // 6) Four GhostSignal banner poles at the compass tips.
          for (const [ox, oy] of [[200, 0], [-200, 0], [0, 200], [0, -200]]) {
            const banner = this.add.image(cx + ox, cy + oy, "armm", "banner-blue");
            banner.setOrigin(0.5, 0.95).setScale(2.2).setDepth(-4);
            banner.setTint(accent);
            this.tweens.add({
              targets: banner,
              x: { from: cx + ox - 1, to: cx + ox + 1 },
              duration: 1600 + Math.random() * 400,
              ease: "Sine.inOut",
              yoyo: true,
              repeat: -1,
            });
          }

          // 7) Wordmark inscribed below the plaza.
          this.add
            .text(cx, cy + 246, "PLAZA · GHOSTSIGNAL", {
              fontFamily: "Inter, ui-monospace, monospace",
              fontSize: "11px",
              color: "#a78bd9",
              fontStyle: "600",
            })
            .setOrigin(0.5)
            .setDepth(-3);
        }

        /** Public send entry the React HUD calls when the user submits
         *  a chat message. No-op if not connected yet. */
        sendChat(body: string) {
          this.room?.send("chat", { body });
        }

        /** Spawn a speech bubble above the speaker's avatar. Word-wraps,
         *  accent-tinted by archetype, drifts up + fades over 4 s. */
        spawnBubble(msg: ChatMessage) {
          const avatar = this.avatars.get(msg.sessionId);
          if (!avatar) return;
          const color = ARCHETYPE_COLOR[msg.archetype] ?? 0xffffff;

          // Build the bubble at the avatar's current world position.
          // Phaser layers float as their own GameObjects (NOT children
          // of the avatar container) so the bubble can drift up freely
          // without being dragged by the avatar's idle bob.
          const px = avatar.x;
          const py = avatar.y - 108;

          const bubble = this.add.container(px, py);
          bubble.setDepth(50);

          const text = this.add
            .text(0, 0, msg.body, {
              fontFamily: "Inter, sans-serif",
              fontSize: "12px",
              color: "#0b0f12",
              wordWrap: { width: 200 },
              align: "center",
              padding: { x: 0, y: 0 },
            })
            .setOrigin(0.5, 0.5);

          const w = Math.max(40, text.width + 20);
          const h = text.height + 12;
          const bg = this.add.graphics();
          bg.fillStyle(0xf6f4ff, 0.96);
          bg.lineStyle(2, color, 1);
          bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
          bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
          // Tail pointing down at the avatar's head.
          bg.fillStyle(0xf6f4ff, 0.96);
          bg.lineStyle(2, color, 1);
          bg.beginPath();
          bg.moveTo(-6, h / 2);
          bg.lineTo(0, h / 2 + 8);
          bg.lineTo(6, h / 2);
          bg.closePath();
          bg.fillPath();
          bg.strokePath();

          bubble.add([bg, text]);

          // Animate: float up + fade out over 4 s.
          this.tweens.add({
            targets: bubble,
            y: py - 28,
            alpha: { from: 1, to: 0 },
            duration: 4000,
            ease: "Sine.out",
            onComplete: () => bubble.destroy(),
          });

          // While the bubble lives, follow the avatar horizontally so
          // it doesn't lag behind a walking speaker.
          const follow = this.time.addEvent({
            delay: 16,
            loop: true,
            callback: () => {
              if (!bubble.active) {
                follow.remove();
                return;
              }
              const a = this.avatars.get(msg.sessionId);
              if (a) bubble.x = a.x;
            },
          });
        }

        shutdown() {
          this.room?.leave();
          this.room = null;
        }
      }

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: hostRef.current,
        width: hostRef.current.clientWidth,
        height: hostRef.current.clientHeight,
        backgroundColor: "#0b0f12",
        pixelArt: true,
        roundPixels: true,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [WorldScene],
      });
      gameRef.current = game;
      // Expose the scene's chat sender to React. The scene exists once
      // the game has booted its first frame.
      sendChatRef.current = (body: string) => {
        const scene = game.scene.getScene("world") as WorldScene | null;
        scene?.sendChat(body);
      };
      // The action button + "Press E" prompt are driven by the
      // scene's per-frame trigger check. We poll for the scene to
      // exist (it doesn't until Phaser's first boot tick), then wire
      // both ends: scene → React via onAction, React → scene via
      // triggerActionRef.
      const wireAction = () => {
        const scene = game.scene.getScene("world") as WorldScene | null;
        if (!scene) {
          // Scene not booted yet — try again next tick.
          setTimeout(wireAction, 30);
          return;
        }
        scene.onAction = (next) => setAction(next);
        triggerActionRef.current = () => scene.tryAction();
        setChatFocusRef.current = (focused) => {
          if (scene.input.keyboard) {
            scene.input.keyboard.enabled = !focused;
          }
        };
        scene.focusChat = () => chatInputRef.current?.focus();
        setCardRef.current = (c) => setCard(c);
        scene.openOwnCard = () => {
          const data = scene.lastSelfPlayer;
          if (!data) return;
          setCardRef.current?.({
            displayName: data.displayName,
            archetype: data.archetype,
            isSelf: true,
          });
        };
        scene.openOtherCard = (sessionId: string) => {
          const data = scene.playerSnapshots.get(sessionId);
          if (!data) return;
          const baseCard = {
            displayName: data.displayName,
            archetype: data.archetype,
            isSelf: false,
            selfArchetype: scene.lastSelfPlayer?.archetype,
          };
          // Guest? No real RQ/XQ to fetch — surface the generic
          // per-archetype copy that the card already renders.
          if (!data.authUserId) {
            setCardRef.current?.({ ...baseCard, rich: null });
            return;
          }
          // Authenticated player. Show the card immediately in
          // "loading" state, then fold in the real RQ/XQ payload once
          // the API responds. The card stays open if the fetch fails.
          setCardRef.current?.({ ...baseCard, rich: "loading" });
          fetch(
            `/api/studio/players/${encodeURIComponent(data.authUserId)}/summary`,
            { cache: "no-store" },
          )
            .then((res) => res.json())
            .then((body) => {
              if (!body?.ok || !body.player) {
                setCardRef.current?.({ ...baseCard, rich: null });
                return;
              }
              const p = body.player as {
                organization: string | null;
                memberType: "brand" | "creator" | "other";
                xq: {
                  code: string | null;
                  archetypeName: string | null;
                  tagline: string | null;
                  values: {
                    nonNegotiables: string[];
                    core: string[];
                    aspirational: string[];
                  };
                } | null;
                rq: {
                  code: string | null;
                  name: string | null;
                  clarityLabel: string | null;
                  clarityNote: string | null;
                  undertone: string | null;
                } | null;
              };
              setCardRef.current?.({
                ...baseCard,
                rich: {
                  organization: p.organization,
                  memberType: p.memberType,
                  xq: p.xq,
                  rq: p.rq,
                },
              });
            })
            .catch(() => {
              setCardRef.current?.({ ...baseCard, rich: null });
            });
        };
      };
      wireAction();

      cleanup = () => {
        const scene = game.scene.getScene("world") as WorldScene | null;
        scene?.shutdown();
        game.destroy(true);
        gameRef.current = null;
      };
    })();

    return () => {
      destroyed = true;
      cleanup?.();
    };
  }, []);

  // Press Enter anywhere in the world (outside any input/textarea)
  // to focus the chat box. Bypasses Phaser's keyboard plugin so we
  // don't depend on the scene's enabled state. The form's onSubmit
  // already handles Enter inside the input.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      // If a real text input/textarea already has focus, let it
      // handle the Enter (form submit logic kicks in).
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (chatInputRef.current) {
        e.preventDefault();
        chatInputRef.current.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function submitChat(e: React.FormEvent) {
    e.preventDefault();
    const body = chatDraft.trim();
    // Always blur on Enter — whether or not there's a message — so
    // the player can resume moving without an extra click. onBlur
    // re-enables the Phaser keyboard handlers.
    chatInputRef.current?.blur();
    if (!body) return;
    sendChatRef.current?.(body);
    setChatDraft("");
  }

  return (
    <main className={`${styles.worldRoot} ${windowed ? styles.worldWindowed : ""}`}>
      <div ref={hostRef} className={styles.canvasHost} aria-label="GhostSignal world canvas" />
      {card && (
        <CharacterCard
          data={card}
          onClose={() => setCard(null)}
          onSendMessage={(toName) => {
            // Prefill the chat input with an @-mention and focus it.
            // No real DM channel yet — Phase 3 adds a server route.
            setChatDraft(`@${toName} `);
            setCard(null);
            // Defer focus until after the card unmounts.
            requestAnimationFrame(() => chatInputRef.current?.focus());
          }}
        />
      )}
      {action && (
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => triggerActionRef.current?.()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <span className={styles.actionKey}>E</span>
          <span className={styles.actionLabel}>{action.label}</span>
        </button>
      )}
      <form
        className={styles.chatForm}
        onSubmit={submitChat}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={chatInputRef}
          type="text"
          className={styles.chatInput}
          value={chatDraft}
          onChange={(e) => setChatDraft(e.target.value.slice(0, 200))}
          onFocus={() => setChatFocusRef.current?.(true)}
          onBlur={() => setChatFocusRef.current?.(false)}
          placeholder="Press Enter to speak…"
          aria-label="Speak to the world"
          maxLength={200}
        />
      </form>
    </main>
  );
}

/** Stable identity for a WorldAction — drives the React HUD diff.
 *  Including the building id means two adjacent doors flip the pill
 *  text correctly when the player walks between them. */
function actionKey(a: WorldAction): string {
  if (!a) return "none";
  if (a.kind === "enter-building") return `enter:${a.buildingId}`;
  if (a.kind === "exit-building") return "exit";
  if (a.kind === "mount-horse") return "mount";
  if (a.kind === "dismount-horse") return "dismount";
  return `talk:${a.sessionId}`;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Phaser's Graphics fillPoints / strokePoints want an array of
 *  {x, y} objects. We carry the badge vertices as a flat number list
 *  for readability and convert here. */
function pairs(flat: number[]): Phaser.Types.Math.Vector2Like[] {
  const out: Phaser.Types.Math.Vector2Like[] = [];
  for (let i = 0; i < flat.length; i += 2) {
    out.push({ x: flat[i], y: flat[i + 1] });
  }
  return out;
}

/** Convert a Phaser color int (e.g. 0xfbad25) to a CSS hex string
 *  (e.g. "#fbad25") for use in Text fill colors. */
function hex(color: number): string {
  return "#" + color.toString(16).padStart(6, "0");
}

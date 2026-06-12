"use client";

import { useEffect, useRef, useState } from "react";
import { Client, Room } from "colyseus.js";

import styles from "./world.module.css";

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

const ARCHETYPE_COLOR: Record<string, number> = {
  "C-P-C": 0xfbad25,
  "C-P-L": 0xff7bad,
  "C-S-C": 0xd66157,
  "C-S-L": 0x00b29c,
  "X-P-C": 0x9f71af,
  "X-P-L": 0xfa7b3f,
  "X-S-C": 0x4dc9ae,
  "X-S-L": 0x7c58d6,
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
};

const TILE = 32;
// World sized to match the Harvest Moon village background at 3×
// native scale (768 × 1024 × 3 = 2304 × 3072 px → 72 × 96 tiles).
const WORLD_W_TILES = 72;
const WORLD_H_TILES = 96;
const VILLAGE_SCALE = 3;
const SPEED = 6;
const SEND_INTERVAL_MS = 100;

// === Church interior ===
// Church.png is 240×465 px native; at 3× display scale that's
// 720×1395 px. We render it as its own "room" with its own camera +
// movement bounds. The interior lives at the SAME world-space block
// that the church facade occupies in the village so a player coming
// out of the door reappears where they entered.
const CHURCH_INTERIOR_SCALE = 3;
const CHURCH_INTERIOR_W = 240 * CHURCH_INTERIOR_SCALE; // 720
const CHURCH_INTERIOR_H = 465 * CHURCH_INTERIOR_SCALE; // 1395
// Interior is anchored top-center to mirror the church column on the
// village map. Interior origin in world coords:
const CHURCH_INTERIOR_X = (WORLD_W_TILES * TILE) / 2 - CHURCH_INTERIOR_W / 2;
const CHURCH_INTERIOR_Y = 0;
// Door trigger on the village map — where the player must stand to
// enter the church. Native (768×1024) door center ~ (355, 150);
// trigger sits ON the door itself at native (355, 140) — slightly
// above where the painted door reads visually, since the avatar's
// origin point (feet) needs to be at this y for the prompt to fire.
// Multiply by VILLAGE_SCALE for world coords.
const CHURCH_DOOR_X = 355 * VILLAGE_SCALE; // 1065
const CHURCH_DOOR_Y = 140 * VILLAGE_SCALE; // 420
const CHURCH_DOOR_RADIUS = 56;
// Inside-the-church spawn — just above the bottom door, on the red
// carpet. Interior PNG native door ~(120, 445); at 3× = (360, 1335).
const CHURCH_INTERIOR_SPAWN_X = CHURCH_INTERIOR_X + 120 * CHURCH_INTERIOR_SCALE; // door-center, interior-local
const CHURCH_INTERIOR_SPAWN_Y = CHURCH_INTERIOR_Y + 425 * CHURCH_INTERIOR_SCALE; // a few px above the bottom edge
// Exit trigger inside the church — decoupled from the spawn so we
// can place it on the painted door tile itself. Sits ~30 px (PNG
// native) below the spawn so the player has to walk down to leave
// rather than triggering it immediately on entry.
const CHURCH_INTERIOR_EXIT_X = CHURCH_INTERIOR_SPAWN_X;
const CHURCH_INTERIOR_EXIT_Y = CHURCH_INTERIOR_Y + 455 * CHURCH_INTERIOR_SCALE;
const CHURCH_EXIT_RADIUS = 72;

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

function pickArchetype(): string {
  return ARCHETYPE_CODES[Math.floor(Math.random() * ARCHETYPE_CODES.length)];
}

/** Authoritative-snapshot shape received from the server. Matches
 *  `apps/game-server/src/rooms/WorldRoom.ts` PlayerData. */
type ServerPlayer = {
  sessionId: string;
  userId: string;
  displayName: string;
  archetype: string;
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

type ChatMessage = {
  sessionId: string;
  displayName: string;
  archetype: string;
  body: string;
  at: number;
};

/** A keypress-triggered action the player can take right now —
 *  surfaced by the Phaser scene whenever the player stands inside a
 *  trigger zone (church door, future shop doors, etc.). Consumed by
 *  the React HUD to render the on-screen action button. */
type WorldAction = { kind: "enter-church" | "exit-church"; label: string } | null;

/** Which "room" the local player is currently rendered in. Other
 *  rooms get added later (shops, atelier, council hall) and use the
 *  same single-Phaser-scene location pattern. */
type WorldLocation = "village" | "church-interior";

export default function WorldClient() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<unknown>(null);
  /** Set inside the Phaser scene's create(). The HUD's chat form calls
   *  this on submit. */
  const sendChatRef = useRef<((body: string) => void) | null>(null);
  /** Set inside the Phaser scene's create(). The HUD's action button
   *  calls this when clicked; the scene resolves it to enter/exit. */
  const triggerActionRef = useRef<(() => void) | null>(null);
  const [chatDraft, setChatDraft] = useState("");
  const [action, setAction] = useState<WorldAction>(null);

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
        ownPos = { x: WORLD_W_TILES / 2, y: WORLD_H_TILES / 2 };
        ownFacing: "down" | "up" | "left" | "right" = "down";
        ownArchetype = "X-S-L";
        lastSendAt = 0;

        statusText!: Phaser.GameObjects.Text;
        hintText!: Phaser.GameObjects.Text;
        /** Ambient chicken NPCs — client-only state, no server sync. */
        chickens: Chicken[] = [];

        // === Church interior state ===
        /** Which room the local player is in. Drives backdrop swap,
         *  camera + movement bounds, and who's visible. */
        location: WorldLocation = "village";
        /** Village backdrop — hidden while the player is in an
         *  interior. */
        villageBg: Phaser.GameObjects.Image | null = null;
        /** The interior backdrop image — created at scene start,
         *  hidden until the player enters the church. */
        churchInteriorBg: Phaser.GameObjects.Image | null = null;
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
        /** Village-tile position to restore when the player exits the
         *  church. Captured at the moment of entry. */
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
          // Harvest Moon chicken sheet — mature + baby chick poses.
          this.load.image(
            "hm-chickens",
            "/world/sprites/SNES - Harvest Moon - Animals - Chicken.png",
          );
          // Church interior background — entered via the door on the
          // village map. 240×465 native; rendered at 3× to match the
          // village's display scale.
          this.load.image(
            "hm-church-interior",
            "/world/sprites/SNES - Harvest Moon - Backgrounds - Church.png",
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

          // === Harvest Moon chickens ===
          // Mature hen + baby chick near the world spawn point. Each
          // runs its own idle → scared → wander state machine
          // (see updateChickens) so they react when a player gets close.
          const spawnX = worldW / 2;
          const spawnY = worldH / 2;
          this.chickens.push(
            this.spawnChicken({
              x: spawnX + 96,
              y: spawnY + 60,
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
              x: spawnX + 56,
              y: spawnY + 88,
              idleFrame: "chick",
              walkFrames: ["chick", "chick-walk"],
              triggerRadius: 80,
              speed: 140,
              bobAmp: 3,
              bobMs: 700,
            }),
          );

          // Soft world-border vignette so the camera bounds don't read
          // as a hard wall — a dark frame around the playable area.
          const vG = this.add.graphics();
          vG.lineStyle(8, 0x0b0f12, 0.7);
          vG.strokeRect(-4, -4, worldW + 8, worldH + 8);
          vG.setDepth(-8);

          this.cameras.main.setBounds(0, 0, worldW, worldH);
          this.cameras.main.centerOn(worldW / 2, worldH / 2);

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
            .text(16, this.scale.height - 28, "WASD / arrows to move", {
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
          this.keys = {
            up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
            down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
            left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
            right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
            w: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            a: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            s: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            d: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            e: kb.addKey(Phaser.Input.Keyboard.KeyCodes.E),
          };
          // Single-shot E handler (keyDown event, not held). The
          // per-frame check in update() can't use .isDown alone —
          // that'd re-trigger on every frame the player holds E.
          this.keys.e.on("down", () => this.tryAction());

          // === Church interior backdrop ===
          // Created hidden; flipped on by enterChurch(). Lives at the
          // same world-space block as the church facade on the
          // village painting so the camera shift feels like a real
          // pan into the building.
          this.churchInteriorBg = this.add.image(
            CHURCH_INTERIOR_X,
            CHURCH_INTERIOR_Y,
            "hm-church-interior",
          );
          this.churchInteriorBg.setOrigin(0, 0);
          this.churchInteriorBg.setScale(CHURCH_INTERIOR_SCALE);
          this.churchInteriorBg.setDepth(-10);
          this.churchInteriorBg.setVisible(false);

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
            const archetype = pickArchetype();
            // 8s timeout race surfaces a stuck WebSocket upgrade as an
            // error in the HUD instead of an infinite "Connecting…".
            const room = await Promise.race([
              this.client.joinOrCreate("world", {
                archetype,
                displayName: `Guest-${Math.floor(Math.random() * 9999)
                  .toString()
                  .padStart(4, "0")}`,
              }),
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
            -76,
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

          // Archetype identity badge — sits just over the head, inside
          // the halo glow so it reads as part of the character rather
          // than something floating above. The YOU/name label sits
          // above the badge.
          const badge = this.buildBadge(player.archetype, color);
          badge.setPosition(0, -42);

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
          if (this.location === "village") this.updateChickens(dt);

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
            this.ownPos.x = clamp(
              this.ownPos.x + vx * SPEED * dt,
              bounds.minX,
              bounds.maxX,
            );
            this.ownPos.y = clamp(
              this.ownPos.y + vy * SPEED * dt,
              bounds.minY,
              bounds.maxY,
            );
            if (Math.abs(vx) > Math.abs(vy)) {
              this.ownFacing = vx > 0 ? "right" : "left";
            } else {
              this.ownFacing = vy > 0 ? "down" : "up";
            }
            const ownAvatar = this.avatars.get(this.ownSessionId);
            if (ownAvatar) {
              ownAvatar.x = this.ownPos.x * TILE;
              ownAvatar.y = this.ownPos.y * TILE;
              this.applyFacing(ownAvatar, this.ownFacing, true);
            }
          } else {
            // Stopped moving — switch own avatar to idle in current facing.
            const ownAvatar = this.avatars.get(this.ownSessionId);
            if (ownAvatar) this.applyFacing(ownAvatar, this.ownFacing, false);
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

        /** Per-location player-clamp rectangle in TILE coordinates.
         *  Interior bounds keep the player inside the church PNG
         *  with a small wall buffer; village uses the full world. */
        movementBoundsTiles(): { minX: number; minY: number; maxX: number; maxY: number } {
          if (this.location === "church-interior") {
            const margin = 32; // px wall buffer
            return {
              minX: (CHURCH_INTERIOR_X + margin) / TILE,
              minY: (CHURCH_INTERIOR_Y + margin) / TILE,
              maxX: (CHURCH_INTERIOR_X + CHURCH_INTERIOR_W - margin) / TILE,
              maxY: (CHURCH_INTERIOR_Y + CHURCH_INTERIOR_H - margin) / TILE,
            };
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

          if (this.location === "village") {
            // Church door — circle around the trigger point so the
            // player can be sloppy by a tile or two.
            const dx = px - CHURCH_DOOR_X;
            const dy = py - CHURCH_DOOR_Y;
            if (Math.hypot(dx, dy) < CHURCH_DOOR_RADIUS) {
              next = { kind: "enter-church", label: "Enter Church" };
            }
          } else if (this.location === "church-interior") {
            // Stand on (or near) the painted bottom-door tile to
            // leave. The exit trigger is decoupled from the spawn
            // so entering doesn't immediately re-fire it.
            const dx = px - CHURCH_INTERIOR_EXIT_X;
            const dy = py - CHURCH_INTERIOR_EXIT_Y;
            if (Math.hypot(dx, dy) < CHURCH_EXIT_RADIUS) {
              next = { kind: "exit-church", label: "Leave Church" };
            }
          }

          // Floating "Press E" above the player. Position on the
          // local avatar each frame so it tracks during movement.
          if (this.pressPrompt && this.ownSessionId) {
            const ownAvatar = this.avatars.get(this.ownSessionId);
            if (next && ownAvatar) {
              this.pressPrompt.setText(`Press E — ${next.label}`);
              this.pressPrompt.setPosition(ownAvatar.x, ownAvatar.y - 90);
              this.pressPrompt.setVisible(true);
            } else {
              this.pressPrompt.setVisible(false);
            }
          }

          // Only push to React when the prompt actually changed —
          // avoids re-rendering the HUD every frame.
          if (
            (this.currentAction?.kind ?? null) !== (next?.kind ?? null)
          ) {
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
          if (a.kind === "enter-church") this.enterChurch();
          else if (a.kind === "exit-church") this.exitChurch();
        }

        /** Swap to the church-interior "room": hide village +
         *  chickens + other-player avatars, show interior backdrop,
         *  teleport local avatar to interior spawn, re-bound the
         *  camera. Single-player visual for now — other clients in
         *  the village will see this player at the interior coords,
         *  which puts them somewhere up near the top of the village
         *  painting. Acceptable for MVP. */
        enterChurch() {
          if (this.location === "church-interior") return;
          this.location = "church-interior";

          // Save where we were so we can put the player back outside
          // the door on exit.
          this.villageReturnTile = { x: this.ownPos.x, y: this.ownPos.y };

          // Hide the village + chickens.
          this.villageBg?.setVisible(false);
          for (const ch of this.chickens) ch.sprite.setVisible(false);
          // Hide everyone else (single-player interior MVP).
          this.avatars.forEach((avatar, sessionId) => {
            if (sessionId !== this.ownSessionId) avatar.setVisible(false);
          });
          this.churchInteriorBg?.setVisible(true);

          // Teleport local player to inside-the-door spawn.
          this.ownPos = {
            x: CHURCH_INTERIOR_SPAWN_X / TILE,
            y: CHURCH_INTERIOR_SPAWN_Y / TILE,
          };
          this.ownFacing = "up"; // face the altar
          const ownAvatar = this.avatars.get(this.ownSessionId!);
          if (ownAvatar) {
            ownAvatar.x = CHURCH_INTERIOR_SPAWN_X;
            ownAvatar.y = CHURCH_INTERIOR_SPAWN_Y;
            this.applyFacing(ownAvatar, this.ownFacing, false);
          }

          // Camera bounded to interior + framed on the spawn.
          this.cameras.main.setBounds(
            CHURCH_INTERIOR_X,
            CHURCH_INTERIOR_Y,
            CHURCH_INTERIOR_W,
            CHURCH_INTERIOR_H,
          );
          this.cameras.main.centerOn(
            CHURCH_INTERIOR_SPAWN_X,
            CHURCH_INTERIOR_SPAWN_Y,
          );

          this.hintText.setText("WASD / arrows to move · E to leave");
        }

        /** Reverse `enterChurch`: hide interior, show village +
         *  chickens + other avatars, drop the player back on the
         *  doorstep where they entered. */
        exitChurch() {
          if (this.location === "village") return;
          this.location = "village";

          this.churchInteriorBg?.setVisible(false);
          // Re-show village + chickens + everyone else.
          this.villageBg?.setVisible(true);
          for (const ch of this.chickens) ch.sprite.setVisible(true);
          this.avatars.forEach((avatar) => avatar.setVisible(true));

          // Put player back exactly where they entered (just outside
          // the door).
          this.ownPos = { ...this.villageReturnTile };
          this.ownFacing = "down";
          const ownAvatar = this.avatars.get(this.ownSessionId!);
          if (ownAvatar) {
            ownAvatar.x = this.ownPos.x * TILE;
            ownAvatar.y = this.ownPos.y * TILE;
            this.applyFacing(ownAvatar, this.ownFacing, false);
          }

          // Camera bounded to full world again.
          const worldW = WORLD_W_TILES * TILE;
          const worldH = WORLD_H_TILES * TILE;
          this.cameras.main.setBounds(0, 0, worldW, worldH);
          this.cameras.main.centerOn(this.ownPos.x * TILE, this.ownPos.y * TILE);

          this.hintText.setText("WASD / arrows to move");
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
          idleFrame: string;
          walkFrames: string[];
          triggerRadius: number;
          speed: number;
          bobAmp: number;
          bobMs: number;
        }): Chicken {
          const sprite = this.add.image(opts.x, opts.y, "hm-chickens", opts.idleFrame);
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
              ch.sprite.x += ch.vx * dt;
              ch.sprite.y += ch.vy * dt;
              // Mirror sprite by horizontal velocity for a tiny bit of
              // directional flair.
              ch.sprite.setFlipX(ch.vx < 0);
              ch.timer -= dt * 1000;
              if (ch.timer <= 0) {
                // Pick a new resting spot — somewhere near home base.
                const r = 60 + Math.random() * 100;
                const a = Math.random() * Math.PI * 2;
                ch.targetX = ch.homeX + Math.cos(a) * r;
                ch.targetY = ch.homeY + Math.sin(a) * r;
                ch.state = "wander";
                ch.timer = 4000; // hard cap so we don't loop forever
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
                ch.sprite.x += (dx / d) * slowerSpeed * dt;
                ch.sprite.y += (dy / d) * slowerSpeed * dt;
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

        /** Build a small archetype badge (~14px) in the right
         *  head-shape for the given code, in the accent color. Returns
         *  a container with a soft glow + the shape outline + small
         *  inner dot, so the badge reads as a logo not a noise dot. */
        buildBadge(code: string, color: number): Phaser.GameObjects.Container {
          const c = this.add.container(0, 0);
          const shape = ARCHETYPE_SHAPE[code] ?? "circle";

          // Soft circular glow behind every badge regardless of shape.
          const glow = this.add.circle(0, 0, 12, color, 0.32);
          c.add(glow);

          const g = this.add.graphics();
          g.lineStyle(2, color, 1);
          g.fillStyle(0x0b0f12, 0.92);
          const r = 7;
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
          c.add(this.add.circle(0, 0, 1.8, color, 1));

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
          const py = avatar.y - 96;

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

  function submitChat(e: React.FormEvent) {
    e.preventDefault();
    const body = chatDraft.trim();
    if (!body) return;
    sendChatRef.current?.(body);
    setChatDraft("");
  }

  return (
    <main className={styles.worldRoot}>
      <div ref={hostRef} className={styles.canvasHost} aria-label="GhostSignal world canvas" />
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
          type="text"
          className={styles.chatInput}
          value={chatDraft}
          onChange={(e) => setChatDraft(e.target.value.slice(0, 200))}
          placeholder="Press Enter to speak…"
          aria-label="Speak to the world"
          maxLength={200}
        />
      </form>
    </main>
  );
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

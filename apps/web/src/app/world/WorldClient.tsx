"use client";

import { useEffect, useRef } from "react";
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

const SERVER_URL =
  process.env.NEXT_PUBLIC_GAME_SERVER_URL ?? "ws://localhost:2567";

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

const TILE = 32;
const WORLD_W_TILES = 80;
const WORLD_H_TILES = 60;
const SPEED = 6;
const SEND_INTERVAL_MS = 100;

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

export default function WorldClient() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<unknown>(null);

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

        keys!: {
          up: Phaser.Input.Keyboard.Key;
          down: Phaser.Input.Keyboard.Key;
          left: Phaser.Input.Keyboard.Key;
          right: Phaser.Input.Keyboard.Key;
          w: Phaser.Input.Keyboard.Key;
          a: Phaser.Input.Keyboard.Key;
          s: Phaser.Input.Keyboard.Key;
          d: Phaser.Input.Keyboard.Key;
        };

        constructor() {
          super("world");
        }

        create() {
          this.cameras.main.setBackgroundColor("#0b0f12");

          const worldW = WORLD_W_TILES * TILE;
          const worldH = WORLD_H_TILES * TILE;

          const ground = this.add.rectangle(
            worldW / 2,
            worldH / 2,
            worldW,
            worldH,
            0x141921,
            1,
          );
          ground.setDepth(-10);

          const g = this.add.graphics();
          g.fillStyle(0x2a313a, 1);
          for (let x = 0; x <= WORLD_W_TILES; x++) {
            for (let y = 0; y <= WORLD_H_TILES; y++) {
              g.fillCircle(x * TILE, y * TILE, 1.5);
            }
          }
          g.lineStyle(2, 0x3a414b, 1);
          g.strokeRect(0, 0, worldW, worldH);

          this.add
            .circle(worldW / 2, worldH / 2, 64, 0x7c58d6, 0)
            .setStrokeStyle(2, 0x7c58d6, 0.45)
            .setDepth(-5);
          this.add
            .text(worldW / 2, worldH / 2 + 84, "PLAZA · SPAWN", {
              fontFamily: "Inter, ui-monospace, monospace",
              fontSize: "11px",
              color: "#7c58d6",
              fontStyle: "600",
            })
            .setOrigin(0.5)
            .setDepth(-5);

          this.cameras.main.setBounds(0, 0, worldW, worldH);
          this.cameras.main.centerOn(worldW / 2, worldH / 2);

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
          };

          this.connect();
        }

        async connect() {
          this.client = new Client(SERVER_URL);
          try {
            const archetype = pickArchetype();
            this.room = await this.client.joinOrCreate("world", {
              archetype,
              displayName: `Guest-${Math.floor(Math.random() * 9999)
                .toString()
                .padStart(4, "0")}`,
            });
            this.ownSessionId = this.room.sessionId;
            this.ownArchetype = archetype;
            this.statusText.setText(
              `Connected · ${this.ownSessionId.slice(0, 6)} · ${archetype} · waiting…`,
            );

            this.room.onMessage("state", (msg: StateMessage) => {
              this.applySnapshot(msg.players);
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
          const container = this.add.container(player.x * TILE, player.y * TILE);

          const halo = this.add.circle(0, 0, 28, color, 0.18);
          const shadow = this.add.ellipse(0, 22, 36, 10, 0x000000, 0.45);
          const body = this.add.circle(0, 0, 18, color, 1);
          body.setStrokeStyle(3, 0xffffff, 0.7);
          const eye = this.add.circle(0, 7, 3.5, 0xffffff, 0.95);
          const isOwn = player.sessionId === this.ownSessionId;
          const label = this.add.text(
            0,
            -34,
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

          container.add([halo, shadow, body, eye, label]);
          container.setDepth(10);
          this.avatars.set(player.sessionId, container);
          this.targets.set(player.sessionId, { x: player.x, y: player.y });
          this.applyFacing(container, player.facing);

          if (isOwn) {
            this.cameras.main.centerOn(player.x * TILE, player.y * TILE);
            this.cameras.main.startFollow(container, true, 0.2, 0.2);
            this.ownPos = { x: player.x, y: player.y };
          }
        }

        applyFacing(
          container: Phaser.GameObjects.Container,
          facing: string,
        ) {
          // Container children order: [halo, shadow, body, eye, label]
          const eye = container.list[3] as Phaser.GameObjects.Arc | undefined;
          if (!eye) return;
          const off = 7;
          if (facing === "down") eye.setPosition(0, off);
          else if (facing === "up") eye.setPosition(0, -off);
          else if (facing === "left") eye.setPosition(-off, 0);
          else if (facing === "right") eye.setPosition(off, 0);
        }

        update(_time: number, deltaMs: number) {
          if (!this.room || !this.ownSessionId) return;
          const dt = deltaMs / 1000;

          // Local input → predicted position
          let vx = 0;
          let vy = 0;
          if (this.keys.left.isDown || this.keys.a.isDown) vx -= 1;
          if (this.keys.right.isDown || this.keys.d.isDown) vx += 1;
          if (this.keys.up.isDown || this.keys.w.isDown) vy -= 1;
          if (this.keys.down.isDown || this.keys.s.isDown) vy += 1;
          const moving = vx !== 0 || vy !== 0;
          if (moving) {
            const len = Math.hypot(vx, vy);
            vx /= len;
            vy /= len;
            this.ownPos.x = clamp(
              this.ownPos.x + vx * SPEED * dt,
              0,
              WORLD_W_TILES,
            );
            this.ownPos.y = clamp(
              this.ownPos.y + vy * SPEED * dt,
              0,
              WORLD_H_TILES,
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
              this.applyFacing(ownAvatar, this.ownFacing);
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

  return (
    <main className={styles.worldRoot}>
      <div ref={hostRef} className={styles.canvasHost} aria-label="GhostSignal world canvas" />
    </main>
  );
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

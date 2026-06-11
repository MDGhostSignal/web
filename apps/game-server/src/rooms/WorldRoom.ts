import { Room, Client } from "colyseus";

/**
 * WorldRoom — one Colyseus room per zone of the world.
 *
 * Phase 1 contract — manual JSON broadcast (no @colyseus/schema sync).
 * We tried the schema-3 path but ran into client/server decorator
 * mismatches under Next.js + SWC. For an MVP, broadcasting a plain
 * JSON snapshot at 10 Hz is plenty: 50 players × small payload ×
 * 10 Hz = trivial bandwidth, and we can swap back to schema delta
 * sync once decorators stabilise in Next/SWC.
 *
 * Phase 2 will add: Supabase JWT auth in onAuth, tile-grid collision,
 * chat bubble broadcast, persistence snapshots to Supabase.
 */

type PlayerData = {
  sessionId: string;
  userId: string;
  displayName: string;
  archetype: string;
  x: number;
  y: number;
  facing: "down" | "up" | "left" | "right";
  moving: boolean;
};

type MoveMessage = {
  x: number;
  y: number;
  facing?: PlayerData["facing"];
  moving?: boolean;
};

type JoinOptions = {
  displayName?: string;
  archetype?: string;
};

const ARCHETYPE_CODES = new Set([
  "C-P-C",
  "C-P-L",
  "C-S-C",
  "C-S-L",
  "X-P-C",
  "X-P-L",
  "X-S-C",
  "X-S-L",
]);

export class WorldRoom extends Room {
  maxClients = 50;

  /** Soft world bounds in tiles. Phase 2 replaces with Tiled map. */
  private readonly WORLD_W = 80;
  private readonly WORLD_H = 60;
  private readonly BROADCAST_HZ = 10;

  private players = new Map<string, PlayerData>();
  private tickHandle: NodeJS.Timeout | null = null;

  onCreate() {
    this.onMessage("move", (client, payload: MoveMessage) => {
      const player = this.players.get(client.sessionId);
      if (!player) return;
      player.x = clamp(Number(payload.x) || 0, 0, this.WORLD_W);
      player.y = clamp(Number(payload.y) || 0, 0, this.WORLD_H);
      if (payload.facing) player.facing = payload.facing;
      if (typeof payload.moving === "boolean") player.moving = payload.moving;
    });

    // 10 Hz broadcast of the full player snapshot. Cheap at our scale.
    this.tickHandle = setInterval(() => {
      this.broadcast("state", {
        players: Array.from(this.players.values()),
      });
    }, 1000 / this.BROADCAST_HZ);
  }

  onJoin(client: Client, options: JoinOptions = {}) {
    const archetype = ARCHETYPE_CODES.has(options.archetype ?? "")
      ? (options.archetype as string)
      : "X-S-L";
    const player: PlayerData = {
      sessionId: client.sessionId,
      userId: client.sessionId, // Phase 2: Supabase user id
      displayName: (
        options.displayName ?? `Guest-${client.sessionId.slice(0, 4)}`
      ).slice(0, 24),
      archetype,
      x: this.WORLD_W / 2,
      y: this.WORLD_H / 2,
      facing: "down",
      moving: false,
    };
    this.players.set(client.sessionId, player);

    // Immediate snapshot so the new client sees the world without
    // waiting up to one tick (~100ms).
    client.send("state", { players: Array.from(this.players.values()) });

    console.log(`[WorldRoom] join ${player.displayName} (${client.sessionId})`);
  }

  onLeave(client: Client) {
    this.players.delete(client.sessionId);
    console.log(`[WorldRoom] leave ${client.sessionId}`);
  }

  onDispose() {
    if (this.tickHandle) {
      clearInterval(this.tickHandle);
      this.tickHandle = null;
    }
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

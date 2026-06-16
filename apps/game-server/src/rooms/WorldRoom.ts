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
 * Phase 2 (now): Supabase JWT auth in onAuth. The Studio /world tab
 * passes the access token; the room validates it via Supabase's REST
 * `/auth/v1/user` endpoint, then looks up the corresponding members
 * row (first/last name, xq_archetype, rq_code, organization). Bad or
 * missing tokens fall through to guest UX so the public /world page
 * keeps working without auth.
 */

type AuthGuest = { kind: "guest" };
type AuthAuthed = {
  kind: "authed";
  authUserId: string;
  displayName: string;
  archetype: string;
  rqCode: string | null;
  memberType: "brand" | "creator" | "other";
  organization: string | null;
};
type AuthResult = AuthGuest | AuthAuthed;

type PlayerData = {
  sessionId: string;
  userId: string;
  /** Supabase auth.users.id when the player joined via Studio; null
   *  for guests. This is the key the E-key card uses to fetch the
   *  player's RQ/XQ summary from the Next API. */
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

type MoveMessage = {
  x: number;
  y: number;
  facing?: PlayerData["facing"];
  moving?: boolean;
};

type JoinOptions = {
  displayName?: string;
  archetype?: string;
  /** Supabase access token from a Studio session. Optional — public
   *  /world joins skip this and arrive as guests. */
  token?: string;
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

function normalizeArchetype(value: string | null | undefined): string {
  return value && ARCHETYPE_CODES.has(value) ? value : "X-S-L";
}

function normalizeMemberType(
  value: string | null | undefined,
): "brand" | "creator" | "other" {
  return value === "brand" || value === "creator" ? value : "other";
}

export class WorldRoom extends Room<AuthResult> {
  maxClients = 50;

  /** Soft world bounds in tiles. Matched to the Harvest Moon village
   *  map (768 × 1024 px) at 3× display scale → 72 × 96 tiles. */
  private readonly WORLD_W = 72;
  private readonly WORLD_H = 96;
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

    // Chat — author broadcasts a short message; every client gets it
    // and renders a transient speech bubble above the speaker's avatar.
    // Phase 3 persists to Supabase world_chat for room history.
    this.onMessage("chat", (client, payload: { body?: unknown }) => {
      const player = this.players.get(client.sessionId);
      if (!player) return;
      const raw = typeof payload?.body === "string" ? payload.body : "";
      const body = raw.trim().slice(0, 200);
      if (!body) return;
      this.broadcast("chat", {
        sessionId: client.sessionId,
        displayName: player.displayName,
        archetype: player.archetype,
        body,
        at: Date.now(),
      });
    });

    // 10 Hz broadcast of the full player snapshot. Cheap at our scale.
    this.tickHandle = setInterval(() => {
      this.broadcast("state", {
        players: Array.from(this.players.values()),
      });
    }, 1000 / this.BROADCAST_HZ);
  }

  /**
   * Validate the optional Supabase access token + look up the member
   * record. Returns a guest result when the token is missing or fails
   * to validate so public /world joins still work. Throwing here would
   * disconnect the client; we don't want that for soft-auth.
   */
  async onAuth(_client: Client, options: JoinOptions): Promise<AuthResult> {
    const token = options.token?.trim();
    if (!token) return { kind: "guest" };

    const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !anonKey || !serviceKey) {
      console.warn(
        "[WorldRoom] Supabase env not configured (SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY); falling back to guest.",
      );
      return { kind: "guest" };
    }

    try {
      // 1. Verify the token by asking Supabase who it belongs to. The
      //    /auth/v1/user endpoint accepts the user's access_token in
      //    the Authorization header and returns the auth.users row.
      const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
        },
      });
      if (!userRes.ok) {
        console.warn(
          `[WorldRoom] Token rejected by Supabase (${userRes.status}); guest fallback.`,
        );
        return { kind: "guest" };
      }
      const user = (await userRes.json()) as { id?: string; email?: string };
      if (!user?.id) return { kind: "guest" };

      // 2. Look up the linked member row via the service role so RLS
      //    doesn't block. The auth_user_id column was added by the
      //    Studio identity migration.
      const memberRes = await fetch(
        `${supabaseUrl}/rest/v1/members?auth_user_id=eq.${encodeURIComponent(user.id)}&select=first_name,last_name,member_type,organization,xq_archetype,rq_code&limit=1`,
        {
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
          },
        },
      );
      if (!memberRes.ok) {
        console.warn(
          `[WorldRoom] Member lookup failed (${memberRes.status}); guest fallback.`,
        );
        return { kind: "guest" };
      }
      const members = (await memberRes.json()) as Array<{
        first_name: string | null;
        last_name: string | null;
        member_type: string | null;
        organization: string | null;
        xq_archetype: string | null;
        rq_code: string | null;
      }>;
      const member = members[0];
      if (!member) {
        // Authed Supabase user but no linked Studio member — could be
        // an admin-only user. Treat as guest in the world.
        return { kind: "guest" };
      }

      const first = (member.first_name ?? "").trim();
      const last = (member.last_name ?? "").trim();
      const fallback = (user.email ?? "Member").split("@")[0] ?? "Member";
      const displayName = (`${first} ${last}`.trim() || fallback).slice(0, 24);

      return {
        kind: "authed",
        authUserId: user.id,
        displayName,
        archetype: normalizeArchetype(member.xq_archetype),
        rqCode: member.rq_code ?? null,
        memberType: normalizeMemberType(member.member_type),
        organization: member.organization ?? null,
      };
    } catch (err) {
      console.error("[WorldRoom] onAuth threw — guest fallback:", err);
      return { kind: "guest" };
    }
  }

  onJoin(client: Client, options: JoinOptions = {}) {
    const auth = (client.auth ?? { kind: "guest" }) as AuthResult;

    let player: PlayerData;
    if (auth.kind === "authed") {
      player = {
        sessionId: client.sessionId,
        userId: auth.authUserId,
        authUserId: auth.authUserId,
        displayName: auth.displayName,
        archetype: auth.archetype,
        rqCode: auth.rqCode,
        memberType: auth.memberType,
        organization: auth.organization,
        x: 36,
        y: 51,
        facing: "down",
        moving: false,
      };
    } else {
      player = {
        sessionId: client.sessionId,
        userId: client.sessionId,
        authUserId: null,
        displayName: (
          options.displayName ?? `Guest-${client.sessionId.slice(0, 4)}`
        ).slice(0, 24),
        archetype: normalizeArchetype(options.archetype),
        rqCode: null,
        memberType: "guest",
        organization: null,
        x: 36,
        y: 51,
        facing: "down",
        moving: false,
      };
    }
    this.players.set(client.sessionId, player);

    // Immediate snapshot so the new client sees the world without
    // waiting up to one tick (~100ms).
    client.send("state", { players: Array.from(this.players.values()) });

    console.log(
      `[WorldRoom] join ${player.displayName} (${client.sessionId}, ${player.memberType})`,
    );
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

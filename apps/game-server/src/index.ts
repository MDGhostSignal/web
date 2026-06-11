import { createServer } from "node:http";

import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";

import { WorldRoom } from "./rooms/WorldRoom.js";

/**
 * Colyseus game server bootstrap.
 *
 * Phase 0b-iii — minimal server:
 *  - One room type: "world".
 *  - WebSocket transport on PORT (default 2567).
 *  - No HTTP API surface yet (Phase 2 adds /healthz + /metrics).
 *  - No Supabase JWT auth yet (Phase 2 wires onAuth into the room).
 *
 * The dev flow: `npm run dev` from `apps/game-server/`. The Phaser
 * client (in apps/web/src/app/world/) connects to ws://localhost:PORT
 * when developing locally.
 */
const PORT = Number(process.env.PORT ?? 2567);

const httpServer = createServer();
const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("world", WorldRoom);

httpServer.listen(PORT, () => {
  console.log(`[game-server] Colyseus listening on ws://localhost:${PORT}`);
  console.log(`[game-server] Define room: world (max 50 players)`);
});

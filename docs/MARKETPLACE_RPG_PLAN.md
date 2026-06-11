# Marketplace RPG — Master Plan

**Status:** planning locked 2026-06-11. Phase 0 starting same day.

**Decisions locked with the user (2026-06-11):**
1. Public route: `/world`.
2. Zero asset budget — free/CC-licensed only. LPC 64×64 base instead of Mana Seed; LibreSprite instead of Aseprite.
3. Source pixel art for the 8 archetypes from free/CC pools (LPC wardrobe + custom recolors).
4. Launch timeline: ASAP.
5. The current admin marketplace map (`/admin/marketplace?view=map`) is **being removed**, not kept as a separate read-only surface.

Replaces the current admin marketplace map (`/admin/marketplace?view=map`) with a public-but-authed multiplayer browser RPG where users walk around as their XQ archetype, meet other users, and exchange signals in speech bubbles.

---

## 1 · Stack (locked)

| Layer        | Pick                                    | Why                                                           |
|--------------|-----------------------------------------|---------------------------------------------------------------|
| Client       | Phaser 3 + TS                           | Mature, DOM layer for chat, largest community, best tooling   |
| Game server  | Colyseus on Fly.io                      | Schema-defined state + delta sync; Phaser examples ship       |
| Persistence  | Supabase Postgres                       | Already in stack; service-role writes from game server        |
| Auth         | Supabase JWT → Colyseus `onAuth`        | 20-line integration                                           |
| Realtime A   | Colyseus WebSocket (positions, 10 Hz)   | Binary, authoritative, anti-cheat-by-default                  |
| Realtime B   | Supabase broadcast (chat, presence)     | Already paid for; not on the per-frame critical path          |
| Level editor | Tiled (JSON)                            | Phaser-native loader                                          |
| Sprites      | Aseprite + Mana Seed base               | Best paid base for modular characters                         |
| Style        | 32×32 pixel art, dark navy + accent rim | Eastward at Sea of Stars resolution, matches GhostSignal brand|
| HUD          | DOM React with `--gs-*` tokens          | Inherits motion lib, accessibility, theme                     |

---

## 2 · Architecture

```
Browser ── Next.js /world page (client component)
            ├── Phaser Game (canvas: world + speech bubbles)
            └── React DOM HUD (presence, chat input, contact requests)
                       │
              JWT (Supabase session)
                       ▼
Colyseus on Fly.io ── WorldRoom (one per zone)
            ├── onAuth: verify Supabase JWT
            ├── @schema state {players, npcs, bubbles}
            ├── 10 Hz tick: broadcast deltas (binary)
            └── snapshots → Supabase every 30s + on disconnect
                       │
                       ▼
Supabase Postgres
   world_profiles · world_chat · world_events
   RLS: profile read for authed; writes service-role only from game server
```

### New Supabase tables

```sql
create table world_profiles (
  user_id uuid primary key references auth.users(id),
  xq_code text not null,            -- "X-S-L" etc.
  display_name text not null,
  sprite_overrides jsonb default '{}',
  last_zone text default 'plaza',
  last_x int default 0,
  last_y int default 0,
  last_seen timestamptz default now()
);

create table world_chat (
  id bigserial primary key,
  zone_id text not null,
  author_id uuid references auth.users(id),
  body text not null,
  created_at timestamptz default now()
);

create index on world_chat (zone_id, created_at desc);

create table world_events (
  id bigserial primary key,
  author_id uuid references auth.users(id),
  kind text not null,               -- 'first_meet' | 'signal_sent' | 'zone_entered'
  target_id uuid references auth.users(id),
  zone_id text,
  created_at timestamptz default now()
);
```

RLS: every authed user can read all `world_profiles` and `world_chat` (public world). Writes are service-role only — the Colyseus server holds the service key and is the only writer.

---

## 3 · The 8 archetype sprites

Each archetype gets a 22-frame sprite sheet on the Mana Seed base:
- 4 directions × 4-frame walk (16)
- 2-frame idle (2)
- 2-frame talk (mouth open/close) (2)
- Static portrait used in HUD + chat header (2 — neutral + speaking)

| Code  | Archetype          | Accent  | Silhouette cue            | Signature prop                          |
|-------|--------------------|---------|---------------------------|-----------------------------------------|
| C-P-C | Steward            | #FBAD25 | Robed, hooded             | Lantern (emits warm radius after dusk)  |
| C-P-L | Shepherd           | #FF7BAD | Tall, staff               | Crook + 3 follower sprites              |
| C-S-C | Conservator        | #D66157 | Squared coat, measured    | Compass + ledger satchel                |
| C-S-L | InstitutionBuilder | #00B29C | Broad shoulders, formal   | Scroll under arm, pillar lapel pin      |
| X-P-C | Artisan            | #9F71AF | Loose smock, casual       | Brush belt, paint stains                |
| X-P-L | Catalyst           | #FA7B3F | Lean, leaning forward     | Megaphone, spark particle trail         |
| X-S-C | Designer           | #4DC9AE | Sharp tailored            | Drafting triangle + small compass cross |
| X-S-L | Architect          | #7C58D6 | Long coat, calm command   | Floating node sprite orbiting head      |

**Effort:** ~1 week with an experienced pixel artist, ~3 weeks DIY. Brand-spend, not art-spend — the 8 archetypes ARE the identity.

---

## 4 · Zones (v1 set)

1. **Plaza** — town square, fountain, the lobby zone. All new players spawn here.
2. **Atelier District** — creator-leaning zone, market stalls, studio doors.
3. **Brand Pavilions** — brand-leaning zone, banners, glass-front halls.
4. **The Grove** — quiet conversation zone, no NPCs, for 1:1 signals.

Each zone = one Tiled map + one Colyseus room. Transitions via edge triggers (object layer property `targetZone`).

---

## 5 · HUD elements (DOM React, `--gs-*` tokens)

| Element              | Position     | Behavior                                                 |
|----------------------|--------------|----------------------------------------------------------|
| Presence dot + count | top-right    | Soft accent-tinted dot, count of users in this zone      |
| Nearby rail          | left, slide  | Up to 5 nearby head crops, accent-tinted, click → signal |
| Zone marker          | top-left     | Fades in 2s on zone change, then fades out               |
| Chat input           | bottom       | Enter to speak → bubble above your head + persists       |
| Chat history         | left slideout| Scrollable, brand-tokenized                              |
| Contact prompt       | center       | `[E] Send signal to <Archetype>` when facing within 1 tile|
| Tab → Manual         | overlay      | Tunic-style match log, signals received, threads in flight|

**Omit:** XP, level, health bar, gold counter, hotbar — every one of those signals "MMO" and breaks the genre we're going for.

---

## 6 · Phased build

### Phase 0 — Salvage audit (½ day)
- Keep: `worldLayout.ts`, `game/store.ts`, the Phaser scene scaffold, route shell.
- Scrap: `game/painter.ts` (2925 lines of procedural canvas paint), `MatchMap.tsx`, `Minimap.tsx`, `MatchRibbon.tsx`.
- Refactor: `PhaserMap.tsx` → split into `WorldClient.tsx` + `WorldScene.ts` + `WorldHUD.tsx`.

### Phase 1 — MVP "two tabs see each other" (week 1)
- 1 zone (Plaza), Tiled map exported as JSON.
- 1 placeholder Mana Seed sprite.
- Colyseus `WorldRoom`, anonymous joins, 10 Hz position sync.
- Goal: open two browser tabs, walk into each other, latency feels right.

### Phase 2 — "Show to friends" (weeks 2–4)
- Supabase JWT auth on Colyseus.
- All 8 archetype sprites.
- Speech bubbles (Phaser DOM layer, persisted to `world_chat`).
- Presence list, contact requests.
- 3 zones with edge transitions.
- Mobile virtual joystick.
- Public route `/world` gated to authed users with completed XQ.

### Phase 3 — Polish (months 2–4)
- NPC mentors on schedules (server-driven).
- `world_events` writes on first-meet → surfaces on profile.
- Contact-request flow ties into CRM (`/admin/marketplace`).
- Voice proximity (LiveKit) — optional.
- Moderation: report button, mute/ban flag, admin queue under `/admin/world-moderation`.

---

## 7 · Reality checks

- **Effort:** Phase 1 ≈ 5–8 dev days. Phase 2 ≈ 3–5 weeks. Phase 3 ongoing.
- **Concurrent target v1:** 50 in one zone, 200 total. Realistic v1 actual = 5–20.
- **Cost at v1 scale:** Fly.io ~$20/mo. Aseprite $20 one-time. Asset packs ~$30 total. Negligible vs eng time.
- **First inappropriate chat message arrives within hours of public launch.** Moderation tooling is P0, not P2.
- **AI sprite failure mode:** brand-quality bar can't be hit by current AI sprite tools for the 8 archetypes. Use AI for moodboards, human (or curated CC0) for ship assets.

---

## 8 · Open questions for the user

1. Public route — `/world`, `/marketplace-world`, or keep under `/admin/marketplace?view=map`?
2. Budget for Aseprite + Mana Seed + LimeZu ($50–80 total)?
3. Hire a pixel artist for the 8 archetypes, or attempt DIY?
4. v1 target launch date?
5. Should the CRM admin map view stay as a separate read-only surface, or be unified with the public world?

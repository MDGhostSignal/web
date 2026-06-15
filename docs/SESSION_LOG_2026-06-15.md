# Session Log — 2026-06-15

Big day on `/world`. Took the marketplace RPG from "a horse and a
church" to a full village: pixel-perfect collision, 8 enterable
buildings with interiors, two more animal species, background music,
and a weather system. ~2100 → ~3100 lines on `WorldClient.tsx` + two
new sibling modules.

Eleven planned phases, all shipped today.

## 1 · Phase 1 — Collision foundation

### 1a · Reusable sprite-sheet alpha-scanner

`apps/web/scripts/scan-sprite-sheet.mjs` — extracted the workflow
that derived the horse sheet's true cell pitch (40 px after we
discovered the right 24 px of the sheet was padding). The script
walks the alpha channel: finds row bands (y-ranges with any opaque
pixel), then for each band finds opaque column runs and reports the
average pitch. Validated by re-deriving the horse sheet result.
`--json` flag emits a manifest for new sheets.

```
node scripts/scan-sprite-sheet.mjs "public/world/sprites/SNES - Harvest Moon - Animals - Cow.png"
```

### 1b · Obstacle data model

New module `apps/web/src/app/world/obstacles.ts`. Single source of
truth for impassable geometry per "room." Two collision sources, in
order:

1. **Pixel mask** — transparent PNG painted over the room's backdrop.
   Opaque pixels block. Lookup is O(1) via flat `Uint8Array`. Used
   for the village.
2. **Rect fallback** — small list per `ObstacleLocation`. Used for
   building interiors where authoring a whole mask PNG is overkill.

Public API:
- `isBlocked(x, y, loc)` — feet-anchor lookup
- `resolveMove(fromX, fromY, toX, toY, loc)` — axis-separated
  wall-slide (the classic SNES "walk diagonally into a wall, keep
  moving along the wall" behavior)
- `pickFreeTarget(homeX, homeY, minR, maxR, loc)` — rejection-samples
  N candidates for animal FSM wander targets
- `nudgeToFree(x, y, loc, maxRadius)` — spiral-search out from a
  point to the nearest free spot. Used at animal spawn so a fence
  edit can't trap an animal inside a wall.
- `registerMask(loc, mask)` — scene calls this after decoding the
  collision PNG

`ObstacleLocation` is a string union `"village" | \`interior:${string}\``
so each building gets its own scope.

Wired into `WorldClient.tsx`:
- Player movement now goes through `resolveMove` → wall-slides
- Debug overlay: press **O** to toggle. Mask-backed rooms render the
  mask tinted red over the world; rect-backed rooms (interiors) draw
  rect outlines. State persists in localStorage.

### 1c · Village collision mask

Tried a hand-authored rect list as a first pass — wildly misaligned.
Pivoted to the cleaner workflow: user paints a 768×1024 transparent
PNG in their editor, opaque pixels = blocked. Loaded at scene start
into a `Uint8Array` via OffscreenCanvas + `getImageData`. Alpha
threshold of 128 (paint is opaque red 237/28/36 at 255α; transparent
background is α=0). Mask shipped as
`apps/web/public/world/sprites/village-collision.png`.

User authored, iterated, and confirmed it works as intended in one
round-trip. Mask wins decisively over rect decomposition for SNES-era
art with curves and irregular geometry.

### 1d · Animal FSMs wired to obstacles

- **Chicken**: scared/wander movement now uses `resolveMove`;
  `pickFreeTarget` for new resting spots. If wall-slide produces zero
  movement during wander, end the segment early so the chicken
  doesn't grind against a wall.
- **Horse**: same treatment — `pickFreeTarget` for both walk and
  gallop targets. If every gallop candidate is blocked, falls
  through to a regular walk. If both fail, stays idle for another
  beat.
- Spawn nudge: `spawnChicken` + `spawnHorse` both call `nudgeToFree`
  before placing the sprite — they spiral out up to 320 px until they
  hit open ground.

## 2 · Phase 2 — Building system

### 2a · Generic Building registry

Refactored the church-specific enter/exit code into a data-driven
`Building` registry. New module
`apps/web/src/app/world/buildings.ts`:

```ts
type Building = {
  id: string;
  displayName: string;
  description: string;
  door: DoorTrigger;       // village world coords
  interior?: BuildingInterior; // undefined until PNG provided
};
```

`WorldLocation` became a discriminated union
`{ kind: "village" } | { kind: "interior"; buildingId: string }`.
`WorldAction` likewise generalised:
`enter-building`/`exit-building` with building id.

The church is now just the first entry in `BUILDINGS`. `updateAction-
Prompt` walks every entry checking door triggers, and the multi-room
exit list (added in 2c follow-up) drops the player back at the
village `villageReturnTile` from any of them.

`enterBuilding(id)` / `exitBuilding()` replaced the church-specific
methods. Buildings without an `interior` block flash a "(name coming
soon)" hint instead of teleporting — useful for landing trigger zones
before each PNG arrives.

### 2b · Door triggers for all 8 buildings

User painted a doors-marker PNG (`village-doors.png`) — small red dots
at each door tile. Script clustered the dots into 8 (x, y) centers in
PNG-native coords. Mapped each cluster to a building id:

| Slug | Native (x, y) | Display name |
|---|---|---|
| `town-hall` | (152, 142) | Town Hall |
| `church` | (368, 140) | Church |
| `tiny-home` | (600, 219) | Tiny Home |
| `shed` | (584, 603) | The Shed |
| `inn` | (152, 861) | The Inn |
| `general-store` | (279, 861) | General Store |
| `smith` | (407, 861) | Village Smith |
| `stable` | (600, 875) | The Stable |

Display names: church + smith + stable came from the user's
descriptions (hammer sign, cow sign). Inn + general store were my
suggestions for the bottom-row buildings the user left open. Tiny
home + shed + town hall came from the user's overall map description.
Each entry carries a `description` field so the lore lives next to
the door coords.

### 2c · 8 building interiors wired

User dropped one interior PNG per building. Each interior:
- Preloaded as a Phaser image with a stable texture key
- Anchored top-center in world coords (only visible inside the
  building, so position doesn't matter — camera bounds to the
  active interior on enter)
- Spawn point just above the painted door, exit trigger on the door
  tile itself

| Building | PNG | Dimensions | Notes |
|---|---|---|---|
| Church | existing | 240×465 | Single room |
| Tiny Home | `toprighthouse.png` | 256×208 | Single room, bedroom + fireplace |
| Inn | `theinn.png` | 256×419 | Two-room (tavern + bedrooms upstairs) |
| Shed | HM Tool Shed rip | 192×208 | Single room |
| Smith | `smith.png` | 256×401 | Two-room (forge + workshop) |
| General Store | `housenexcttotheinn.png` | 256×419 | Two-room (looks more like a diner) |
| Town Hall | `townhall.png` | 609×321 | Multi-room: library upstairs, 3 lower rooms |
| Stable | `stable.png` | 256×360 | Single room with stalls |

For the multi-room interiors, we treat the visual gaps between
"rooms" as one continuous traversable space — the player just walks
through the divider. Acceptable for MVP; if a building wants a real
staircase trigger between rooms later we add a midpoint exit.

#### Multi-exit refactor

`BuildingInterior.exit` (single) became `exits: DoorTrigger[]`.
Required when the user asked "let's add exits to all house interiors"
— `updateActionPrompt` now iterates the array; any exit fires the
same leave action.

- Town Hall: 3 exits — one per bottom-row room
- Inn / Smith / General Store: 2 exits — bottom-tavern door + a
  fallback at the top of the upper room so the player doesn't have
  to walk all the way down to leave
- Single-room buildings: still 1 exit

## 3 · Phase 3 — Animals

### 3a · Texture-key parameter on `spawnChicken`

Refactor was lighter than originally planned. Looking at the cow and
dog sheets, they're too different from chicken/horse to share a
single FSM. So 3a is just: `spawnChicken` now takes an optional
`textureKey` so future chicken-shaped animals (golden chicken etc.)
can ride the same FSM. The actual primitive is the *pattern* —
documented in code by example.

### 3b · Cow + dog NPCs

- **Cows** (2 instances, near the Stable): own `CowState =
  "idle" | "walking"` FSM. Idle bob + watch player distance. Player
  within 130 px → pick a slow vector away from them, amble for ~1.4 s
  at 40 px/sec, settle back to idle bob. Less skittish than chickens.
  Frame: band-0 cell-0 of the HM cow sheet (30 × 25 native).
- **Dog** (1 instance, by Town Hall door): wandering FSM. Idle bouts
  1.5-4 s, then walks to a `pickFreeTarget` spot within 130 px of
  home at 55 px/sec, repeats. `setFlipX` based on velocity. Wall-slide
  when blocked.

#### Animals block the player

Per-frame check after the obstacle `resolveMove`: if the resolved
point lies inside any animal's foot circle, fall back to axis-
separated movement so the player slides past instead of phasing
through. Hit radii (world px): chicken 18, horse 36, cow 30, dog 22.
Tuned to the sprite sizes at `VILLAGE_SCALE = 3`.

Animals don't currently check the player when picking their own
movement — they'll happily walk through the player. Asymmetric but
fine for MVP.

## 4 · Phase 4 — Background music

"The Village" by Eric Matyas (soundimage.org), looping OGG version
downloaded into `apps/web/public/world/audio/the-village-loop.ogg`.
Royalty-free with attribution.

- Phaser `this.sound.add` with `{ loop: true, volume: 0.32 }`
- Speaker icon (🔊 / 🔇) top-right, click to mute
- **M** key as keyboard shortcut
- State persists in localStorage (`world.bgm.muted`, `world.bgm.volume`)
- Browser autoplay restriction handled automatically by Phaser's
  SoundManager — playback unlocks on first user gesture

Attribution added to `apps/web/public/world/CREDITS.md`.

## 5 · Phase 5 — Weather

User dropped three HM weather sheets. Analysed:
- Summer Clouds (256×512): 3 distinct cloud shapes at fixed y. Each
  registered as a sub-frame (sm 106×60, md 128×75, lg 163×87).
- Rain (256×1538): 3 stacked frames of 512 px each, separated by 1-px
  divider lines. Classic SNES technique — cycle frames at ~6 fps for
  the falling-rain illusion.
- Snow: same structure as rain.

Implementation:
- **5 always-present clouds** drift east at 8-22 px/sec, depth 50,
  alpha 0.45. Wrap back to the west when off-screen east.
- **Rain + snow overlays** are full-viewport `TileSprite`s pinned to
  the camera (`setScrollFactor(0)`), depth 9000. Hidden until the
  scheduler or a dev key fires them. Indoor check: precipitation only
  shows when `location.kind === "village"`.
- **Frame cycle**: 160 ms per frame across the 3 frames.
- **Scheduler**: rolls every 4 hours. 25% chance per roll of a 20-40
  min weather event (60% rain / 40% snow weighting; no season system
  yet so it's pseudo-random). `weatherNextRollAt` + `weatherUntil`
  persist to localStorage so the cycle survives a refresh.
- **Top-right indicator**: ☀ / 🌧 / ❄ next to the speaker icon.
- **Dev shortcuts**: R force-starts a rain event, T forces snow, C
  clears. 60-second duration when triggered manually.

## 6 · UX bug fixes — chat input + keyboard

Two regressions surfaced from adding so many key bindings:

### Chat could not type E / O / W / A / S / D

Root cause: Phaser's `kb.addKey(KeyCodes.X)` defaults to
`enableCapture = true`, which makes Phaser call `event.preventDefault()`
on those keys at the **window** level. Even with
`scene.input.keyboard.enabled = false` while the chat input was
focused, the events were already preventDefault'd before the input
could see them.

Fix: pass `false` as the second argument to *every* `addKey` call
(arrows, WASD, E, O, M, R, T, C, ENTER). Keys still fire Phaser
handlers when registered Keys' state changes, but text inputs receive
the keystrokes unmolested. Kept the `keyboard.enabled` toggle so
action handlers (enter building, toggle mute, etc.) don't double-fire
while typing.

### Enter while moving → focus chat

Originally tried via a Phaser `KeyCodes.ENTER` handler. Was unreliable
— refocus logic depended on the scene's keyboard state. Replaced with
a direct `window.addEventListener("keydown")` in the React component:
if Enter and `e.target` isn't INPUT/TEXTAREA, focus the chat input.

### Enter in the chat → blur

`submitChat` now calls `chatInputRef.current?.blur()` unconditionally
(even for empty messages), so hitting Enter cleanly exits chat mode
without an extra click outside.

## Files touched (today)

### New
- `apps/web/scripts/scan-sprite-sheet.mjs` — alpha-scan workflow.
- `apps/web/src/app/world/obstacles.ts` — collision data model.
- `apps/web/src/app/world/buildings.ts` — building registry.
- `apps/web/public/world/sprites/village-collision.png` — pixel mask.
- `apps/web/public/world/sprites/village-doors.png` — door dot mask.
- 7 new interior PNGs (Tiny Home, Inn, Shed, Smith, General Store,
  Town Hall, Stable).
- 3 weather sheets (Summer Clouds, Rain, Snow).
- `apps/web/public/world/audio/the-village-loop.ogg` — BGM.

### Modified
- `apps/web/src/app/world/WorldClient.tsx` — every section: preload,
  scene state, obstacle wiring, building system, BGM, weather, FSMs,
  chat-focus fix.
- `apps/web/public/world/CREDITS.md` — Eric Matyas attribution.

## Validation

- `npm run typecheck` (web) — clean throughout.
- Manual: walked every door, entered/exited every building, scared
  chickens, watched the horse roam, cow flee, dog patrol. Pressed R/T/C
  to verify weather, muted/unmuted with M, typed every alphabet letter
  into chat.

## Open / next-step notes

- **Walk frames for cow / dog**: both use their idle frame while
  moving; the apparent motion comes from world-position change. Same
  trade-off as the chickens. If a more authentic cycle is wanted,
  register additional frames per row and cycle them at ~6 fps.
- **Building rooms as separate scopes**: today multi-room interiors
  (Inn, Smith, General Store, Town Hall) are one big continuous walk.
  A real "go upstairs" trigger would mean adding sub-rooms per
  building and a teleport handler — punt until needed.
- **Interior collisions**: no rect obstacles registered for any
  interior. Player walks through beds, fireplaces, piano, etc. Matches
  the church behavior; user hasn't asked for it.
- **Animals blocking animals**: only the player is blocked by NPCs
  currently. Two chickens can overlap. Acceptable for MVP.
- **Audio for rain/snow**: not wired. Eric Matyas has free rain SFX on
  soundimage.org if the user wants ambience during weather.
- **PSD source**: `worldblock.psd` (~10 MB+) is the user's source file
  for the collision + doors masks. Not committed — only the exported
  PNGs ship.

## Memory check

No new memory entries warranted. The RPG project memory + RPG stack
reference still hold. Today's work didn't introduce new conventions
that future sessions need to know — pixel-mask collision and the
building registry are self-evident from the code.

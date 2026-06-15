# GhostSignal World — Asset Credits

The `/world` route uses pixel art from the
[Universal LPC Sprite Sheet Character Generator](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator)
project — the consolidated CC-licensed character base originally
produced for the Liberated Pixel Cup (Bart Kelsey + Chris Webber).

All LPC art is dual-licensed under **CC-BY-SA 3.0** and **GNU GPL 3.0**.
Continued use requires attribution and that derivative art ships under
the same dual license.

## Files in use

### Character body base
- `apps/web/public/world/sprites/body-male/walk.png` — 64×64 frame
  walk cycle, 4 directions × 9 frames.
- `apps/web/public/world/sprites/body-male/idle.png` — 64×64 frame
  idle pose, 4 directions × 2 frames.

Source:
- `https://raw.githubusercontent.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator/master/spritesheets/body/bodies/male/walk.png`
- `https://raw.githubusercontent.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator/master/spritesheets/body/bodies/male/idle.png`

The LPC project pools work from many artists. Per-file attribution is
tracked in the [LPC generator's credits page](https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/)
— when we ship layered (clothed/styled) characters this page must list
every contributor whose layers we use.

## License compliance status

- ✅ Attribution: this page is the canonical credits record. Phase 3
  wires `/world/credits` as a public route surfacing this content.
- ⏳ Share-Alike: derivative sprites we produce on top of the LPC base
  (recolors, archetype overlays) will be checked into the repo at
  `apps/web/public/world/sprites/` and remain CC-BY-SA 3.0 / GPL 3.0.
  No proprietary closed sprite work on top of LPC layers.

### ArMM1998 Zelda-like Overworld Tileset — primary world art

The cohesive SNES Action-RPG look of `/world` (houses, fountains,
statues, gates, banners, market stalls, trees, bushes, ground decor)
comes from **ArMM1998's** "Zelda-like tilesets and sprites" — a single
640×576 atlas with the entire vocabulary in one consistent style.

- `apps/web/public/world/sprites/pipoya/overworld-armm.png` — the
  full atlas. We don't extract sprites into separate PNGs; the
  client defines named frames on the loaded texture at scene init
  (see `registerArmmFrames()` in `WorldClient.tsx`).

Source page (OpenGameArt):
`https://opengameart.org/content/zelda-like-tilesets-and-sprites`

**License: CC0 (public domain).** No attribution required, but we
credit anyway because pixel artists should be recognised by name.

### LPC Tile Atlas — legacy landmark sprites (Phase 2 trial)

- `apps/web/public/world/sprites/lpc-atlas/base_out_atlas.png` — full
  1024×1024 exterior atlas.
- `apps/web/public/world/sprites/lpc-atlas/terrain_atlas.png` — full
  1024×1024 terrain atlas.
- `apps/web/public/world/sprites/lpc-atlas/extracted/` — region crops
  used as standalone landmarks in the world (cathedral facade, brick
  studio, pine trees, bushes, torches, etc).

Source bundle:
- `https://opengameart.org/sites/default/files/Atlas.zip` — "LPC Tile
  Atlas" curated by Jeckel.

License: **CC-BY-SA 3.0 + GNU GPL 3.0** (dual; you may comply with
either or both). See `apps/web/public/world/sprites/lpc-atlas/Attribution.txt`
for the full contributor manifest. Headline contributors whose work
shipped here:

- **Lanea Zimmerman (Sharm)** — base terrain, houses, water,
  vegetation, signs, shadow.
- **Stephen Challener (Redshrike)** — character walk-cycles.
- **Casper Nilsson** — LPC C.Nilsson 2D art kit.
- **Daniel Eddeland (daneeklu)** — farming tilesets.
- **Johann Charlot** — shoot'em up graphic kit components.
- **Skyler Robert Colladay** — FeralFantom's Entry.

(See `Attribution.txt` for the complete list — the LPC contest pulled
work from dozens of artists. Per CC-BY-SA all of them are credited.)

### Background music — "The Village" by Eric Matyas

- `apps/web/public/world/audio/the-village-loop.ogg` — looping cut of
  the track, plays as ambient BGM on the `/world` route. Toggle mute
  with `M` or the speaker icon top-right.

Source: [soundimage.org / Fantasy 3](https://soundimage.org/fantasy-3/)

**License: royalty-free with attribution required.** Per
soundimage.org's policy: credit "Eric Matyas" and link to
`https://soundimage.org`. This entry, plus the music-credit line on
the `/world` route, satisfy that requirement.

## Future asset sources to layer on

When we add clothing, hair, props per archetype, candidate layer paths
inside the same repo:
- `spritesheets/torso/*` — shirts, robes, jackets
- `spritesheets/legs/*` — pants, skirts
- `spritesheets/head/hair/*` — hair variants
- `spritesheets/accessories/*` — quivers, capes, belts

Each layer used adds a line here.

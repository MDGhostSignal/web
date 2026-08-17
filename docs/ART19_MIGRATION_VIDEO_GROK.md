# ART19 Migration — Explainer Video (Grok Imagine)

Production brief for the **onboarding explainer** that pairs with
`/studio/migration`. Audience: podcasters we're moving onto the GHOSTSignal
network (hosted on ART19). Tone: warm, reassuring, prestige-but-friendly.

- **Master format:** 16:9 landscape, **60–90s**.
- **Metaphor:** moving a cherished artwork between galleries (straight from
  the guide's own language: "like moving artwork between galleries —
  everything protected, us on hand throughout").
- **Look:** friendly art-gallery world, rendered in the **GHOSTSignal brand**
  (violet + cyan + warm gold, cosmic starfield, snowdrift particles,
  morse-dash motifs, the cloud-signal glyph).

## How to read this brief

Grok Imagine makes **short (~6s) clips** from a text prompt or a still image.
It does **not** do reliable on-screen text, voiceover, or a long stitched
edit. So the pipeline is:

1. **Grok** → generate each *shot* below (10 shots). Work **image → video**:
   generate the still first, pick the best, then animate it. Trim each ~6s
   clip to its 3–6s beat in the editor.
2. **Editor** (CapCut / Premiere / Resolve) → stitch in order, add the
   **voiceover**, **on-screen captions**, **brand transitions**, **music**,
   and the real **GHOSTSignal logo/wordmark** (never let Grok draw text or
   logos — they garble).

## Naming note — confirm before final

The guide calls the destination **ART19** ("the GHOSTSignal network, hosted
on ART19, an Amazon company"). This brief uses that. If "**Altar**" is the
name you want on screen instead, it's a find-and-replace in the VO + captions
only — tell me and I'll swap it.

---

## Mood & emotional arc

The single through-line emotion is **trust**. The viewer is a podcaster who
has quietly worried that moving hosts means risk — lost episodes, lost
numbers, broken links. The film's whole job is to replace that worry with
*"I'm in good hands."* Prestige but warm; a little magical (glow, drifting
particles); never sterile, never salesy.

Beat-by-beat feeling:

| Beat | Shots | Feeling we want |
| --- | --- | --- |
| Hook | 1–2 | Pride — *your work matters; it's art* |
| Step 1 | 3 | Careful custody — *nothing is lost; we preserve it first* |
| Step 2 | 4–5 | Arrival & competence — *it's home somewhere better; handled* |
| Step 3 | 6–7 | Quiet confidence — *the hard part is one calm step* |
| Step 4 | 8–9 | Joy & belonging — *opening day; it shines* |
| Close | 10 | Warm resolve — *welcome home; you're not alone* |

## Pacing

The calm **is** the message — an unhurried film says "this move is safe."

- **Slow cuts:** 5–10s holds, no rapid cutting anywhere. Energy rises toward
  Opening Day through **music and light**, not faster edits.
- **Let the open breathe:** ~1s of shot 1 before the first VO line.
- **The peak:** shot 8 (Opening Day) is the emotional high — give it the
  longest hold and the music swell.
- **A breath before the close:** shot 9 runs with **no VO** — just music and
  ambience — so "Welcome home" lands in space, not on top of narration.
- Match cut energy to the VO's own rhythm: it slows at the em-dashes; so
  should the picture.

---

## Voiceover script (~150 words, ~70s at a calm pace)

Record warm and unhurried, with small pauses at the em-dashes. A friendly
human voice, not a corporate announcer.

1. *(Hook)* "Your podcast is a work of art. Every episode — another piece of
   the story you've been making."
2. "So when it's time to move it somewhere new, we treat it the way any
   masterpiece deserves. Carefully. And with you, the whole way."
3. *(Step 1)* "First, we catalog everything. Your history, your numbers, your
   story so far — preserved, before a single thing moves."
4. *(Step 2)* "Then your show arrives at its new gallery: the GHOSTSignal
   network. We hang every episode, check every detail, and hand you the keys."
5. *(Step 3)* "Next, the address changes. One redirect — and the world
   quietly learns where your show now lives."
6. *(Step 4)* "And then, opening day. The doors open, the listeners arrive,
   and your show shines in its new home."
7. *(Close)* "You make the work. We handle everything else. Welcome home — to
   GHOSTSignal."

### Tone of voice & delivery

- **Voice:** warm, human, mid-range; any gender. A trusted friend or a
  gracious gallery curator — **not** an announcer or a hype narrator. Speaks
  *to* one person ("you"), never "our valued creators."
- **Pace:** slow — **~120–130 wpm**. The ~150 words land in ~70–75s *because*
  of the pauses. Full beat of silence at each em-dash.
- **Per-line delivery:**
  - L1 — intimate, almost quiet; a small proud smile on "a work of art."
  - L2 — reassuring; slow right down on "*Carefully. And with you, the whole
    way.*"
  - L3 — steady, competent, unshowy.
  - L4 — a lift of warmth; gentle emphasis on "*hand you the keys.*"
  - L5 — light, a near-smile on "*quietly learns.*"
  - L6 — the emotional peak; let warmth swell on "*shines in its new home.*"
  - L7 — land it softly; "*Welcome home*" almost a whisper, proud and calm.
- **If using AI voice (e.g. ElevenLabs):** pick a warm, natural conversational
  voice; **stability ~50, similarity ~75, style low**, speaking rate slightly
  slow. Punctuate for breath (commas + em-dashes; add `<break time="0.5s"/>`
  at the dashes). Generate 2–3 takes and keep the least "read-aloud" one.
- **Brand voice:** unhurried, values-led, quietly confident. Never salesy,
  never corporate, never rushed.

---

## Style DNA — paste this into EVERY shot prompt

Keeps all 10 shots feeling like one film. Prepend it, then add the shot's
specific action.

> **STYLE:** Cinematic art-gallery world, warm and inviting. Tall softly-lit
> gallery walls in warm white, pale oak floors, high windows with volumetric
> daylight. Signature lighting accent of deep violet (#7c3aed) and cool cyan
> (#06b6d4) glow with a warm gold (#fbad25) highlight. Faint drifting light
> particles like a calm starfield. Shallow depth of field, 35mm lens, gentle
> slow camera motion, elegant and reassuring, premium hopeful mood, soft film
> grain. **No text, no signage, no logos, no readable writing, no sharp-focus
> faces, natural hands.**

---

## Reference-image workflow — the key to consistency

Grok Imagine is strongest **image → video**, and a 10-shot film only holds
together if the shots share one world. So don't prompt 10 unrelated clips —
**build from reference stills.**

**Phase 1 — lock two master reference stills** (text → image; regenerate until
they're perfect, then keep them):

**Reference A — "The Gallery"** (the world / look-bible)
> *(Style DNA)* Establishing interior of the gallery world: a tall, elegant
> art-gallery room, warm-white walls, pale oak herringbone floor, high arched
> windows with soft volumetric daylight from the left. Deep violet and cyan
> ambient glow with a warm gold accent pooling on the floor. Faint drifting
> light particles. One empty museum spotlight on the far wall, awaiting a
> frame. Calm, protected, prestige. 16:9.

**Reference B — "The Artwork"** (the hero object that recurs)
> *(Style DNA)* Hero close-up of a single framed artwork in a thin warm-brass
> frame. Inside the frame: an abstract cosmic sound-wave — ribbons of violet
> (#7c3aed) and cyan (#06b6d4) light rippling like an audio waveform across a
> deep starfield, with a warm gold (#fbad25) glint at the crest. Museum
> spotlight, soft shadow, dust motes. This is "the podcast, as art." 16:9.

**Phase 2 — generate each shot from the references:**
1. Seed each shot's still from the closest reference — use Grok's **image
   reference / remix / "animate this image"** from Ref A or B where it lets
   you; otherwise paste the **Style DNA** + the reference's exact look words.
2. Generate **3–4 still variations**; pick the cleanest (best hands/faces, no
   stray text, no warping).
3. **Animate** the chosen still (image → video), **2 motion takes**, keep the
   smoother one.
4. Keep every alternate — you'll want options in the edit.

**Consistency rules (don't let these drift):** same wall color, floor, and
window-light direction in every shot; the **artwork** described identically
(ideally reuse Ref B as the seed) so it's recognizably the same piece in shots
1, 5, and 9; one lens feel (35mm, shallow DoF) and one grade (violet shadows,
gold highlights).

---

## Shot list — 10 Grok prompts

Each = one shot. Prepend the **STYLE DNA** to the prompt text, set **16:9**,
generate a still, then animate with the **Motion** note. Keep camera moves
slow. Trim to the **Beat** length in the editor.

### Shot 1 — Hook: the artwork *(beat ~4s · VO line 1)*
> A single framed artwork glowing softly on a warm gallery wall, alone in a
> pool of spotlight. The "painting" inside the frame is an abstract cosmic
> sound-wave — violet and cyan light rippling like an audio waveform across a
> starfield. Dust motes drift in the light beam.

**Motion:** very slow push-in toward the frame; particles drift; the waveform
inside shimmers gently.

### Shot 2 — Hook: the gallery *(beat ~4s · VO line 2)*
> Wide establishing shot of an elegant, near-empty art gallery. Tall warm-white
> walls, pale oak floor, huge windows pouring soft volumetric daylight. One
> glowing framed artwork on the far wall. A sense of calm, protected grandeur.

**Motion:** slow steady dolly forward down the center of the room.

### Shot 3 — Step 1: cataloging *(beat ~6s · VO line 3)*
> Close, tender shot of the framed artwork being gently wrapped in soft
> protective cloth. Beside it, a glowing violet holographic data-panel floats,
> covered in faint abstract marks and tiny light-graphs (no readable text).
> White-gloved hands in soft focus, careful and unhurried.

**Motion:** the cloth settles over a corner of the frame; the violet panel's
faint graphs pulse slowly. Keep hands soft-focus / partially in frame.

### Shot 4 — Step 2: keys to the new gallery (arrival) *(beat ~6s · VO line 4)*
> The wrapped artwork carried through tall grand doors into a brighter, larger
> gallery. On the far wall, a large softly-glowing violet emblem shaped like a
> stylized cloud made of light (an abstract signal glyph). Warm gold accent
> light. A feeling of arriving somewhere special.

**Motion:** slow reveal as the doors part and the camera follows the artwork
inward; the violet cloud-emblem glows brighter as we approach.

### Shot 5 — Step 2b: hung and checked *(beat ~5s)*
> The artwork now hung, unwrapped, perfectly level on the new gallery wall,
> lit by a warm gold spotlight with violet rim-light. Two curator silhouettes
> step back to admire it, soft focus, no sharp faces. Quiet satisfaction.

**Motion:** gentle rack focus from the curators to the glowing artwork; a soft
lens flare blooms on the violet rim-light.

### Shot 6 — Step 3: changing addresses *(beat ~5s · VO line 5)*
> A blank brass address plaque beside an elegant gallery doorway (leave it
> empty — no engraving). A soft violet ribbon of light arcs from a dim old
> doorway on the left toward a bright, warm gallery on the right — an elegant
> "redirect" of light.

**Motion:** the violet light-ribbon animates smoothly left → right and settles
into the bright doorway; the old doorway dims.

### Shot 7 — Step 3b: signal reroutes *(beat ~5s)*
> A dark cosmic gallery wall of constellation lines and glowing points. Lines
> of violet and cyan light re-route across the starfield, converging on one
> bright node that flares warm gold — a signal finding its new home. Abstract,
> premium, brand-cosmic.

**Motion:** the light-lines travel and re-connect to the single flaring node;
slow parallax drift across the starfield.

### Shot 8 — Step 4: opening day *(beat ~7s · VO line 6)*
> Gallery opening night. The room glows warm; soft-focus silhouettes of
> visitors arrive and gather (no sharp faces). Delicate string-lights and
> drifting light particles. The framed artwork is centered and radiant, violet
> and gold light washing the walls. Celebratory but calm and elegant.

**Motion:** slow crane/tilt up revealing the warm crowd and the lit artwork;
particles and gentle snow-like flecks drift down.

### Shot 9 — Step 4b: at home *(beat ~5s)*
> Close on the artwork, fully at home and glowing, warm gold key-light with a
> violet halo. Gentle snowfall-like light particles drift past (calm, magical).
> A deep, satisfied stillness.

**Motion:** almost still — a slow breathing push-in; particles drift; the
waveform inside the frame pulses once, softly.

### Shot 10 — Close plate for logo + title *(beat ~5s · VO line 7)*
> A clean, deep near-black cosmic background (#0A0A0A) with a slow-drifting
> starfield and soft snow particles. The center is calm and empty (space for a
> logo). A faint horizontal row of glowing violet dashes forms across the
> lower third — like morse code made of light.

**Motion:** starfield drifts, snow falls slowly, the row of violet dashes
fades/forms in sequence left → right. **Leave the center empty** — the
GHOSTSignal wordmark is added in the editor.

---

## Master timeline (source of truth)

Target **75s**. Everything — shots, VO, captions, music, SFX — aligns to this
clock. The per-shot "beat" lengths in the shot list defer to the durations
here.

| Time | Shot | VO | On-screen | Music / SFX |
| --- | --- | --- | --- | --- |
| 0:00–0:05 | 1 · Hook artwork | L1 (from 0:01) | — | room tone in; faint waveform shimmer |
| 0:05–0:11 | 2 · Gallery wide | L2 | — | soft piano enters |
| 0:11–0:21 | 3 · Cataloging | L3 | `1 · Pre-move Cataloging` | cloth rustle; holo shimmer |
| 0:21–0:29 | 4 · Arrival | L4 (a) | `2 · Keys to the New Gallery` | warm door whoosh; low arrival swell |
| 0:29–0:36 | 5 · Hung & checked | L4 (b) | — | strings enter |
| 0:36–0:44 | 6 · Changing addresses | L5 (a) | `3 · Changing Addresses` | rising whoosh (light-ribbon travels) |
| 0:44–0:50 | 7 · Signal reroutes | L5 (b) | — | soft confirming chime on landing |
| 0:50–1:00 | 8 · Opening day | L6 | `4 · Opening Day` | **music swell — peak**; warm crowd murmur |
| 1:00–1:06 | 9 · At home | *(no VO — breathe)* | — | snowfall shimmer |
| 1:06–1:15 | 10 · Close plate | L7 | wordmark → `Welcome home.` → `You make the work. We handle everything else.` → `ghostsignal.cloud` | resolve to final warm chord |

**Covering a 10s beat with a ~6s clip** (shots 3, 8): generate **two takes**
and cross-dissolve, or slow one clip to ~0.6× — slow motion suits the mood.

### On-screen captions — style

Use the guide's exact step names so the film and `/studio/migration` read as
one system. Small, elegant, lower-left, brand font, a thin **morse-dash**
accent underneath; fade in/out per beat; keep inside title-safe. Violet
`#7c3aed` or warm white, whichever reads on the shot.

## Music & sound design

**Music:** warm, hopeful, unhurried. Soft solo **piano** + gentle
**strings/pad**, a slow build that lifts into **Opening Day** (shot 8) and
resolves warmly on the close. No percussion drive; nothing corporate. Library
search terms: *"warm cinematic hopeful piano underscore,"* *"gentle uplifting
ambient strings."* Duck the music **~-8 dB** under the voiceover.

**Sound design** (subtle — music carries; SFX just add texture; cues are in
the master timeline's SFX column):

- A soft, airy **gallery room tone** under the whole film.
- Shot 1: faint **shimmer/tone** as the waveform pulses.
- Shot 3: gentle **cloth rustle** + a soft **holographic shimmer** on the data-panel.
- Shot 4: a warm, low **door whoosh** and a resonant **"arrival" swell**.
- Shots 6–7: a delicate **rising whoosh** as the light reroutes, then a soft
  **confirming chime** when it lands.
- Shot 8: warm, low **crowd murmur** (never loud) + a **celebratory shimmer**.
- Shots 9–10: **snowfall shimmer** and a final warm resolve note.

## Subtitles & accessibility

- Most people watch muted — provide **burned-in or toggleable subtitles** of
  the VO (export an **`.srt`** from the VO script). These are separate from the
  decorative step captions.
- Keep all text in the **title-safe** area with strong contrast (violet or
  white on the darker shots; add a subtle scrim behind captions on busy frames).
- Respect the mood at low volume: the film should still make sense with **no
  audio** — the captions + shots carry the four steps on their own.

## Brand assets (drop in during the edit)

- **Wordmark:** `apps/web/public/images/brand/gs-brandmark-hor-white.png` (or
  `gs-logo-white.png`) on the shot-10 close plate.
- **Cloud-signal glyph:** `movinggiflogogrey.gif` / the vert brandmark — can be
  composited faintly onto the "new gallery" wall in shot 4 if Grok's emblem
  isn't clean enough.
- **Snowdrift particles:** the site's snowfall look for shots 8–10 (matches
  `snowdrift/SnowParticles`).
- **Palette for captions / grade:** violet `#7c3aed` / `#8B5CF6`, cyan
  `#06b6d4`, warm gold `#fbad25`, ink `#0A0A0A`, paper `#FFFFFF`.
- **Morse-dash** divider motif between step beats (brand element).

## Editor assembly checklist

1. Lay shots **1 → 10** in order; trim each to its **Beat** length (~55–75s
   total). Hold shot 10 for the end card.
2. Transitions: soft **dip-to-violet** or a **morse-dash wipe** between steps;
   straight cuts within a step.
3. Add the **voiceover**; align each line to its shot (see script tags).
4. Add **captions** per the table; brand font, lower-left, dash accent.
5. **Color-grade** all shots to one look (lift violet/cyan in shadows, warm
   gold in highlights) so Grok's clips match.
6. Composite the **wordmark + snowfall** on shot 10; add the CTA end card.
7. Add **music**; duck under VO; fade out on the close.
8. Export **1080p or 4K, 16:9**. Optional: a 9:16 cut later by reframing the
   center of each shot.

## Grok Imagine gotchas

- **Image → video** beats text-to-video for control: lock the still, then
  animate. Regenerate the still a few times and pick the cleanest.
- **No text / logos in-prompt** — they garble. All words come from the editor.
- **Hands & faces:** keep them soft-focus or partially out of frame (shots 3,
  5, 8) — AI mangles fingers and sharp faces.
- **Slow motion only:** gentle dollies, push-ins, rack focus. Fast motion =
  warping and flicker.
- **Consistency:** reuse the STYLE DNA verbatim every time; keep the same
  gallery (warm white walls, oak floor, violet/gold light) across shots.
- **Negative prompt** (if supported): `text, words, letters, logo, watermark,
  extra fingers, deformed hands, distorted faces, harsh lighting, cluttered`.

---

*Deliverable = this brief. You generate the 10 shots in Grok and assemble in
the editor; I can adjust any prompt, the VO, or the pacing on request.*

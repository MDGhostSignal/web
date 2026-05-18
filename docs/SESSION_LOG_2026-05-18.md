# Session Log — 2026-05-18

Copy + CTA pass on `/what-is-this`, white-paper link rotation, hero
video swap + re-encode, full structural mirror of the /for-creators
hero pattern, and a scroll-fade for the hero white background.

## 1. /what-is-this — Harmony section copy + CTA

- Headline line "harmony" → "harmony?" (kept inside the same `<span>`
  so `SplitLinesReveal` animates the punctuated word as one line —
  the question mark rides with the line, no separate split).
- Replaced the four body paragraphs with a new copy block, split at
  sentence boundaries so the existing staggered `ScrollFadeUp`
  cadence (indices 0–3) is preserved verbatim.
- Added "Find my match" CTA at SFU index 4, linking to `/rq-quiz`.
- Used `&mdash;` for em-dashes and `&rsquo;` for apostrophes to
  match the surrounding typographic convention.

## 2. /what-is-this — Values section copy + CTA

- Replaced the two existing body paragraphs with a five-paragraph
  block: intro question → three parallel outcome lines (creators
  earn / brands promoted / audiences sense harmony) → closing
  question. Each line is its own `<ScrollFadeUp>` (indices 0–4)
  so the stagger reads as a rhythm rather than a wall of text.
- Added "Read our white paper" CTA at SFU index 5.

## 3. Drag-overlay z-index trap — shared wrapper class

Both the harmony and values sections have a section-spanning
pointer-capture overlay (`.harmonyInteraction`, `.valuesInteraction`)
at `z-index: 5` so the user can drag-rotate the R3F scenes from
anywhere. Adding a CTA inside the body block ran into a stacking
problem: lifting just the inner `<Link>` to `z-index: 6` did nothing
because **GSAP writes a `transform` onto the `ScrollFadeUp` wrapper
div**, and any non-`none` transform establishes a stacking context.
A `z-index` on the inner link only competes inside that local
context — never against the section-level overlay.

Fix: the lift has to go on the **SFU wrapper** itself, via the
component's `className` prop. Generalized this into a shared
`.elevatedCtaWrapper` rule (`position: relative; z-index: 6;
align-self: flex-start`) used by both sections' CTAs. The wrapper
stays content-sized so only the button footprint sits above the
overlay; the rest of the section retains drag interaction.

```tsx
<ScrollFadeUp index={5} className={styles.elevatedCtaWrapper}>
  <a className={styles.whitepaperButton} ...>Read our white paper</a>
</ScrollFadeUp>
```

## 4. White paper URL rotated everywhere

New URL: `https://drive.google.com/file/d/1j5eA3-OSEVnx0TP13DoqfsfD-viREGvk/view?usp=sharing`

Updated **four occurrences across three files**:

| File | Where |
|---|---|
| `src/app/what-is-this/page.tsx` | Values-section CTA + bottom "Read the White Paper" |
| `src/app/rq-quiz/IntroStep.tsx` | Accordion link inside the "Research Behind the GHOSTSignal RQ" details |
| `src/app/api/rq-submissions/emails.ts` | Submission-confirmation email template |

## 5. /rq-quiz — accordion link spacing bug

The IntroStep accordion's "Read the GHOSTSignal White Paper" link
was rendering as `Read theGHOSTSignalWhite Paper` (no spaces around
the brand mark). Cause: `.rq-intro-link` had `display: inline-flex`,
and the two `{" "}` JSX expressions on either side of the
`<span class="gs-brand">` were anonymous **whitespace-only text
nodes**. Per CSS Flexbox spec, those are removed entirely — the
companion link in the same `<nav>` ("Acemoglu on High-Trust...")
had no inner span so it was unaffected and looked fine.

Fix: `display: inline-flex` → `inline-block`. Restores normal inline
whitespace handling. `align-items: center` becomes a no-op but is
harmless. Added an inline comment so the next agent doesn't revert
it.

## 6. /what-is-this hero video — swap + re-encode

The user dropped a new 1280×720 / 24 fps source as
`apps/web/public/images/what-is-this/garden4.mp4` (9.1 MB,
H.264 High + AAC + embedded MJPEG cover art). Replaced `garden3.mp4`
as the hero clip. Followed the documented optimization recipe from
`SESSION_LOG_2026-04-20`:

| Output | Size | Codec | Notes |
|---|---:|---|---|
| `garden4-optimized.mp4` | **6.0 MB** (−34 %) | H.264 Main, CRF 23, `preset slow`, `+faststart` | AAC + MJPEG cover stripped via `-map 0:v:0 -an`, 2 s keyframe interval (`-g 48 -keyint_min 48 -sc_threshold 0`). |
| `garden4.webm` | **2.8 MB** (−69 %) | VP9, CRF 33, `b:v 0`, `row-mt 1` | Same 2 s keyframe cadence. |

ffmpeg-static was installed `--no-save`, used, then uninstalled —
`package.json` / `package-lock.json` show no drift. Original
`garden4.mp4` kept on disk as the encode source (matches the
home-page convention; intentionally left untracked per the
asset-policy precedent for unreferenced source files).

Code change: `apps/web/src/app/what-is-this/page.tsx` swapped from
a single `<source src="garden3.mp4">` to dual sources, WebM first:

```tsx
<source src="/images/what-is-this/garden4.webm" type="video/webm" />
<source src="/images/what-is-this/garden4-optimized.mp4" type="video/mp4" />
```

## 7. White-frame "picture" treatment — full /for-creators mirror

User asked for the same white-border treatment that wraps the
/for-creators hero video. First attempt added a sibling
`.heroVideoFrame` div + a `.heroVideoInset` wrapper around the
`<video>`, keeping the existing wrapper full-bleed so the text
overlay positioning didn't have to move. That fixed a right-side
gap (see §8) but the user then asked to **mirror /for-creators
exactly**, including the text/element structure.

Full restructure of the what-is-this hero:

| Layer | Before | After |
|---|---|---|
| Outer | `<div className={styles.heroVideoWrapper}>` full-bleed, transparent, 100 vh | `<Section className={styles.hero}>` — white background, `min-height: 100vh`, `padding: var(--edge-pad)`, `isolation: isolate; contain: paint` (mirrors `/for-creators .hero`) |
| Video container | Full-bleed wrapper containing the video + text overlay + blossoms | `<div className={styles.heroVideoWrapper}>` positioned `absolute` with **uniform 100 px inset on all four sides** (diverges from /for-creators's `bottom: 0` — see §11) |
| Video element | `<video>` directly inside | `<video>` fills its wrapper via `inset: 0; width:100%; height:100%` |
| Text | `.heroTextOverlay` (absolute, left-half, vertically centered) + nested `.heroTextContainer` | `.heroContent` — normal-flow flex column, `position: relative; z-index: 2`, content sits over the inset video |
| Blossoms | Inside the wrapper | Sibling of the wrapper inside `.hero` |

Refactored the heroContent rule into a single flex column (dropped
the `.heroTextOverlay` + `.heroTextContainer` pair). Media queries
collapsed accordingly. Removed the bespoke `.heroVideoFrame` and
`.heroVideoInset` rules — they're obsolete now that the parent
`.hero` provides the white frame via its background.

## 8. Replaced-element `right`-is-ignored bug (resolved by §7)

Before the full restructure, an interim attempt positioned the
`<video>` itself with `top:100px; left:100px; right:100px; bottom:0`.
Visible result on wide viewports: a gap between the video and the
right white border. Cause: `<video>` is a CSS **replaced element**
with intrinsic dimensions (1280×720), and per CSS 2.1 §10.3.8 the
over-constrained case with `width: auto` keeps the intrinsic width
and ignores `right` — the video stopped at `left + 1280 px`. Fix:
position the inset on a plain `<div>` wrapper, not on the `<video>`.
Plain divs aren't replaced elements; `right` is honored.

The full /for-creators mirror (§7) is the long-term version of
this fix — the wrapper does the positioning, the video fills.

## 9. Headline centering + percentage left indent

After the restructure, the headline needed to look balanced inside
the white frame. Two passes:

- Removed the top horizontal logo row (the 3 lettermarks above the
  GHOSTSignal headline). Kept the middle row + h3 subtitle + bottom
  row — those form the content rhythm specific to this page.
- `.hero { align-items: flex-start }` → `center` so the heroContent
  block (headline + subhead + two logo rows) sits vertically
  centered within the white frame instead of pinning to the top.
- `padding: var(--edge-pad)` → `padding: var(--edge-pad);
  padding-left: 10%` so the headline's left indent scales with
  viewport. 10 % of hero width is ≈192 px on a 1920 viewport,
  ≈92 px inside the video's 100 px inset. The 10 % is a tunable
  starting value — annotated in the rule's comment.
- `.hero { justify-content: center }` → `flex-start` so the
  heroContent hugs the padding-left edge instead of being centered
  in the leftover space.

## 10. Top spacing + height on `.harmonySection`

`min-height: 100vh` → `110vh` and `margin-top: calc(var(--gs-n-160)
* var(--gs-px))` (≈160 px). Opens a breathing gap between the
(now-fading) hero white frame and the harmony headline — without
it, the harmony scene started immediately at the hero boundary and
read as a hard seam.

## 11. White-background scroll-fade

Reported: the white hero frame stayed solid as the user scrolled,
creating a hard edge against the next section. Fix in two parts:

1. Made the bottom inset on `.heroVideoWrapper` symmetric with the
   other three sides — `bottom: 0` → `bottom: calc(var(--gs-n-100)
   * var(--gs-px))`. The video now has a uniform 100 px white
   runway on all four sides; the bottom one specifically gives the
   scroll-fade somewhere soft to land.
2. **Moved the white off `.hero` and onto a new `.heroBackground`
   child** so its opacity can be tweened independently of the
   heroContent (which has its own text tween — fading the whole
   `.hero` would double-fade the text). Wired into the existing
   video opacity tween via `[video, background]` as the GSAP target.
   Same trigger, same scrub timing.

```tsx
<Section className={styles.hero}>
  <div className={styles.heroBackground} aria-hidden ref={...} />
  <div className={styles.heroVideoWrapper}>...</div>
  <HeroBlossoms />
  <div className={styles.heroContent} ref={...}>...</div>
</Section>
```

```ts
const videoTween = gsap.fromTo(
  background ? [video, background] : video,
  { opacity: 1 },
  { opacity: 0, ease: "power1.inOut", scrollTrigger: trigger },
);
```

Once both the video and the white background reach opacity 0, the
`.hero` is fully transparent and the `<ParallaxBackground />` stars
show through into the 160 px gap before the harmony section —
clean handoff, no hard edge.

## Files touched

| Area | Paths |
|------|-------|
| Harmony copy + CTA | `apps/web/src/app/what-is-this/page.tsx`, `page.module.css` |
| Values copy + CTA | `apps/web/src/app/what-is-this/page.tsx`, `page.module.css` |
| White paper URL | `apps/web/src/app/what-is-this/page.tsx`, `apps/web/src/app/rq-quiz/IntroStep.tsx`, `apps/web/src/app/api/rq-submissions/emails.ts` |
| RQ-quiz link spacing | `apps/web/src/app/rq-quiz/rq-quiz.css` |
| Hero video re-encode | `apps/web/public/images/what-is-this/garden4-optimized.mp4` (new), `garden4.webm` (new) |
| Hero structural mirror | `apps/web/src/app/what-is-this/page.tsx`, `page.module.css` |
| Hero scroll-fade | `apps/web/src/app/what-is-this/page.tsx`, `page.module.css` |
| Session log | `docs/SESSION_LOG_2026-05-18.md` (this file) |

## Validation

Re-run after every meaningful chunk; final state:

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ 0 errors / 0 warnings |
| `npm run lint:css` | ✅ pass |
| `npm run assets:audit` | ✅ 51 referenced public assets exist |

`package.json` + `package-lock.json` show no drift after the
ffmpeg-static install/uninstall cycle.

## Asset bundle delta

| File | Before | After |
|---|---|---|
| `garden4.mp4` (source, untracked) | — | 9.1 MB |
| `garden4-optimized.mp4` (shipped) | — | 6.0 MB (new) |
| `garden4.webm` (shipped, primary on Chromium/FF) | — | 2.8 MB (new) |
| `garden3.mp4` (previous hero, now orphaned) | 13.3 MB | unchanged on disk, **no longer referenced** |

`garden3.mp4` is unused as of this session — same situation as the
`for-advertisers/loop{1..4}.mp4` leftovers noted in the 2026-04-20
log. Untouched here; user can decide whether to delete.

## Open items / next-step notes

1. **Tunable values.** The `10%` `padding-left` on `.hero` and the
   `160 px` `margin-top` on `.harmonySection` are starting values.
   Both annotated in their CSS comments. Likely to want a manual
   pass once viewing on a target display.
2. **`garden3.mp4` orphan.** No longer referenced — safe to delete
   if the source isn't needed anymore. Same call as the 2026-04-20
   `loop1..4.mp4` orphans (left for user to triage).
3. **Trade-off acknowledged.** The hero now fades to the starry
   parallax (was the original behavior) — but via a different
   mechanism: instead of a transparent wrapper with a fading video,
   the wrapper is opaque white that itself fades. The /for-creators
   page does not fade its white, so this what-is-this behavior
   diverges intentionally to preserve the original fade-to-stars
   handoff that the white-frame restructure would have otherwise
   broken.
4. **Manual browser walk.** All validation passes mechanically. A
   click-through of /what-is-this end-to-end (and a re-check of the
   /rq-quiz accordion link spacing on the deployed build) is worth
   doing before sharing the build.

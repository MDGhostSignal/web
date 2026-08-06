# Session Log — 2026-08-06

## Cold-outreach email: final copy + template polish

The `/admin/outreach` cold email graduated from placeholder to final copy.

### Changes implemented

- **Subject (final):** `"{name}, the right audience changes everything"` — echoes the /for-advertisers hero headline.
- **Pitch box (final):** "Why GHOSTSignal" eyebrow, resonance-vs-impressions positioning line, and three value-prop bullets adapted from the /for-advertisers page (highly-attuned audiences / zero admin overhead / real conversion). Outlook-safe table bullets.
- **CTA bug fix:** button linked to `ghostsignal.cloud/for-brands`, which is not a route — now points at `/for-advertisers`. Label updated to "See how GHOSTSignal works for brands".
- **Plain-text part added:** new `coldOutreachEmailText()` sent alongside the HTML via Resend's `text` field (cold sends without a text part score worse with spam filters).
- Removed "placeholder" caveats from the composer preview subtitle and route comments.

### Files touched

- `apps/web/src/lib/cold-outreach-email.ts` (subject, pitch box, CTA, new text part)
- `apps/web/src/app/api/admin/outreach/route.ts` (send `text:` alongside `html:`)
- `apps/web/src/app/admin/outreach/components/OutreachComposer.tsx` (preview subtitle)

### Validation

- `npm run typecheck` — pass.
- `npm run lint` — pass (5 pre-existing warnings in untouched studio/world files).
- Template smoke-rendered via tsx with sample data: subject, HTML (CTA href confirmed `/for-advertisers`), and text part all build correctly.

### Open notes

- Personal-message block remains the heart of the email; visual shell unchanged.
- Possible enhancement if Mike wants it: a company/brand-name field on the composer so subject + copy can reference the brand rather than only the contact's first name (needs a nullable `company` column on `cold_outreach`).

## Revision 2 — Mike's feedback incorporated (same day)

Mike's spec: (1) edited personal paragraph, (2) one-two sentence "what is this", (3) "who we work with" that shows our hand; tone personal/professional/not overly eager; feel light, bright, open, inviting.

### Changes

- **Subject:** tagline subject replaced with plainer `"{name} — your brand on the right podcasts"` (the hero-echo line read as too eager by Mike's standard).
- **Pitch box dissolved:** the boxed gray panel + three bullets are gone; replaced by two open typographic sections with small purple labels — "What this is" (two sentences) and "Who we work with" (RQ-screen selectivity framing: "If we've reached out, it's because we think you'd clear that bar").
- **Single-source constants:** `WHAT_IS_THIS` / `WHO_WE_WORK_WITH` feed both the HTML (via `pitchToHtml`, which styles the GHOSTSignal wordmark) and the plain-text part — future copy edits touch the constants only.
- Roomier shell: 40px gutters, 16px radius, looser section rhythm.
- CTA label now "See how we work with brands" (still → /for-advertisers).

### Validation

- `npm run typecheck` — pass; tsx smoke-render confirmed subject, CTA href, no leftover bullets, wordmark styling from the constant.

### Awaiting from the team

- Named shows/genres for the "Who we work with" section (current copy shows the hand via method, not names — name-dropping members is a permission question).
- Clarify Mike's "a page on our site" idea vs. the existing /for-advertisers page.

## Revision 3 — visual redesign to the studio theme (same day)

Rebuilt the HTML shell as distinct designed sections using the studio light theme (hex literals mirroring `src/app/studio/studio-tokens.css` — emails can't use CSS vars):

- Canvas `#fafbff` (studio-bg), white card at 584px with 18px radius + studio card shadow (progressive enhancement; degrades in Outlook).
- Header: wordmark left, "PODCAST NETWORK" pill right (mirrors the studio STUDIO pill), morse accent divider now full card width.
- Personal message stays open letter-style text — no panel — per "the heart" intent.
- Sections 01/02 as soft-tint rounded panels (accent tint `#f6f3fc` for "What this is", cool neutral `#f5f7fc` for "Who we work with") with numbered chip + letter-spaced eyebrow headers via a shared `sectionHeader()` helper.
- CTA block: button + quiet "Prefer a link?" fallback line (pattern from the invite email).
- Copy, constants, subject, and plain-text part unchanged from revision 2.

Validation: typecheck pass, lint 0 errors (5 pre-existing warnings elsewhere), Playwright screenshot of the rendered template visually verified (scratchpad `outreach-preview.png`).

## Revision 4 — Mike's second feedback round (same day)

Structural rebuild of the email per Mike:

- **Entrance:** "PODCAST NETWORK" pill removed; full vertical brandmark (cloud glyph + wordmark) centered at the top. New asset `public/images/brand/gs-brandmark-vert-dark.png` generated from `brandmark-vert-white.svg` recolored dark and rasterized (Gmail can't render SVG). Short morse divider centered beneath.
- **Invitation headline:** "You are invited to the GHOSTSignal Studio." centered.
- **Description panel:** the "01 / WHAT THIS IS" chip + label removed — plain soft-tint container with the WHAT_IS_THIS text, centered.
- **Default personal message:** new exported `defaultOutreachMessage()` ("no pitch deck, just a look…"). Composer textarea prefills it (same pattern as the studio invite form), the send route falls back to it when blank (and stores what was actually sent), preview route likewise.
- **Who we work with → baseball-card fan:** new animated asset `public/images/email/outreach-roster.gif` (~200 KB, 1080×630, 6 frames @1.5 s) — three studio-chrome client cards, center overlapping left/right, cycling through a six-client roster; brands in blue / creators in ember per the studio color coding. **Roster is a MOCK-UP (fictional clients)** — regenerate before real sends. First frame is the static Outlook fallback.
- Template gained an `assetOrigin` param (preview route passes the request origin so images resolve on localhost; sends use production).
- Note: `gcn-brandmark-black1.svg` in public/images/brand is Global Counseling Network — NOT a GhostSignal asset; avoided.

Files: `lib/cold-outreach-email.ts`, `api/admin/outreach/route.ts` (+preview), `OutreachComposer.tsx`, two new image assets. Validation: typecheck pass, lint 0 errors, full-page Playwright screenshot verified (scratchpad `outreach-v2.png`). Not yet committed — pending Martin's inspection.

### Do-not-send caveat

The roster GIF names six fictional clients. Until it's regenerated from real members, sending this email to a real prospect would show made-up "clients" — hold real sends.

## Revision 5 — founders section + section reorder (same day)

Mike's round 3: add the four co-founder faces with name + brief description, and reorder the email to: headline → personal message → co-founders → description → who-we-work-with.

- **Headline** now broken over two lines: "You're invited / to the GHOSTSignal Studio." (26px, centered).
- **Co-founders section:** four-column row under a "The co-founders" eyebrow — photo, name, role (Mike Sense / Vision & Partnerships, Jack W Harding / Cultural & Business Strategist, Martin Drexler / Design, Jeremy Reeves / Creative Strategist). Data mirrored from `who-are-we/FoundersSection.tsx` (roles used as the brief descriptions; site bios far too long for email).
- **New assets:** the site portraits are 550×800; forcing them square would distort, so four square 152px email crops were generated with sharp's attention crop → `public/images/email/founder-*.jpg` (~4 KB each).
- Plain-text part reordered to match.

Validation: typecheck pass, lint 0 errors, Playwright full-page screenshot verified (faces undistorted, 4-across fits the 584px card; Jack's two-line role wraps cleanly). Still uncommitted pending inspection.

## Revision 6 — description/founders swap + LinkedIn links (same day)

- Description panel now precedes the co-founders section (order: headline → personal message → description → founders → card fan).
- Each founder's photo + name wrapped in a link to their LinkedIn profile (URLs from FoundersSection.tsx); role line stays plain. Plain-text part lists each founder with their LinkedIn URL.
- Verified: all four linkedin.com hrefs present in rendered HTML, typecheck pass, screenshot re-checked.

## Revision 8 — quote, spinning logo, calmer card animation, XQ footnotes (same day)

- **Pull-quote** with a mini morse accent: "We help brands zoom in on the right people." (Martin's raw text said "zoom in on with the right people" — grammar glitch flagged, corrected form used.) First placed as the pre-CTA closer; moved on Martin's request to sit directly on top of the card rotation (after the founders row).
- **Spinning logo entrance:** no extraction needed — the signature GIFs embed the standalone `movinggiflogogrey.gif` (120px, 90 frames @70ms). Rebuilt it with the flat #f2f2f2 background remapped to white → `public/images/email/logo-spin.gif` (~109 KB), shown at 96px above an HTML wordmark. Static dark lockup PNG kept in /brand but no longer used in the header.
- **Card animation:** regenerated with 2.2 s holds + 5-frame (80 ms) opacity crossfades between states — 36 frames total. Render scale dropped to 1× / 160-color palette to hold size: first cut at 1.25×/256c was 1.3 MB, final is ~807 KB.
- **Card footnote:** "GHOSTSignal client" → the client's XQ archetype in the side's accent color ("XQ · The Steward" etc.), using real archetype names from `lib/xq/constants.ts` — personas are mock assignments like the clients themselves.
- Plain-text part carries the quote. Validation: typecheck pass, lint 0 errors, screenshot verified, GIF timing verified via sharp metadata (2200,80×5 pattern).

## Revision 9 — no-name greeting, dark mode, Snowdrift ad (same day)

- **No-name case is now a real send path**, not a preview placeholder: greeting renders "Hello," (recommended over "Hello there" — filler words read mass-mail), subject drops the name prefix ("Your brand on the right podcasts"), name field no longer `required` in the composer, send route accepts a blank name (schema's `not null` satisfied by empty string). Preview shows exactly what a no-name send would say.
- **Dark mode designed**: template takes `theme: "light" | "dark"` with palettes mirroring studio-tokens.css dark tokens (page #0f1219, card #161a23, accent #9b7ee6 with dark button text, panel #2b2a42). Dark asset variants generated: `logo-spin-dark.gif` (bg → #161a23 from movinggiflogodarkgrey.gif) and `outreach-roster-dark.gif` (~855 KB; dark card chrome, lifted blue #6ea8ff / ember #ff9e64 accents per studio dark tokens).
- **Preview toggle**: composer preview has Light/Dark buttons (re-fetches with `theme`); new `.previewThemeRow` style; iframe background now transparent since the email brings its own canvas. **Sends remain light-only** — recipient clients that force-darken do their own inversion; a prefers-color-scheme hybrid embed was considered and skipped (patchy client support).
- **Snowdrift ad** added below the CTA — same starry card unit as the studio invite email (dark by design, works in both themes); plain-text part carries the subscribe link.
- Validation: typecheck pass, lint 0 errors, both theme screenshots verified (incl. "Hello," no-name variant), subject fallbacks verified.

## Revision 10 — /invitation full-page version of the cold call (same day)

New public route `apps/web/src/app/invitation/` — the email's "full version": same section order expanded for desktop. Public-surface conventions honored: Section/Container primitives, --gs-* tokens with calc pattern (accents via --gs-tw-violet-500, tones blue-600/orange-600 + color-mix softs), SplitLinesReveal/ScrollFadeUp motion, SiteHeader/Footer.

- Sections: spinning-glyph hero + two-line headline + intro → What-this-is + three /for-advertisers value-prop cards → co-founders 2×2 with full bios + LinkedIn → pull-quote → RosterCarousel → CTA → Snowdrift starry band.
- **RosterCarousel** (`RosterCarousel.tsx`): five-card layered deck per Martin's spec — center on top, one pair a layer below, another pair a layer below that; arrow buttons flank the deck; ← / → keys rotate (ignored while typing in form fields) with a visible kbd hint + counter; brands/creators legend. 8 mock clients (email's 6 + Juniper Supply Co. / Long Way Home) so each XQ archetype appears once. Below 680px the outer pair folds away (3 visible).
- Email gained a "This is the short version — see the full introduction on our site →" link under the entrance morse (HTML + text parts) → /invitation.
- Validation: typecheck, ESLint, **Stylelint (public surface) clean**, assets:audit OK (64 assets). Playwright-verified live: carousel arrows + ArrowRight both rotate (counter 1/8 → 3/8), scroll-reveal sections render (full-page stitched screenshot shows pre-reveal blanks — artifact, not a bug).

## Revision 11 — template picker in the composer (same day)

The light/dark choice is now part of the send, not just the preview: an "Email template" radio pair (Light mode / Dark mode) in the composer form; the send route accepts `theme` and renders the chosen variant; the preview's Light/Dark toggle and the form radios share one state so what you preview is what goes out. New `.themeField` / `.themeChoices` / `.themeChoice` styles (admin tokens). Typecheck + lint pass. Note: the sent theme is not stored on the cold_outreach row (no column) — add one if the team later wants per-send template reporting.

## Revision 12 — five-brand-color diagonal stripes (same day)

Brand-stripe motif (what-is-this / founder-portrait rainbow: red D66157, purple 9F71AF, green 00B29C, pink FF7BAD, orange FBAD25) added as diagonal background bands on both surfaces; the opaque cards/sections keep all copy readable.

- **Email:** `pageStripes` per theme in THEMES — 135° repeating-linear-gradient of the five colors pre-mixed into the page bg (12% into #fafbff light / 18% into #0f1219 dark; email can't color-mix). Applied on body + outer table; Outlook falls back to flat bgcolor. Both themes screenshot-verified — light reads as soft pastels, dark as muted jewel tones.
- **/invitation page:** same motif on `.page` via color-mix over --gs-tw-brand-* tokens (7%), 120px bands, `background-attachment: fixed`. Solid section bands (about/cta/snowdrift) and cards sit on top, giving striped/solid rhythm. The spin-GIF's opaque white ground showed as a square on stripes → framed as a rounded chip with soft shadow (app-icon look), verified.
- Stylelint + typecheck pass.

### Correction (Martin): desktop = real strands, not muted background

The what-is-this stripes turned out to be `/images/what-is-this/color-bars.png` (652×7548, rendered there via BarsRipple at 0.6 opacity, centered vertical strip). /invitation now reuses that exact asset: diagonal color-mix background removed; `.brandBars` = viewport-fixed, centered, full-height strand (160px wide, object-fit cover, z-index 0, pointer-events none) with sections lifted to z-index 1 — solid bands (about/cta/snowdrift) cover it for rhythm, cards glide over it. Readability: small centered text that crosses the strand (eyebrows, hero/section ledes, carousel key-hint) got frosted chips (color-mix 78% bg + backdrop-blur). Email keeps its diagonal muted stripes (correction was desktop-only). Screenshot-verified hero + carousel over strands.

## Revision 13 — ripple animation, clean hero, flat email background (same day)

- **/invitation strand now animates**: swapped the static `<Image>` for the what-is-this `BarsRipple` component (shallow-water ripple on mouse-over). It listens on `window.mousemove`, so it works through the pointer-transparent layer; falls back to the static PNG on touch/reduced-motion/no-WebGL. Verified live — synthetic mouse sweep produced visible wave displacement.
- **Hero de-striped**: `.heroSection` got an opaque background so the entrance text sits on a clean field; the strand appears from the "what this is" band onward. The hero lede's now-redundant frosted chip removed (eyebrow/key-hint chips stay — they still cross the strand).
- **Email colored background removed** (Martin): `pageStripes` deleted from THEMES; body + outer table back to flat `pageBg` per theme. Both themes re-rendered.
- Typecheck, ESLint, Stylelint all pass.

## Revision 14 — rapid-fire batch (same day)

Four Martin directives in quick succession:

- **Stripes removed from /invitation entirely** (after briefly wiring the BarsRipple mouse-over animation + opaque hero per the prior ask — all of it reverted): brandBars layer, z-lifting rule, frosted chips, hero background all deleted. Page is back to clean fields; spin-GIF keeps its rounded-chip framing. XQSpectrumMap gained an optional `pointLabel` prop (default "YOU") — kept, used below.
- **Email "This is the short version — see the full introduction on our site →" removed** (HTML row + text-part line + now-unused INVITATION_PATH const). /invitation still exists; the email no longer links it.
- **/invitation section swap:** carousel (with its pull-quote on top) now precedes the co-founders. Order: hero → what-this-is → quote → carousel → founders → CTA → Snowdrift.
- **CTA section rebuilt:** title → "Find out what your RQ and XQ are." (Martin wrote "is" — grammar-corrected, flagged); two quiz tiles (XQ · Conviction Index, violet top-rule → /xq-quiz; RQ · Resonance Quotient, brand-orange top-rule → /rq-quiz); dark spectrum-map panel using the shared XQSpectrumMap in result mode (position ≈ Steward, highlight C-P-C, pointLabel "YOUR BRAND") + caption tying it to Meridian Coffee from the carousel; advertisers button kept at the end.

Validation: typecheck, ESLint, Stylelint pass; CTA tiles + map + section order screenshot-verified; both email themes re-rendered clean.

## Revision 16 — email carousel arrows (same day)

Decorative circular ← → arrows added flanking the email's card-fan GIF (three-column table; 36px bordered circles themed per palette; GIF narrowed to 416px max). Explicitly non-interactive — email can't rotate; they mirror /invitation's carousel controls. Offered to make them links to the interactive carousel; left unlinked since Martin removed the email→/invitation link. Both themes re-rendered + verified.

## Revision 15 — email section swap, bold quote, heavy XQ/RQ section (same day)

- **Email:** card-fan (with quote on top) and co-founders swapped — order now mirrors the page: description → quote → fan → founders → CTA. Plain-text part reordered to match. Both themes re-rendered + verified.
- **/invitation quote** "We help brands zoom in on the right people." → font-weight bold (700).
- **/invitation XQ/RQ section rebuilt heavy** per Martin: replaced the light tiles with the what-is-this assessment-teaser treatment — dark #0a0a0d band, uppercase clamp headline, `XQ3DWordmark`/`RQ3DWordmark` extruded marks crowning glassy prose cards (copy verbatim from what-is-this for lockstep: Conviction Quotient "Free · open to everyone" / Resonance Quotient "Members only · the matching engine"), per-card secondary buttons → /xq-quiz + /rq-quiz. Spectrum-map panel restyled as a matching glass card inside the band; advertisers button switched to secondary for the dark ground.
- Validation: typecheck, ESLint, Stylelint pass; screenshot-verified.

### Map + headline refinements (Martin, same batch)

- Map panel enlarged (compact prop dropped → 76px archetype thumbnails; needed a `.mapReveal` full-width wrapper class — ScrollFadeUp's plain div was shrink-wrapping the panel), then width-matched to the assessment pair (960 max) so tiles + map align as one unit.
- CTA headline restyled down: sentence-case, --gs-text-3xl-size, semibold (was uppercase clamp-56px bold) — the 3D wordmarks stay the visual heroes.
- **Carousel profile popup:** clicking the front card opens a modal with the client's full profile — blurb, longer about paragraph, XQ block (real archetype name + tagline + first sentence from lib/xq/constants; ROSTER refactored to store `xqCode` so display data derives from the source of truth) and a short mock RQ resonance read. Closes via X, backdrop click, or Escape; arrow-rotation suspended and page scroll locked while open; smooth in/out (overlay fade + card pop, exit keyframes play before unmount via animationend, reduced-motion safe). Side-card clicks still rotate; rail hint mentions the click. Verified open + Escape-close via Playwright.
- User-point pulse added to the shared XQSpectrumMap (component docstring promised "pulsed" but never animated it): 2.8s radar ping ring + breathing halo, reduced-motion safe — benefits the quiz reveal ("YOU") as well as /invitation ("YOUR BRAND"). Verified animating via two-phase screenshots.

## Revision 7 — formal greeting + visible name placeholder (same day)

- Greeting "Hi {name}," → "Hello {name}," (HTML + text parts). "Dear" considered and offered as the more formal alternative.
- Preview with a blank name field now renders "Hello [First name]," (bracket placeholder) instead of "Hi there" — makes the missing name obvious. Sends are unaffected: the send route already rejects a missing name.

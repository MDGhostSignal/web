# Session Log — 2026-05-11

Container-sickness audit + first cleanup pass.

## 1. Audit

Surveyed every public page (`page.tsx` + `page.module.css`) for
container/wrapper/section naming, nesting depth, dead wrappers,
duplication, and token compliance. Catalogued findings into a
ranked optimization plan. Full diagnosis in conversation history;
the highlights that drove this session's work:

- **Homepage outlier.** Every other page uses `.page` as its root
  CSS module class; homepage used `.legacyHome` — a class name
  that confessed an unfinished refactor.
- **`--edge-pad` / `--content-max` / `--footer-max` copy-pasted**
  into 8 separate page module files (7 page roots + ContactSection
  consumer). No shared layout primitive.
- Three-layer nesting chains on several pages
  (`.featuresSection > .featuresContainer > .featuresLayout > .featuresGrid`
  etc.) — deferred to a future pass.
- Several "dead wrapper" candidates surfaced by the audit
  subagent. Verified in this session — see §3.

## 2. Cleanup pass #1 — variable unification + root rename

**New file: `apps/web/src/styles/page-shell.css`** — declares
the three shared CSS variables on `:root`. Imported once in
`apps/web/src/app/layout.tsx` alongside `generated-tokens.css`
and `typography.css`.

**Removed redundant declarations** from each `.page` rule:

- `apps/web/src/app/for-creators/page.module.css:1`
- `apps/web/src/app/for-advertisers/page.module.css:1`
- `apps/web/src/app/who-are-we/page.module.css:1`
- `apps/web/src/app/get-in-touch/page.module.css:1`
- `apps/web/src/app/snowdrift/page.module.css:1`
- `apps/web/src/app/what-is-this/page.module.css:1`
- `apps/web/src/app/signal-sheet/page.module.css:1`

Page-specific `--accent` on signal-sheet kept (it's not shared).
Page-specific `background` / `overflow` / `min-height` kept on
each page's `.page` rule — those legitimately vary.

**Homepage root renamed.** `.legacyHome` → `.page` in both
`apps/web/src/app/page.module.css:1` and the consuming
`<main className={...}>` in `apps/web/src/app/page.tsx:42`. All
8 public pages now share the same root class name.

## 3. Dead-wrapper verification — audit overcalled

The Explore-subagent audit flagged six wrappers as "dead /
pass-through". Read each one's full CSS + JSX context before
deleting. **Five out of six had real responsibilities the audit
missed** (the audit only inspected the first ~35 lines of each
module file):

| Candidate | Real purpose discovered | Verdict |
|---|---|---|
| `.morseCodeWrapper` (who-are-we) | `position: relative` + `overflow: hidden` clip for marquee `position: absolute` child | Keep |
| `.formContainer` (get-in-touch) | Width constraint shared by two conditional children (`.successMessage` AND `.contactForm`) | Keep |
| `.descriptionContent` (snowdrift) | `gap` between 4 ScrollFadeUp children; folding up would affect sibling `.descriptionTagline` | Defer (needs sibling check) |
| `.journeyRight` (for-creators) | CSS comment documents intent — groups `<ol>` + CTA as a single grid child | Keep |
| `.featuresAnimation` (creators + advertisers) | Flex center + `order: 1` reorder + sizes Lottie SVG children + responsive overrides | Keep |
| `.centeredHeadlineContainer` / `.centeredBodyContainer` (what-is-this) | Real width/margin/text-align rules; names are misleading but functional | Keep, rename later |

**Net deletions this session: zero.** The audit ran on partial
context; verification matters more than rec count.

I briefly inlined `.formContainer` into `.contactForm`, then
caught the success-state branch on read of the full JSX and
reverted.

## 4. Skipped from the plan

- Tokenizing `.heroVideoTilt`'s 32px/26px parallax multipliers
  (for-advertisers) — these are visual tuning constants, not
  spacing values; forcing them through `--gs-n-*` would be
  semantically wrong.
- Replacing homepage `background: #000000` with `var(--gs-background)`
  — the homepage actively forces `html`/`body` black via inline
  `useEffect` (`page.tsx:24-39`), so the literal black is
  intentional, not a token miss.

## Files touched

| Area | Paths |
|------|-------|
| New shared layout file | `apps/web/src/styles/page-shell.css` |
| Layout import | `apps/web/src/app/layout.tsx` |
| Page modules (vars stripped) | `apps/web/src/app/{for-creators,for-advertisers,who-are-we,get-in-touch,snowdrift,what-is-this,signal-sheet}/page.module.css` |
| Homepage root rename | `apps/web/src/app/page.module.css`, `apps/web/src/app/page.tsx` |
| Session log | `docs/SESSION_LOG_2026-05-11.md` (this file) |

## Validation

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ 0 errors / 0 warnings |
| `npm run assets:audit` | ✅ 50 referenced public assets exist |

Manual browser verification of the rename + var extraction not
performed in this session (pure refactor; classes resolve
identically, vars now sourced from `:root` instead of the local
module).

## 5. Cleanup pass #2 — misleading class renames

After reading the actual CSS for the 3-layer chains the audit
flagged (for-creators features/journey, who-are-we mission/
promises, snowdrift description), I concluded that **the chains
are structurally healthy** — each layer owns real CSS (padding,
max-width, grid, sticky positioning, distinct gaps). The audit's
"container sickness" framing applied to nesting depth was wrong;
the real issues were misleading names.

Two clean renames executed:

| Old | New | Reason |
|---|---|---|
| `.featuresGrid` (for-creators + for-advertisers) | `.featuresList` | The rule is `flex-direction: column` — it's not a grid. List-of-cards is the actual semantic. |
| `.centeredHeadlineContainer` / `.centeredBodyContainer` (what-is-this) | `.headlineBlock` / `.bodyBlock` | CSS comment already admitted "the layout is no longer centred"; rules use `text-align: left` and a left-anchored body block. |

While in `what-is-this/page.module.css` I also rewrote the
contradictory comment pair (one comment said "no longer centred",
another said "centered via `.centeredHeadlineContainer`") into a
single accurate one-liner.

## 6. Cleanup pass #3 — orphan CSS deletion (largest win)

Wrote a per-page orphan check: extract every `^\.className` rule
from `page.module.css`, extract every `styles.X` reference from
the page's `.tsx` files in the same directory, diff. Iterated
twice — the first version only inspected `page.tsx`, which would
have deleted classes used by sibling components that share the
page's CSS module. **Caught this before any damage** when
verifying who-are-we (FoundersSection.tsx + SplineEmbed.tsx both
import `./page.module.css` — modal/founder/team/cloud classes
are alive via those).

Re-ran the script against the whole page directory (`*.tsx`) for
who-are-we. Other six pages confirmed clean (only `page.tsx`
imports the module).

**Dead CSS found (verified via targeted rechecks):**

Every page had a leftover **footer/social/morse block** (~15
classes: `.footer`, `.footerTop/Nav/Morse/Social`, `.footerMark`,
`.footerWordmark{,Left,Right}`, `.footerCol{,Title,Links}`,
`.morseCode`, `.socialLink{,:hover}`, `.socialIcon`) from before
the per-page footer was replaced by the shared `<Footer />`
component. Every page also had unique page-specific dead blocks
from removed features:

- **Homepage**: `.scrollIndicator`, `.scrollArrow`, `@keyframes pulse`
- **For Creators**: footer block only
- **For Advertisers**: `.heroLogo`, `.heroLogoText`, `.pitchImageGrid`, `.pitchImageCell`, `.pitchSection:hover .pitchImageCell`, `.visualStack`, `.visualOverlay`, entire `.resonance*` section (`.resonanceSection/Content/Headline/Subhead` + `.resonanceHeadline em`)
- **Get In Touch**: `.contactCta`, `.contactCta:hover`, `.ctaArrow`, `.contactCta:hover .ctaArrow`
- **Snowdrift**: `.signupForm`/`.ctaForm` selector group, `.formLabel`, `.formRow`, `.formInput` (+ `:focus`, `::placeholder`), entire CTA section (`.ctaSection`, `.ctaContainer`, `.ctaHeadline`, `.ctaClosing`), `.ctaSection` reference inside the 768px media query
- **What Is This**: entire split-hero ecosystem (`.splitHeroWrapper/Left/Right/Image/TextContainer/Headline/Subtitle/Body`), `.staticFlicker` + `@keyframes noiseFlicker`, `.logoRow`, `.framingLogo`, the 1024px + 768px media queries that only override split-hero classes, `.barsImage`, `.alignLeft` (+ `.alignLeft .textContainer`), `.alignCenter` (+ `.alignCenter .textContainer`), `.alignRightText`, `.harmonyOrbit` (+ comment block + prefers-reduced-motion override), `.harmonyOrbitSphere`, `.sectionSubtitle`, the now-stale comment block referring to removed CSS animations
- **Who Are We**: `.heroLogoWordmark`, `.splineLoading`, `.teamHeadline`, `.modalSignature` + `.modalSignature img` + `.modalSignature img:hover`
- **Signal Sheet**: clean — no orphans found

### Line-count impact

| Page module | Before | After | Δ |
|---|---:|---:|---:|
| Homepage | 213 | 172 | -41 |
| For Creators | 975 | 839 | -136 |
| For Advertisers | 1215 | 991 | -224 |
| Who Are We | 1533 | 1350 | -183 |
| Get In Touch | 669 | 499 | -170 |
| Snowdrift | 596 | 369 | -227 |
| What Is This | 1330 | 920 | -410 |
| Signal Sheet | 838 | 838 | 0 |
| **Total** | **7369** | **5978** | **-1391** |

Plus the smaller var-extraction pass earlier this session
(~-21 lines from removed `--edge-pad`/`--content-max`/
`--footer-max` declarations, offset by +18 in the new shared
`page-shell.css`).

**Net: ~1394 lines of dead CSS removed**, ~19% reduction in page
module CSS across the public site.

## 7. What was NOT touched (and why)

- **3-layer nesting** on for-creators/who-are-we/snowdrift —
  verified each layer carries real CSS work (padding vs.
  max-width vs. grid vs. distinct gap values). Folding any layer
  would change either visual semantics or sibling layout.
  Audit's "container sickness" framing didn't survive contact
  with the actual rules.
- **Originally flagged "dead wrappers"** (`.morseCodeWrapper`,
  `.formContainer`, `.descriptionContent`, `.journeyRight`,
  `.featuresAnimation`) — see §3.
- **`.alignRight`** in what-is-this — looked orphan on a naive
  `styles.X` grep but is applied via a template-literal class
  composition (`${styles.textSection} ${styles.alignRight}` at
  `page.tsx:491`). Caught during verification; kept. Its
  siblings `.alignLeft`/`.alignCenter` had no such use and were
  deleted.
- **For-advertisers parallax magic numbers** (32px/26px) — still
  hard-coded. Same call as last session: they're tuning
  constants, not spacing tokens.
- **Homepage `#000` background** — intentional per `page.tsx`
  comment forcing html/body black.

## Files touched (full session)

| Area | Paths |
|------|-------|
| Shared layout vars | `apps/web/src/styles/page-shell.css` (new), `apps/web/src/app/layout.tsx` |
| Var declarations stripped | 7 × `page.module.css` |
| Homepage root rename | `apps/web/src/app/page.module.css`, `apps/web/src/app/page.tsx` |
| Rename `.featuresGrid` → `.featuresList` | `apps/web/src/app/for-creators/{page.module.css,page.tsx}`, `apps/web/src/app/for-advertisers/{page.module.css,page.tsx}` |
| Rename `.centered*Container` → `.{headline,body}Block` | `apps/web/src/app/what-is-this/{page.module.css,page.tsx}` |
| Orphan CSS deletion | All 7 page modules + `apps/web/src/app/page.module.css` |
| Session log | `docs/SESSION_LOG_2026-05-11.md` (this file) |

## Validation (end of session)

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ 0 errors / 0 warnings |
| `npm run assets:audit` | ✅ 50 referenced public assets exist |

Validation re-run after every page-module edit. Pure CSS
deletions of unreferenced rules have zero runtime impact by
construction — but the user should still manually walk the site
once before pushing to catch any classname I marked orphan that's
actually applied via a less-common pattern (CSS Modules `:global`,
runtime `classList.add`, etc.). The two patterns I specifically
checked for: template-literal composition (`alignRight` survived
that check) and sibling-component CSS-module sharing (who-are-we
survived that check).

## 8. Cleanup pass #4 — final sweep

After the bulk page-module deletions, ran two follow-ups:

**ContactSection fallback dropped.**
`apps/web/src/components/ContactSection/ContactSection.module.css:2`
had `var(--edge-pad, 112px)` — the fallback existed because
`--edge-pad` was previously only declared inside each page's
`.page` rule. Now that `:root` declares it unconditionally
(pass #1), the fallback is dead code. Removed.

**Cross-page duplicate scan.** Three pages declare a
`.staticOverlay` rule (for-creators, for-advertisers,
signal-sheet) with subtle variants — opacity (0.04 vs 0.05),
SVG noise `baseFrequency` (0.85 vs 0.9) baked into the inline
data URL, plus signal-sheet's `mix-blend-mode: overlay`.
Considered extracting but the baseFrequency lives inside the
SVG payload so the dedup gains would be ~10 lines × 3 pages
for marginal benefit vs. the work of unifying the visual.
Skipped — keeping each page's tuned variant.

Cloud float keyframes (`cloudFloat1/2/3`) appear only in
who-are-we. Not duplicated.

**Components directory orphan scan.** Ran the broader orphan
check on `apps/web/src/components/` and `apps/web/src/app/*.module.css`.
False positives flagged on `BrandedGhostSignal.module.css`,
`Button.module.css`, and `HomeTypingLoop.module.css` — all use
the `styles[variant]` / `styles[propValue]` runtime access
pattern. My naive `styles\.X` grep doesn't catch bracket
access. Verified each, kept as-is. No real orphans in the
components tree.

## Open follow-ups / next-step notes

1. **Manual browser walk.** Pure unreferenced-rule deletion is
   zero-risk by construction, but I haven't started the dev
   server. Worth a 5-minute click through all 8 pages to
   confirm nothing references these classes via a pattern my
   scripts didn't catch (`classList.add`, `:global` selectors,
   Tailwind composition).

2. **Standardize section naming** (S/M). Pages currently mix
   `.{name}Container` / `.{name}Content` / `.{name}Layout`
   for the content-well role. `.{name}Container` is dominant.
   Lots of small renames, low individual risk, low individual
   value — only worth doing if it precedes target #3.

3. **JSX `<Section>` / `<Block>` primitive** (L). Locks the
   shape so future drift requires explicit CSS. Worthwhile
   after target #2 lands.

4. **Stylelint rule: forbid hard-coded px/rem outside the calc
   pattern** — would catch future token-system drift
   automatically.

5. **Audit-overcall lesson #2.** The naive orphan grep would
   have silently deleted ~20 alive classes in who-are-we
   (sibling-component CSS sharing) and ~12 classes in
   `Button` / `BrandedGhostSignal` / `HomeTypingLoop`
   (dynamic bracket access). Future automated cleanup in this
   codebase MUST: (a) union references across every `*.tsx`
   in the module's directory, (b) match both `styles.X` AND
   `styles[X]` / `styles["X"]` access patterns. Worth a short
   note in `AGENTS.md` if we keep doing this.

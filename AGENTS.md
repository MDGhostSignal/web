# Agent Instructions (ghostsignal)

## Mandatory Project Context Read

- At the beginning of every task in this repo, read `PROJECT_INFO.md`.
- Treat `PROJECT_INFO.md` as canonical for website purpose, page map, and route naming.
- If implementation and `PROJECT_INFO.md` diverge, follow `PROJECT_INFO.md` unless the user explicitly overrides it in the current prompt.

## Figma MCP Connection (Mandatory)

- A local MCP endpoint for Figma is available at: `http://127.0.0.1:3845/mcp`.
- At the start of any design-implementation task, agents should verify this endpoint is reachable before proceeding with Figma-driven changes.
- The endpoint may return protocol-level JSON-RPC errors (for example `Invalid sessionId`) to plain HTTP requests; that still confirms the MCP service is running.
- Treat this MCP connection as the source for current Figma context when design fidelity decisions are required.
- The design direction for this website is a **cutting-edge modern agency website** look and feel.

## Figma MCP Full-Access Verification

- Detailed runbook: `docs/FIGMA_MCP_ACCESS.md`.
- Before claiming Figma access is working, validate all of the following through MCP tool calls:
  - `tools/list` returns: `get_design_context`, `get_variable_defs`, `get_screenshot`, `get_metadata`.
  - `get_metadata` returns node structure with positions/sizes (`x`, `y`, `width`, `height`) and component hierarchy.
  - `get_variable_defs` returns token values (colors, typography, spacing/sizing variables).
  - `get_screenshot` returns image content for the target node.
  - `get_design_context` returns reference implementation + node ids + asset links + style context.
- Reference node for smoke test: `3002:370` in file `https://www.figma.com/design/6nDMQnD7o9MMMSGzNAzXRc/ghostsignal-design-system`.
- If MCP client handshakes fail in-tool, use the documented fallback procedure in `docs/FIGMA_MCP_ACCESS.md` and do not claim missing access until that direct check fails.

This repo has two kinds of assets:

1. **Raw/source assets (local-only vault)**: `assets/`
2. **Shipped website assets (tracked)**: `apps/web/public/`

## Asset Policy (Keep Git Lean)

- Treat `assets/` as a **scratch / vault directory** for exports, inspiration, PSDs, big dumps.
- **Do not commit** raw/source assets from `assets/`.
- Any file that the website code references (for example `"/images/..."`, `"/lottie/..."`) must exist in `apps/web/public/` and should be committed.
- If an asset is needed for the site, copy it from `assets/` into `apps/web/public/...` using clean names and stable paths.

Notes:
- `.gitignore` ignores `assets/` to prevent accidental commits, but it does not remove files already tracked in git.
- If the repo still tracks `assets/*`, untrack them once with:
  - `git rm -r --cached assets`
  - re-add `assets/README.md` (kept as documentation)

## Canonical Locations

- Raw vault (ignored): `assets/`
- Website public root (tracked): `apps/web/public/`
- Website images (tracked): `apps/web/public/images/`

Recommended structure under `apps/web/public/images/`:
- `brand/` (logos, morse strips, brand textures)
- `squarespace/` (page-specific assets grouped by route)

## Validation (Automation)

From `apps/web`:
- `npm run assets:audit` checks that every referenced `public/` asset exists.
- `npm run assets:manifest` regenerates `public/assets.manifest.json` (list of referenced public assets).

Rules for agents:
- Before shipping a page change, run:
  - `npm run assets:audit`
  - `npm run typecheck`
  - `npm run lint`

If `assets:audit` reports missing files:
- Look for the file in the raw vault `assets/` and copy it into `apps/web/public/...`.
- Update the code to reference only `public/` paths (no hotlinking unless explicitly requested).

## Design Token System (Mandatory)

This repo has a **comprehensive design token system** synced from Figma. Agents MUST use these tokens instead of hard-coding values.

### Token Files

| File | Purpose |
|------|---------|
| `apps/web/src/styles/generated-tokens.css` | Auto-generated from Figma (DO NOT EDIT) |
| `apps/web/src/styles/typography.css` | Composite text styles + utility classes |
| `apps/web/public/variables/` | Source token JSON files from Figma |
| `apps/web/scripts/build-tokens.mjs` | Token generation script |

### Available Token Categories**Colors (semantic):**
- `--gs-background`, `--gs-foreground`, `--gs-primary`, `--gs-secondary`
- `--gs-muted`, `--gs-accent`, `--gs-destructive`, `--gs-border`
- Full light/dark mode support via `.theme-dark` class

**Colors (primitives):**
- `--gs-tw-{color}-{shade}` (e.g., `--gs-tw-neutral-500`, `--gs-tw-blue-600`)
- Brand colors: `--gs-tw-brand-red`, `--gs-tw-brand-purple`, etc.

**Typography:**
- Font sizes: `--gs-font-size-xs` through `--gs-font-size-10xl`
- Font weights: `--gs-font-weight-thin` through `--gs-font-weight-black`
- Line heights: `--gs-font-leading-3` through `--gs-font-leading-32`
- Composite styles: `--gs-text-{size}-size`, `--gs-text-{size}-leading`

**Spacing:**
- Number scale: `--gs-n-{value}` (e.g., `--gs-n-16`, `--gs-n-64`)
- Gap tokens: `--gs-gap-gap-{n}`
- Space/padding/margin tokens available

**Border Radius:**
- `--gs-radius-none` through `--gs-radius-full`

### Token Usage Pattern

Always use the calc pattern for pixel values:
```css
/* Correct */
padding: calc(var(--gs-n-24) * var(--gs-px));
font-size: calc(var(--gs-font-size-xl) * var(--gs-px));

/* Also correct - composite typography */
font-size: var(--gs-text-xl-size);
line-height: var(--gs-text-xl-leading);

/* WRONG - never hard-code */
padding: 24px;
font-size: 20px;
```

### Typography Utility Classes

The `typography.css` file provides ready-to-use classes:
```tsx
<p className="text-xl-regular">Body text</p>
<h1 className="text-display-lg">Display heading</h1>
<span className="text-caption">Small caption</span>
```

### Regenerating Tokens

After updating Figma token JSON files:
```bash
cd apps/web && node scripts/build-tokens.mjs
```

### Design System Reference Page

A visual reference of all tokens is available at `/design-system` in the running app. This page displays:
- All color swatches (semantic, brand, palettes)
- Typography scale with live samples
- Spacing scale visualization
- Border radius tokens

---

## Motion / Animation Library (Mandatory)

This repo includes a **Motto-inspired motion library** (GSAP + ScrollTrigger patterns). Agents MUST reuse these components instead of creating new animations.

### Location

- **Components + hooks**: `apps/web/src/motion/`
- **Full documentation**: `apps/web/docs/MOTTO_MOTION_LIBRARY.md`

### Available Motion Components

| Component | Purpose | Usage |
|-----------|---------|-------|
| `SplitLinesReveal` | Text line-by-line reveal on scroll | Headings, quotes |
| `ScrollFadeUp` | Fade + slide up on scroll | Cards, paragraphs |
| `ParallaxY` | Vertical parallax effect | Background layers |

### Quick Usage

```tsx
import { SplitLinesReveal, ScrollFadeUp } from "@/motion";

// Text reveal animation
<SplitLinesReveal duration={1.9} stagger={0.28}>
  <h1>Headline text</h1>
</SplitLinesReveal>

// Fade up animation
<ScrollFadeUp index={0}>
  <div>Card content</div>
</ScrollFadeUp>
```

### Adding New Motion Patterns

1. Create component in `src/motion/`
2. Export from `src/motion/index.ts`
3. Document in `apps/web/docs/MOTTO_MOTION_LIBRARY.md`

---

## Session Logging (Mandatory)

- At the end of each working day/session, create or update `docs/SESSION_LOG_YYYY-MM-DD.md` (use local date).
- Record only concrete outcomes from that day:
  - Changes implemented (short bullets)
  - Files touched (paths)
  - Validation commands run and results
  - Open issues / next-step notes
- Keep logs concise and factual so future agents can quickly resume work.

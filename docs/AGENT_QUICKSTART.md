# Agent Quickstart Guide
## GhostSignal Project - Complete Onboarding Documentation

**Last Updated**: 2026-03-12
**Status**: Active Development
**Priority**: Read this file first when resuming work on GhostSignal

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Environment Configuration](#environment-configuration)
3. [Tech Stack](#tech-stack)
4. [Directory Structure](#directory-structure)
5. [RQ Index System (Side Project)](#rq-index-system-side-project)
6. [Figma MCP Connection](#figma-mcp-connection)
7. [Development Workflow](#development-workflow)
8. [Motion Library](#motion-library)
9. [Pages & Routes](#pages--routes)
10. [Critical Files Reference](#critical-files-reference)
11. [Mandatory Agent Instructions](#mandatory-agent-instructions)

---

## Project Overview

**GhostSignal** is a values-based advertising network that creates authentic, meaningful partnerships between creators/podcasters and brands through shared values alignment.

### Core Mission
- **Values First**: Prioritize shared world-making and human dignity
- **Authenticity**: Enable genuine endorsements and tone fit
- **Clarity**: Foster transparent, trust-based partnerships

### What We're Building
A premium, motion-rich Next.js 16 website to replace the current Squarespace site. The site showcases GhostSignal's philosophy and provides tools (like the RQ Index) for creators and brands to discover values-aligned partnerships.

### Business Model
GhostSignal matches:
- **Creators/Podcasters** seeking authentic brand partnerships
- **Advertisers/Brands** wanting values-aligned audience reach

This replaces transactional ad networks with meaningful, long-term relationships.

---

## Environment Configuration

### Critical Environment Variables

**Location**: `apps/web/.env.local`

```env
# Public (exposed in browser)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase (RQ Submissions Storage)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
RQ_SUBMISSIONS_TABLE=rq_submissions

# CORS for RQ Quiz
RQ_ALLOWED_ORIGINS=*

# Email Notifications (Optional - via Resend)
# RESEND_API_KEY=re_...
# RESEND_FROM="Ghost Signal <no-reply@yourdomain.com>"
# CONTACT_TO=hello@ghostsignal.cloud
# SNOWDRIFT_TO=snowdrift@ghostsignal.cloud
```

### Supabase Configuration

**Purpose**: Store RQ Index quiz submissions from users

**Active Connection**:
- URL: `https://mavtvivcwrxiqrruwdib.supabase.co`
- Table: `rq_submissions`
- Service key is configured in `.env.local`

**Test Connection**:
```bash
# Start dev server
npm run dev

# Visit health check endpoint
http://localhost:3000/api/rq-submissions
```

Expected response when working:
```json
{
  "ok": true,
  "configured": true,
  "table": "rq_submissions",
  "emailConfigured": false,
  "message": "Supabase connection is working for RQ submissions."
}
```

**Setup Documentation**:
- Schema: `docs/RQ_SUBMISSIONS_SCHEMA.sql`
- Setup Guide: `docs/RQ_SUPABASE_SETUP.md`

---

## Tech Stack

### Framework & Core
- **Next.js**: 16.1.6 (App Router)
- **React**: 19.2.3 with React Compiler enabled
- **TypeScript**: 5.x (strict mode)
- **Tailwind CSS**: 4.x with custom tokens

### Animation & Motion
- **GSAP**: 3.14.2 (with ScrollTrigger plugin)
- **Lenis**: 1.3.17 (smooth scrolling)
- **Motion**: 12.33.0 (React motion primitives)
- **split-type**: 0.3.4 (text splitting for line reveals)

### 3D Graphics (Future)
- **Three.js**: 0.182.0
- **@react-three/fiber**: 9.5.0
- **@react-three/drei**: 10.7.7
- **@react-three/postprocessing**: 3.0.4

### Backend & Services
- **Supabase**: PostgreSQL database (RQ submissions)
- **Resend**: Email notifications (optional, not yet configured)

### Development Tools
- **ESLint**: 9 (Next.js config)
- **Prettier**: 3.8.1 (with Tailwind plugin)
- **Playwright**: 1.58.2 (E2E testing)
- **Babel React Compiler**: Enabled for React 19

---

## Directory Structure

```
ghostsignal/
├── apps/web/                           # Main Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx               # Homepage (primary surface)
│   │   │   ├── layout.tsx             # Root layout with fonts
│   │   │   ├── globals.css            # Global styles + Tailwind
│   │   │   └── api/
│   │   │       └── rq-submissions/    # RQ submission API endpoint
│   │   │           └── route.ts       # POST/GET/OPTIONS handlers
│   │   ├── components/
│   │   │   ├── GhostSignalLiquidWordmark.tsx
│   │   │   └── SiteHeader.tsx         # Motto-style header with menu
│   │   ├── motion/                    # Motto-inspired motion library
│   │   │   ├── ScrollFadeUp.tsx       # Fade + translate on scroll
│   │   │   ├── SplitLinesReveal.tsx   # Split text lines reveal
│   │   │   ├── ScrollGrowDockPin.tsx  # Grow + dock + pin effect
│   │   │   ├── ParallaxY.tsx          # Parallax scroll effect
│   │   │   ├── RotateOnScroll.tsx     # Rotation on scroll
│   │   │   └── SmoothScrollLenis.tsx  # Smooth scroll provider
│   │   └── styles/
│   │       └── tokens.css             # Generated design tokens
│   ├── public/
│   │   ├── images/                    # Shipped assets (tracked in git)
│   │   └── rq-preview.html            # Local RQ quiz preview
│   ├── rq_quiz/
│   │   └── rqv1.txt                   # Current RQ Squarespace snippet
│   ├── scripts/
│   │   ├── build-tokens.mjs           # Generate tokens.css
│   │   └── audit-public-assets.mjs    # Validate referenced assets
│   ├── docs/                          # App-level documentation
│   ├── package.json
│   ├── .env.local                     # Environment variables
│   └── tailwind.config.ts
├── docs/                              # Project-level documentation
│   ├── AGENT_QUICKSTART.md            # This file (start here!)
│   ├── PROGRESS_LOG.md                # Recent changes & current state
│   ├── RQ_INDEX_TOOL.md               # RQ Index documentation
│   ├── RQ_SUPABASE_SETUP.md           # Supabase setup guide
│   ├── FIGMA_MCP_ACCESS.md            # Figma MCP connection guide
│   ├── FIGMA_VARIABLES_AND_TOKENS.md  # Design tokens reference
│   ├── WHITE_PAPER.md                 # Business strategy
│   └── SESSION_LOG_*.md               # Historical work logs
├── context/                           # Business context documents
│   ├── business_strategy_whitepaper.md
│   └── resonance_index.md             # Original RQ concept
├── assets/                            # Raw design vault (NOT tracked)
│   └── (PSDs, exports, inspiration)
└── README.md                          # Project README

```

### Asset Management Policy

**Raw Assets** (NOT tracked in git):
- Location: `assets/` directory
- Contents: PSDs, Figma exports, inspiration images, source files
- Use: Design iteration and asset generation

**Shipped Assets** (tracked in git):
- Location: `apps/web/public/images/`
- Contents: Optimized PNGs, JPGs, SVGs, videos for production
- Validation: Run `npm run assets:audit` before shipping

---

## RQ Index System (Side Project)

### Overview

The **RQ Index** (Resonance Quotient / Resonance Index) is a critical side project embedded within GhostSignal. It's a questionnaire tool that helps users discover their values-alignment profile.

### Purpose

Users (creators or brands) complete the RQ Index quiz to:
1. Generate a unique RQ code (e.g., `F(7)-R(8)-L(6)`)
2. Receive a personalized RQ name (e.g., "Grounded Warm Patient")
3. Get detailed profile descriptions
4. Enable GhostSignal to match partners based on values alignment

### Current Implementation

**Location**: `apps/web/rq_quiz/rqv1.txt`

**Format**: Squarespace-embeddable JavaScript snippet

**Features**:
- Self-contained single-file implementation
- Three assessment axes: Values, Authenticity, Horizon
- 18 questions (scales, multiple choice, text inputs)
- Client-side scoring algorithm
- PDF generation (jsPDF)
- Browser-to-API submission capture

### Architecture Flow

```
User (Squarespace) → RQ Quiz (JS snippet) → Next.js API → Supabase → Email Notification
```

**1. Squarespace Embed**:
- Current production location: Squarespace site (legacy)
- Snippet source: `apps/web/rq_quiz/rqv1.txt`
- Configuration: Set `window.GHOSTSIGNAL_RQ_ENDPOINT` before snippet

**2. Submission Capture API**:
- Endpoint: `POST /api/rq-submissions`
- Handler: `apps/web/src/app/api/rq-submissions/route.ts`
- Validation: Checks required fields (name, email, org, type, RQ code)
- CORS: Configurable via `RQ_ALLOWED_ORIGINS` env var

**3. Storage (Supabase)**:
- Table: `rq_submissions`
- Stores: basics, answers, computed RQ, profile, metadata
- Schema: `docs/RQ_SUBMISSIONS_SCHEMA.sql`

**4. Email Notification (Optional)**:
- Service: Resend API
- Recipient: `hello@ghostsignal.cloud`
- Status: Not yet configured (requires `RESEND_API_KEY`)

### Testing Locally

**Preview File**: `apps/web/public/rq-preview.html`

1. Start dev server:
   ```bash
   cd apps/web
   npm run dev
   ```

2. Open in browser:
   ```
   http://localhost:3000/rq-preview.html
   ```

3. Complete quiz and submit

4. Check Supabase table `rq_submissions` for new row

### RQ Index Structure

**RQ Code Format**: `V(score)-A(score)-H(score)`

**Three Axes**:
1. **Values** (V): F (Formative) or I (Implicit) — How explicitly you communicate values
2. **Authenticity** (A): R (Relational) or S (Structural) — How you express authenticity
3. **Horizon** (H): L (Long-Arc) or C (Catalytic) — Your partnership timeline preference

**Scoring Bands**:
- 1-3: Low intensity
- 4-5: Medium intensity
- 6-10: High intensity

**Example RQ**: `F(7)-R(8)-L(6)` = "Grounded Warm Patient"
- Formative on values (score 7)
- Relational on authenticity (score 8)
- Long-arc on horizon (score 6)

### Future Direction

The RQ Index will eventually be rebuilt as a native website feature in this Next.js app, replacing the Squarespace embed. The current snippet serves as the reference implementation.

**Key Documentation**:
- `docs/RQ_INDEX_TOOL.md` - Overview and instructions
- `docs/RQ_SUPABASE_SETUP.md` - Database setup
- `context/resonance_index.md` - Original business concept

---

## Figma MCP Connection

### Overview

The GhostSignal design system lives in Figma and is accessible via a local MCP (Model Context Protocol) server. This allows agents to fetch design tokens, screenshots, metadata, and reference code directly from Figma.

### Configuration

**MCP Endpoint**: `http://127.0.0.1:3845/mcp`
**Figma File**: `https://www.figma.com/design/6nDMQnD7o9MMMSGzNAzXRc/ghostsignal-design-system`
**Smoke Test Node**: `3002:370`

### Available MCP Tools

When connected, you can use these Figma MCP tools:

1. **get_design_context**: Retrieve reference code, node IDs, style context, asset URLs
2. **get_variable_defs**: Fetch design tokens (colors, fonts, spacing, sizing)
3. **get_screenshot**: Get visual representation of a Figma node
4. **get_metadata**: Retrieve node positions, sizes, hierarchy

### Connection Requirements

**Critical HTTP Header**:
```
Accept: application/json, text/event-stream
```

Without this header, requests may fail with `406 Not Acceptable`.

### Usage in Code

Agents with MCP access can query the Figma file directly for:
- Design token values (colors, fonts, spacing)
- Component screenshots for visual reference
- Layout measurements and positioning
- Style guidelines

### Verification

To verify MCP connection is working:

1. Check endpoint responds:
   ```bash
   curl http://127.0.0.1:3845/mcp
   ```

2. Test tool discovery:
   ```json
   {
     "jsonrpc": "2.0",
     "id": 2,
     "method": "tools/list",
     "params": {}
   }
   ```

3. Expected tools: `get_design_context`, `get_variable_defs`, `get_screenshot`, `get_metadata`

**Full Runbook**: `docs/FIGMA_MCP_ACCESS.md`

### Design Tokens

Design tokens are generated from Figma variables and written to:
- `apps/web/src/styles/tokens.css`

**Build Script**: `npm run tokens:build`
**Auto-runs**: Before `dev`, `build`, `start` commands

**Token Categories**:
- Colors (accent, foreground, background)
- Typography (font families, sizes, weights)
- Spacing (gaps, margins, padding)
- Sizing (widths, heights, containers)
- Border radius, shadows, breakpoints

---

## Development Workflow

### Commands

```bash
# Development
npm run dev              # Start dev server (auto-builds tokens first)

# Production
npm run build            # Build for production (auto-builds tokens first)
npm run start            # Start production server

# Quality Checks
npm run typecheck        # TypeScript validation (required before commits)
npm run lint             # ESLint validation
npm run format           # Format with Prettier
npm run format:check     # Check formatting without writing

# Asset Management
npm run assets:audit     # Verify all referenced assets exist
npm run assets:manifest  # Generate asset manifest

# Tokens
npm run tokens:build     # Rebuild design tokens from source
```

### Mandatory Pre-Commit Workflow

Before creating any commit:

1. **Type check**: `npm run typecheck` must pass
2. **Lint**: `npm run lint` must pass with no errors
3. **Asset validation**: `npm run assets:audit` must pass (if you modified public assets)

### Git Workflow

**Current Branch**: `main`
**Remote**: Not configured (local development)

**Commit Message Format**:
```
type(scope): brief description

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Commit Types**: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`

### Session Logging

Document significant work sessions in:
```
docs/SESSION_LOG_YYYY-MM-DD.md
```

Format:
```markdown
# Session Log: YYYY-MM-DD

## Objective
[What you set out to accomplish]

## Work Completed
- [Item 1]
- [Item 2]

## Decisions Made
- [Decision 1 and rationale]

## Next Steps
- [Follow-up task 1]
```

---

## Motion Library

### Philosophy

The GhostSignal motion system is inspired by **Motto**'s design language:
- Meaningful, choreographed animations
- GSAP + ScrollTrigger for precise control
- Lenis for smooth scrolling
- Reusable motion primitives

### Motion Components

**Location**: `apps/web/src/motion/`

**Currently Implemented**:

1. **ScrollFadeUp** (`ScrollFadeUp.tsx`)
   - Fades in and translates up on scroll
   - Props: `index`, `duration`, `start`, `delay`, `distance`
   - Use case: Staggered entrance reveals

2. **SplitLinesReveal** (`SplitLinesReveal.tsx`)
   - Splits text into lines and animates each from bottom
   - Props: `duration`, `stagger`, `start`, `delay`
   - Use case: Large headline reveals (hero sections)

3. **ScrollGrowDockPin** (`ScrollGrowDockPin.tsx`)
   - Grows element on scroll, then docks to target position
   - Props: `dockTargetSelector`, `pinUntilSelector`, `startScale`, `holdBefore`, `start`, `dockAt`, `dockOffsetY`
   - Use case: Hero video that grows then sticks to specific position

4. **ParallaxY** (`ParallaxY.tsx`)
   - Vertical parallax scrolling effect
   - Use case: Background elements that scroll at different speeds

5. **RotateOnScroll** (`RotateOnScroll.tsx`)
   - Rotation based on scroll progress
   - Use case: Rotating badges or decorative elements

6. **AccordionHeight** (`AccordionHeight.tsx`)
   - Height transitions for expandable content
   - Use case: FAQ accordions, expandable sections

7. **SmoothScrollLenis** (`SmoothScrollLenis.tsx`)
   - Smooth scroll provider (wraps entire app)
   - Location: Applied in `app/layout.tsx`

### Motion Best Practices

**DO**:
- Reuse existing motion components
- Keep animations purposeful and meaningful
- Test performance on lower-end devices
- Use `will-change` sparingly (only for animated properties)

**DON'T**:
- Reinvent animations that already exist in `/motion`
- Add motion without purpose (motion should enhance, not distract)
- Animate too many elements simultaneously (causes jank)
- Use inline animation code (create reusable components instead)

### Adding New Motion Components

If you need a new motion pattern:

1. Check if it can be achieved by combining existing components
2. If truly new, create a new file in `src/motion/`
3. Follow the existing naming convention: `PascalCase.tsx`
4. Export a typed React component with clear prop interfaces
5. Add documentation comment explaining use case
6. Update `docs/MOTTO_MOTION_LIBRARY.md` (if exists)

---

## Pages & Routes

### Canonical Site Structure

Based on business requirements, the site must include:

1. **Homepage** `/` ✅ Implemented
   - Hero with liquid wordmark animation
   - Philosophy section ("Harmony Not Hype")
   - Scroll-docked video animation
   - Trusted companies grid
   - Impact section

2. **For Creators** `/for-creators` ⏳ Planned
   - Value proposition for podcasters/creators
   - Partnership benefits
   - RQ Index introduction

3. **For Brands** (or For Advertisers) `/for-brands` or `/for-advertisers` ⏳ Planned
   - Value proposition for brands
   - Matching process explanation
   - Case studies

4. **What Is This** `/what-is-this` ⏳ Planned
   - GhostSignal philosophy deep dive
   - Values-based advertising explanation

5. **Who Are We** `/who-are-we` ⏳ Planned
   - Team introduction
   - Company story
   - Mission and values

6. **Contact** `/get-in-touch` ⏳ Planned
   - Contact form
   - Office/contact info

7. **Snowdrift** `/snowdrift` ⏳ Planned
   - Special sub-brand or initiative

**Status Legend**:
- ✅ Implemented and deployed
- ⏳ Planned but not yet built
- 🚧 In progress

### Current Homepage Implementation

The homepage (`apps/web/src/app/page.tsx`) features:

**Hero Section**:
- Dark background with "sky" gradient effect
- Animated liquid wordmark (GhostSignal + SVG fluid effect)
- `GhostSignalLiquidWordmark` component

**Content Sections**:
- Split-line reveal headline: "IS FOR PEOPLE WHO ARE MAKING THE WORLD"
- Values statement with asterisk marker
- Scroll-docked video that grows then pins to target
- Trusted companies/partners grid
- Impact section with imagery

**Motion Choreography**:
- Smooth scroll via Lenis
- GSAP ScrollTrigger-based reveals
- Staggered fade-up animations
- Split-line text reveals
- Scroll-grow-dock-pin video effect

---

## Critical Files Reference

### Configuration Files

| File | Purpose |
|------|---------|
| `apps/web/.env.local` | Environment variables (Supabase, CORS, email) |
| `apps/web/package.json` | Dependencies and npm scripts |
| `apps/web/tsconfig.json` | TypeScript configuration |
| `apps/web/tailwind.config.ts` | Tailwind CSS configuration |
| `apps/web/next.config.mjs` | Next.js configuration (React Compiler enabled) |

### Source Files

| File | Purpose |
|------|---------|
| `apps/web/src/app/layout.tsx` | Root layout (fonts, metadata, Lenis) |
| `apps/web/src/app/page.tsx` | Homepage implementation |
| `apps/web/src/app/globals.css` | Global styles and Tailwind imports |
| `apps/web/src/app/api/rq-submissions/route.ts` | RQ submission API handler |
| `apps/web/src/components/GhostSignalLiquidWordmark.tsx` | Hero animated wordmark |
| `apps/web/src/components/SiteHeader.tsx` | Site-wide header with menu |
| `apps/web/src/styles/tokens.css` | Generated design tokens (auto-built) |

### RQ Index Files

| File | Purpose |
|------|---------|
| `apps/web/rq_quiz/rqv1.txt` | Current RQ quiz snippet (Squarespace) |
| `apps/web/public/rq-preview.html` | Local RQ quiz test page |
| `apps/web/src/app/api/rq-submissions/route.ts` | RQ submission handler |
| `docs/RQ_SUBMISSIONS_SCHEMA.sql` | Supabase table schema |

### Documentation Files

| File | Purpose |
|------|---------|
| `docs/AGENT_QUICKSTART.md` | This file - start here! |
| `docs/PROGRESS_LOG.md` | Recent changes and current state |
| `docs/RQ_INDEX_TOOL.md` | RQ Index documentation |
| `docs/RQ_SUPABASE_SETUP.md` | Supabase setup instructions |
| `docs/FIGMA_MCP_ACCESS.md` | Figma MCP connection guide |
| `docs/FIGMA_VARIABLES_AND_TOKENS.md` | Design tokens reference |
| `docs/WHITE_PAPER.md` | Business strategy and philosophy |
| `context/business_strategy_whitepaper.md` | Business context |
| `context/resonance_index.md` | Original RQ concept |

---

## Mandatory Agent Instructions

### Before Starting Any Task

1. **Read this file** (`AGENT_QUICKSTART.md`) to understand project context
2. **Check** `PROGRESS_LOG.md` to see recent changes and current state
3. **Verify environment** by testing:
   ```bash
   npm run dev
   curl http://localhost:3000/api/rq-submissions
   ```
4. **Understand the scope**: Is this a research task or an implementation task?

### During Implementation Tasks

1. **Always read files before editing**: Never propose changes to code you haven't read
2. **Use existing motion components**: Check `src/motion/` before creating new animations
3. **Validate before committing**:
   - `npm run typecheck` must pass
   - `npm run lint` must pass
   - `npm run assets:audit` must pass (if assets changed)
4. **Reuse patterns**: Study existing pages/components to maintain consistency
5. **Avoid over-engineering**: Only implement what's requested, keep it simple
6. **Use Figma MCP**: When implementing designs, verify against Figma file via MCP

### Quality Standards

**TypeScript**:
- Strict mode enabled
- All components must be typed
- Avoid `any` types
- Use proper interfaces for props

**React**:
- Use React 19 best practices
- Prefer server components (mark client components with `"use client"`)
- Keep components small and focused
- Extract reusable logic

**CSS/Tailwind**:
- Use Tailwind utility classes
- Reference design tokens from `tokens.css`
- Avoid inline styles
- Keep CSS modules scoped

**Motion**:
- Use existing motion primitives from `src/motion/`
- Keep animations performant (60fps target)
- Test on lower-end devices
- Ensure accessibility (respect `prefers-reduced-motion`)

### After Completing Work

1. **Run quality checks**:
   ```bash
   npm run typecheck && npm run lint
   ```

2. **Document changes** in `docs/PROGRESS_LOG.md`:
   - What was changed
   - Why it was changed
   - Any new dependencies or patterns

3. **Create session log** (for significant work):
   - File: `docs/SESSION_LOG_YYYY-MM-DD.md`
   - Include: objectives, completed work, decisions, next steps

4. **Commit with proper format**:
   ```
   type(scope): description

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
   ```

---

## Common Tasks Quick Reference

### Add a New Page

1. Create route file: `apps/web/src/app/[route-name]/page.tsx`
2. Import necessary components from `@/components`
3. Import motion components from `@/motion`
4. Add to navigation in `SiteHeader` links
5. Update this documentation to mark page as implemented

### Add a New Motion Component

1. Create: `apps/web/src/motion/ComponentName.tsx`
2. Export typed React component with props interface
3. Use GSAP + ScrollTrigger for scroll-based animations
4. Add usage documentation in component comment
5. Update motion library docs if needed

### Test RQ Index Locally

1. Start dev: `npm run dev`
2. Open: `http://localhost:3000/rq-preview.html`
3. Complete quiz and submit
4. Check Supabase table for new row
5. Check terminal for any API errors

### Debug Supabase Connection

1. Check `.env.local` has correct values
2. Test health endpoint: `GET http://localhost:3000/api/rq-submissions`
3. Check Supabase dashboard for table existence
4. Verify service role key permissions
5. Check CORS if testing from Squarespace

### Rebuild Design Tokens

1. Ensure Figma MCP is running on `http://127.0.0.1:3845/mcp`
2. Run: `npm run tokens:build`
3. Check: `apps/web/src/styles/tokens.css` for updates
4. Restart dev server to pick up changes

---

## Additional Resources

### Business Context
- `docs/WHITE_PAPER.md` - GhostSignal business strategy
- `context/business_strategy_whitepaper.md` - Detailed business model
- `context/resonance_index.md` - RQ Index concept and philosophy

### Technical Documentation
- `docs/FIGMA_VARIABLES_AND_TOKENS.md` - Design token system
- `docs/RQ_SUBMISSIONS_SCHEMA.sql` - Database schema
- `apps/web/docs/MOTTO_MOTION_LIBRARY.md` - Motion library catalog (if exists)

### Session Logs
- `docs/SESSION_LOG_2026-02-09.md`
- `docs/SESSION_LOG_2026-03-05.md`
- `docs/SESSION_LOG_2026-03-09.md`
- `docs/SESSION_LOG_2026-03-10.md`

---

## Summary Checklist

When picking up this project, ensure you:

- [ ] Read this file (`AGENT_QUICKSTART.md`)
- [ ] Read `PROGRESS_LOG.md` for current state
- [ ] Check `.env.local` is properly configured
- [ ] Test dev server: `npm run dev`
- [ ] Test RQ API: `GET http://localhost:3000/api/rq-submissions`
- [ ] Verify Figma MCP connection (if using design tools)
- [ ] Understand the RQ Index system architecture
- [ ] Review existing motion components before building new ones
- [ ] Know the mandatory pre-commit workflow (typecheck, lint, audit)

---

**You're now ready to work on GhostSignal!**

For questions about current progress or recent changes, see `docs/PROGRESS_LOG.md`.

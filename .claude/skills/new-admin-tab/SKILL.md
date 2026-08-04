---
name: new-admin-tab
description: Scaffold a new admin/CRM tab end-to-end — page, CSS module, components dir, API route, proxy.ts auth gate, layout.tsx nav entry, sidebar icon, and (optionally) a Supabase schema file. Use when the user asks to add a new admin tab, admin page, CRM section, internal tooling surface, or a new /admin/* route.
argument-hint: "[slug-in-kebab-case]"
---

# Scaffold a new admin tab

You are scaffolding a new tab under `/admin/*` in the GhostSignal CRM. The full slug is `$1` (kebab-case). If `$1` is empty, ask the user for the slug before doing anything else.

## Step 0 — Load admin context

Before writing any code, read these admin memories so the scaffold follows current conventions. They are short and capture decisions that are NOT obvious from the code:

- `C:\Users\heyma\.claude\projects\C--Users-heyma-ghostsignal\memory\project_admin_overview.md`
- `C:\Users\heyma\.claude\projects\C--Users-heyma-ghostsignal\memory\feedback_admin_tokens.md`
- `C:\Users\heyma\.claude\projects\C--Users-heyma-ghostsignal\memory\feedback_admin_api_pattern.md`
- `C:\Users\heyma\.claude\projects\C--Users-heyma-ghostsignal\memory\reference_admin_infra.md`

Then read the current state of the four files this skill will modify:
- `apps/web/src/app/admin/layout.tsx` (nav array)
- `apps/web/src/proxy.ts` (auth matcher + PUBLIC_SUBPATHS)
- `apps/web/src/components/admin/icons.tsx` (icon registry)
- `apps/web/src/components/admin/index.ts` (available shared components)

## Step 1 — Clarify intent (≤3 questions)

Ask the user, in one turn, only the questions that aren't already answered in their prompt:

1. **Purpose** — one sentence on what this tab does (drives the page header copy and the empty-state language).
2. **Data source** — pick one: (a) Supabase-backed CRUD (needs schema + GET/POST/PATCH/DELETE routes), (b) external integration (Mercury-style: third-party API + sync route + cache table), (c) read-only computed view (no DB), (d) just the shell for now.
3. **Sidebar grouping** — top-level tab (default), or sub-item under an existing tab (Marketplace / Marketing)? Optional fourth icon hint if they have a metaphor in mind.

Skip questions the user already answered. Don't ask a fifth question — make a defensible call and surface it for correction at the end.

## Step 2 — Validate the slug

- Reject if `$1` contains uppercase, spaces, or underscores. Suggest a kebab-case fix.
- Reject if `apps/web/src/app/admin/$1/` already exists.
- Reject if the slug collides with an existing admin route in the nav (read `admin/layout.tsx`).

## Step 3 — Scaffold the files

Create the following. Use admin tokens throughout (`--admin-*`, raw px — NOT the `--gs-*` calc pattern). Import shared components from `@/components/admin` (Button, PageHeader, Loading, EmptyState, ErrorCard, DataTable, Modal, SearchInput, Badge).

### Always create

**`apps/web/src/app/admin/$1/page.tsx`** — a starter page with:
- `"use client"` directive
- `PageHeader` with title derived from the slug (e.g. `leads-pipeline` → `Leads Pipeline`) + the purpose sentence as the description
- A `LoadState` discriminated union (`loading | error | ready`) — established pattern across admin pages
- For (a/b/c): a `useEffect` that fetches the API route, renders `<Loading />`, `<ErrorCard />`, `<EmptyState />`, or the data view. The effect body MUST be an async IIFE with a `cancelled` cleanup flag, setState only after `await` — calling a component-scope loader function synchronously from the effect trips the repo's `react-hooks/set-state-in-effect` lint error. For refetch-after-mutation, bump a `refresh` counter in the effect deps instead of exposing the loader.
- For (d): just `<EmptyState />` with a "Coming soon" message
- Imports the local CSS module

**`apps/web/src/app/admin/$1/$1.module.css`** — empty module with one or two opening rules using `--admin-*` tokens. Do NOT redeclare `:root` variables. Do NOT use the `calc(var(--gs-n-N) * var(--gs-px))` pattern — admin tree uses raw px via `--admin-space-N`.

**`apps/web/src/app/admin/$1/components/.gitkeep`** — create the directory so future per-tab components have a home. (If the page is non-trivial, extract the obvious sub-component on the first pass.)

### Create when data source is (a) or (b)

**`apps/web/src/app/api/admin/$1/route.ts`** — a `GET` handler using `supabaseRest()` from `@/lib/supabase-admin`. No inline auth check (the proxy gates it). Return `NextResponse.json({ ok: true, ... })` on success; `{ ok: false, error, detail }` with status 502 on Supabase errors. Follow the exact shape of `apps/web/src/app/api/admin/finance/accounts/route.ts`.

**`docs/$SLUG_UPPER_SUPABASE_SCHEMA.sql`** (for source (a) or (b)) — DDL stub with:
- `create table if not exists $TABLE (...)` with `id uuid primary key default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`
- `alter table $TABLE enable row level security;`
- Useful indices
- A comment block at the top with the runbook one-liner ("Run in Supabase SQL editor. RLS is on; service-role bypasses it. Idempotent (uses `if not exists`).")

### Create when data source is (b)

**`docs/$SLUG_UPPER_INTEGRATION.md`** — runbook stub following the shape of `docs/MERCURY_INTEGRATION.md`: env var matrix, sandbox-vs-prod, auth pattern, monitoring, known gotchas (leave gotchas section as a TODO).

## Step 4 — Wire it up

### `apps/web/src/app/admin/layout.tsx`

Add one entry to the `nav={[...]}` array, placed where it makes sense in the existing ordering. Use the icon component name decided in Step 1. If sub-items, follow the `children: [...]` shape used by Marketplace/Marketing.

### `apps/web/src/proxy.ts`

If you created an API route under `/api/admin/$1`, add `"/api/admin/$1/:path*"` to the `matcher` array so the cookie gate covers it.

If the route is a webhook or cron endpoint (Bearer-auth instead of cookie), add it to `PUBLIC_SUBPATHS` instead and enforce auth inside the handler. Match the comment style of the existing Mercury / esignatures entries.

### `apps/web/src/components/admin/icons.tsx`

If a new icon was decided in Step 1, add a stroke-currentColor inline SVG following the existing 24×24 viewBox + strokeWidth 1.8 + round caps/joins convention. Export it as `Icon{PascalCase}`. Then import it in `admin/layout.tsx`.

If reusing an existing icon, skip this file.

## Step 5 — Validate

Run from `apps/web/`:

```bash
npm run typecheck
npm run lint
npm run lint:css
npm run assets:audit
```

All four must pass. If any fail, fix before declaring done.

Do NOT run `npm run build` unless the user asks — it's slow and the four checks above catch what matters at scaffold time.

## Step 6 — Close out

Report:
- Files created (paths only)
- Files edited (paths only)
- Validation results (one line each)
- Next steps for the user (run schema in Supabase if applicable; add real data; flesh out the components/ dir)

Then evaluate: did this scaffold expose a non-obvious convention or a new pattern worth preserving for future sessions? If yes, per `feedback_proactive_admin_memory.md`, update an existing admin memory or add a new one. Mention it in one line so the user can object.

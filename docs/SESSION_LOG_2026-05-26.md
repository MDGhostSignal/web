# Session Log — 2026-05-26

## Summary

Project-level Claude Code infrastructure pass. Five gaps identified at start of session, all shipped: admin-scoped memories, `/new-admin-tab` scaffold skill, project permissions allowlist, pre-ship gates hook on `git commit`, Supabase MCP (read-only). Plus a `.gitignore` change so the shareable parts of `.claude/` ship with the repo while personal secrets stay out.

No app code changed. All work lives in `.claude/`, `.mcp.json`, `.gitignore`, and `docs/`.

## Changes implemented

### 1. Admin-scoped memories (5 files)
Captured admin/CRM conventions that are not derivable from reading the code (auth in `proxy.ts`, cron on GitHub Actions, raw px in admin tokens, etc.):
- `memory/project_admin_overview.md` — 8-tab surface map, `AdminShell` + `.admin-root`, sidebar/drawer, why admin ≠ public-site primitives.
- `memory/feedback_admin_tokens.md` — `--admin-*` namespace, raw px (NOT calc-wrapped), Stylelint exclusion, light-theme override convention, full token catalog.
- `memory/feedback_admin_api_pattern.md` — auth via `proxy.ts` matcher (not inline), `supabaseRest()` PostgREST wrapper, webhook/cron Bearer pattern via `PUBLIC_SUBPATHS`, money as `numeric(20,4)` + bigint cents.
- `memory/reference_admin_infra.md` — Supabase schemas in `docs/*_SUPABASE_SCHEMA.sql`, cron in `.github/workflows/`, Next 16 `proxy.ts` rename, Mercury `secret-token:` prefix gotcha. Later updated with Supabase MCP pointer.
- `memory/feedback_proactive_admin_memory.md` — meta-rule: after large admin tasks, proactively write/update an admin-scoped memory without being asked.

### 2. `/new-admin-tab` skill
- `.claude/skills/new-admin-tab/SKILL.md` — scaffolds a new admin tab end-to-end given a kebab-case slug. Loads the four admin memories first, then reads `layout.tsx` / `proxy.ts` / `icons.tsx` for current state, asks ≤3 clarifying questions, creates `page.tsx` + `.module.css` + `components/` + optional API route + optional Supabase schema + integration runbook based on data-source choice, wires the nav + proxy matcher + icon, runs the four AGENTS.md gates.

### 3. Project permissions allowlist
- `.claude/settings.json` — 6 read-only patterns sourced from a transcript scan (50 recent JSONL files): `Bash(npm run typecheck *)`, `Bash(npm run lint *)`, `Bash(npm run lint:css *)`, `Bash(npm run assets:audit *)`, `Bash(npx tsc --noEmit *)`, `Bash(tasklist *)`. Skipped commands that are already auto-allowed by Claude Code (`cat`, `ls`, `grep`, `git status/log/diff`, etc.) and mutating commands (`git add/commit/push`, `rm`, `npm install`).

### 4. Pre-ship gates hook
- `.claude/hooks/pre-ship-checks.mjs` — PreToolUse hook on Bash. Fires only when (a) the command contains `git commit` and (b) at least one `apps/web/*` file is staged. Runs `typecheck → lint → lint:css → assets:audit`, tails the last 2000 chars of any failure to stderr, exits 2 to block. Skips entirely on docs-only / settings-only commits (~50ms early exit).
- `.claude/settings.json` `hooks.PreToolUse` — registered with matcher `Bash`, 180s timeout, status-line message.

### 5. Supabase MCP (read-only, prod project)
- `.mcp.json` at repo root — official server via `npx -y @supabase/mcp-server-supabase@latest`, locked to `--read-only --project-ref=${SUPABASE_PROJECT_REF}`, PAT via `${SUPABASE_ACCESS_TOKEN}` env var.
- `docs/SUPABASE_MCP_SETUP.md` — runbook: PAT creation, project-ref extraction from `SUPABASE_URL`, env wiring via `.claude/settings.local.json`, first-session approval flow, safety notes, troubleshooting.
- User created PAT and set both env vars in `.claude/settings.local.json` (gitignored, secrets stay local). Auth-checked against `https://api.supabase.com/v1/projects/<ref>` → HTTP 200, token + ref pair confirmed working.

### `.gitignore` change
- Changed `.claude/` (ignore-all) to `.claude/*` + four negation patterns: `!.claude/skills/`, `!.claude/agents/`, `!.claude/commands/`, `!.claude/hooks/`, `!.claude/settings.json`. Personal stuff (`settings.local.json`, transcripts, `.bak` files) stays ignored.

## Files touched

### New (tracked, will ship)
- `.claude/settings.json`
- `.claude/skills/new-admin-tab/SKILL.md`
- `.claude/hooks/pre-ship-checks.mjs`
- `.mcp.json`
- `docs/SUPABASE_MCP_SETUP.md`
- `docs/SESSION_LOG_2026-05-26.md` (this file)

### Edited
- `.gitignore` — added `.claude/*` plus five negation patterns

### Outside the repo (auto-memory, persists across sessions)
- `~/.claude/projects/C--Users-heyma-ghostsignal/memory/MEMORY.md` (updated index)
- `~/.claude/projects/C--Users-heyma-ghostsignal/memory/project_admin_overview.md` (new)
- `~/.claude/projects/C--Users-heyma-ghostsignal/memory/feedback_admin_tokens.md` (new)
- `~/.claude/projects/C--Users-heyma-ghostsignal/memory/feedback_admin_api_pattern.md` (new)
- `~/.claude/projects/C--Users-heyma-ghostsignal/memory/feedback_proactive_admin_memory.md` (new)
- `~/.claude/projects/C--Users-heyma-ghostsignal/memory/reference_admin_infra.md` (new, then updated with MCP pointer)

## Validation results

- Permissions allowlist source: transcript scan of 50 most-recent `.jsonl` files across all the user's Claude projects (`~/.claude/projects/`). 58 unique Bash command-prefixes detected, 0 MCP tool calls.
- Hook pipe-tests (synthetic stdin payloads):
  - `{"tool_input":{"command":"ls"}}` → exit 0 (pass-through for non-commit Bash) ✅
  - `{"tool_input":{"command":"git commit -m fake"}}` with no apps/web staged → exit 0 (pass-through when no web changes) ✅
- Hook JSON schema reachable: `jq -e '.hooks.PreToolUse[] | select(.matcher == "Bash") | .hooks[] | select(.type == "command") | .command'` → exit 0 ✅
- Supabase MCP auth: `GET https://api.supabase.com/v1/projects/<ref>` with the PAT → HTTP 200 ✅
- `.gitignore` verification: `.claude/settings.json` + `.claude/skills/**` + `.claude/hooks/**` all tracked-candidates; `.claude/settings.local.json` + `.bak` files all still ignored ✅

## Outstanding actions for the user

1. **Activate the new hooks + MCP in the next session.** Claude Code's settings watcher only watches directories that had a settings file when the session started. This session began with no `.claude/settings.json`, so the hook + MCP won't fire in-session. Restart Claude or open `/hooks` / `/mcp` once to load. From the next fresh session onward, both load automatically.
2. **Delete leftover backups** once the MCP is confirmed working next session: `.claude/settings.local.json.bak`, `.claude/settings.local.json.pre-ref-fix`. Both gitignored, both contain the old (broken) shapes of the secrets file.
3. **Untouched untracked files:** several `.mp4` / `.webm` assets in `apps/web/public/images/home/` and `apps/web/public/images/what-is-this/`, `docs/Creator Life Cycle.xlsx`, `docs/nimble_contacts.csv`, `logo/SVG/ghostsiggnal-admin-white-4c.svg`, and `apps/web/.claude/`. None of these are part of today's pass — left for the user to decide whether to ship or vault.

## Open issues / next-step notes

- **Hook is per-session.** A `git commit` run by the user in a terminal directly (not through Claude) bypasses the pre-ship checks entirely. If symmetric enforcement is wanted, add a real `.git/hooks/pre-commit` or husky setup that runs the same four gates.
- **Supabase MCP is prod-pointed, read-only.** Schema changes (DDL) still go through the Supabase SQL editor — the MCP can only verify deployed shape, not modify it. If full read-write is wanted later, change `.mcp.json` to drop `--read-only` (carefully) and consider provisioning a dev project for MCP work as Supabase's own docs recommend.
- **No MCP tool calls in the transcript scan** — once the Supabase MCP is live and used a few sessions, re-running `/fewer-permission-prompts` should surface `mcp__supabase__*` patterns worth allowlisting.

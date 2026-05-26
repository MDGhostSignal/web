# Supabase MCP — Setup Runbook

This repo ships a project-level Model Context Protocol (MCP) server for Supabase via `.mcp.json` at the repo root. With it enabled, Claude Code can:

- List tables, columns, types, indices, RLS policies
- Run `SELECT` queries to verify data shape
- Generate TypeScript types from the live schema
- Compare a `docs/*_SUPABASE_SCHEMA.sql` file against what's actually deployed

It **cannot** apply migrations, mutate data, or change RLS — the server is locked to `--read-only` mode. Schema changes are still done by pasting SQL into the Supabase SQL editor (see `docs/MERCURY_SUPABASE_SCHEMA.sql` for the pattern).

## One-time setup

### 1. Create a Personal Access Token (PAT)

The MCP server authenticates with a Supabase PAT — **not** the project's service-role key. PATs are account-wide and can be revoked at any time.

1. Open <https://supabase.com/dashboard/account/tokens>
2. Click **Generate new token**
3. Name it something like `claude-code-mcp-readonly`
4. Copy the value (starts with `sbp_…`) — it's only shown once

### 2. Find your project ref

The project ref is the subdomain in your Supabase URL. Open `apps/web/.env.local`:

```
SUPABASE_URL=https://<project-ref>.supabase.co
```

Copy the `<project-ref>` part (about 20 chars, all lowercase).

### 3. Wire the values into Claude Code

Edit (or create) `.claude/settings.local.json` at the repo root and add an `env` block. This file is gitignored, so the token never ends up in the repo.

```json
{
  "env": {
    "SUPABASE_ACCESS_TOKEN": "sbp_paste-your-token-here",
    "SUPABASE_PROJECT_REF": "your-project-ref-here"
  }
}
```

If the file already exists, merge the `env` block — don't replace existing keys.

### 4. Enable the server in Claude Code

Restart Claude (or open `/mcp` once) so it picks up the new `.mcp.json`. On first session after pickup, Claude prompts you to approve the `supabase` server — approve it.

Verify by asking Claude: *"List the tables in our Supabase project."* You should see your `mercury_accounts`, `mercury_transactions`, `members`, `contracts`, etc.

## Safety notes

- **Read-only is enforced at the server, not at the token.** The `--read-only` flag in `.mcp.json` is what blocks mutations; the PAT itself has full account access. Don't remove that flag without thinking about it.
- **Production data, not a sandbox.** This connects to the live CRM project. SELECT queries surface real member contact data into the conversation — treat the transcript accordingly.
- **Revocation is fast.** If a token leaks, revoke it at <https://supabase.com/dashboard/account/tokens>. A new one can be generated in 30 seconds.
- **Per-machine setup.** `.claude/settings.local.json` is gitignored, so each contributor sets their own PAT. The `.mcp.json` is committed — only the secrets stay personal.

## Troubleshooting

- **"MCP server failed to start":** Check the spelling of `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF`. Run `npx -y @supabase/mcp-server-supabase@latest --read-only --project-ref=<ref>` manually with `SUPABASE_ACCESS_TOKEN=<token>` exported to see the actual error.
- **"Project not found":** The PAT's account doesn't own that project ref. Check that you're logged into the right Supabase account when you created the PAT.
- **Tools missing from Claude's tool list:** Open `/mcp` and confirm `supabase` is enabled (green). If it's stuck on "starting", check the process — `tasklist | grep node` should show one or more node processes.

## Optional: pinning the server version

`.mcp.json` uses `@supabase/mcp-server-supabase@latest`. If a future release breaks something, pin to a known-good version by replacing `@latest` with `@x.y.z`. Bump deliberately, not automatically.

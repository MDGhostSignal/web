# Mercury Integration — Runbook

The `/admin/finance` tab pulls data from [Mercury](https://mercury.com) (our business bank) via their REST API and caches it in Supabase. This document is the operational reference: env setup, sandbox ↔ prod swap, token rotation, monitoring, and failure recovery.

## Architecture

```
┌──────────────────────────┐         every 15 min
│  Vercel Cron             │ ───────────────────────┐
│  (apps/web/vercel.json)  │                        ▼
└──────────────────────────┘     POST /api/admin/finance/sync
                                  Authorization: Bearer <CRON_SECRET>
                                        │
                                        ▼
                          ┌────────────────────────────┐
                          │  runMercurySync()          │
                          │  apps/web/src/lib/         │
                          │    mercury-sync.ts         │
                          └────────────────────────────┘
                                ▲                  │
                Mercury REST    │                  │ upsert
                (mercury.ts)    │                  ▼
                          ┌──────────────┐   ┌─────────────────────────┐
                          │ api.mercury  │   │ Supabase                │
                          │ .com / sand  │   │  mercury_accounts       │
                          │ box variant  │   │  mercury_transactions   │
                          └──────────────┘   │  mercury_sync_runs      │
                                              └─────────────────────────┘
                                                       ▲
                                                       │ select
                                              ┌──────────────────┐
                                              │ /admin/finance   │
                                              │ (dashboard reads │
                                              │  from Supabase)  │
                                              └──────────────────┘
```

The dashboard **never** calls Mercury directly. Reads are always from Supabase, so the UI stays fast and survives a Mercury outage. The "Refresh now" button triggers the same sync route the cron uses.

## Environment variables

Add these to `apps/web/.env.local` for local dev and to the Vercel project settings (Production + Preview) for deployments.

| Variable | Sandbox value | Production value |
|---|---|---|
| `MERCURY_API_TOKEN` | Token generated in the [Mercury sandbox](https://api-sandbox.mercury.com/) | Read-only token generated in the Mercury dashboard → Settings → API Tokens |
| `MERCURY_API_BASE_URL` | `https://api-sandbox.mercury.com/api/v1` | `https://api.mercury.com/api/v1` |
| `CRON_SECRET` | Random 32+ char string (`openssl rand -hex 32`) | Same — must also be set in **Vercel Project Settings → Cron → Secret** so Vercel Cron sends the right `Authorization: Bearer` header |

Existing env vars used by this integration (already set for the rest of admin): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `ADMIN_AUTH_SECRET`.

> **Token storage note.** Mercury's docs are explicit: *"someone who steals your Mercury API token can interact with your accounts on your behalf, so treat it as securely as you would treat any password. Tokens should never be stored in source control."* Never commit `.env.local`. The repo's `.gitignore` already covers it; double-check before pushing.

> **`secret-token:` prefix gotcha.** Mercury tokens are formatted as `secret-token:<rest-of-token>` and **the literal `secret-token:` prefix is part of the value, not a label**. When copying out of the Mercury dashboard, make sure you grab the whole string. The line in `.env.local` should look like `MERCURY_API_TOKEN=secret-token:abc123...`. Missing the prefix gets you a Mercury `401 noTokenInDBButMaybeMalformed` with the helpful hint *"ensure that part is included"*.

> **Sandbox vs production tokens are separate.** A token generated in the regular Mercury dashboard works only against `api.mercury.com`. The sandbox at `api-sandbox.mercury.com` has its own token database — a production token there returns the same `noTokenInDBButMaybeMalformed` 401. If you need sandbox, you must generate the token from the sandbox dashboard specifically (typically requires support coordination).

## Initial setup (one-time)

1. **Apply the schema.** In the Supabase SQL editor, run `docs/MERCURY_SUPABASE_SCHEMA.sql`. Verify the three tables exist and the indices are created. If Supabase prompts about Row Level Security, choose **Enable RLS** — the schema explicitly enables it at the bottom and we deliberately leave the policy set empty so only the service-role key (used server-side) can read/write these tables.
2. **Generate a sandbox token.** Log into [api-sandbox.mercury.com](https://api-sandbox.mercury.com/), Settings → API Tokens → New Token → **Read Only**. No IP allowlist needed for read-only tokens.
3. **Generate `CRON_SECRET`.** `openssl rand -hex 32` (or any 32+ char random string). Set it in both `.env.local` and Vercel.
4. **Smoke-test the sync.** With the dev server running, hit the sync endpoint manually:
   ```bash
   curl -X POST \
     -H "Authorization: Bearer $CRON_SECRET" \
     http://localhost:3000/api/admin/finance/sync
   ```
   Expect `{ "ok": true, "accountCount": N, "transactionCount": N, ... }`. In Supabase, confirm `mercury_sync_runs` has a row with `status = 'ok'`.
5. **Deploy.** Push to main; Vercel Cron picks up `apps/web/vercel.json` automatically.

## Sandbox → production swap

Once the UI is validated against sandbox data:

1. Generate a production **read-only** token at [mercury.com](https://mercury.com) → Settings → API Tokens.
2. In the Vercel project, set:
   - `MERCURY_API_TOKEN` = production token
   - `MERCURY_API_BASE_URL` = `https://api.mercury.com/api/v1`
3. Redeploy. No code change.

Recommended order: roll the env vars in **Preview** first, hit the preview URL's `/admin/finance` to confirm real data renders correctly, then promote.

## Token rotation

Mercury auto-deletes tokens **unused for 45 days** (with a 7-day advance email). Our 15-min cron keeps the token "warm" so this is rarely the trigger — but rotate manually any time you suspect compromise.

To rotate without downtime:

1. Generate a new read-only token in Mercury.
2. Update `MERCURY_API_TOKEN` in Vercel → redeploy. (Vercel rotates env vars at the next deploy; for an instant swap, redeploy via the dashboard's "Redeploy" button.)
3. After confirming a successful sync (`mercury_sync_runs.status = 'ok'`), revoke the old token in Mercury.

## Monitoring

### "Last synced" badge in the UI

Always visible at the top of `/admin/finance` — it surfaces the most recent `mercury_sync_runs` row. If the badge is yellow or older than 45 minutes, something is wrong.

### Vercel dashboard

- **Deployments → Crons** shows the 15-min cron's last N invocations with HTTP status.
- **Logs → Filter by `/api/admin/finance/sync`** shows full stdout/stderr from the route handler.

### Supabase query

```sql
select started_at, status, account_count, transaction_count, error_message
from mercury_sync_runs
order by started_at desc
limit 20;
```

## Failure recovery

### Sync run shows `status = 'error'`

Check `error_message` in the row. Common cases:

- **`Mercury 401 on /accounts: ...`** — token revoked, expired, or wrong env. Generate a new token, update `MERCURY_API_TOKEN`, redeploy.
- **`Mercury 429 ...`** — rate limited. Unusual at our cadence; if it persists, lengthen the cron interval (`*/30 * * * *`) or stagger calls.
- **`Failed to upsert mercury_*: HTTP 5xx`** — Supabase issue. Check the Supabase status page; the next cron tick will retry automatically. Manual: hit "Refresh now."
- **`Mercury is not configured`** — env vars missing. Set `MERCURY_API_TOKEN` + `MERCURY_API_BASE_URL` in Vercel.

### Cron stopped firing

Vercel → Project Settings → Cron Jobs — confirm the cron from `vercel.json` is listed and enabled. If you removed `vercel.json` accidentally, re-add it and redeploy.

### Stale data showing in the UI

Hit "Refresh now" on the dashboard. If that succeeds, you're fixed. If it fails, follow the sync-error flow above.

## Operational notes

- **Lookback window**: the sync pulls **last 90 days** of transactions per account (covers both the 30-day KPI calculations and the 90-day cash-trend chart). Older transactions stay in Supabase forever — we don't garbage-collect. If you need a longer backfill, lengthen `TX_LOOKBACK_DAYS` in `apps/web/src/lib/mercury-sync.ts` and run the sync once.
- **Pagination ceiling**: 5 pages × 500 tx = 2500 tx per account per run. Far above realistic volume. If we ever hit this, switch to incremental sync keyed off `max(created_at)` already in Supabase.
- **Currency precision**: balances and amounts are stored as `numeric(20,4)` and passed as strings end-to-end. Client-side math goes through `parseAmountCents` / `formatCents` in `apps/web/src/lib/mercury-types.ts`. Never call `Number(amount)` on these values.
- **Account number masking**: full account numbers from Mercury are masked server-side before they hit the database. The `account_number_masked` column stores only `••••1234`. The full number is **not** persisted.
- **Access**: anyone logged into `/admin` sees Finance. No per-user role gating in v1.

## Files

| Path | Purpose |
|---|---|
| `apps/web/src/lib/mercury-types.ts` | Types + currency helpers (`parseAmountCents`, `formatCents`, `maskAccountNumber`) |
| `apps/web/src/lib/mercury.ts` | REST client (`listAccounts`, `listAccountTransactions`, `MercuryError`) |
| `apps/web/src/lib/mercury-sync.ts` | Sync orchestrator (`runMercurySync`) |
| `apps/web/src/app/api/admin/finance/sync/route.ts` | Cron + on-demand sync endpoint |
| `apps/web/src/app/api/admin/finance/accounts/route.ts` | Read endpoint (Phase B) |
| `apps/web/src/app/api/admin/finance/transactions/route.ts` | Read endpoint (Phase B) |
| `apps/web/src/app/admin/finance/page.tsx` | Dashboard UI (Phase B) |
| `apps/web/vercel.json` | Cron schedule |
| `apps/web/src/proxy.ts` | Allowlist + matcher |
| `docs/MERCURY_SUPABASE_SCHEMA.sql` | Database schema |

## Mercury references

- API home: <https://docs.mercury.com/docs/welcome>
- Endpoint reference: <https://docs.mercury.com/reference>
- Auth + token policies: <https://docs.mercury.com/reference/api-token-security-policies>
- Sandbox: <https://docs.mercury.com/docs/using-mercury-sandbox>
- Status: Mercury Help Center (no dedicated status page at time of writing)

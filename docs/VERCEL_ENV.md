# Vercel environment variables

Canonical list of every env var the `apps/web` Next.js project reads
in production. Vercel dashboard: **Settings → Environment Variables**.

**Set for all three environments** (Production, Preview, Development)
unless a note below says otherwise. Mark **secrets** as Sensitive in
the Vercel UI so the value can't be re-read after save.

`NEXT_PUBLIC_*` prefixed values are bundled into client-side JS —
they ARE visible to anyone who views page source. Don't put a
service-role key or any other private secret behind that prefix.

---

## Public site

| Var | Required | Sensitive | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Yes | No | The site's canonical origin (e.g. `https://ghostsignal.com`). Used for absolute links + OG image URLs. |
| `SITE_ORIGIN` | Yes | No | Same value as above, server-side mirror. Some routes read this without the `NEXT_PUBLIC_` prefix. |

## Supabase

The database backs nearly everything: CRM, quiz submissions, ART19
cache, contracts, Studio auth.

| Var | Required | Sensitive | Notes |
|---|---|---|---|
| `SUPABASE_URL` | Yes | No | Project URL, server-side use. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | **Sensitive** | Full RLS-bypassing key. **Never expose to the browser.** |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes (Studio) | No | Same project URL, browser-visible. Needed by `lib/studio-auth-client.ts`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (Studio) | No | Publishable anon key (`sb_publishable_...`). Safe to expose. Browser-side Studio auth needs it. |

### Studio onboarding (this is the one that broke the build 2026-06-17)

For the production Supabase project:

- `NEXT_PUBLIC_SUPABASE_URL = https://mavtvivcwrxiqrruwdib.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_HlXqMBXbb0qEhM_dLekmjw_J9jkPZs6`

Both go in **all 3 environments**. Without them the static prerender
phase of `/studio/*` + `/admin/studio-approvals` throws.

## Admin auth (HQ shared-password cookie)

The four co-founders sign in to `/admin/*` with a shared password.

| Var | Required | Sensitive | Notes |
|---|---|---|---|
| `ADMIN_PASSWORD` | Yes | **Sensitive** | The shared password. Production value lives in the team 1Password vault. |
| `ADMIN_AUTH_SECRET` | Yes | **Sensitive** | HMAC secret used to sign the auth cookie. Decoupled from the password so rotating one doesn't invalidate the other. |

## Cron + webhooks

| Var | Required | Sensitive | Notes |
|---|---|---|---|
| `CRON_SECRET` | Yes | **Sensitive** | Bearer token GitHub Actions + Vercel Cron use to call the sync endpoints (`/api/admin/{finance,alerts,art19,marketing-social}/sync`, `/digest`). |

## Email (Resend)

| Var | Required | Sensitive | Notes |
|---|---|---|---|
| `RESEND_API_KEY` | Yes | **Sensitive** | Resend API key. |
| `RESEND_FROM` | Yes | No | The verified sending address (e.g. `noreply@ghostsignal.com`). |
| `RESEND_DIGEST_TO` | Yes | No | Comma-separated list of recipients for the daily alert digest. |
| `RQ_NOTIFY_TO` | Yes | No | Recipients notified on each new RQ submission. |
| `CONTACT_EMAIL_TO` | Yes | No | Recipients of `/get-in-touch` form submissions. |
| `ALERT_EMAIL_FALLBACK` | Optional | No | Fallback recipient when an alert isn't tied to a specific owner. |

## Quiz submissions config

| Var | Required | Sensitive | Notes |
|---|---|---|---|
| `RQ_SUBMISSIONS_TABLE` | Yes | No | Table name (default `rq_submissions`). |
| `RQ_ALLOWED_ORIGINS` | Yes | No | Comma-separated origins allowed to POST RQ submissions (e.g. `https://ghostsignal.com,https://www.ghostsignal.com,https://*.squarespace.com`). |
| `XQ_ALLOWED_ORIGINS` | Yes | No | Same shape as above for XQ. |
| `MEMBERS_TABLE` | Optional | No | Override the default `members` table name. Almost never set. |
| `MEMBER_COMMENTS_TABLE` | Optional | No | Override default `member_comments`. Almost never set. |

## Mercury (finance integration)

| Var | Required | Sensitive | Notes |
|---|---|---|---|
| `MERCURY_API_TOKEN` | Yes | **Sensitive** | Mercury bank API token. |
| `MERCURY_API_BASE_URL` | Optional | No | Defaults to Mercury's prod URL; override for staging. |

## ART19 (podcast integration)

| Var | Required | Sensitive | Notes |
|---|---|---|---|
| `ART19_API_TOKEN` | Yes | **Sensitive** | ART19 API bearer token. |
| `ART19_API_CREDENTIAL_ID` | Yes | No | The ART19 credential id paired with the token. |
| `ART19_NETWORK_ID` | Yes | No | The GHOSTSignal network UUID — all sync runs are scoped to this network only. |
| `ART19_API_BASE_URL` | Optional | No | Defaults to ART19's prod URL. |

## esignatures.com (contracts)

| Var | Required | Sensitive | Notes |
|---|---|---|---|
| `ESIGNATURES_API_TOKEN` | Yes | **Sensitive** | esignatures.com API token. |
| `ESIGNATURES_BASE_URL` | Optional | No | Defaults to the prod API URL. |

## Google Sheets (marketing copy + RQ mirror)

| Var | Required | Sensitive | Notes |
|---|---|---|---|
| `GOOGLE_SHEETS_WEBHOOK_URL` | Optional | No | Apps Script endpoint for RQ submission mirroring. |
| `GOOGLE_SHEETS_CLIENT_EMAIL` | Optional | No | Service account email (for the read APIs). |
| `GOOGLE_SHEETS_PRIVATE_KEY` | Optional | **Sensitive** | Service account private key. Multi-line; paste with `\n` escapes intact. |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Optional | No | Sheet id read by the copy library. |
| `GOOGLE_SHEETS_SHEET_NAME` | Optional | No | Tab name within the sheet. |

## Marketing assets

| Var | Required | Sensitive | Notes |
|---|---|---|---|
| `MARKETING_ASSETS_BUCKET` | Yes (for that surface) | No | Supabase Storage bucket name for the asset library. |

## Alert thresholds

These tune CRM-alert sensitivity. All optional — sensible defaults
live in `lib/alerts.ts`.

| Var | Required | Sensitive | Notes |
|---|---|---|---|
| `ALERT_CONTACT_COLD_DAYS` | Optional | No | After N days without contact, flag a contact as cold. |
| `ALERT_CONTRACT_EXPIRING_DAYS` | Optional | No | Window before contract end-date to flag. |
| `ALERT_MARKETPLACE_STALL_DAYS` | Optional | No | When marketplace activity stalls for N days. |
| `ALERT_TASK_STALE_DAYS` | Optional | No | Tasks idle for N days. |

## World multiplayer (Phaser + Colyseus)

| Var | Required | Sensitive | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_GAME_SERVER_URL` | Yes (prod) | No | WebSocket URL of the deployed Colyseus server (e.g. `wss://ghostsignal-game-server.fly.dev`). Without it, prod `/world` falls back to `ws://127.0.0.1:2567` and silently fails for everyone but the dev. |

## Optional webhooks

| Var | Required | Sensitive | Notes |
|---|---|---|---|
| `CONTACT_WEBHOOK_URL` | Optional | No | Mirror contact-form submissions to a Slack / Discord / Zapier webhook. |
| `SNOWDRIFT_WEBHOOK_URL` | Optional | No | Same shape, for the `/snowdrift` form. |

---

## Quick check — am I missing anything in Vercel?

Compare against `apps/web/.env.local`:

```bash
cd apps/web
grep -oE "^[A-Z_][A-Z0-9_]+" .env.local | sort -u
```

Any entry that's required (per the tables above) and isn't set in
Vercel will either silently break a feature OR — for `NEXT_PUBLIC_*`
values consumed during static prerender — fail the build outright.

## When you add a new env var

1. Add the actual reference in source (`process.env.X`).
2. Add it to `apps/web/.env.local` for local dev.
3. Add it to this doc with a short note + which environments it
   belongs in + whether it's sensitive.
4. Set it in the Vercel project for the environments that need it.

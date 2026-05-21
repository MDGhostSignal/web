# Marketing Social Scheduler — Runbook

`/admin/marketing` → **Social** sub-tab. Plan, draft, and track Facebook / Instagram / Substack posts on a weekly calendar. Execution stays manual (no auto-posting to platform APIs) — the dashboard's job is to be the team's single source of truth for *what* gets posted *when*.

## Architecture at a glance

```
Vercel Cron (0 15 * * *)                  Browser
        │                                    │
        │ Bearer CRON_SECRET                 │ admin_auth cookie
        ▼                                    ▼
┌──────────────────────────────────────────────────────┐
│ POST /api/admin/marketing-social/digest              │
│   ↓                                                  │
│   - read scheduled posts due today/tomorrow          │
│   - dedupe via social_post_notifications             │
│   - render digest                                    │
│   - sendEmail (Resend) to RESEND_DIGEST_TO           │
│   - write audit rows                                 │
└──────────────────────────────────────────────────────┘

Browser (admin team)
       │
       │ fetch /api/admin/marketing-social/...
       ▼
┌─────────────────────────────────────────┐    Supabase Storage
│ Supabase                                │    (marketing-assets bucket)
│   social_posts                          │    /social/<post_id>/<file>
│   social_post_images ──────────────────────►  ↑ uploaded via dual-path
│   social_post_notifications             │     (proxy ≤4 MB / signed PUT)
└─────────────────────────────────────────┘
```

## Initial setup (one-time)

1. **Apply the schema.** In the Supabase SQL editor, run `docs/MARKETING_SOCIAL_SCHEDULER_SCHEMA.sql`. Choose **Enable RLS** at the prompt — the SQL also enables it explicitly with no policies (service-role bypasses; anon/authenticated blocked).
2. **Image storage** — no new bucket. The scheduler reuses the existing **`marketing-assets`** bucket (created during the Marketing Asset Library setup) with a `/social/<post_id>/...` path prefix.
3. **Env vars.** For Phase C alerts only:

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `RESEND_DIGEST_TO` | yes | — | Comma- or newline-separated list of recipients for the daily digest. Example: `mike@example.com, jack@example.com, jeremy@example.com, martin@example.com` |
| `MARKETING_DIGEST_TZ` | no | `America/Los_Angeles` | Reference TZ for the digest window. Reserved — Phase D will use this; today the window is UTC start-of-today through end-of-tomorrow. |

`RESEND_API_KEY`, `RESEND_FROM`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `ADMIN_PASSWORD`, `ADMIN_AUTH_SECRET` are already configured (Mercury + RQ + Marketing Asset Library).

4. **Confirm the cron.** After your next deploy, check **Vercel Dashboard → Crons** for the entry `/api/admin/marketing-social/digest` at `0 15 * * *`. It fires daily at 15:00 UTC.

## Daily cron schedule

`0 15 * * *` UTC = 8 AM Pacific in winter, 7 AM in summer. The DST drift is intentional; running an hourly job that gates on local time is more code than the convenience is worth at this team size. Documented; the team lives with the one-hour shift twice a year.

## Composing posts

- **Calendar:** Week view, Mon–Sun. Today is highlighted. Prev / Today / Next nav at the top.
- **Add post:** Section toolbar button creates an empty composer. Each day cell also has a small `+` that pre-fills the date.
- **Per-platform body variants:** Default body is used everywhere unless a per-platform override is supplied. The composer reveals the override fields only when 2+ platforms are selected.
- **Images:** Open the detail modal (click any post pill) and drop files into the upload zone. Files ≤4 MB go through the proxy POST; larger files use a signed-PUT URL straight to Supabase Storage (Vercel's body-size limit bypassed automatically).
- **Status workflow:** Draft → Scheduled → Posted → (back to Draft to redo, or Skipped to abandon). `posted_at` is stamped automatically on the Scheduled → Posted transition and cleared on the way back to Draft.

## "Prepare to post" mode

Open any post in `scheduled` status → **Prepare to post** button (replaces the bare "Mark as Posted" button). It opens an inline mode that:

- Auto-copies the platform-specific caption to your clipboard on open.
- Lets you swap between platforms for multi-platform posts (re-copies on switch).
- Lists each attached image with a click-to-download link.
- Provides a single **Mark as posted** finisher that transitions status + stamps `posted_at` in one click.

Designed for the moment you're actually publishing: open Instagram, paste, attach images, mark posted, done.

## Duplicate post

Detail modal → **Duplicate** opens a fresh composer pre-filled with the original's title / body / per-platform variants / platforms / notes, scheduled **+7 days** from the original's date. Images are NOT carried over (originals stay attached to the original post). The new post starts as a draft. Workflow optimised for weekly cadence: post on Mon, click Duplicate on Mon afternoon, ship next Mon's draft in 30 seconds.

## Alerts

### In-app banner

Top of `/admin/marketing` (every sub-tab) → renders when 1+ scheduled posts are due in the next 48 hours. Polls every 5 minutes. Click **Open scheduler** → switches to the Social sub-tab.

### Email digest

Daily 8 AM Pacific (15:00 UTC). One email summarising every `scheduled` post with `scheduled_at` between start-of-today and end-of-tomorrow (UTC). Includes:

- Per-post title, platforms, scheduled time
- Per-platform body preview (truncated to ~240 chars per platform)
- Direct link back to `/admin/marketing`

Dedupe: each post that gets included writes a `social_post_notifications` row with `channel='email_digest'`. The next day's run skips any post that already has a notification in the last 23 hours — so a post scheduled for Tuesday morning only triggers one email (Monday's digest), not two.

### Manual trigger

Same endpoint, different auth path. From your terminal, while logged in to `/admin`:

```bash
# With admin cookie (extract from devtools → Application → Cookies → admin_auth)
curl -X POST -b "admin_auth=<value>" http://localhost:3000/api/admin/marketing-social/digest

# Or via Bearer (matches the cron path)
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/admin/marketing-social/digest
```

Response shape:

```json
{
  "ok": true,
  "sent": true,
  "dueCount": 2,
  "notifiedCount": 2,
  "recipientCount": 4,
  "resendId": "abc123...",
  "via": "cron"
}
```

`sent: false` means nothing to do (either no due posts or all already notified) — response includes a `reason` string.

## Failure modes

- **`RESEND_DIGEST_TO is not configured` (503)** — set the env var in `.env.local` + Vercel.
- **`Resend ${status}: ...` (502)** — usually means `RESEND_API_KEY` is wrong, the sender domain isn't verified, or the recipient list is malformed. Check Resend's dashboard logs.
- **Banner shows no count even though I have scheduled posts** — the banner only counts posts with `status='scheduled'` (not drafts). Mark posts as Scheduled in the detail modal before they'll appear.
- **Cron didn't fire** — Vercel Dashboard → Crons should show the most recent run. If absent, confirm `apps/web/vercel.json` is in the repo and was included in the last deploy.
- **Duplicate sends within the same day** — only happens if the dedupe table query failed silently. Check Supabase logs; a hard outage of `social_post_notifications` reads will choose to send (favoring deliverability over noise).

## Phase D candidates (deferred, not in v1)

- **Drag-to-reschedule** on the calendar. Today the user edits the date field in the composer. Drag is a polish that needs HTML5 drag-and-drop handlers + an optimistic PATCH; ~half a day of work, low priority at 9 posts/month.
- **Recent-assets sidebar** in the composer — pull last N images from the Marketing Asset Library so the team can attach a brand asset without re-uploading.
- **Auto-publishing** to Facebook Graph API, Instagram Content Publishing API, and Substack — would eliminate the manual "open the app and paste" step entirely. Large undertaking (each platform has its own auth/quota/approval model); we'd revisit when the team is at ~30+ posts/month and the manual step is the bottleneck.
- **Per-user audit** of who marked what posted, who duplicated what. Blocked on admin gaining per-user identity (the entire admin shares one password today).
- **ICS calendar feed** the team subscribes to with their personal calendars (Google Calendar, Apple Calendar). One-way, reliable, no permissions to configure.
- **Best-time-to-post analytics** — needs actual engagement data; not enough volume yet.
- **Browser notifications** via the Notification API — explicitly rejected for v1 (permissions friction, noisy, low signal).
- **Slack / Discord webhook** mirror of the daily digest — easy to add if the team picks up a chat platform.

## Files

| Path | Purpose |
|---|---|
| `apps/web/src/lib/social-posts-types.ts` | DTOs + enum labels + `bodyForPlatform` resolver |
| `apps/web/src/lib/email.ts` | Resend wrapper (`sendEmail`, `parseRecipientList`, `escapeHtml`) |
| `apps/web/src/app/api/admin/marketing-social/route.ts` | GET list + POST create |
| `apps/web/src/app/api/admin/marketing-social/[id]/route.ts` | GET / PATCH / DELETE (cascades to Storage) |
| `apps/web/src/app/api/admin/marketing-social/[id]/images/route.ts` | GET + dual-path POST upload |
| `apps/web/src/app/api/admin/marketing-social/[id]/images/[imageId]/route.ts` | DELETE single image |
| `apps/web/src/app/api/admin/marketing-social/digest/route.ts` | Daily digest cron + manual trigger |
| `apps/web/src/app/admin/marketing/sections/SocialSection.tsx` | Section composition + state + duplicate flow |
| `apps/web/src/app/admin/marketing/components/social/WeekCalendar.tsx` | 7-column week grid |
| `apps/web/src/app/admin/marketing/components/social/PostCell.tsx` | Day-cell pill |
| `apps/web/src/app/admin/marketing/components/social/PostComposer.tsx` | Create / edit form |
| `apps/web/src/app/admin/marketing/components/social/PostDetail.tsx` | Read mode + status transitions + Duplicate + Prepare |
| `apps/web/src/app/admin/marketing/components/social/PostImageUpload.tsx` | Drag-drop image attach |
| `apps/web/src/app/admin/marketing/components/social/PreparePostMode.tsx` | "Publish moment" companion |
| `apps/web/src/app/admin/marketing/components/social/DueBanner.tsx` | Top-of-page due-soon banner |
| `apps/web/vercel.json` | Cron schedule (digest + Mercury sync) |
| `docs/MARKETING_SOCIAL_SCHEDULER_SCHEMA.sql` | Schema source of truth |

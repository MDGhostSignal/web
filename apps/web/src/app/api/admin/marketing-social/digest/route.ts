import { NextResponse, type NextRequest } from "next/server";

import {
  ADMIN_COOKIE_NAME,
  verifyAdminCookie,
} from "@/lib/admin-auth";
import { escapeHtml, parseRecipientList, sendEmail } from "@/lib/email";
import {
  bodyForPlatform,
  PLATFORM_LABELS,
} from "@/lib/social-posts-types";
import type { SocialPostRow } from "@/lib/social-posts-types";
import { supabaseRest } from "@/lib/supabase-admin";

/**
 * POST /api/admin/marketing-social/digest
 *
 * Triggered two ways:
 *
 *  1. Vercel Cron — daily at 15:00 UTC (≈ 8 AM Pacific in winter, 7 AM
 *     summer; documented DST drift). Sends `Authorization: Bearer
 *     <CRON_SECRET>`.
 *
 *  2. Manual "Send digest now" trigger from /admin/marketing — uses
 *     the `admin_auth` cookie.
 *
 * Behaviour:
 *   - Select posts with status='scheduled' and scheduled_at between
 *     the start of today and end of tomorrow (UTC; rough enough for
 *     a digest that lands a few hours before the natural local window).
 *   - Skip any post that already has a 'email_digest'
 *     `social_post_notifications` row in the last 23 hours (dedupe).
 *   - Render one HTML + text email listing all due posts and send via
 *     Resend (`RESEND_DIGEST_TO`).
 *   - Audit each notified post with a fresh `social_post_notifications`
 *     row.
 *
 * Returns a JSON summary including notified count + any skipped /
 * failed cases so the manual trigger can show a result toast.
 */

export const runtime = "nodejs";
export const maxDuration = 30;

const DEDUPE_WINDOW_MS = 23 * 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: 401 },
    );
  }

  const recipients = parseRecipientList(process.env.RESEND_DIGEST_TO);
  if (recipients.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "RESEND_DIGEST_TO is not configured. Set a comma-separated list of recipient emails in .env.local + Vercel.",
      },
      { status: 503 },
    );
  }

  // Window: start-of-today through end-of-tomorrow, UTC. Rough on
  // purpose — the cron runs daily so over/underlap by a few hours
  // doesn't lose a post.
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);
  const endOfTomorrow = new Date(startOfToday);
  endOfTomorrow.setUTCDate(endOfTomorrow.getUTCDate() + 2); // exclusive

  const from = startOfToday.toISOString();
  const to = endOfTomorrow.toISOString();

  const postsRes = await supabaseRest<SocialPostRow[]>(
    `social_posts?select=*&status=eq.scheduled&scheduled_at=gte.${encodeURIComponent(from)}&scheduled_at=lt.${encodeURIComponent(to)}&order=scheduled_at.asc&limit=200`,
  );
  if (!postsRes.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to query due posts.",
        detail: postsRes.detail,
      },
      { status: 502 },
    );
  }

  const allDue = postsRes.data;

  // Pull recent notifications for these posts (one round-trip) so we
  // can dedupe without N queries.
  const ids = allDue.map((p) => p.id);
  let notified = new Set<string>();
  if (ids.length > 0) {
    const since = new Date(now.getTime() - DEDUPE_WINDOW_MS).toISOString();
    const idList = ids.map(encodeURIComponent).join(",");
    const notifRes = await supabaseRest<{ post_id: string }[]>(
      `social_post_notifications?select=post_id&channel=eq.email_digest&sent_at=gte.${encodeURIComponent(since)}&post_id=in.(${idList})`,
    );
    if (notifRes.ok) {
      notified = new Set(notifRes.data.map((r) => r.post_id));
    }
    // Tolerate notif-query failure: better to send a duplicate digest
    // once than swallow the alert entirely.
  }

  const toNotify = allDue.filter((p) => !notified.has(p.id));

  if (toNotify.length === 0) {
    return NextResponse.json({
      ok: true,
      sent: false,
      reason:
        allDue.length === 0
          ? "No scheduled posts due today or tomorrow."
          : `All ${allDue.length} due posts already notified in the last 23 hours.`,
      dueCount: allDue.length,
      notifiedCount: 0,
    });
  }

  // Send the email.
  const { html, text, subject } = buildDigest(toNotify);
  const sendRes = await sendEmail({
    to: recipients,
    subject,
    text,
    html,
  });
  if (!sendRes.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to send digest.",
        detail: sendRes.reason,
        dueCount: allDue.length,
        notifiedCount: 0,
      },
      { status: 502 },
    );
  }

  // Record notifications. Tolerate per-row failures — the email was
  // already sent.
  await Promise.all(
    toNotify.map(async (p) => {
      await supabaseRest("social_post_notifications", {
        method: "POST",
        body: JSON.stringify({
          post_id: p.id,
          channel: "email_digest",
        }),
        prefer: "return=minimal",
      });
    }),
  );

  return NextResponse.json({
    ok: true,
    sent: true,
    dueCount: allDue.length,
    notifiedCount: toNotify.length,
    recipientCount: recipients.length,
    resendId: sendRes.id || null,
    via: auth.via,
  });
}

/* --- Auth (mirrors Mercury sync) ------------------------------------- */

type AuthOk = { ok: true; via: "cron" | "cookie" };
type AuthFail = { ok: false; error: string };
type AuthResult = AuthOk | AuthFail;

async function authenticate(req: NextRequest): Promise<AuthResult> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (match) {
    const expected = process.env.CRON_SECRET;
    if (!expected) {
      return { ok: false, error: "CRON_SECRET not configured." };
    }
    if (timingSafeEqualStr(match[1], expected)) {
      return { ok: true, via: "cron" };
    }
    return { ok: false, error: "Invalid CRON_SECRET." };
  }

  const cookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (await verifyAdminCookie(cookie)) {
    return { ok: true, via: "cookie" };
  }
  return { ok: false, error: "Unauthorized." };
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/* --- Digest email rendering ----------------------------------------- */

function buildDigest(posts: SocialPostRow[]): {
  subject: string;
  text: string;
  html: string;
} {
  const subject =
    posts.length === 1
      ? `1 social post due — ${platformsShort(posts[0].platforms)}`
      : `${posts.length} social posts due today/tomorrow`;

  const lines: string[] = [
    `${posts.length} scheduled social post${posts.length === 1 ? "" : "s"} coming up:`,
    "",
  ];
  const rows: string[] = [];

  for (const p of posts) {
    const when = formatScheduled(p.scheduled_at);
    const platformList = p.platforms.map((pl) => PLATFORM_LABELS[pl]).join(" · ");
    const title = p.title?.trim() || p.body.split("\n")[0].slice(0, 100);
    const preview = p.platforms
      .map((pl) => `${PLATFORM_LABELS[pl]}: ${truncate(bodyForPlatform(p, pl), 240)}`)
      .join("\n");

    lines.push(`• ${when} — ${platformList}`);
    lines.push(`  ${title}`);
    lines.push("");

    rows.push(`
      <tr>
        <td style="padding: 16px 0; border-bottom: 1px solid #eee;">
          <div style="font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.06em;">
            ${escapeHtml(when)} &middot; ${escapeHtml(platformList)}
          </div>
          <div style="margin-top: 6px; font-size: 16px; font-weight: 600; color: #111;">
            ${escapeHtml(title)}
          </div>
          <pre style="margin-top: 8px; font-size: 13px; color: #444; white-space: pre-wrap; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">${escapeHtml(preview)}</pre>
        </td>
      </tr>
    `);
  }

  lines.push("Open the dashboard to publish:");
  lines.push("https://ghostsignal.cloud/admin/marketing");

  const text = lines.join("\n");

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <tr><td>
        <h1 style="margin:0 0 8px;font-size:20px;color:#111;">Social posts due</h1>
        <p style="margin:0 0 16px;font-size:14px;color:#555;">${posts.length} scheduled post${posts.length === 1 ? " is" : "s are"} due today or tomorrow.</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${rows.join("")}
        </table>
        <p style="margin: 24px 0 0;font-size:14px;">
          <a href="https://ghostsignal.cloud/admin/marketing" style="color: #fbad25; text-decoration: none; font-weight: 600;">Open the dashboard →</a>
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  return { subject, text, html };
}

function platformsShort(platforms: SocialPostRow["platforms"]): string {
  return platforms.map((p) => PLATFORM_LABELS[p]).join(", ");
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

function formatScheduled(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // Pick a stable human format usable across timezones. The recipient
  // sees the time in UTC plus the day-of-week; not perfect but matches
  // what gets stored. Future enhancement: format in MARKETING_DIGEST_TZ.
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

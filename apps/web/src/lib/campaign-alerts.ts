/**
 * Campaign-ending alerts — detection, snapshot, and the one-time email.
 *
 * Trigger: an ART19 campaign has elapsed ≥ 97% of its RUN TIME (not its
 * impression goal — campaigns routinely over-deliver impressions, so a
 * volume threshold would misfire). Detection runs hourly from
 * /api/admin/campaign-alerts/sync; the crm_alerts row it inserts is both
 * the in-app record (bell + dashboard) and the fire-once dedup guard, so
 * the email below is sent exactly once as the campaign crosses 97%.
 *
 * Recipients: Jack + Mike (the contract/campaign owners), resolved from
 * the same ALERT_EMAIL_<SLUG> env vars the CRM digest uses.
 */

import type { CampaignAlertSnapshot } from "@/lib/alerts";
import type { Art19CampaignRow } from "@/lib/art19-types";

/** Run-time completion that trips the alert. */
export const CAMPAIGN_ENDING_RUN_PCT = 97;

/**
 * How many days past a campaign's end_date we still allow the alert to
 * fire. This decouples detection cadence from the trigger: the 97→100%
 * run-time window is narrower than a day for a 30-day campaign (~21h),
 * so a daily/every-few-days cron could otherwise step right over it. The
 * grace lets a just-concluded campaign still fire once (fire-once via the
 * crm_alerts row), while excluding long-concluded history so a redeploy
 * never blasts old campaigns. Keep it comfortably larger than the cron
 * interval (currently daily).
 */
export const CAMPAIGN_ENDING_GRACE_DAYS = 7;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Slim shape the detector needs from a campaign row. */
export type CampaignCandidate = Pick<
  Art19CampaignRow,
  | "id"
  | "name"
  | "campaign_type"
  | "ad_source"
  | "status"
  | "default_cpm"
  | "listen_count"
  | "maximum_impressions"
  | "fill_rate"
  | "advertisements_count"
  | "start_date"
  | "end_date"
>;

function pct(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Build the captured snapshot for a campaign at time `nowMs`. Returns
 *  null when the campaign lacks a usable run-time window. */
export function buildCampaignSnapshot(
  c: CampaignCandidate,
  nowMs: number,
): CampaignAlertSnapshot | null {
  if (!c.start_date || !c.end_date) return null;
  const start = Date.parse(c.start_date);
  const end = Date.parse(c.end_date);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;

  const runPct = pct(((nowMs - start) / (end - start)) * 100);
  const daysRemaining = Math.max(0, Math.ceil((end - nowMs) / MS_PER_DAY));

  const impressions = c.listen_count ?? null;
  const goal = c.maximum_impressions ?? null;
  const pctOfGoal =
    impressions !== null && goal && goal > 0
      ? pct((impressions / goal) * 100)
      : null;
  const cpm = c.default_cpm ?? null;
  const estValue =
    cpm !== null && impressions !== null
      ? Math.round((cpm * impressions) / 1000)
      : null;

  return {
    name: c.name,
    campaign_type: c.campaign_type,
    ad_source: c.ad_source,
    run_pct: runPct,
    days_remaining: daysRemaining,
    start_date: c.start_date,
    end_date: c.end_date,
    impressions,
    goal,
    pct_of_goal: pctOfGoal,
    fill_rate: c.fill_rate ?? null,
    cpm,
    est_value: estValue,
    ads_count: c.advertisements_count ?? null,
  };
}

/**
 * Pure: should this campaign have an open `campaign_ending` alert right
 * now? Qualifies once run time reaches 97%, and keeps qualifying up to
 * `CAMPAIGN_ENDING_GRACE_DAYS` past the end date — so a slow cron never
 * skips the narrow 97→100% window, yet long-concluded campaigns (end
 * date older than the grace) never fire, so a redeploy can't blast
 * history. Fire-once is enforced by the open crm_alerts row.
 */
export function detectCampaignEndingAlert(
  c: CampaignCandidate,
  nowMs: number,
): { campaign_id: string; reason: { campaign: CampaignAlertSnapshot } } | null {
  if (c.status === "archived_draft") return null;
  const snap = buildCampaignSnapshot(c, nowMs);
  if (!snap) return null;
  if (snap.run_pct < CAMPAIGN_ENDING_RUN_PCT) return null;
  // Exclude campaigns that concluded longer than the grace window ago.
  const end = snap.end_date ? Date.parse(snap.end_date) : NaN;
  if (Number.isNaN(end)) return null;
  if (end < nowMs - CAMPAIGN_ENDING_GRACE_DAYS * MS_PER_DAY) return null;
  return { campaign_id: c.id, reason: { campaign: snap } };
}

/* ------------------------- Recipients ------------------------------- */

/** Jack + Mike, resolved from ALERT_EMAIL_JACK_W_HARDING /
 *  ALERT_EMAIL_MIKE_SENSE. De-duplicated (in case both point at the
 *  same inbox) and falling back to ALERT_EMAIL_FALLBACK when neither is
 *  configured, so an alert never vanishes silently. */
export function campaignAlertRecipients(): string[] {
  const candidates = [
    process.env.ALERT_EMAIL_JACK_W_HARDING,
    process.env.ALERT_EMAIL_MIKE_SENSE,
  ].filter((e): e is string => !!e && e.includes("@"));
  const unique = Array.from(
    new Set(candidates.map((e) => e.trim().toLowerCase())),
  );
  if (unique.length > 0) return unique;
  const fallback = process.env.ALERT_EMAIL_FALLBACK ?? "hello@ghostsignal.cloud";
  return [fallback];
}

/* --------------------------- Email ---------------------------------- */

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function num(n: number | null): string {
  return n === null ? "—" : n.toLocaleString("en-US");
}

function money(n: number | null): string {
  return n === null ? "—" : `$${n.toLocaleString("en-US")}`;
}

const SITE_ORIGIN = process.env.SITE_ORIGIN ?? "https://www.ghostsignal.cloud";

/** Metric rows, ordered by the hierarchy requested: run-time → delivery
 *  vs goal → pacing/fill → value → meta. `[label, value, emphasis?]`. */
function metricRows(s: CampaignAlertSnapshot): Array<[string, string, boolean?]> {
  const pacing =
    s.pct_of_goal !== null
      ? `${num(Math.round(s.impressions ?? 0))} of ${num(s.goal)} (${s.pct_of_goal}% of goal)`
      : num(s.impressions);
  const deliveryVsTime =
    s.pct_of_goal !== null
      ? `${s.pct_of_goal}% delivered at ${s.run_pct}% of run time`
      : "—";
  return [
    ["Run time elapsed", `${s.run_pct}%`, true],
    ["Days remaining", String(s.days_remaining)],
    [
      "Window",
      `${(s.start_date ?? "").slice(0, 10)} → ${(s.end_date ?? "").slice(0, 10)}`,
    ],
    ["Impressions delivered", pacing, true],
    ["Delivery vs. run time", deliveryVsTime],
    ["Fill rate", s.fill_rate === null ? "—" : `${s.fill_rate}%`],
    ["CPM", s.cpm === null ? "—" : `$${s.cpm}`],
    ["Est. gross value", money(s.est_value)],
    ["Ad units", num(s.ads_count)],
    ["Type / source", `${s.campaign_type ?? "—"} · ${s.ad_source ?? "—"}`],
  ];
}

export function buildCampaignEmail(s: CampaignAlertSnapshot): {
  subject: string;
  html: string;
  text: string;
} {
  const name = s.name ?? "Untitled campaign";
  const subject = `Campaign wrapping up · ${name} at ${s.run_pct}% run time`;

  const rows = metricRows(s);
  const rowHtml = rows
    .map(
      ([label, value, emph]) => `
      <tr>
        <td style="padding:9px 20px;border-bottom:1px solid #eee;font-size:13px;color:#666;">${esc(label)}</td>
        <td style="padding:9px 20px;border-bottom:1px solid #eee;font-size:${emph ? "15px;font-weight:700;color:#1a1a1a" : "14px;color:#1a1a1a"};text-align:right;">${esc(value)}</td>
      </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:24px;background:#f5f5f5;font-family:-apple-system,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);">
    <tr><td style="padding:28px 20px 14px;border-bottom:1px solid #eee;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;color:#1f8a8a;margin-bottom:6px;">Campaign wrapping up</div>
      <h1 style="margin:0;font-size:20px;color:#1a1a1a;">${esc(name)}</h1>
      <p style="margin:8px 0 0;font-size:14px;color:#444;">This campaign has reached <strong>${s.run_pct}% of its run time</strong>${s.days_remaining > 0 ? ` — about ${s.days_remaining} day${s.days_remaining === 1 ? "" : "s"} left.` : "."}</p>
    </td></tr>
    <tr><td style="padding:8px 0 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rowHtml}</table>
    </td></tr>
    <tr><td style="padding:18px 20px 24px;text-align:center;font-size:12px;color:#999;">
      <a href="${SITE_ORIGIN}/admin/art19" style="color:#1f8a8a;text-decoration:none;font-weight:600;">Open Campaigns →</a>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    `Campaign wrapping up: ${name}`,
    `Reached ${s.run_pct}% of run time${s.days_remaining > 0 ? ` (~${s.days_remaining}d left)` : ""}.`,
    "",
    ...rows.map(([label, value]) => `  ${label}: ${value}`),
    "",
    `Open Campaigns: ${SITE_ORIGIN}/admin/art19`,
  ].join("\n");

  return { subject, html, text };
}

/** Send the one-time campaign-ending email. Mirrors sendDigestEmail. */
export async function sendCampaignEndingEmail(
  to: string[],
  snapshot: CampaignAlertSnapshot,
): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    return { sent: false, reason: "RESEND_API_KEY or RESEND_FROM not set" };
  }
  const { subject, html, text } = buildCampaignEmail(snapshot);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html, text }),
      cache: "no-store",
    });
    if (!res.ok) {
      return { sent: false, reason: `Resend ${res.status}: ${await res.text()}` };
    }
    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      reason: err instanceof Error ? err.message : "unknown",
    };
  }
}

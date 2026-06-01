/**
 * Email helpers for the daily CRM alert digest.
 *
 * Mirrors the lightweight Resend pattern used by rq-submissions and
 * xq-submissions: pure HTML/text builders + a thin `sendDigest()` that
 * skips silently when env vars are missing (so dev environments don't
 * blow up). Each owner gets their own digest email; alerts whose
 * member has no owner go to a fallback inbox.
 */

import { ALERT_KIND_LABELS, type AlertKind, type CrmAlert } from "@/lib/alerts";

export type DigestAlert = CrmAlert & {
  member: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    owner: string | null;
    phase: string;
    organization: string | null;
  } | null;
};

const SITE_ORIGIN =
  process.env.SITE_ORIGIN ?? "https://www.ghostsignal.cloud";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fullName(m: DigestAlert["member"]): string {
  if (!m) return "Unknown member";
  const n = [m.first_name, m.last_name].filter(Boolean).join(" ").trim();
  return n || m.organization || "Unnamed";
}

function ageDescription(a: DigestAlert): string {
  const r = a.reason_json;
  if (a.kind === "contact_cold" && typeof r.days_since_last_contact === "number") {
    return `${r.days_since_last_contact} days since last contact`;
  }
  if (a.kind === "marketplace_stall" && typeof r.days_in_phase === "number") {
    return `${r.days_in_phase} days in current phase`;
  }
  return "—";
}

function deepLink(a: DigestAlert): string {
  return a.kind === "marketplace_stall"
    ? `${SITE_ORIGIN}/admin/marketplace?view=pool`
    : `${SITE_ORIGIN}/admin/contacts`;
}

/** Look up `ALERT_EMAIL_<SLUG>` for the given owner name. Returns
 *  undefined if not set so the caller can decide on fallback. */
export function ownerEmailFromEnv(owner: string): string | undefined {
  const slug = owner.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  return process.env[`ALERT_EMAIL_${slug}`];
}

/** Fallback inbox for alerts whose member has no `owner` set. */
export function fallbackEmail(): string {
  return process.env.ALERT_EMAIL_FALLBACK ?? "hello@ghostsignal.cloud";
}

function alertRowHtml(a: DigestAlert): string {
  const name = escapeHtml(fullName(a.member));
  const kind = escapeHtml(ALERT_KIND_LABELS[a.kind as AlertKind]);
  const age = escapeHtml(ageDescription(a));
  const phase = a.member?.phase ? escapeHtml(a.member.phase) : "";
  const link = deepLink(a);
  const accent = a.kind === "contact_cold" ? "#c98a14" : "#c43a3a";
  return `
    <tr>
      <td style="padding: 14px 20px; border-bottom: 1px solid #eee;">
        <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
          <tr>
            <td>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: ${accent}; margin-bottom: 4px;">${kind}</div>
              <div style="font-size: 15px; font-weight: 600; color: #1a1a1a; margin-bottom: 3px;">${name}</div>
              <div style="font-size: 13px; color: #666;">${age}${phase ? ` · phase: ${phase}` : ""}</div>
            </td>
            <td align="right" style="vertical-align: top;">
              <a href="${link}" style="display: inline-block; padding: 6px 14px; background: #fbad25; color: #1a1a1a; text-decoration: none; border-radius: 6px; font-size: 12px; font-weight: 600;">Open →</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function alertRowText(a: DigestAlert): string {
  const name = fullName(a.member);
  const kind = ALERT_KIND_LABELS[a.kind as AlertKind];
  return `  • [${kind}] ${name} — ${ageDescription(a)}\n    ${deepLink(a)}`;
}

/** Build the HTML body for one owner's digest. */
export function buildDigestHtml(opts: {
  recipient: string;
  ownerName: string;
  alerts: DigestAlert[];
}): string {
  const { recipient, ownerName, alerts } = opts;
  const cold = alerts.filter((a) => a.kind === "contact_cold");
  const stalls = alerts.filter((a) => a.kind === "marketplace_stall");

  const section = (title: string, rows: DigestAlert[]) => {
    if (rows.length === 0) return "";
    return `
      <tr>
        <td style="padding: 18px 20px 6px;">
          <h2 style="margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: #666;">${escapeHtml(title)} (${rows.length})</h2>
        </td>
      </tr>
      ${rows.map(alertRowHtml).join("")}`;
  };

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>CRM Alerts · ${escapeHtml(ownerName)}</title></head>
<body style="margin: 0; padding: 24px; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
    <tr>
      <td style="padding: 28px 20px 12px; border-bottom: 1px solid #eee;">
        <h1 style="margin: 0; font-size: 20px; color: #1a1a1a;">GhostSignal CRM · ${alerts.length} alert${alerts.length === 1 ? "" : "s"}</h1>
        <p style="margin: 6px 0 0; font-size: 13px; color: #666;">Daily digest for <strong>${escapeHtml(ownerName)}</strong> (sent to ${escapeHtml(recipient)}).</p>
      </td>
    </tr>
    ${section("Contact cold", cold)}
    ${section("Marketplace stalled", stalls)}
    <tr>
      <td style="padding: 18px 20px 24px; text-align: center; font-size: 12px; color: #999;">
        <a href="${SITE_ORIGIN}/admin/alerts" style="color: #c98a14; text-decoration: none; font-weight: 600;">Manage all alerts in the dashboard →</a>
        <br/><br/>
        Logging a comment or updating last-contact automatically clears the related alert.
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildDigestText(opts: {
  recipient: string;
  ownerName: string;
  alerts: DigestAlert[];
}): string {
  const { ownerName, alerts } = opts;
  const cold = alerts.filter((a) => a.kind === "contact_cold");
  const stalls = alerts.filter((a) => a.kind === "marketplace_stall");
  const lines: string[] = [
    `GhostSignal CRM · ${alerts.length} alert(s) for ${ownerName}`,
    "",
  ];
  if (cold.length > 0) {
    lines.push(`Contact cold (${cold.length}):`);
    lines.push(...cold.map(alertRowText));
    lines.push("");
  }
  if (stalls.length > 0) {
    lines.push(`Marketplace stalled (${stalls.length}):`);
    lines.push(...stalls.map(alertRowText));
    lines.push("");
  }
  lines.push(`Manage all: ${SITE_ORIGIN}/admin/alerts`);
  return lines.join("\n");
}

/** Sends a single digest via Resend. Returns send status — never
 *  throws (failures are logged so one owner's failure doesn't block
 *  the next). */
export async function sendDigestEmail(opts: {
  to: string;
  ownerName: string;
  alerts: DigestAlert[];
}): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    return { sent: false, reason: "RESEND_API_KEY or RESEND_FROM not set" };
  }
  const subject = `GhostSignal CRM · ${opts.alerts.length} alert${opts.alerts.length === 1 ? "" : "s"} for ${opts.ownerName}`;
  const html = buildDigestHtml({
    recipient: opts.to,
    ownerName: opts.ownerName,
    alerts: opts.alerts,
  });
  const text = buildDigestText({
    recipient: opts.to,
    ownerName: opts.ownerName,
    alerts: opts.alerts,
  });
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [opts.to], subject, html, text }),
      cache: "no-store",
    });
    if (!res.ok) {
      const detail = await res.text();
      return { sent: false, reason: `Resend ${res.status}: ${detail}` };
    }
    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      reason: err instanceof Error ? err.message : "unknown",
    };
  }
}

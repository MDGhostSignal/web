/**
 * XQ submission email triggers.
 *
 * Mirrors `src/app/api/rq-submissions/emails.ts` shape:
 *
 *   sendLeadNotificationEmail  — fires on incomplete capture (contact
 *                                 step only). Lightweight admin alert.
 *   sendNotificationEmail      — fires on complete submission. Heavy
 *                                 admin alert with full archetype +
 *                                 value buckets summary.
 *   sendUserSummaryEmail       — fires on complete submission. Sends
 *                                 the user a styled archetype dossier
 *                                 (their copy of the XQ result).
 *
 * Same Resend setup, same env vars (RESEND_API_KEY + RESEND_FROM),
 * same XQ_NOTIFY_TO override (defaults to hello@ghostsignal.cloud).
 */

import { CHARACTERS } from "@/lib/xq/characters";
import type { ArchetypeCode } from "@/lib/xq/constants";

import type { XQSubmissionPayload } from "./types";

/** Resolve per-archetype palette for the email reveal card. Falls
 *  back to a neutral slate if the code is missing or unrecognised so
 *  the email never renders an invalid color. */
function archetypePalette(code: string | null | undefined): {
  accent: string;
  accentSoft: string;
  accentSoftStrong: string;
  accentBorder: string;
} {
  const identity = code ? CHARACTERS[code as ArchetypeCode] : undefined;
  if (!identity) {
    return {
      accent: "#4a4e58",
      accentSoft: "rgba(74, 78, 88, 0.08)",
      accentSoftStrong: "rgba(74, 78, 88, 0.16)",
      accentBorder: "rgba(74, 78, 88, 0.32)",
    };
  }
  // `accentSoft` is the canonical ~18% wash. Build a slightly stronger
  // version for the card border so it reads as a defined frame and a
  // weaker version for the gradient base.
  return {
    accent: identity.accent,
    accentSoft: identity.accentSoft.replace("0.18", "0.06"),
    accentSoftStrong: identity.accentSoft,
    accentBorder: identity.accentSoft.replace("0.18", "0.45"),
  };
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const EMAIL_TO = process.env.XQ_NOTIFY_TO ?? "hello@ghostsignal.cloud";

type SendResult =
  | { attempted: false; sent: false; reason: string }
  | { attempted: true; sent: false; reason?: string; email?: string }
  | { attempted: true; sent: true; email?: string };

/* =====================================================================
 * sendUserSummaryEmail — the user's copy of their XQ result.
 * ===================================================================== */
export async function sendUserSummaryEmail(
  payload: XQSubmissionPayload,
): Promise<SendResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM;

  if (!resendApiKey || !resendFrom) {
    return { attempted: false, sent: false, reason: "Resend is not configured." };
  }

  const basics = payload.basics ?? {};
  const result = payload.result ?? {};
  const buckets = result.buckets ?? {};
  const userEmail = basics.email?.trim();

  if (!userEmail || !userEmail.includes("@")) {
    return { attempted: false, sent: false, reason: "Invalid user email." };
  }

  const fullName = `${basics.first ?? ""} ${basics.last ?? ""}`.trim() || "there";
  const archetypeName = result.archetypeName ?? "—";
  const archetypeTagline = result.archetypeTagline ?? "";
  const profile =
    typeof result.profile === "string"
      ? result.profile
      : "Your archetype dossier is ready below.";

  const vectorBias = result.vectorBias ?? "";

  // Per-archetype palette — overrides the hardcoded teal the email
  // used for every code. Drives the reveal-card gradient, border,
  // archetype name color, and label tint so the email matches the
  // on-site dossier visual language.
  const palette = archetypePalette(result.code);

  // Bucket renderers — color match the public quiz dossier visual
  // language (red = non-neg, accent = core, purple = aspirational,
  // muted = background).
  const bucketRow = (
    label: string,
    color: string,
    bg: string,
    values: string[] | undefined,
    emptyText: string,
  ): string => {
    const items = values ?? [];
    const tags = items.length
      ? items
          .map(
            (v) =>
              `<span style="display: inline-block; padding: 4px 10px; margin: 3px; border-radius: 6px; border: 1px solid ${color}; color: ${color}; background-color: ${bg}; font-size: 13px;">${escapeHtml(v)}</span>`,
          )
          .join("")
      : `<span style="font-size: 13px; color: #999999;">${escapeHtml(emptyText)}</span>`;
    return `
      <tr>
        <td style="padding: 0 32px 20px;">
          <div style="font-size: 12px; font-weight: 700; color: ${color}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">${escapeHtml(label)}</div>
          <div>${tags}</div>
        </td>
      </tr>
    `;
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Your GHOSTSignal Conviction Quotient</title></head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

          <tr>
            <td align="center" style="padding: 40px 32px 24px;">
              <img src="https://www.ghostsignal.cloud/images/brand/ghostsignal-logo.svg" alt="GHOSTSignal" width="140" style="display: block; margin: 0 auto 20px;" />
              <h1 style="margin: 0; font-size: 24px; font-weight: 400; color: #1a1a1a; line-height: 1.4;">
                <span style="display: block;">Your <span style="white-space: nowrap;"><span style="font-weight: 700;">GHOST</span><span style="font-weight: 300;">Signal</span></span></span>
                <span style="display: block;">Conviction Quotient</span>
              </h1>
              <p style="margin: 12px 0 0; font-size: 15px; color: #666666;">
                Hello ${escapeHtml(fullName)}, here's your complete XQ archetype dossier.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, ${palette.accentSoftStrong}, ${palette.accentSoft}); border: 2px solid ${palette.accentBorder}; border-radius: 12px;">
                <tr>
                  <td align="center" style="padding: 32px 24px;">
                    <div style="font-family: 'SF Mono', 'Fira Code', ui-monospace, monospace; font-size: 11px; font-weight: 700; color: ${palette.accent}; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px;">
                      Calibration Architecture Verified
                    </div>
                    <div style="font-size: 28px; font-weight: 700; color: ${palette.accent}; margin-bottom: 6px; line-height: 1.2;">
                      ${escapeHtml(archetypeName)}
                    </div>
                    <div style="font-size: 14px; font-style: italic; color: ${palette.accent}; opacity: 0.85; margin-bottom: 16px;">
                      ${escapeHtml(archetypeTagline)}
                    </div>
                    ${
                      vectorBias
                        ? `<div style="font-family: 'SF Mono', 'Fira Code', ui-monospace, monospace; font-size: 12px; color: #666666; padding-top: 16px; border-top: 1px solid ${palette.accentBorder};">
                            Triangulated Vector Bias · ${escapeHtml(vectorBias)}
                          </div>`
                        : ""
                    }
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 24px;">
              <p style="margin: 0; font-size: 14.5px; color: #444444; line-height: 1.65;">
                ${escapeHtml(profile)}
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 16px;">
              <h2 style="margin: 0; font-size: 17px; color: #1a1a1a; letter-spacing: 0.2px;">Your Triangulated Conviction Dossier</h2>
            </td>
          </tr>

          ${bucketRow(
            "🔴 Non-Negotiable Guardrails",
            "#b22222",
            "rgba(178, 34, 34, 0.07)",
            buckets.nonNegotiables,
            "No restrictive boundary values triggered under pressure.",
          )}
          ${bucketRow(
            "🔹 Core Operating Framework",
            "#0a7794",
            "rgba(199, 249, 255, 0.18)",
            buckets.core,
            "No baseline habits checked.",
          )}
          ${bucketRow(
            "🔮 Aspirational Horizons",
            "#7b3ec7",
            "rgba(209, 179, 255, 0.15)",
            buckets.aspirational,
            "No growth parameters marked.",
          )}
          ${bucketRow(
            "💡 Background Context Nuances",
            "#888888",
            "rgba(0, 0, 0, 0.03)",
            buckets.background,
            "None.",
          )}

          <tr>
            <td style="padding: 24px 32px 16px;">
              <div style="height: 1px; background-color: #e0e0e0;"></div>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 32px 24px;" align="center">
              <p style="margin: 0 0 12px; font-size: 13px; color: #666666;">
                Questions or want to talk through what this means for your business?
              </p>
              <a href="mailto:mike@ghostsignal.cloud" style="font-size: 14px; color: #c4880d; text-decoration: none; font-weight: 500;">
                mike@ghostsignal.cloud
              </a>
              <div style="margin-top: 16px;">
                <img src="https://www.ghostsignal.cloud/images/brand/GS-EmailSignatures-mikew.gif" alt="Mike" width="320" style="display: block; margin: 0 auto; border-radius: 8px;" />
              </div>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 16px 32px 32px; font-size: 12px; color: #999999;">
              GHOSTSignal · The Conviction Quotient · XQ
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFrom,
      to: [userEmail],
      subject: `Your XQ Archetype — ${archetypeName}`,
      html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("XQ user summary email failed:", detail);
    return { attempted: true, sent: false, reason: detail, email: userEmail };
  }

  return { attempted: true, sent: true, email: userEmail };
}

/* =====================================================================
 * sendLeadNotificationEmail — light admin alert for incomplete capture
 * (contact step only, no quiz answers yet).
 * ===================================================================== */
export async function sendLeadNotificationEmail(
  payload: XQSubmissionPayload,
): Promise<SendResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM;
  if (!resendApiKey || !resendFrom) {
    return { attempted: false, sent: false, reason: "Resend is not configured." };
  }

  const basics = payload.basics ?? {};
  const fullName = `${basics.first ?? ""} ${basics.last ?? ""}`.trim() || "(unnamed)";
  const subject = `XQ lead — ${fullName}${basics.org ? ` · ${basics.org}` : ""}`;

  const html = `<!DOCTYPE html><html><body style="font-family: -apple-system, sans-serif; color: #1a1a1a;">
    <h2 style="margin: 0 0 8px;">XQ lead captured</h2>
    <p style="color: #666; margin: 0 0 16px;">Someone started the Conviction Quotient but hasn't completed it yet.</p>
    <table cellspacing="0" cellpadding="4" style="font-size: 14px;">
      <tr><td style="color:#666;">Name</td><td><strong>${escapeHtml(fullName)}</strong></td></tr>
      <tr><td style="color:#666;">Email</td><td>${escapeHtml(basics.email ?? "—")}</td></tr>
      <tr><td style="color:#666;">Organization</td><td>${escapeHtml(basics.org ?? "—")}</td></tr>
      <tr><td style="color:#666;">Role</td><td>${escapeHtml(basics.role ?? "—")}</td></tr>
      <tr><td style="color:#666;">Type</td><td>${escapeHtml(basics.type ?? "—")}</td></tr>
    </table>
  </body></html>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: resendFrom, to: [EMAIL_TO], subject, html }),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("XQ lead notification failed:", detail);
    return { attempted: true, sent: false, reason: detail };
  }
  return { attempted: true, sent: true };
}

/* =====================================================================
 * sendNotificationEmail — admin alert on complete submission with the
 * full archetype + value buckets summary.
 * ===================================================================== */
export async function sendNotificationEmail(
  payload: XQSubmissionPayload,
  link?: { status: string; candidateCount: number },
): Promise<SendResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM;
  if (!resendApiKey || !resendFrom) {
    return { attempted: false, sent: false, reason: "Resend is not configured." };
  }

  const basics = payload.basics ?? {};
  const result = payload.result ?? {};
  const buckets = result.buckets ?? {};
  const fullName = `${basics.first ?? ""} ${basics.last ?? ""}`.trim() || "(unnamed)";
  const archetypeName = result.archetypeName ?? "—";

  const list = (vals: string[] | undefined): string =>
    vals && vals.length ? vals.map((v) => escapeHtml(v)).join(", ") : "—";

  const subject = `XQ complete — ${fullName} · ${archetypeName}`;

  // When the result couldn't be auto-linked to a member, warn loudly so
  // a human links it — otherwise it silently never reaches their Studio.
  const linkWarn =
    link && (link.status === "no_match" || link.status === "ambiguous")
      ? `<div style="background:#fff4e5;border:1px solid #f0b849;border-radius:8px;padding:12px 14px;margin:0 0 16px;font-size:13px;color:#8a5a00;">⚠️ <strong>Not auto-linked to a member.</strong> ${
          link.status === "ambiguous"
            ? `${link.candidateCount} members share this email`
            : "no member matches this email"
        } — link it by hand in the admin, or this result won't show in their Studio.</div>`
      : "";

  const html = `<!DOCTYPE html><html><body style="font-family: -apple-system, sans-serif; color: #1a1a1a;">
    ${linkWarn}
    <h2 style="margin: 0 0 8px;">XQ submission complete</h2>
    <p style="color: #666; margin: 0 0 16px;"><strong>${escapeHtml(fullName)}</strong> · ${escapeHtml(basics.email ?? "")}</p>
    <table cellspacing="0" cellpadding="4" style="font-size: 14px; margin-bottom: 16px;">
      <tr><td style="color:#666;">Archetype</td><td><strong>${escapeHtml(archetypeName)}</strong> · ${escapeHtml(result.archetypeTagline ?? "")}</td></tr>
      <tr><td style="color:#666;">Code</td><td><code>${escapeHtml(result.code ?? "—")}</code></td></tr>
      <tr><td style="color:#666;">Vector Bias</td><td>${escapeHtml(result.vectorBias ?? "—")}</td></tr>
      <tr><td style="color:#666;">Organization</td><td>${escapeHtml(basics.org ?? "—")}</td></tr>
      <tr><td style="color:#666;">Type</td><td>${escapeHtml(basics.type ?? "—")}</td></tr>
    </table>
    <h3 style="margin: 16px 0 4px; font-size: 14px;">Non-Negotiables</h3>
    <p style="margin: 0 0 12px; font-size: 13px; color: #b22222;">${list(buckets.nonNegotiables)}</p>
    <h3 style="margin: 16px 0 4px; font-size: 14px;">Core</h3>
    <p style="margin: 0 0 12px; font-size: 13px; color: #0a7794;">${list(buckets.core)}</p>
    <h3 style="margin: 16px 0 4px; font-size: 14px;">Aspirational</h3>
    <p style="margin: 0 0 12px; font-size: 13px; color: #7b3ec7;">${list(buckets.aspirational)}</p>
    <h3 style="margin: 16px 0 4px; font-size: 14px;">Background</h3>
    <p style="margin: 0; font-size: 13px; color: #888888;">${list(buckets.background)}</p>
  </body></html>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: resendFrom, to: [EMAIL_TO], subject, html }),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("XQ admin notification failed:", detail);
    return { attempted: true, sent: false, reason: detail };
  }
  return { attempted: true, sent: true };
}

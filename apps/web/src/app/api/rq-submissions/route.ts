import { NextResponse } from "next/server";
import { postToGoogleSheetsWebhook } from "@/lib/googleSheetsWebhook";
import type { SubmissionPayload } from "./types";

const TABLE_NAME = process.env.RQ_SUBMISSIONS_TABLE ?? "rq_submissions";
const EMAIL_TO = process.env.RQ_NOTIFY_TO ?? "hello@ghostsignal.cloud";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getCorsHeaders(origin: string | null) {
  const allowOrigin = process.env.RQ_ALLOWED_ORIGINS?.trim();
  const headers = new Headers({
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  });

  if (!allowOrigin || allowOrigin === "*") {
    headers.set("Access-Control-Allow-Origin", origin ?? "*");
    return headers;
  }

  const allowedOrigins = allowOrigin
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (origin && allowedOrigins.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

function json(data: unknown, init?: ResponseInit, origin: string | null = null) {
  const headers = getCorsHeaders(origin);
  headers.set("Content-Type", "application/json");

  if (init?.headers) {
    const extra = new Headers(init.headers);
    extra.forEach((value, key) => headers.set(key, value));
  }

  return new NextResponse(JSON.stringify(data), {
    ...init,
    headers,
  });
}

function isValidPayload(payload: SubmissionPayload) {
  return Boolean(
    payload?.basics?.first &&
      payload?.basics?.last &&
      payload?.basics?.email &&
      payload?.basics?.org &&
      payload?.basics?.type &&
      payload?.result?.rq &&
      payload?.result?.rqName &&
      payload?.answers,
  );
}

async function sendUserSummaryEmail(payload: SubmissionPayload) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM;

  if (!resendApiKey || !resendFrom) {
    return { attempted: false, sent: false, reason: "Resend is not configured." };
  }

  const basics = payload.basics ?? {};
  const result = payload.result ?? {};
  const clarity = result.clarity ?? {};
  const profile = (result.profile ?? {}) as { values?: string; authenticity?: string; horizon?: string };
  const userEmail = basics.email?.trim();

  if (!userEmail || !userEmail.includes("@")) {
    return { attempted: false, sent: false, reason: "Invalid user email." };
  }

  const fullName = `${basics.first ?? ""} ${basics.last ?? ""}`.trim() || "there";

  // Determine clarity badge color for light background
  let clarityBgColor = "rgba(200, 150, 50, 0.15)";
  let clarityTextColor = "#b8860b";
  const clarityLabel = clarity.label?.toLowerCase() ?? "";
  if (clarityLabel === "high") {
    clarityBgColor = "rgba(34, 139, 34, 0.12)";
    clarityTextColor = "#228b22";
  } else if (clarityLabel === "low") {
    clarityBgColor = "rgba(178, 34, 34, 0.12)";
    clarityTextColor = "#b22222";
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your GhostSignal Resonance Quotient</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px 32px 24px;">
              <img src="https://ghostsignal.cloud/images/brand/ghostsignal-logo.svg" alt="GhostSignal" width="140" style="display: block; margin: 0 auto 20px;" />
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1a1a1a; line-height: 1.3;">
                Your GhostSignal Resonance Quotient
              </h1>
              <p style="margin: 12px 0 0; font-size: 15px; color: #666666;">
                Hello ${escapeHtml(fullName)}, here's your complete RQ analysis.
              </p>
            </td>
          </tr>

          <!-- RQ Card -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(251, 173, 37, 0.12), rgba(251, 173, 37, 0.04)); border: 2px solid rgba(251, 173, 37, 0.25); border-radius: 12px;">
                <tr>
                  <td align="center" style="padding: 32px 24px;">
                    <div style="font-family: 'SF Mono', 'Fira Code', ui-monospace, monospace; font-size: 28px; font-weight: 700; color: #c4880d; letter-spacing: 1px; margin-bottom: 6px;">
                      ${escapeHtml(result.rq ?? "—")}
                    </div>
                    <div style="font-family: 'SF Mono', 'Fira Code', ui-monospace, monospace; font-size: 16px; color: #666666; margin-bottom: 20px;">
                      ${escapeHtml(result.rqName ?? "—")}
                    </div>

                    <!-- Clarity Badge -->
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                      <tr>
                        <td style="padding-top: 20px; border-top: 1px solid rgba(251, 173, 37, 0.2);">
                          <span style="font-size: 13px; color: #666666; margin-right: 8px;">Signal Clarity:</span>
                          <span style="display: inline-block; padding: 5px 14px; border-radius: 999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; background: ${clarityBgColor}; color: ${clarityTextColor};">
                            ${escapeHtml(clarity.label ?? "—")}
                          </span>
                        </td>
                      </tr>
                      ${clarity.note ? `
                      <tr>
                        <td style="padding-top: 10px;">
                          <p style="margin: 0; font-size: 13px; color: #888888; font-style: italic; text-align: center;">
                            ${escapeHtml(clarity.note)}
                          </p>
                        </td>
                      </tr>
                      ` : ""}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Profile Sections -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <!-- Values -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="border-left: 3px solid #FBAD25; padding-left: 20px; background: #fafafa; padding-top: 16px; padding-bottom: 16px; padding-right: 16px; border-radius: 0 8px 8px 0;">
                    <h3 style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: #c4880d; text-transform: uppercase; letter-spacing: 0.5px;">Values</h3>
                    <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #333333;">
                      ${escapeHtml(profile.values ?? "—")}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Authenticity -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="border-left: 3px solid #FBAD25; padding-left: 20px; background: #fafafa; padding-top: 16px; padding-bottom: 16px; padding-right: 16px; border-radius: 0 8px 8px 0;">
                    <h3 style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: #c4880d; text-transform: uppercase; letter-spacing: 0.5px;">Authenticity</h3>
                    <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #333333;">
                      ${escapeHtml(profile.authenticity ?? "—")}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Horizon -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-left: 3px solid #FBAD25; padding-left: 20px; background: #fafafa; padding-top: 16px; padding-bottom: 16px; padding-right: 16px; border-radius: 0 8px 8px 0;">
                    <h3 style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: #c4880d; text-transform: uppercase; letter-spacing: 0.5px;">Horizon</h3>
                    <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #333333;">
                      ${escapeHtml(profile.horizon ?? "—")}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- About the RQ Section -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f8f8f8; border-radius: 12px; border: 1px solid #e8e8e8;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #1a1a1a;">What is the Resonance Quotient?</h3>
                    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.7; color: #555555;">
                      The Resonance Quotient is a framework for understanding how you signal values, build trust, and approach partnerships—helping match creators and brands who share aligned visions for world-making.
                    </p>
                    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.7; color: #555555;">
                      Nobel Prize-winning economist Daron Acemoglu's research demonstrates that "high-trust circles"—groups bound by shared values—are self-reinforcing. This deeper trust directly translates to greater revenue, efficiency, and long-term sustainability.
                    </p>
                    <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.7; color: #555555;">
                      When partnerships are built on genuine alignment rather than transactional reach, it creates a deeply human bond—one where every interaction compounds into community that lasts.
                    </p>
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-right: 24px;">
                          <a href="https://drive.google.com/file/d/1Jgn7CTqYcfqxxM8d14fjlDfVydsi2up3/view?usp=drive_link" target="_blank" style="font-size: 13px; color: #c4880d; text-decoration: none; font-weight: 500;">
                            Read the GhostSignal White Paper →
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 8px;">
                          <a href="https://economics.mit.edu/sites/default/files/2023-04/Culture%2C%20Institutions%20and%20Social%20Equilibria%20-%20A%20Framework.pdf" target="_blank" style="font-size: 13px; color: #c4880d; text-decoration: none; font-weight: 500;">
                            Acemoglu on High-Trust Equilibria at MIT →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Connect with Mike -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top: 1px solid #e8e8e8; padding-top: 24px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 12px; font-size: 15px; color: #333333; line-height: 1.6;">
                      Find out what your RQ can do for you.<br />
                      Schedule a call with one of our founders, Mike.
                    </p>
                    <a href="mailto:mike@ghostsignal.cloud" style="font-size: 14px; color: #c4880d; text-decoration: none; font-weight: 500;">
                      mike@ghostsignal.cloud
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Buttons -->
          <tr>
            <td style="padding: 24px 32px; background: #fafafa; border-top: 1px solid #e8e8e8;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <!-- Snowdrift Section -->
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <p style="margin: 0 0 4px; font-size: 14px; color: #333333; font-weight: 600;">
                      Snowdrift is a GhostSignal transmission.
                    </p>
                    <p style="margin: 0 0 16px; font-size: 13px; color: #666666; line-height: 1.6;">
                      Thoughts for a community of world makers.
                    </p>
                    <a href="https://snowdriftghostsignal.substack.com/" target="_blank" style="display: inline-block; padding: 12px 24px; background: #ffffff; color: #333333; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; border: 1px solid #dddddd;">
                      Subscribe to Snowdrift Newsletter
                    </a>
                  </td>
                </tr>
                <!-- Discover GhostSignal Button -->
                <tr>
                  <td align="center" style="padding-top: 16px;">
                    <a href="https://ghostsignal.cloud" target="_blank" style="display: inline-block; padding: 14px 28px; background: #FBAD25; color: #1a1a1a; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                      Discover GhostSignal
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 32px; border-top: 1px solid #e8e8e8;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #888888;">
                Your RQ is a tuning tool — clarity, not a box.
              </p>
              <p style="margin: 0; font-size: 11px; color: #aaaaaa;">
                © ${new Date().getFullYear()} GhostSignal · Values-based partnerships
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = [
    "Your GhostSignal Resonance Index",
    "",
    `Hello ${fullName}, here's your RQ summary.`,
    "",
    "═══════════════════════════════════",
    "",
    `RQ Code: ${result.rq ?? "—"}`,
    `RQ Name: ${result.rqName ?? "—"}`,
    `Signal Clarity: ${clarity.label ?? "—"}`,
    clarity.note ? `  ${clarity.note}` : "",
    "",
    "═══════════════════════════════════",
    "",
    "VALUES",
    profile.values ?? "—",
    "",
    "AUTHENTICITY",
    profile.authenticity ?? "—",
    "",
    "HORIZON",
    profile.horizon ?? "—",
    "",
    "═══════════════════════════════════",
    "",
    "SNOWDRIFT",
    "",
    "Snowdrift is a GhostSignal transmission. Thoughts for a community of world makers.",
    "A cultural investigation of the future and what it means for you.",
    "",
    "→ Subscribe to the Snowdrift Newsletter: https://snowdriftghostsignal.substack.com/",
    "",
    "→ Discover GhostSignal: https://ghostsignal.cloud",
    "",
    "═══════════════════════════════════",
    "",
    "Your RQ is a tuning tool — clarity, not a box.",
    "",
    `© ${new Date().getFullYear()} GhostSignal · Values-based partnerships`,
  ].filter(Boolean).join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFrom,
      to: [userEmail],
      subject: `Your Resonance Index: ${result.rq ?? "RQ Summary"}`,
      text,
      html,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("User summary email failed:", detail);
    return { attempted: true, sent: false, reason: detail };
  }

  return { attempted: true, sent: true, email: userEmail };
}

async function sendNotificationEmail(payload: SubmissionPayload) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM;

  if (!resendApiKey || !resendFrom) {
    return { attempted: false, sent: false, reason: "Resend is not configured." };
  }

  const basics = payload.basics ?? {};
  const result = payload.result ?? {};
  const clarity = result.clarity ?? {};
  const fullName = `${basics.first ?? ""} ${basics.last ?? ""}`.trim();

  const text = [
    "New GhostSignal RQ submission",
    "",
    `Name: ${fullName || "Unknown"}`,
    `Type: ${basics.type ?? "Unknown"}`,
    `Organization: ${basics.org ?? "Unknown"}`,
    `Role: ${basics.role ?? "-"}`,
    `Industry: ${basics.industry ?? "-"}`,
    `Website: ${basics.website ?? "-"}`,
    `Email: ${basics.email ?? "-"}`,
    "",
    `RQ: ${result.rq ?? "-"}`,
    `RQ Name: ${result.rqName ?? "-"}`,
    `Signal Clarity: ${clarity.label ?? "-"}${clarity.note ? ` - ${clarity.note}` : ""}`,
    "",
    `Undertone: ${result.undertone ?? "-"}`,
    "",
    `Source: ${payload.source ?? "-"}`,
    `Page URL: ${payload.meta?.pageUrl ?? "-"}`,
    `Referrer: ${payload.meta?.referrer ?? "-"}`,
  ].join("\n");

  const html = `
    <h2>New GhostSignal RQ submission</h2>
    <p><strong>Name:</strong> ${escapeHtml(fullName || "Unknown")}</p>
    <p><strong>Type:</strong> ${escapeHtml(basics.type ?? "Unknown")}</p>
    <p><strong>Organization:</strong> ${escapeHtml(basics.org ?? "Unknown")}</p>
    <p><strong>Role:</strong> ${escapeHtml(basics.role ?? "-")}</p>
    <p><strong>Industry:</strong> ${escapeHtml(basics.industry ?? "-")}</p>
    <p><strong>Website:</strong> ${escapeHtml(basics.website ?? "-")}</p>
    <p><strong>Email:</strong> ${escapeHtml(basics.email ?? "-")}</p>
    <hr />
    <p><strong>RQ:</strong> ${escapeHtml(result.rq ?? "-")}</p>
    <p><strong>RQ Name:</strong> ${escapeHtml(result.rqName ?? "-")}</p>
    <p><strong>Signal Clarity:</strong> ${escapeHtml(clarity.label ?? "-")}</p>
    <p>${escapeHtml(clarity.note ?? "")}</p>
    <hr />
    <p><strong>Undertone:</strong></p>
    <p>${escapeHtml(result.undertone ?? "-")}</p>
    <hr />
    <p><strong>Source:</strong> ${escapeHtml(payload.source ?? "-")}</p>
    <p><strong>Page URL:</strong> ${escapeHtml(payload.meta?.pageUrl ?? "-")}</p>
    <p><strong>Referrer:</strong> ${escapeHtml(payload.meta?.referrer ?? "-")}</p>
  `;

  // Format reply_to properly - only include if email is valid
  const replyTo = basics.email?.trim();
  const emailPayload: {
    from: string;
    to: string[];
    subject: string;
    text: string;
    html: string;
    reply_to?: string;
  } = {
    from: resendFrom,
    to: [EMAIL_TO],
    subject: `New GhostSignal RQ: ${result.rq ?? "Submission"} - ${fullName || basics.org || "Unknown"}`,
    text,
    html,
  };

  // Only add reply_to if we have a valid email
  if (replyTo && replyTo.includes("@")) {
    emailPayload.reply_to = replyTo;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailPayload),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("RQ notification email failed:", detail);
    return { attempted: true, sent: false, reason: detail };
  }

  return { attempted: true, sent: true };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request.headers.get("origin")),
  });
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendConfigured = Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
  const googleSheetsConfigured = Boolean(process.env.GOOGLE_SHEETS_WEBHOOK_URL);

  if (!supabaseUrl || !serviceRoleKey) {
    return json(
      {
        ok: false,
        configured: false,
        table: TABLE_NAME,
        emailConfigured: resendConfigured,
        googleSheetsConfigured,
        error:
          "RQ submission capture is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 },
      origin,
    );
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/${TABLE_NAME}?select=id&limit=1`,
    {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    return json(
      {
        ok: false,
        configured: true,
        table: TABLE_NAME,
        emailConfigured: resendConfigured,
        googleSheetsConfigured,
        error: "Supabase connection check failed.",
        detail,
      },
      { status: 502 },
      origin,
    );
  }

  return json(
    {
      ok: true,
      configured: true,
      table: TABLE_NAME,
      emailConfigured: resendConfigured,
      googleSheetsConfigured,
      emailTo: EMAIL_TO,
      message: "Supabase connection is working for RQ submissions.",
    },
    { status: 200 },
    origin,
  );
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");

  let payload: SubmissionPayload;
  try {
    payload = (await request.json()) as SubmissionPayload;
  } catch {
    return json({ error: "Invalid JSON body." }, { status: 400 }, origin);
  }

  if (!isValidPayload(payload)) {
    return json({ error: "Missing required submission fields." }, { status: 400 }, origin);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return json(
      {
        error:
          "RQ submission capture is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 },
      origin,
    );
  }

  const record = {
    source: payload.source ?? "squarespace-rq-snippet",
    submitted_at: payload.submittedAt ?? new Date().toISOString(),
    company: payload.brand?.company ?? null,
    acronym: payload.brand?.acronym ?? null,
    title: payload.brand?.title ?? null,
    participant_type: payload.basics?.type ?? null,
    first_name: payload.basics?.first ?? null,
    last_name: payload.basics?.last ?? null,
    role: payload.basics?.role ?? null,
    organization: payload.basics?.org ?? null,
    industry: payload.basics?.industry ?? null,
    website: payload.basics?.website ?? null,
    email: payload.basics?.email ?? null,
    rq_code: payload.result?.rq ?? null,
    rq_name: payload.result?.rqName ?? null,
    signal_clarity_label: payload.result?.clarity?.label ?? null,
    signal_clarity_note: payload.result?.clarity?.note ?? null,
    undertone: payload.result?.undertone ?? null,
    page_url: payload.meta?.pageUrl ?? null,
    referrer: payload.meta?.referrer ?? null,
    user_agent: payload.meta?.userAgent ?? null,
    answers_json: payload.answers ?? {},
    profile_json: payload.result?.profile ?? {},
    details_json: payload.result?.details ?? {},
    submission_payload: payload,
  };

  const response = await fetch(`${supabaseUrl}/rest/v1/${TABLE_NAME}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify(record),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("RQ submission insert failed:", errorText);
    return json(
      { error: "Failed to store RQ submission.", detail: errorText },
      { status: 502 },
      origin,
    );
  }

  const inserted = (await response.json()) as Array<{ id?: string | number }>;

  // Send email notification to admin
  const emailResult = await sendNotificationEmail(payload);

  // Send summary email to user
  const userEmailResult = await sendUserSummaryEmail(payload);

  // Post to Google Sheets webhook
  const sheetsResult = await postToGoogleSheetsWebhook(payload);

  return json(
    {
      ok: true,
      id: inserted?.[0]?.id ?? null,
      emailNotified: emailResult.sent,
      emailTo: emailResult.attempted ? EMAIL_TO : null,
      userSummarySent: userEmailResult.sent,
      userSummaryEmail: userEmailResult.sent ? (userEmailResult as { email?: string }).email : null,
      googleSheetsAppended: sheetsResult.success,
      googleSheetsRow: sheetsResult.row,
    },
    { status: 201 },
    origin,
  );
}

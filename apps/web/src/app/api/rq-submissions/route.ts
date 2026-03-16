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

  // Determine clarity badge color
  let clarityBgColor = "rgba(255, 200, 100, 0.2)";
  let clarityTextColor = "#ffc864";
  const clarityLabel = clarity.label?.toLowerCase() ?? "";
  if (clarityLabel === "high") {
    clarityBgColor = "rgba(50, 255, 150, 0.2)";
    clarityTextColor = "#50ff96";
  } else if (clarityLabel === "low") {
    clarityBgColor = "rgba(255, 150, 150, 0.2)";
    clarityTextColor = "#ff9696";
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your GhostSignal Resonance Index</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f12; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0f12;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <img src="https://ghostsignal.cloud/images/brand/brandmark-vert-white.svg" alt="GhostSignal" width="60" style="display: block; margin: 0 auto 16px;" />
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #FFFFFF; line-height: 1.3;">
                Your Resonance Index
              </h1>
              <p style="margin: 12px 0 0; font-size: 16px; color: #BCBCBC;">
                Hello ${escapeHtml(fullName)}, here's your RQ summary.
              </p>
            </td>
          </tr>

          <!-- RQ Card -->
          <tr>
            <td style="padding: 0 0 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(251, 173, 37, 0.15), rgba(251, 173, 37, 0.05)); border: 2px solid rgba(251, 173, 37, 0.18); border-radius: 16px;">
                <tr>
                  <td align="center" style="padding: 40px 24px;">
                    <div style="font-family: 'Inter', ui-monospace, monospace; font-size: 32px; font-weight: 700; color: #FBAD25; letter-spacing: 1px; margin-bottom: 8px;">
                      ${escapeHtml(result.rq ?? "—")}
                    </div>
                    <div style="font-family: 'Inter', ui-monospace, monospace; font-size: 18px; color: #BCBCBC; margin-bottom: 24px;">
                      ${escapeHtml(result.rqName ?? "—")}
                    </div>

                    <!-- Clarity Badge -->
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                      <tr>
                        <td style="padding-top: 24px; border-top: 1px solid rgba(251, 173, 37, 0.18);">
                          <span style="font-size: 13px; color: #BCBCBC; margin-right: 8px;">Signal Clarity:</span>
                          <span style="display: inline-block; padding: 5px 14px; border-radius: 999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; background: ${clarityBgColor}; color: ${clarityTextColor};">
                            ${escapeHtml(clarity.label ?? "—")}
                          </span>
                        </td>
                      </tr>
                      ${clarity.note ? `
                      <tr>
                        <td style="padding-top: 10px;">
                          <p style="margin: 0; font-size: 13px; color: #BCBCBC; font-style: italic; text-align: center;">
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
            <td style="padding-bottom: 32px;">
              <!-- Values -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="border-left: 3px solid #FBAD25; padding-left: 20px;">
                    <h3 style="margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #FBAD25; text-transform: uppercase; letter-spacing: 0.5px;">Values</h3>
                    <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #FFFFFF;">
                      ${escapeHtml(profile.values ?? "—")}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Authenticity -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="border-left: 3px solid #FBAD25; padding-left: 20px;">
                    <h3 style="margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #FBAD25; text-transform: uppercase; letter-spacing: 0.5px;">Authenticity</h3>
                    <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #FFFFFF;">
                      ${escapeHtml(profile.authenticity ?? "—")}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Horizon -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="border-left: 3px solid #FBAD25; padding-left: 20px;">
                    <h3 style="margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #FBAD25; text-transform: uppercase; letter-spacing: 0.5px;">Horizon</h3>
                    <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #FFFFFF;">
                      ${escapeHtml(profile.horizon ?? "—")}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Buttons -->
          <tr>
            <td style="padding: 32px 0; border-top: 1px solid rgba(251, 173, 37, 0.18);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <!-- Snowdrift Logo -->
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <img src="https://ghostsignal.cloud/images/brand/snowdrift-logo-white.png" alt="Snowdrift" width="100" style="display: block;" />
                  </td>
                </tr>
                <!-- Snowdrift Description -->
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <p style="margin: 0 0 8px; font-size: 15px; color: #FFFFFF; font-weight: 500; line-height: 1.6;">
                      Snowdrift is a GhostSignal transmission.
                    </p>
                    <p style="margin: 0; font-size: 15px; color: #BCBCBC; line-height: 1.6; max-width: 420px;">
                      Thoughts for a community of world makers. A cultural investigation of the future and what it means for you.
                    </p>
                  </td>
                </tr>
                <!-- Snowdrift Button -->
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <a href="https://snowdriftghostsignal.substack.com/" target="_blank" style="display: inline-block; padding: 14px 28px; background: rgba(255, 255, 255, 0.08); color: #FFFFFF; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 10px; border: 2px solid rgba(251, 173, 37, 0.18);">
                      Subscribe to the Snowdrift Newsletter
                    </a>
                  </td>
                </tr>
                <!-- Discover GhostSignal Button -->
                <tr>
                  <td align="center">
                    <a href="https://ghostsignal.cloud" target="_blank" style="display: inline-block; padding: 16px 32px; background: #FBAD25; color: #0b0f12; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 10px;">
                      Discover GhostSignal
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 32px 0; border-top: 1px solid rgba(251, 173, 37, 0.18);">
              <p style="margin: 0 0 8px; font-size: 13px; color: #BCBCBC;">
                Your RQ is a tuning tool — clarity, not a box.
              </p>
              <p style="margin: 0; font-size: 12px; color: #666666;">
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

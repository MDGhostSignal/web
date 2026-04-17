import { NextResponse } from "next/server";

const EMAIL_TO = process.env.CONTACT_EMAIL_TO ?? "hello@ghostsignal.cloud";

interface ContactPayload {
  firstName: string;
  lastName: string;
  email: string;
  type?: string;
  website?: string;
  podcastOrProduct?: string;
  interest?: string;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isValidPayload(payload: ContactPayload): boolean {
  return Boolean(
    payload?.firstName?.trim() &&
    payload?.lastName?.trim() &&
    payload?.email?.trim() &&
    payload?.email?.includes("@")
  );
}

export async function POST(request: Request) {
  let payload: ContactPayload;
  try {
    payload = (await request.json()) as ContactPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isValidPayload(payload)) {
    return NextResponse.json(
      { error: "Missing required fields (firstName, lastName, email)." },
      { status: 400 }
    );
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM;

  if (!resendApiKey || !resendFrom) {
    console.error("Contact form: Resend is not configured");
    return NextResponse.json(
      { error: "Email service is not configured." },
      { status: 500 }
    );
  }

  const fullName = `${payload.firstName} ${payload.lastName}`.trim();
  const typeLabel = payload.type === "podcast" ? "Podcaster" : payload.type === "advertiser" ? "Advertiser" : "Not specified";

  const text = [
    "New Contact Form Submission",
    "",
    `Name: ${fullName}`,
    `Email: ${payload.email}`,
    `Type: ${typeLabel}`,
    `Website: ${payload.website || "Not provided"}`,
    "",
    "What is your podcast or product?",
    payload.podcastOrProduct || "Not provided",
    "",
    "What has you interested in GHOSTSignal?",
    payload.interest || "Not provided",
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; background: #f5f5f5;">
  <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden;">
    <tr>
      <td style="background: #0b0f12; padding: 24px; text-align: center;">
        <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 400;">
          <span style="font-weight: 700;">GHOST</span><span style="font-weight: 300;">Signal</span> Contact Form
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h2 style="margin: 0 0 24px; font-size: 18px; color: #333;">New Inquiry</h2>

        <table width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
              <strong style="color: #666;">Name:</strong>
              <span style="color: #333; margin-left: 8px;">${escapeHtml(fullName)}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
              <strong style="color: #666;">Email:</strong>
              <a href="mailto:${escapeHtml(payload.email)}" style="color: #c4880d; margin-left: 8px;">${escapeHtml(payload.email)}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
              <strong style="color: #666;">Type:</strong>
              <span style="color: #333; margin-left: 8px;">${escapeHtml(typeLabel)}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
              <strong style="color: #666;">Website:</strong>
              ${payload.website
                ? `<a href="${escapeHtml(payload.website)}" style="color: #c4880d; margin-left: 8px;">${escapeHtml(payload.website)}</a>`
                : `<span style="color: #999; margin-left: 8px;">Not provided</span>`
              }
            </td>
          </tr>
        </table>

        ${payload.podcastOrProduct ? `
        <div style="margin-top: 24px; padding: 16px; background: #f8f8f8; border-radius: 8px;">
          <h3 style="margin: 0 0 8px; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">What is your podcast or product?</h3>
          <p style="margin: 0; color: #333; line-height: 1.6;">${escapeHtml(payload.podcastOrProduct)}</p>
        </div>
        ` : ""}

        ${payload.interest ? `
        <div style="margin-top: 16px; padding: 16px; background: #f8f8f8; border-radius: 8px;">
          <h3 style="margin: 0 0 8px; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">What has you interested in GHOSTSignal?</h3>
          <p style="margin: 0; color: #333; line-height: 1.6;">${escapeHtml(payload.interest)}</p>
        </div>
        ` : ""}

        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee; text-align: center;">
          <a href="mailto:${escapeHtml(payload.email)}" style="display: inline-block; padding: 12px 24px; background: #FBAD25; color: #1a1a1a; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Reply to ${escapeHtml(payload.firstName)}
          </a>
        </div>
      </td>
    </tr>
    <tr>
      <td style="background: #f5f5f5; padding: 16px; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #888;">
          Submitted via ghostsignal.cloud/get-in-touch
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFrom,
      to: [EMAIL_TO],
      subject: `Contact: ${fullName} (${typeLabel})`,
      text,
      html,
      reply_to: payload.email,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Contact form email failed:", detail);
    return NextResponse.json(
      { error: "Failed to send message.", detail },
      { status: 502 }
    );
  }

  console.log(`Contact form sent: ${fullName} <${payload.email}> -> ${EMAIL_TO}`);

  return NextResponse.json(
    { ok: true, message: "Your message has been sent!" },
    { status: 200 }
  );
}

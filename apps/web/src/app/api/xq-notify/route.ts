import { NextResponse } from "next/server";

const EMAIL_TO = process.env.XQ_NOTIFY_TO ?? process.env.CONTACT_EMAIL_TO ?? "hello@ghostsignal.cloud";

interface NotifyPayload {
  email: string;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  return trimmed.length > 3 && trimmed.includes("@") && trimmed.includes(".");
}

export async function POST(request: Request) {
  let payload: NotifyPayload;
  try {
    payload = (await request.json()) as NotifyPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = payload?.email?.trim() ?? "";
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM;

  if (!resendApiKey || !resendFrom) {
    console.error("XQ notify: Resend is not configured");
    return NextResponse.json(
      { error: "Email service is not configured." },
      { status: 500 },
    );
  }

  const text = [
    "XQ launch notify signup",
    "",
    `Email: ${email}`,
    "",
    "Source: /xq-preview",
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
          <span style="font-weight: 700;">GHOST</span><span style="font-weight: 300;">Signal</span> XQ Notify
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h2 style="margin: 0 0 24px; font-size: 18px; color: #333;">New XQ launch signup</h2>
        <p style="margin: 0 0 12px; color: #666;">Someone asked to be notified when the consolidated XQ goes live.</p>
        <p style="margin: 0;">
          <strong style="color: #666;">Email:</strong>
          <a href="mailto:${escapeHtml(email)}" style="color: #c4880d; margin-left: 8px;">${escapeHtml(email)}</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="background: #f5f5f5; padding: 16px; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #888;">
          Submitted via ghostsignal.cloud/xq-preview
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
      subject: `XQ notify: ${email}`,
      text,
      html,
      reply_to: email,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("XQ notify email failed:", detail);
    return NextResponse.json(
      { error: "Failed to save your email.", detail },
      { status: 502 },
    );
  }

  console.log(`XQ notify signup: ${email} -> ${EMAIL_TO}`);

  return NextResponse.json(
    { ok: true, message: "You are on the list." },
    { status: 200 },
  );
}

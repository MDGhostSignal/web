// Local-only script: sends a test RQ result email via Resend.
// Run with: RESEND_API_KEY=... node test-email.mjs
//
// Never hard-code the API key in this file. The key is loaded from the
// RESEND_API_KEY environment variable. If you previously had a key pasted
// here, rotate it at https://resend.com/api-keys — a key in a plaintext
// file is considered compromised.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || "Ghost Signal <onboarding@resend.dev>";
const TEST_EMAIL = process.env.TEST_EMAIL || "heymatvond@gmail.com";

if (!RESEND_API_KEY) {
  console.error(
    "Missing RESEND_API_KEY. Set it in your environment, e.g.:\n" +
      "  RESEND_API_KEY=re_xxx node test-email.mjs",
  );
  process.exit(1);
}

// Sample RQ result for testing
const result = {
  rq: 72,
  rqName: "Grounded Adaptive Builder",
  clarity: { label: "Strong", color: "#22c55e" },
  axes: {
    values: { score: 7, direction: "right", label: "Grounded" },
    authenticity: { score: 6, direction: "right", label: "Adaptive" },
    horizon: { score: 8, direction: "right", label: "Builder" },
  },
  profile: {
    values: "You value stability and proven approaches.",
    authenticity: "You adapt your presentation based on context.",
    horizon: "You focus on long-term sustainable growth.",
  },
};

const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Resonance Index</title>
</head>
<body style="margin: 0; padding: 0; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding: 32px 32px 24px; border-bottom: 1px solid #e8e8e8;">
              <img src="https://web-nine-fawn-27.vercel.app/images/brand/brandmark-vert-dark.svg" alt="GhostSignal" width="60" style="display: block; margin-bottom: 16px;" />
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a;">
                Your GhostSignal Resonance Quotient
              </h1>
            </td>
          </tr>

          <!-- RQ Score -->
          <tr>
            <td align="center" style="padding: 32px;">
              <div style="display: inline-block; width: 120px; height: 120px; line-height: 120px; border-radius: 50%; background: linear-gradient(135deg, #FBAD25 0%, #c4880d 100%); color: #1a1a1a; font-size: 48px; font-weight: 700; text-align: center;">
                ${result.rq}
              </div>
              <p style="margin: 16px 0 0; font-size: 20px; font-weight: 600; color: #1a1a1a;">
                ${result.rqName}
              </p>
              <span style="display: inline-block; margin-top: 8px; padding: 4px 12px; background: ${result.clarity.color}22; color: ${result.clarity.color}; font-size: 12px; font-weight: 600; border-radius: 999px; text-transform: uppercase;">
                ${result.clarity.label} Signal
              </span>
            </td>
          </tr>

          <!-- Snowdrift Section - Dark starry background -->
          <tr>
            <td style="padding: 32px; background: #0a0a0d; background-image: radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 1px, transparent 1px), radial-gradient(circle at 60% 70%, rgba(255,255,255,0.1) 1px, transparent 1px), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.12) 1px, transparent 1px), radial-gradient(circle at 40% 80%, rgba(255,255,255,0.08) 1px, transparent 1px), radial-gradient(circle at 90% 50%, rgba(255,255,255,0.15) 1px, transparent 1px), radial-gradient(circle at 10% 60%, rgba(255,255,255,0.1) 1px, transparent 1px), radial-gradient(circle at 70% 40%, rgba(255,255,255,0.12) 1px, transparent 1px), radial-gradient(circle at 30% 10%, rgba(255,255,255,0.08) 1px, transparent 1px); border-radius: 12px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <img src="https://web-nine-fawn-27.vercel.app/images/brand/snowdrift-logo-white.png" alt="Snowdrift" width="100" style="display: block; margin: 0 auto;" />
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 4px; font-size: 15px; color: #ffffff; font-weight: 500;">
                      Snowdrift is a <span style="white-space: nowrap;"><span style="font-weight: 700;">GHOST</span><span style="font-weight: 300;">Signal</span></span> transmission.
                    </p>
                    <p style="margin: 0 0 20px; font-size: 13px; color: rgba(255,255,255,0.7); line-height: 1.6;">
                      Thoughts for a community of world makers. A cultural investigation of the future and what it means for you.
                    </p>
                    <a href="https://snowdriftghostsignal.substack.com/" target="_blank" style="display: inline-block; padding: 12px 24px; background: rgba(255,255,255,0.08); color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);">
                      Subscribe to the Snowdrift Newsletter
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Discover GhostSignal Button -->
          <tr>
            <td align="center" style="padding: 24px 32px;">
              <a href="https://ghostsignal.cloud" target="_blank" style="display: inline-block; padding: 14px 28px; background: #FBAD25; color: #1a1a1a; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px;">
                Discover <span style="white-space: nowrap;"><span style="font-weight: 700;">GHOST</span><span style="font-weight: 300;">Signal</span></span>
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 32px; border-top: 1px solid #e8e8e8;">
              <p style="margin: 0 0 8px; font-size: 12px; color: #888888;">
                Your RQ is a tuning tool — clarity, not a box.
              </p>
              <p style="margin: 0; font-size: 11px; color: #aaaaaa;">
                © ${new Date().getFullYear()} <span style="white-space: nowrap;"><span style="font-weight: 700;">GHOST</span><span style="font-weight: 300;">Signal</span></span> · Values-based partnerships
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

async function sendTestEmail() {
  console.log("Sending test email to:", TEST_EMAIL);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [TEST_EMAIL],
      subject: "Test: Your Resonance Index - Snowdrift Section Preview",
      html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Failed to send email:", detail);
    process.exit(1);
  }

  const result = await response.json();
  console.log("Email sent successfully!", result);
}

sendTestEmail();

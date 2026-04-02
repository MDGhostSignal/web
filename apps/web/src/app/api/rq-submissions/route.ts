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
  const details = (result.details ?? {}) as {
    values?: { letter?: string; score?: number };
    authenticity?: { letter?: string; score?: number };
    horizon?: { letter?: string; score?: number };
  };
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

  // Generate chart image URL
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL || "https://ghostsignal.cloud";

  const chartUrl = `${baseUrl}/api/rq-chart?vl=${details.values?.letter || "F"}&vs=${details.values?.score || 5}&al=${details.authenticity?.letter || "R"}&as=${details.authenticity?.score || 5}&hl=${details.horizon?.letter || "L"}&hs=${details.horizon?.score || 5}`;

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
              <img src="https://web-nine-fawn-27.vercel.app/images/brand/ghostsignal-logo.svg" alt="GhostSignal" width="140" style="display: block; margin: 0 auto 20px;" />
              <h1 style="margin: 0; font-size: 24px; font-weight: 400; color: #1a1a1a; line-height: 1.4;">
                <span style="display: block;">Your <span style="white-space: nowrap;"><span style="font-weight: 700;">GHOST</span><span style="font-weight: 300;">Signal</span></span></span>
                <span style="display: block;">Resonance Quotient</span>
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
                    <!-- RQ Name (now large display) -->
                    <div style="font-size: 28px; font-weight: 700; color: #c4880d; letter-spacing: 0.5px; margin-bottom: 8px; line-height: 1.2;">
                      ${escapeHtml(result.rqName ?? "—")}
                    </div>
                    <!-- RQ Code (now subtitle) -->
                    <div style="font-family: 'SF Mono', 'Fira Code', ui-monospace, monospace; font-size: 15px; font-weight: 500; color: #666666; letter-spacing: 1px; margin-bottom: 20px;">
                      ${escapeHtml(result.rq ?? "—")}
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

          <!-- Signal Profile Chart -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #fafafa; border-radius: 12px; border: 1px solid #e8e8e8;">
                <tr>
                  <td align="center" style="padding: 24px 16px;">
                    <h3 style="margin: 0 0 16px; font-size: 14px; font-weight: 600; color: #1a1a1a; text-transform: uppercase; letter-spacing: 0.5px;">Your Signal Profile</h3>
                    <img src="${chartUrl}" alt="Your RQ Signal Profile" width="300" height="300" style="display: block; margin: 0 auto; border-radius: 8px;" />
                    <p style="margin: 12px 0 0; font-size: 12px; color: #888888;">
                      Distance from center indicates signal strength (1–10)
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- What Does This Mean For You? Section -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h2 style="margin: 0 0 24px; font-size: 20px; font-weight: 600; color: #c4880d; text-align: center;">
                What Does This Mean For You?
              </h2>

              <!-- Axis 1: Values Orientation -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="background: #fafafa; padding: 20px; border-radius: 12px; border: 1px solid #e8e8e8;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                      <tr>
                        <td>
                          <h3 style="margin: 0; font-size: 15px; font-weight: 600; color: #1a1a1a;">Axis 1: Values Orientation</h3>
                        </td>
                        <td align="right">
                          <span style="display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; background: rgba(251, 173, 37, 0.15); color: #c4880d;">
                            You're ${details.values?.letter === "F" ? "an F" : "an I"} (${details.values?.score ?? ""})
                          </span>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 0 0 8px; font-size: 12px; font-family: monospace; color: #888888;">
                      <span style="color: ${details.values?.letter === "F" ? "#c4880d" : "#888888"}; font-weight: ${details.values?.letter === "F" ? "600" : "400"};">Formative</span>
                      ←→
                      <span style="color: ${details.values?.letter === "I" ? "#c4880d" : "#888888"}; font-weight: ${details.values?.letter === "I" ? "600" : "400"};">Implicit</span>
                    </p>
                    <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.6; color: #666666;">
                      This axis reflects how your convictions show up in your work.
                    </p>
                    <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.6; color: #333333; padding: 12px 16px; background: rgba(251, 173, 37, 0.08); border-left: 3px solid #FBAD25; border-radius: 0 8px 8px 0;">
                      ${details.values?.letter === "F"
                        ? "As an <strong style=\"color: #c4880d;\">F (Formative)</strong>, your values are named, declared, and actively shaping your message—what you stand for is part of what you say."
                        : "As an <strong style=\"color: #c4880d;\">I (Implicit)</strong>, your values are lived rather than stated—what you stand for is revealed through tone, choices, and outcomes."}
                    </p>
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #888888; font-style: italic;">
                      Neither is more "true" than the other. This is about where your signal is most naturally expressed: spoken or embodied, explicit or ambient.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Axis 2: Authenticity Expression -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="background: #fafafa; padding: 20px; border-radius: 12px; border: 1px solid #e8e8e8;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                      <tr>
                        <td>
                          <h3 style="margin: 0; font-size: 15px; font-weight: 600; color: #1a1a1a;">Axis 2: Authenticity Expression</h3>
                        </td>
                        <td align="right">
                          <span style="display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; background: rgba(251, 173, 37, 0.15); color: #c4880d;">
                            You're ${details.authenticity?.letter === "R" ? "an R" : "an S"} (${details.authenticity?.score ?? ""})
                          </span>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 0 0 8px; font-size: 12px; font-family: monospace; color: #888888;">
                      <span style="color: ${details.authenticity?.letter === "R" ? "#c4880d" : "#888888"}; font-weight: ${details.authenticity?.letter === "R" ? "600" : "400"};">Relational</span>
                      ←→
                      <span style="color: ${details.authenticity?.letter === "S" ? "#c4880d" : "#888888"}; font-weight: ${details.authenticity?.letter === "S" ? "600" : "400"};">Structural</span>
                    </p>
                    <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.6; color: #666666;">
                      This axis captures how your voice carries trust.
                    </p>
                    <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.6; color: #333333; padding: 12px 16px; background: rgba(251, 173, 37, 0.08); border-left: 3px solid #FBAD25; border-radius: 0 8px 8px 0;">
                      ${details.authenticity?.letter === "R"
                        ? "As an <strong style=\"color: #c4880d;\">R (Relational)</strong>, your authenticity flows through story, personality, and lived experience—people trust you because they feel like they know you."
                        : "As an <strong style=\"color: #c4880d;\">S (Structural)</strong>, your authenticity comes through clarity, consistency, and well-formed ideas—people trust you because your message holds together."}
                    </p>
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #888888; font-style: italic;">
                      This is not a choice between warmth and rigor. It's about whether your signal lands more through connection or construction, presence or precision.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Axis 3: Flourishing Time Horizon -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background: #fafafa; padding: 20px; border-radius: 12px; border: 1px solid #e8e8e8;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                      <tr>
                        <td>
                          <h3 style="margin: 0; font-size: 15px; font-weight: 600; color: #1a1a1a;">Axis 3: Flourishing Time Horizon</h3>
                        </td>
                        <td align="right">
                          <span style="display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; background: rgba(251, 173, 37, 0.15); color: #c4880d;">
                            You're ${details.horizon?.letter === "L" ? "an L" : "a C"} (${details.horizon?.score ?? ""})
                          </span>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 0 0 8px; font-size: 12px; font-family: monospace; color: #888888;">
                      <span style="color: ${details.horizon?.letter === "L" ? "#c4880d" : "#888888"}; font-weight: ${details.horizon?.letter === "L" ? "600" : "400"};">Long-Arc</span>
                      ←→
                      <span style="color: ${details.horizon?.letter === "C" ? "#c4880d" : "#888888"}; font-weight: ${details.horizon?.letter === "C" ? "600" : "400"};">Catalytic</span>
                    </p>
                    <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.6; color: #666666;">
                      This axis reveals how you think about growth, impact, and partnership over time.
                    </p>
                    <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.6; color: #333333; padding: 12px 16px; background: rgba(251, 173, 37, 0.08); border-left: 3px solid #FBAD25; border-radius: 0 8px 8px 0;">
                      ${details.horizon?.letter === "L"
                        ? "As an <strong style=\"color: #c4880d;\">L (Long-Arc)</strong>, you prioritize depth, durability, and relationships that compound slowly—trust is built and protected over time."
                        : "As a <strong style=\"color: #c4880d;\">C (Catalytic)</strong>, you value momentum, activation, and timely impact—energy is directed toward movement and measurable lift."}
                    </p>
                    <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #888888; font-style: italic;">
                      Both create real value. This axis simply shows whether your signal is oriented toward endurance or ignition, formation or acceleration.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- What Do Your Numbers Mean? -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; border-top: 1px solid #e8e8e8; padding-top: 24px;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #1a1a1a;">What Do Your Numbers Mean?</h3>
                    <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #666666;">
                      Each letter in your RQ is paired with a number from 1 to 10. This number reflects how strongly that signal shows up in you.
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding: 12px 16px; background: rgba(100, 180, 255, 0.08); border-radius: 0 8px 8px 0; border-left: 4px solid #5eb5ff;">
                          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #333333;">
                            <span style="color: #3b9eff; font-weight: 600;">Lower numbers (1–3)</span> indicate an <span style="color: #3b9eff; font-weight: 600;">ambient signal</span>—present, but flexible. You likely have range here and can move across the spectrum without much friction.
                          </p>
                        </td>
                      </tr>
                      <tr><td style="height: 8px;"></td></tr>
                      <tr>
                        <td style="padding: 12px 16px; background: rgba(251, 173, 37, 0.08); border-radius: 0 8px 8px 0; border-left: 4px solid #fbad25;">
                          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #333333;">
                            <span style="color: #e09800; font-weight: 600;">Middle numbers (4–6)</span> suggest a <span style="color: #e09800; font-weight: 600;">balanced signal</span>—you have a clear leaning, but with openness. You can adapt without losing yourself.
                          </p>
                        </td>
                      </tr>
                      <tr><td style="height: 8px;"></td></tr>
                      <tr>
                        <td style="padding: 12px 16px; background: rgba(80, 220, 130, 0.08); border-radius: 0 8px 8px 0; border-left: 4px solid #4ade80;">
                          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #333333;">
                            <span style="color: #22c55e; font-weight: 600;">Higher numbers (7–10)</span> indicate an <span style="color: #22c55e; font-weight: 600;">emphatic signal</span>—this is a defining part of how you operate. Alignment here matters more, and mismatches are easier to feel.
                          </p>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 16px 0 0; font-size: 13px; line-height: 1.5; color: #888888; font-style: italic;">
                      This isn't about better or worse. It's about clarity and intensity—how loudly or quietly each part of your signal comes through, and how important it is that others meet you there.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Your Call Sign -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top: 1px solid #e8e8e8; padding-top: 24px;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #c4880d;">Your Call Sign: ${escapeHtml(result.rqName ?? "—")}</h3>
                    <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.6; color: #666666;">
                      The three-word name underneath your RQ score is shorthand for your signal.
                    </p>
                    <p style="margin: 0 0 12px; font-size: 14px; line-height: 1.6; color: #333333;">
                      Each word corresponds to one axis of the Resonance Index—Values, Authenticity, and Time Horizon—and reflects both your direction and your strength on that axis. Taken together, they form your "call sign": a quick, intuitive way to understand how you interact in partnerships, how you communicate, and how you build.
                    </p>
                    <p style="margin: 16px 0 0; padding-top: 16px; border-top: 1px solid #e8e8e8; font-size: 15px; line-height: 1.6; color: #666666; font-style: italic; text-align: center;">
                      (It's not a label to live inside, but a way to recognize yourself—and to help others recognize you—at a glance.)
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
                      The <span style="white-space: nowrap;"><span style="font-weight: 700;">GHOST</span><span style="font-weight: 300;">Signal</span></span> Resonance Quotient is a framework for understanding how you signal values, build trust, and approach partnerships—helping match creators and brands who share aligned visions for world-making.
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
                            Read the <span style="white-space: nowrap;"><span style="font-weight: 700;">GHOST</span><span style="font-weight: 300;">Signal</span></span> White Paper →
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
                      Ready to put your RQ to work?<br />
                      Let's talk about partnership opportunities.
                    </p>
                    <a href="mailto:mike@ghostsignal.cloud" style="font-size: 14px; color: #c4880d; text-decoration: none; font-weight: 500;">
                      mike@ghostsignal.cloud
                    </a>
                    <div style="margin-top: 16px;">
                      <img src="https://web-nine-fawn-27.vercel.app/images/brand/GS-EmailSignatures-mikew.gif" alt="Mike" width="320" style="display: block; margin: 0 auto; border-radius: 8px;" />
                    </div>
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
                    <p style="margin: 0 0 4px; font-size: 14px; color: #333333; font-weight: 400;">
                      Snowdrift is a <span style="white-space: nowrap;"><span style="font-weight: 700;">GHOST</span><span style="font-weight: 300;">Signal</span></span> transmission.
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
                      Discover <span style="white-space: nowrap;"><span style="font-weight: 700;">GHOST</span><span style="font-weight: 300;">Signal</span></span>
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
  `.trim();

  // Build personalized axis descriptions for plain text
  const valuesPersonal = details.values?.letter === "F"
    ? "As an F (Formative), your values are named, declared, and actively shaping your message—what you stand for is part of what you say."
    : "As an I (Implicit), your values are lived rather than stated—what you stand for is revealed through tone, choices, and outcomes.";

  const authenticityPersonal = details.authenticity?.letter === "R"
    ? "As an R (Relational), your authenticity flows through story, personality, and lived experience—people trust you because they feel like they know you."
    : "As an S (Structural), your authenticity comes through clarity, consistency, and well-formed ideas—people trust you because your message holds together.";

  const horizonPersonal = details.horizon?.letter === "L"
    ? "As an L (Long-Arc), you prioritize depth, durability, and relationships that compound slowly—trust is built and protected over time."
    : "As a C (Catalytic), you value momentum, activation, and timely impact—energy is directed toward movement and measurable lift.";

  const text = [
    "Your GHOSTSignal",
    "Resonance Quotient",
    "",
    `Hello ${fullName}, here's your RQ summary.`,
    "",
    "═══════════════════════════════════",
    "",
    `${result.rqName ?? "—"}`,
    `${result.rq ?? "—"}`,
    "",
    `Signal Clarity: ${clarity.label ?? "—"}`,
    clarity.note ? `  ${clarity.note}` : "",
    "",
    "═══════════════════════════════════",
    "",
    "WHAT DOES THIS MEAN FOR YOU?",
    "",
    "───────────────────────────────────",
    "",
    `AXIS 1: VALUES ORIENTATION — You're ${details.values?.letter === "F" ? "an F" : "an I"} (${details.values?.score ?? ""})`,
    `Formative ←→ Implicit`,
    "",
    "This axis reflects how your convictions show up in your work.",
    "",
    valuesPersonal,
    "",
    'Neither is more "true" than the other. This is about where your signal is most naturally expressed: spoken or embodied, explicit or ambient.',
    "",
    "───────────────────────────────────",
    "",
    `AXIS 2: AUTHENTICITY EXPRESSION — You're ${details.authenticity?.letter === "R" ? "an R" : "an S"} (${details.authenticity?.score ?? ""})`,
    `Relational ←→ Structural`,
    "",
    "This axis captures how your voice carries trust.",
    "",
    authenticityPersonal,
    "",
    "This is not a choice between warmth and rigor. It's about whether your signal lands more through connection or construction, presence or precision.",
    "",
    "───────────────────────────────────",
    "",
    `AXIS 3: FLOURISHING TIME HORIZON — You're ${details.horizon?.letter === "L" ? "an L" : "a C"} (${details.horizon?.score ?? ""})`,
    `Long-Arc ←→ Catalytic`,
    "",
    "This axis reveals how you think about growth, impact, and partnership over time.",
    "",
    horizonPersonal,
    "",
    "Both create real value. This axis simply shows whether your signal is oriented toward endurance or ignition, formation or acceleration.",
    "",
    "═══════════════════════════════════",
    "",
    "WHAT DO YOUR NUMBERS MEAN?",
    "",
    "Each letter in your RQ is paired with a number from 1 to 10.",
    "This number reflects how strongly that signal shows up in you.",
    "",
    "• Lower numbers (1–3): Ambient signal—present, but flexible.",
    "  You likely have range here and can move across the spectrum without much friction.",
    "",
    "• Middle numbers (4–6): Balanced signal—you have a clear leaning, but with openness.",
    "  You can adapt without losing yourself.",
    "",
    "• Higher numbers (7–10): Emphatic signal—this is a defining part of how you operate.",
    "  Alignment here matters more, and mismatches are easier to feel.",
    "",
    "This isn't about better or worse. It's about clarity and intensity—how loudly or",
    "quietly each part of your signal comes through, and how important it is that others meet you there.",
    "",
    "═══════════════════════════════════",
    "",
    `YOUR CALL SIGN: ${result.rqName ?? "—"}`,
    "",
    "The three-word name underneath your RQ score is shorthand for your signal.",
    "",
    "Each word corresponds to one axis of the Resonance Index—Values, Authenticity,",
    "and Time Horizon—and reflects both your direction and your strength on that axis.",
    "Taken together, they form your \"call sign\": a quick, intuitive way to understand",
    "how you interact in partnerships, how you communicate, and how you build.",
    "",
    "───────────────────────────────────",
    "",
    "(It's not a label to live inside, but a way to recognize yourself—and to help",
    "others recognize you—at a glance.)",
    "",
    "═══════════════════════════════════",
    "",
    "SNOWDRIFT",
    "",
    "Snowdrift is a GHOSTSignal transmission. Thoughts for a community of world makers.",
    "A cultural investigation of the future and what it means for you.",
    "",
    "→ Subscribe to the Snowdrift Newsletter: https://snowdriftghostsignal.substack.com/",
    "",
    "→ Discover GHOSTSignal: https://ghostsignal.cloud",
    "",
    "═══════════════════════════════════",
    "",
    "Your RQ is a tuning tool — clarity, not a box.",
    "",
    `© ${new Date().getFullYear()} GHOSTSignal · Values-based partnerships`,
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
    console.error("Attempted to send to:", userEmail);
    console.error("From address:", resendFrom);
    console.error("Note: If using onboarding@resend.dev, you can only send to verified emails on your Resend account.");
    return { attempted: true, sent: false, reason: detail };
  }

  console.log("User summary email sent successfully to:", userEmail);
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
    "New GHOSTSignal RQ submission",
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
    <h2>New <span style="white-space: nowrap;"><span style="font-weight: 700;">GHOST</span><span style="font-weight: 300;">Signal</span></span> RQ submission</h2>
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
    subject: `New GHOSTSignal RQ: ${result.rq ?? "Submission"} - ${fullName || basics.org || "Unknown"}`,
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

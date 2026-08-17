/**
 * Cold-outreach email — shared template (brand prospecting).
 *
 * Single source of truth for Mike's cold reachout email so the send
 * route (/api/admin/outreach) and the preview endpoint
 * (/api/admin/outreach/preview) can never drift apart — same pattern
 * as lib/studio-invite-email.ts. Pure string building — safe to import
 * from client components (the composer prefills the default message).
 *
 * Section order — mirrors the /invitation page (2026-08-17 redesign):
 *   1. spinning cloud glyph + wordmark, then the invitation headline
 *      broken over two lines ("You're invited / to GHOSTSignal!")
 *   2. personal message ("Hello {name}," — or just "Hello," when no
 *      name is known; composer text falls back to the standard
 *      default below)
 *   3. values-based intro panel — the hero subheadline ("what is this")
 *   4. "Here are some of our current world-makers" — client card fan
 *   5. "How we do it" — the three value-props
 *   6. pull-quote bridging into the co-founders
 *   7. the four co-founders — faces + names link to their LinkedIn
 *      (photos + data mirrored from who-are-we/FoundersSection.tsx)
 *   8. CTA, then the Snowdrift newsletter ad (same starry card as the
 *      studio invite email), then the footer
 *
 * THEMES: the template renders in "light" (default, what sends use)
 * or "dark" — both derived from studio-tokens.css as email-safe hex
 * literals. The composer preview offers a toggle; recipients' clients
 * may also auto-darken the light version on their own.
 *
 * HOSTED ASSETS (generated, committed under public/images/email/):
 *   logo-spin.gif / logo-spin-dark.gif — spinning cloud glyph with
 *     the flat background remapped to the card surface per theme
 *   outreach-roster.gif / outreach-roster-dark.gif — card fan.
 *     ROSTER IS A MOCK-UP (fictional clients + personas) until real
 *     members are on the platform. Regenerate via the session
 *     scratchpad gen-assets script or any equivalent.
 *   founder-*.jpg — square sharp attention-crops of the who-are-we
 *     portraits (originals are 550×800)
 */

const PROD_ORIGIN = "https://www.ghostsignal.cloud";
const ADVERTISERS_PATH = "/for-advertisers";
const SNOWDRIFT_URL = "https://snowdriftghostsignal.substack.com/";

export type OutreachTheme = "light" | "dark";

/** Email-safe palettes mirroring studio-tokens.css light/dark. */
const THEMES = {
  light: {
    pageBg: "#fafbff",
    card: "#ffffff",
    cardBorder: "#e6e8ee",
    cardShadow: "0 24px 60px -28px rgba(15, 23, 42, 0.15)",
    textPrimary: "#0e1119",
    textSecondary: "#5a5e66",
    textMuted: "#6a727b",
    accent: "#7c58d6",
    btnBg: "#7c58d6",
    btnBorder: "#6a45c7",
    btnText: "#ffffff",
    panelBg: "#f6f3fc",
    panelBorder: "#eae3f8",
    logoSpin: "/images/email/logo-spin.gif",
    rosterGif: "/images/email/outreach-roster.gif",
  },
  dark: {
    pageBg: "#0f1219",
    card: "#161a23",
    cardBorder: "#2a3142",
    cardShadow: "0 24px 60px -28px rgba(0, 0, 0, 0.55)",
    textPrimary: "#f1f3f8",
    textSecondary: "#adb3c0",
    textMuted: "#7a8094",
    accent: "#9b7ee6",
    btnBg: "#9b7ee6",
    btnBorder: "#b09cf0",
    btnText: "#0e1119",
    panelBg: "#2b2a42",
    panelBorder: "#3a3560",
    logoSpin: "/images/email/logo-spin-dark.gif",
    rosterGif: "/images/email/outreach-roster-dark.gif",
  },
} as const;

/** The four co-founders — names/roles mirrored from the who-are-we
 *  page (FoundersSection.tsx); update alongside the site. */
const FOUNDERS = [
  { name: "Mike Sense", role: "Vision & Partnerships", img: "/images/email/founder-mike6.jpg", linkedin: "https://www.linkedin.com/in/mike-sense/" },
  { name: "Jack W Harding", role: "Cultural & Business Strategist", img: "/images/email/founder-jack11.jpg", linkedin: "https://www.linkedin.com/in/jackwharding" },
  { name: "Martin Drexler", role: "Design", img: "/images/email/founder-martin3.jpg", linkedin: "https://www.linkedin.com/in/whoismartindrexler/" },
  { name: "Jeremy Reeves", role: "Creative Strategist", img: "/images/email/founder-jeremy4.jpg", linkedin: "https://www.linkedin.com/in/jeremy-reeves-5365b036a/" },
] as const;

/** The values-based intro — shown in the entrance panel (mirrors the
 *  /invitation hero subheadline). */
const WHAT_IS_THIS =
  "GHOSTSignal is the values-based podcast advertising network. We create " +
  "partnerships that feel good, because they are good. When brands' and " +
  "creators' are values-aligned, advertising contributes to the world we " +
  "all want to make.";

/** The pull-quote above the card rotation. */
const QUOTE = "We help brands zoom in on the right people.";

/** "How we do it" — the three value-props from the /invitation page. */
const VALUE_PROPS = [
  {
    title: "Highly-attuned audiences",
    body: "We place you in front of considered communities where alignment runs deep — listeners who already share your values.",
  },
  {
    title: "Zero admin overhead",
    body: "Contracts, ad creation, transparent reporting — handled under one membership, without individual podcaster deals.",
  },
  {
    title: "Real conversion",
    body: "Audiences who are aligned and feel seen are far more likely to become customers. Resonance beats reach.",
  },
] as const;

/** Standard personal message used when the composer form is left
 *  blank. Prefilled in the form so the team can edit it per-send. */
export function defaultOutreachMessage(): string {
  return (
    "We came across your brand and a few shows on our network came to " +
    "mind right away. We'd love to show you around — no pitch deck, " +
    "just a look at how podcast partnerships work when the audience " +
    "already fits."
  );
}

/** No name known → the plain formal greeting, no filler word. */
function greeting(name: string): string {
  return name ? `Hello ${name},` : "Hello,";
}

export function coldOutreachSubject(name: string): string {
  // Plain and descriptive on purpose — "not overly eager" (Mike).
  const base = "your brand on the right podcasts";
  return name ? `${name} — ${base}` : `Your brand on the right podcasts`;
}

export function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Plain text → email-safe HTML: escaped, line breaks preserved. */
function textToHtml(s: string): string {
  return escapeHtml(s).replaceAll("\n", "<br>");
}

/** textToHtml + the GHOSTSignal wordmark styled bold/light wherever it
 *  appears, so the pitch constants stay plain text. */
function pitchToHtml(s: string, color: string): string {
  return textToHtml(s).replaceAll(
    "GHOSTSignal",
    `<span style="white-space: nowrap;"><strong style="color: ${color};">GHOST</strong><span style="font-weight: 300; color: ${color};">Signal</span></span>`,
  );
}

/** Plain-text part sent alongside the HTML (better spam scoring). */
export function coldOutreachEmailText({
  name,
  message,
}: {
  name: string;
  message: string;
}): string {
  const body = message.trim() || defaultOutreachMessage();
  const founders = FOUNDERS.map(
    (f) => `- ${f.name}, ${f.role} — ${f.linkedin}`,
  ).join("\n");
  const valueProps = VALUE_PROPS.map(
    (v) => `- ${v.title}: ${v.body}`,
  ).join("\n");
  return `You're invited to GHOSTSignal!

${greeting(name)}

${body}

${WHAT_IS_THIS}

Here are some of our current world-makers
Brands and creators across the network, matched where the audience already fits. See the roster and how membership works: ${PROD_ORIGIN}${ADVERTISERS_PATH}

How we do it
${valueProps}

"${QUOTE}"

The co-founders
${founders}

Snowdrift is a GHOSTSignal transmission — thoughts for a community of world makers. Subscribe: ${SNOWDRIFT_URL}

- The GHOSTSignal team
We reached out because we think your brand fits podcasts on our network. Not relevant? You can simply ignore this email.`;
}

export function coldOutreachEmailHtml({
  name,
  message,
  assetOrigin = PROD_ORIGIN,
  theme = "light",
}: {
  /** Contact's first name — may be empty (greeting becomes "Hello,"). */
  name: string;
  /** Mike's personal message — falls back to defaultOutreachMessage(). */
  message: string;
  /** Origin for hosted images. The preview route passes the request
   *  origin so local previews resolve; real sends use production. */
  assetOrigin?: string;
  /** Visual theme. Sends default to light; the composer preview can
   *  render either. */
  theme?: OutreachTheme;
}): string {
  const t = THEMES[theme];
  const hello = name ? `Hello ${escapeHtml(name)},` : "Hello,";
  const body = textToHtml(message.trim() || defaultOutreachMessage());
  const wordmark = `<span style="white-space: nowrap;"><span style="font-weight: 800;">GHOST</span><span style="font-weight: 300;">Signal</span></span>`;
  const morse = (width: string) =>
    `<div style="height: 3px; width: ${width}; border-radius: 2px; background-color: ${t.accent}; background-image: repeating-linear-gradient(90deg, ${t.accent} 0 5px, ${t.card} 5px 13px, ${t.accent} 13px 33px, ${t.card} 33px 41px, ${t.accent} 41px 46px, ${t.card} 46px 58px);"></div>`;

  return `<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background-color: ${t.pageBg}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${t.pageBg}" style="background-color: ${t.pageBg};">
    <tr>
      <td align="center" style="padding: 44px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${t.card}" style="max-width: 584px; background-color: ${t.card}; border: 1px solid ${t.cardBorder}; border-radius: 18px; box-shadow: ${t.cardShadow};">

          <!-- Entrance: spinning cloud glyph + wordmark, centered -->
          <tr>
            <td align="center" style="padding: 34px 40px 0;">
              <img src="${assetOrigin}${t.logoSpin}" alt="GHOSTSignal" width="96" height="96" style="display: block; width: 96px; height: 96px;">
              <p style="margin: 8px 0 0; font-size: 21px; letter-spacing: -0.02em; color: ${t.textPrimary};">${wordmark}</p>
            </td>
          </tr>

          <!-- Morse accent divider — short and centered under the lockup -->
          <tr>
            <td align="center" style="padding: 22px 40px 0;">
              ${morse("220px")}
            </td>
          </tr>

          <!-- 1 · Invitation headline, broken over two lines -->
          <tr>
            <td align="center" style="padding: 28px 40px 0;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.01em; color: ${t.textPrimary}; line-height: 1.3;">You&rsquo;re invited<br>to ${wordmark}!</h1>
            </td>
          </tr>

          <!-- 2 · Personal message (the heart — open, letter-style) -->
          <tr>
            <td style="padding: 28px 40px 0;">
              <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 700; letter-spacing: -0.01em; color: ${t.textPrimary}; line-height: 1.3;">${hello}</h2>
              <p style="margin: 0; font-size: 15px; color: ${t.textSecondary}; line-height: 1.75;">
                ${body}
              </p>
            </td>
          </tr>

          <!-- 3 · What GHOSTSignal is — values-based intro panel -->
          <tr>
            <td style="padding: 30px 40px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${t.panelBg}" style="background-color: ${t.panelBg}; border: 1px solid ${t.panelBorder}; border-radius: 14px;">
                <tr>
                  <td align="left" style="padding: 18px 24px;">
                    <p style="margin: 0; font-size: 14px; color: ${t.textSecondary}; line-height: 1.75; text-align: left;">
                      ${pitchToHtml(WHAT_IS_THIS, t.textPrimary)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 4 · Here are some of our current world-makers — card fan -->
          <tr>
            <td align="center" style="padding: 26px 40px 0;">
              <p style="margin: 0 0 14px; font-size: 11px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: ${t.accent};">Here are some of our current world-makers</p>
              <!-- All five cards, full content width, no controls —
                   mirrors the invitation carousel's five-up view. -->
              <img src="${assetOrigin}${t.rosterGif}" alt="Brand and creator cards from the GHOSTSignal client roster" width="520" style="display: block; width: 100%; max-width: 520px; height: auto; margin: 0 auto;">
              <p style="margin: 12px 0 0; font-size: 12px; color: ${t.textMuted}; line-height: 1.6;">
                Brands in blue, creators in ember &mdash; a card for every client on the network.
              </p>
            </td>
          </tr>

          <!-- 5 · How we do it — the three value-props -->
          <tr>
            <td style="padding: 30px 40px 0;">
              <p style="margin: 0 0 14px; font-size: 11px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: ${t.accent}; text-align: center;">How we do it</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
${VALUE_PROPS.map(
  (v) => `                <tr>
                  <td style="padding: 8px 0;">
                    <p style="margin: 0 0 3px; font-size: 14px; font-weight: 700; color: ${t.textPrimary};">${escapeHtml(v.title)}</p>
                    <p style="margin: 0; font-size: 13px; color: ${t.textSecondary}; line-height: 1.6;">${escapeHtml(v.body)}</p>
                  </td>
                </tr>`,
).join("\n")}
              </table>
            </td>
          </tr>

          <!-- Pull-quote — bridges into the co-founders -->
          <tr>
            <td align="center" style="padding: 32px 56px 0;">
              <div style="margin: 0 auto 14px; width: 58px;">${morse("58px")}</div>
              <p style="margin: 0; font-size: 19px; font-weight: 600; letter-spacing: -0.01em; color: ${t.textPrimary}; line-height: 1.5;">&ldquo;${escapeHtml(QUOTE).replace("right people", "right&nbsp;people")}&rdquo;</p>
            </td>
          </tr>

          <!-- 6 · The co-founders — faces + names link to LinkedIn -->
          <tr>
            <td align="center" style="padding: 32px 40px 0;">
              <p style="margin: 0 0 16px; font-size: 11px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: ${t.accent};">The co-founders</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
${FOUNDERS.map(
  (f) => `                  <td width="25%" align="center" valign="top" style="padding: 0 6px;">
                    <a href="${f.linkedin}" target="_blank" style="text-decoration: none;">
                      <img src="${assetOrigin}${f.img}" alt="${escapeHtml(f.name)} on LinkedIn" width="76" height="76" style="display: block; margin: 0 auto; width: 76px; height: 76px; border-radius: 20px; border: 0;">
                      <p style="margin: 10px 0 0; font-size: 12.5px; font-weight: 700; color: ${t.textPrimary}; line-height: 1.3;">${escapeHtml(f.name)}</p>
                    </a>
                    <p style="margin: 3px 0 0; font-size: 11px; color: ${t.textMuted}; line-height: 1.45;">${escapeHtml(f.role)}</p>
                  </td>`,
).join("\n")}
                </tr>
              </table>
            </td>
          </tr>

          <!-- 8 · Discover your character — the XQ tile (free hook) -->
          <tr>
            <td style="padding: 32px 40px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="${t.panelBg}" style="background-color: ${t.panelBg}; border: 1px solid ${t.panelBorder}; border-radius: 14px;">
                <tr>
                  <td align="center" style="padding: 26px 26px 28px;">
                    <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: ${t.accent};">XQ &middot; Conviction Quotient</p>
                    <p style="margin: 0 0 8px; font-size: 20px; font-weight: 700; letter-spacing: -0.01em; color: ${t.textPrimary}; line-height: 1.3;">Discover your character</p>
                    <p style="margin: 0 0 18px; font-size: 14px; color: ${t.textSecondary}; line-height: 1.7;">The XQ helps you discover and codify your values across eight archetypes, so you know the character behind your work. Free to take.</p>
                    <table role="presentation" cellspacing="0" cellpadding="0" align="center">
                      <tr>
                        <td bgcolor="#fbad25" style="background-color: #fbad25; border-radius: 10px;">
                          <a href="${PROD_ORIGIN}/xq-quiz?start=1" target="_blank" style="display: inline-block; padding: 13px 28px; font-size: 14px; font-weight: 700; color: #1a1a1a; text-decoration: none;">Take the XQ &mdash; it&rsquo;s free</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Snowdrift ad — starry card, same unit as the studio
               invite email. Dark by design, so it works in both themes. -->
          <tr>
            <td style="padding: 28px 40px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#0a0a0d" style="background-color: #0a0a0d; background-image: radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 1px, transparent 1px), radial-gradient(circle at 60% 70%, rgba(255,255,255,0.1) 1px, transparent 1px), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.12) 1px, transparent 1px), radial-gradient(circle at 40% 80%, rgba(255,255,255,0.08) 1px, transparent 1px), radial-gradient(circle at 90% 50%, rgba(255,255,255,0.15) 1px, transparent 1px), radial-gradient(circle at 10% 60%, rgba(255,255,255,0.1) 1px, transparent 1px); border-radius: 10px;">
                <tr>
                  <td align="center" style="padding: 20px 24px 22px;">
                    <img src="${assetOrigin}/images/brand/snowdrift-logo-white.png" alt="Snowdrift" width="80" style="display: block; margin: 0 auto 10px;">
                    <p style="margin: 0 0 12px; font-size: 12px; color: rgba(255,255,255,0.7); line-height: 1.6;">
                      Snowdrift is a <span style="white-space: nowrap;"><span style="font-weight: 700; color: #ffffff;">GHOST</span><span style="font-weight: 300; color: #ffffff;">Signal</span></span> transmission &mdash; thoughts for a community of world makers.
                    </p>
                    <a href="${SNOWDRIFT_URL}" target="_blank" style="display: inline-block; padding: 9px 18px; background: rgba(255,255,255,0.08); color: #ffffff; font-size: 12px; font-weight: 600; text-decoration: none; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);">
                      Subscribe to the Snowdrift Newsletter
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 28px 40px 30px;">
              <div style="border-top: 1px solid ${t.cardBorder};"></div>
              <p style="margin: 20px 0 0; font-size: 12px; color: ${t.textMuted}; line-height: 1.7;">
                &mdash; The ${wordmark} team<br>
                We reached out because we think your brand fits podcasts on our network. Not relevant? You can simply ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

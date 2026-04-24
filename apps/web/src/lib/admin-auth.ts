/**
 * Admin auth helpers — a minimal shared-password gate for all internal
 * tooling at /admin, /rq-dashboard, /design-tasks.
 *
 * Design:
 *  - A single `ADMIN_PASSWORD` env var is the source of truth.
 *  - On success we issue an `admin_auth` cookie whose value is an
 *    HMAC-SHA256 signature of a constant payload, using
 *    `ADMIN_AUTH_SECRET` (falls back to `ADMIN_PASSWORD`). The cookie
 *    can't be forged without the server's secret.
 *  - Uses Web Crypto (`crypto.subtle`) rather than `node:crypto` so
 *    the same module works in Next.js middleware (Edge runtime) AND
 *    in API route handlers (Node runtime).
 *  - No DB round-trip per request — verification is pure HMAC on the
 *    cookie value.
 *
 * Intentionally simple. When the team grows past "share a password in
 * 1Password" this can be swapped for Supabase Auth / magic-link flow
 * without touching admin-route UI.
 */

export const ADMIN_COOKIE_NAME = "admin_auth";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const COOKIE_VERSION = "v1";
const COOKIE_PAYLOAD = "admin";

function getSecret(): string {
  const secret = process.env.ADMIN_AUTH_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error(
      "ADMIN_PASSWORD (or ADMIN_AUTH_SECRET) must be set to gate admin routes.",
    );
  }
  return secret;
}

// --- Hex helpers (avoid Buffer in Edge) --------------------------------

function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let hex = "";
  for (let i = 0; i < view.length; i++) {
    hex += view[i].toString(16).padStart(2, "0");
  }
  return hex;
}

// --- HMAC signing via Web Crypto --------------------------------------

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return bytesToHex(sig);
}

/**
 * Returns the signed cookie value. Format: `v1.<hex-signature>`.
 */
export async function issueAdminCookie(): Promise<string> {
  const sig = await hmacSha256Hex(getSecret(), COOKIE_PAYLOAD);
  return `${COOKIE_VERSION}.${sig}`;
}

/**
 * Constant-time string compare — avoids leaking per-character timing
 * info to a probing attacker.
 */
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Returns true if the cookie value matches the expected signature.
 */
export async function verifyAdminCookie(
  value: string | null | undefined,
): Promise<boolean> {
  if (!value) return false;
  const [version, sig] = value.split(".");
  if (version !== COOKIE_VERSION || !sig) return false;

  let expected: string;
  try {
    expected = await hmacSha256Hex(getSecret(), COOKIE_PAYLOAD);
  } catch {
    return false;
  }
  return timingSafeEqualStr(sig, expected);
}

/**
 * Constant-time compare for the submitted password against
 * `ADMIN_PASSWORD`.
 */
export function verifyAdminPassword(submitted: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return timingSafeEqualStr(submitted, expected);
}

/**
 * Shared cookie options for Set-Cookie / clearing.
 */
export function adminCookieOptions() {
  return {
    name: ADMIN_COOKIE_NAME,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  };
}

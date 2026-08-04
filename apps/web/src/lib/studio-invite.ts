import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed Studio invite tokens (invite-only era, 2026-08-04).
 *
 * While STUDIO_INVITE_ONLY is on, /studio/register is closed to the
 * public — the only way in is the link in the team's invite email,
 * which carries one of these tokens. The token is an HMAC-signed
 * snapshot of what the team entered in the CRM invite form (contact
 * person, brand-or-creator, org/show name), so the register page can
 * prefill and lock those fields without any extra DB round-trip or
 * schema change.
 *
 * Format: base64url(JSON payload) + "." + base64url(HMAC-SHA256).
 * Server-only (node:crypto) — never import from client components;
 * the secret must not reach the browser.
 */
export type StudioInvite = {
  email: string;
  firstName: string;
  lastName: string;
  kind: "brand" | "creator";
  orgName: string;
  /** Issued-at, unix seconds. */
  iat: number;
};

/** Invite links die after 30 days — long enough for a slow inbox,
 *  short enough that a leaked old email isn't a forever-key. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function secret(): string {
  const s =
    process.env.STUDIO_INVITE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) {
    throw new Error(
      "Studio invite tokens need STUDIO_INVITE_SECRET or SUPABASE_SERVICE_ROLE_KEY in the environment.",
    );
  }
  return s;
}

function hmac(payload: string): Buffer {
  return createHmac("sha256", secret()).update(payload).digest();
}

export function signStudioInvite(
  invite: Omit<StudioInvite, "iat">,
): string {
  const payload = Buffer.from(
    JSON.stringify({ ...invite, iat: Math.floor(Date.now() / 1000) }),
  ).toString("base64url");
  return `${payload}.${hmac(payload).toString("base64url")}`;
}

/** Returns the invite payload, or null for anything malformed,
 *  tampered with, or older than 30 days. */
export function verifyStudioInvite(token: string): StudioInvite | null {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = Buffer.from(token.slice(dot + 1), "base64url");
  const expected = hmac(payload);
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) {
    return null;
  }
  let data: StudioInvite;
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (
    typeof data.email !== "string" ||
    !data.email ||
    (data.kind !== "brand" && data.kind !== "creator") ||
    typeof data.iat !== "number"
  ) {
    return null;
  }
  if (Date.now() / 1000 - data.iat > MAX_AGE_SECONDS) return null;
  return {
    email: data.email,
    firstName: typeof data.firstName === "string" ? data.firstName : "",
    lastName: typeof data.lastName === "string" ? data.lastName : "",
    kind: data.kind,
    orgName: typeof data.orgName === "string" ? data.orgName : "",
    iat: data.iat,
  };
}

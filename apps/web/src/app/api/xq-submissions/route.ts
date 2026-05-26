import { NextResponse } from "next/server";

import { findMembersByEmail } from "@/lib/members";
import { supabaseRest } from "@/lib/supabase-admin";

import {
  sendLeadNotificationEmail,
  sendNotificationEmail,
  sendUserSummaryEmail,
} from "./emails";
import type { XQSubmissionPayload, XQSubmissionStatus } from "./types";

const TABLE_NAME = process.env.XQ_SUBMISSIONS_TABLE ?? "xq_submissions";
const EMAIL_TO = process.env.XQ_NOTIFY_TO ?? "hello@ghostsignal.cloud";

/**
 * Best-effort link of a freshly-stored XQ submission back to a matching
 * Member row by email. Sets `members.xq_submission_id` only when there's
 * exactly one email match — ambiguous cases (>1 match) are skipped to
 * avoid mis-linking PII. Silent on failure: the user's quiz submission
 * is still complete + the dossier email still sends; the link can be
 * fixed manually later via the admin.
 */
async function linkSubmissionToMember(
  submissionId: string,
  email: string | null | undefined,
): Promise<void> {
  if (!submissionId || !email || !email.includes("@")) return;
  try {
    const matches = await findMembersByEmail(email);
    if (matches.length !== 1) return;
    const memberId = matches[0].id;
    await supabaseRest(`members?id=eq.${encodeURIComponent(memberId)}`, {
      method: "PATCH",
      body: JSON.stringify({ xq_submission_id: submissionId }),
      prefer: "return=minimal",
    });
  } catch (err) {
    console.warn("XQ → member link skipped:", err);
  }
}

/* ---------------- CORS helpers (mirror RQ) ----------------------- */

function getCorsHeaders(origin: string | null) {
  const allowOrigin = process.env.XQ_ALLOWED_ORIGINS?.trim();
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
    .map((v) => v.trim())
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
  return new NextResponse(JSON.stringify(data), { ...init, headers });
}

/* ---------------- Validation ------------------------------------- */

function hasBasics(payload: XQSubmissionPayload) {
  return Boolean(
    payload?.basics?.first &&
      payload?.basics?.last &&
      payload?.basics?.email &&
      payload?.basics?.org &&
      payload?.basics?.type,
  );
}

function isValidCompletePayload(payload: XQSubmissionPayload) {
  return (
    hasBasics(payload) &&
    Boolean(
      payload?.result?.code &&
        payload?.result?.archetypeName &&
        payload?.answers,
    )
  );
}

function resolveStatus(payload: XQSubmissionPayload): XQSubmissionStatus {
  return payload.status === "incomplete" ? "incomplete" : "complete";
}

/* ---------------- OPTIONS / GET ---------------------------------- */

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request.headers.get("origin")),
  });
}

/**
 * Tiny health/config check (mirrors RQ's GET). Useful for quick smoke
 * tests during integration.
 */
export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const supabaseConfigured = Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const resendConfigured = Boolean(
    process.env.RESEND_API_KEY && process.env.RESEND_FROM,
  );
  return json(
    {
      ok: true,
      configured: supabaseConfigured,
      table: TABLE_NAME,
      emailConfigured: resendConfigured,
      emailTo: EMAIL_TO,
      message: supabaseConfigured
        ? "Supabase connection is working for XQ submissions."
        : "Supabase env vars are not set.",
    },
    { status: 200 },
    origin,
  );
}

/* ---------------- POST: submit ----------------------------------- */

export async function POST(request: Request) {
  const origin = request.headers.get("origin");

  let payload: XQSubmissionPayload;
  try {
    payload = (await request.json()) as XQSubmissionPayload;
  } catch {
    return json({ error: "Invalid JSON body." }, { status: 400 }, origin);
  }

  const status = resolveStatus(payload);
  const valid =
    status === "incomplete" ? hasBasics(payload) : isValidCompletePayload(payload);
  if (!valid) {
    return json(
      { error: "Missing required submission fields." },
      { status: 400 },
      origin,
    );
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return json(
      {
        error:
          "XQ submission capture is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 },
      origin,
    );
  }

  const result = payload.result ?? {};
  const buckets = result.buckets ?? {};
  const details = result.details ?? {};

  const record = {
    source: payload.source ?? "ghostsignal-xq-quiz",
    submitted_at: payload.submittedAt ?? new Date().toISOString(),
    status,
    participant_type: payload.basics?.type ?? null,
    first_name: payload.basics?.first ?? null,
    last_name: payload.basics?.last ?? null,
    role: payload.basics?.role ?? null,
    organization: payload.basics?.org ?? null,
    industry: payload.basics?.industry ?? null,
    website: payload.basics?.website ?? null,
    email: payload.basics?.email ?? null,
    xq_code: result.code ?? null,
    xq_archetype_name: result.archetypeName ?? null,
    xq_archetype_tagline: result.archetypeTagline ?? null,
    axis_continuity_change: details.axis1?.letter ?? null,
    axis_person_system: details.axis2?.letter ?? null,
    axis_craft_leverage: details.axis3?.letter ?? null,
    page_url: payload.meta?.pageUrl ?? null,
    referrer: payload.meta?.referrer ?? null,
    user_agent: payload.meta?.userAgent ?? null,
    answers_json: payload.answers ?? {},
    profile_json: result.profile ?? {},
    details_json: details,
    non_negotiables_json: buckets.nonNegotiables ?? [],
    core_values_json: buckets.core ?? [],
    aspirational_values_json: buckets.aspirational ?? [],
    background_values_json: buckets.background ?? [],
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
    console.error("XQ submission insert failed:", errorText);
    return json(
      { error: "Failed to store XQ submission.", detail: errorText },
      { status: 502 },
      origin,
    );
  }

  const inserted = (await response.json()) as Array<{ id?: string | number }>;
  const insertedId = inserted?.[0]?.id ?? null;

  // Incomplete capture: lightweight admin lead notification only.
  if (status === "incomplete") {
    const leadEmailResult = await sendLeadNotificationEmail(payload);
    return json(
      {
        ok: true,
        id: insertedId,
        status,
        leadEmailNotified: leadEmailResult.sent,
        emailTo: leadEmailResult.attempted ? EMAIL_TO : null,
      },
      { status: 201 },
      origin,
    );
  }

  // Complete: link to Member by email (if exactly one match) so the
  // marketplace pool / contacts views can surface the dossier next to
  // the existing member record. Best-effort — quiz user gets their
  // email no matter what.
  if (typeof insertedId === "string") {
    await linkSubmissionToMember(insertedId, payload.basics?.email);
  }

  // Complete: admin notification + user summary emails.
  const emailResult = await sendNotificationEmail(payload);
  const userEmailResult = await sendUserSummaryEmail(payload);

  return json(
    {
      ok: true,
      id: insertedId,
      status,
      emailNotified: emailResult.sent,
      emailTo: emailResult.attempted ? EMAIL_TO : null,
      userSummarySent: userEmailResult.sent,
      userSummaryEmail: userEmailResult.sent
        ? (userEmailResult as { email?: string }).email ?? null
        : null,
    },
    { status: 201 },
    origin,
  );
}

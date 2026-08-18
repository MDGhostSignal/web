import { NextResponse } from "next/server";
import { postToGoogleSheetsWebhook } from "@/lib/googleSheetsWebhook";
import type { SubmissionPayload, SubmissionStatus } from "./types";
import {
  sendLeadNotificationEmail,
  sendNotificationEmail,
  sendUserSummaryEmail,
} from "./emails";
import { linkRqSubmissionToMember, type LinkOutcome } from "./link-member";

const TABLE_NAME = process.env.RQ_SUBMISSIONS_TABLE ?? "rq_submissions";
const EMAIL_TO = process.env.RQ_NOTIFY_TO ?? "hello@ghostsignal.cloud";

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

function hasBasics(payload: SubmissionPayload) {
  return Boolean(
    payload?.basics?.first &&
      payload?.basics?.last &&
      payload?.basics?.email &&
      payload?.basics?.org &&
      payload?.basics?.type,
  );
}

function isValidCompletePayload(payload: SubmissionPayload) {
  return (
    hasBasics(payload) &&
    Boolean(payload?.result?.rq && payload?.result?.rqName && payload?.answers)
  );
}

function resolveStatus(payload: SubmissionPayload): SubmissionStatus {
  return payload.status === "incomplete" ? "incomplete" : "complete";
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

  const status = resolveStatus(payload);

  // 'incomplete' rows are captured after the contact step of the
  // RQ quiz — basics-only, no answers/result yet. The full quiz
  // submission later upgrades the row to 'complete' via PATCH.
  const valid =
    status === "incomplete" ? hasBasics(payload) : isValidCompletePayload(payload);

  if (!valid) {
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
    status,
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
  const insertedId = inserted?.[0]?.id ?? null;

  // For incomplete (lead-captured) rows, only fire a lightweight
  // admin-side notification. The user has not finished the quiz, so
  // there is nothing to summarize for them and nothing valuable to
  // append to the completion-tracking Google Sheet yet.
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

  // Complete: link to Member by email (if exactly one match) so Studio
  // + admin surfaces show the result instead of prompting a retake.
  let linkOutcome: LinkOutcome = { status: "skipped", candidateCount: 0 };
  if (typeof insertedId === "string") {
    linkOutcome = await linkRqSubmissionToMember(
      insertedId,
      payload.basics?.email,
      payload.result?.rq ?? null,
    );
    if (linkOutcome.status === "no_match" || linkOutcome.status === "ambiguous") {
      console.warn(
        `[rq-link] submission ${insertedId} not auto-linked ` +
          `(${linkOutcome.status}, ${linkOutcome.candidateCount} candidate(s)) ` +
          `for email ${payload.basics?.email ?? "—"}`,
      );
    }
  }

  // Send email notification to admin (with a warning banner when the
  // result couldn't be auto-linked to a member).
  const emailResult = await sendNotificationEmail(payload, linkOutcome);

  // Send summary email to user
  const userEmailResult = await sendUserSummaryEmail(payload);

  // Post to Google Sheets webhook
  const sheetsResult = await postToGoogleSheetsWebhook(payload);

  return json(
    {
      ok: true,
      id: insertedId,
      status,
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

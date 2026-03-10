import { NextResponse } from "next/server";

type SubmissionPayload = {
  source?: string;
  submittedAt?: string;
  brand?: {
    company?: string;
    acronym?: string;
    title?: string;
  };
  basics?: {
    type?: string;
    first?: string;
    last?: string;
    role?: string;
    org?: string;
    industry?: string;
    website?: string;
    email?: string;
  };
  answers?: Record<string, unknown>;
  result?: {
    rq?: string;
    rqName?: string;
    profile?: unknown;
    details?: unknown;
    clarity?: {
      label?: string;
      note?: string;
      [key: string]: unknown;
    };
    undertone?: string;
  };
  meta?: {
    pageUrl?: string;
    referrer?: string;
    userAgent?: string;
  };
};

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

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFrom,
      to: [EMAIL_TO],
      subject: `New GhostSignal RQ: ${result.rq ?? "Submission"} - ${fullName || basics.org || "Unknown"}`,
      text,
      html,
      reply_to: basics.email || undefined,
    }),
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

  if (!supabaseUrl || !serviceRoleKey) {
    return json(
      {
        ok: false,
        configured: false,
        table: TABLE_NAME,
        emailConfigured: resendConfigured,
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
  const emailResult = await sendNotificationEmail(payload);
  return json(
    {
      ok: true,
      id: inserted?.[0]?.id ?? null,
      emailNotified: emailResult.sent,
      emailTo: emailResult.attempted ? EMAIL_TO : null,
    },
    { status: 201 },
    origin,
  );
}

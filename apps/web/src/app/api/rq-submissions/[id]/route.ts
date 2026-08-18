import { NextRequest, NextResponse } from "next/server";
import { postToGoogleSheetsWebhook } from "@/lib/googleSheetsWebhook";
import type { SubmissionPayload } from "../types";
import { sendNotificationEmail, sendUserSummaryEmail } from "../emails";
import { linkRqSubmissionToMember } from "../link-member";

const TABLE_NAME = process.env.RQ_SUBMISSIONS_TABLE ?? "rq_submissions";
const EMAIL_TO = process.env.RQ_NOTIFY_TO ?? "hello@ghostsignal.cloud";

// Supabase row ids are UUIDs; accept that shape and nothing else so the
// route can't be used to issue arbitrary PostgREST filters via a crafted
// `id` segment.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid submission id." },
      { status: 400 },
    );
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { ok: false, error: "Supabase is not configured." },
      { status: 500 },
    );
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/${TABLE_NAME}?id=eq.${id}`,
    {
      method: "DELETE",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        // `return=representation` makes PostgREST echo the deleted row(s)
        // back so we can confirm something actually matched the id.
        Prefer: "return=representation",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      { ok: false, error: "Failed to delete submission.", detail },
      { status: 502 },
    );
  }

  const deleted = (await response.json()) as unknown[];
  if (!Array.isArray(deleted) || deleted.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No submission found with that id." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, id });
}

/**
 * Upgrade an existing rq_submissions row from `incomplete` to
 * `complete`. The RQ quiz captures a lead at the contact step (POST,
 * status='incomplete'), then on final submission it PATCHes that same
 * row with the full quiz answers + computed result. The complete-stage
 * side-effects (admin notification email, user summary email, Google
 * Sheets append) all fire here, since this is the point at which the
 * submission is actually finished.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid submission id." },
      { status: 400 },
    );
  }

  let payload: SubmissionPayload;
  try {
    payload = (await request.json()) as SubmissionPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  // PATCH is the completion path — we expect the full result block
  // and answers. Basics may also have changed (user went back and
  // edited), so we patch them too.
  const hasResult = Boolean(
    payload?.result?.rq && payload?.result?.rqName && payload?.answers,
  );
  if (!hasResult) {
    return NextResponse.json(
      { ok: false, error: "Missing required completion fields." },
      { status: 400 },
    );
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { ok: false, error: "Supabase is not configured." },
      { status: 500 },
    );
  }

  const record = {
    status: "complete" as const,
    submitted_at: payload.submittedAt ?? new Date().toISOString(),
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
    answers_json: payload.answers ?? {},
    profile_json: payload.result?.profile ?? {},
    details_json: payload.result?.details ?? {},
    submission_payload: payload,
  };

  const response = await fetch(
    `${supabaseUrl}/rest/v1/${TABLE_NAME}?id=eq.${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify(record),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    console.error("RQ submission update failed:", detail);
    return NextResponse.json(
      { ok: false, error: "Failed to update submission.", detail },
      { status: 502 },
    );
  }

  const updated = (await response.json()) as unknown[];
  if (!Array.isArray(updated) || updated.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No submission found with that id." },
      { status: 404 },
    );
  }

  // Completion-stage side-effects. Member link first — this PATCH is
  // the moment the submission gains its scored rq_code.
  const linkOutcome = await linkRqSubmissionToMember(
    id,
    payload.basics?.email,
    payload.result?.rq ?? null,
  );
  if (linkOutcome.status === "no_match" || linkOutcome.status === "ambiguous") {
    console.warn(
      `[rq-link] submission ${id} not auto-linked ` +
        `(${linkOutcome.status}, ${linkOutcome.candidateCount} candidate(s)) ` +
        `for email ${payload.basics?.email ?? "—"}`,
    );
  }
  const emailResult = await sendNotificationEmail(payload, linkOutcome);
  const userEmailResult = await sendUserSummaryEmail(payload);
  const sheetsResult = await postToGoogleSheetsWebhook(payload);

  return NextResponse.json({
    ok: true,
    id,
    status: "complete",
    emailNotified: emailResult.sent,
    emailTo: emailResult.attempted ? EMAIL_TO : null,
    userSummarySent: userEmailResult.sent,
    userSummaryEmail: userEmailResult.sent
      ? (userEmailResult as { email?: string }).email
      : null,
    googleSheetsAppended: sheetsResult.success,
    googleSheetsRow: sheetsResult.row,
  });
}

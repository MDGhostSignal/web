import { NextResponse } from "next/server";

const TABLE_NAME = process.env.XQ_SUBMISSIONS_TABLE ?? "xq_submissions";

/**
 * GET /api/xq-submissions/list
 *
 * Admin-only — gated by `/api/xq-submissions/list` matcher in
 * src/proxy.ts. Returns up to 500 most-recent submissions, newest
 * first. Mirrors /api/rq-submissions/list.
 */
export async function GET() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 },
    );
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/${TABLE_NAME}?select=*&order=submitted_at.desc&limit=500`,
    {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      { error: "Failed to fetch submissions.", detail },
      { status: 502 },
    );
  }

  const submissions = await response.json();

  return NextResponse.json({
    ok: true,
    count: Array.isArray(submissions) ? submissions.length : 0,
    submissions,
  });
}

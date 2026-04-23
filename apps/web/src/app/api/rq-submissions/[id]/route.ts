import { NextRequest, NextResponse } from "next/server";

const TABLE_NAME = process.env.RQ_SUBMISSIONS_TABLE ?? "rq_submissions";

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

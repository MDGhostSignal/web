import { NextResponse, type NextRequest } from "next/server";

import { supabaseRest } from "@/lib/supabase-admin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Mirrors the status column's documented vocabulary in
 *  docs/STUDIO_LITE_CONTACT_REQUESTS.sql. */
const STATUSES = ["new", "in_progress", "done", "declined"] as const;
type Status = (typeof STATUSES)[number];

/**
 * PATCH /api/admin/studio/requests/[id]
 * Body: { status: "new" | "in_progress" | "done" | "declined" }
 *
 * Team-side triage of a member's brokered-intro request. Cookie-gated
 * by the proxy's /api/admin/studio/* matcher.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid request id." }, { status: 400 });
  }

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const status = body.status as Status | undefined;
  if (!status || !STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${STATUSES.join(", ")}.` },
      { status: 400 },
    );
  }

  const res = await supabaseRest<Array<{ id: string }>>(
    `studio_contact_requests?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
      prefer: "return=representation",
    },
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: `Update failed (${res.status}): ${res.detail.slice(0, 200)}` },
      { status: 500 },
    );
  }
  if (!res.data || res.data.length === 0) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, status });
}

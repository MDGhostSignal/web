import { NextResponse, type NextRequest } from "next/server";

import { supabaseRest } from "@/lib/supabase-admin";

/**
 * POST /api/admin/studio/approve
 * Body: { memberId: string }
 *
 * Flips the member's activated_at to now() — unlocking their Studio
 * dashboard access. The proxy already gates this route via the
 * /api/admin/* matcher + admin cookie check.
 */
export async function POST(req: NextRequest) {
  let body: { memberId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const memberId = body.memberId?.trim();
  if (!memberId) {
    return NextResponse.json({ error: "memberId required." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const res = await supabaseRest(
    `members?id=eq.${encodeURIComponent(memberId)}&activated_at=is.null`,
    {
      method: "PATCH",
      body: JSON.stringify({ activated_at: now }),
      prefer: "return=representation",
    },
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: `Approve failed (${res.status}): ${res.detail.slice(0, 200)}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, activatedAt: now });
}

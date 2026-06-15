import { NextResponse, type NextRequest } from "next/server";

import { createStudioAdminClient, createStudioServerClient } from "@/lib/studio-auth";

/**
 * POST /api/studio/register
 *
 * Called by the Studio register page right after the browser-side
 * `supabase.auth.signUp` succeeds. Creates or updates the matching
 * `members` row so the new auth user is linked to a CRM record from
 * day one.
 *
 * Idempotent — if there's already a member row for the email, we
 * just attach the auth_user_id (no duplicate row). If not, we insert
 * a new one in 'discern' phase (= "contact" tier in the user-facing
 * model), with activated_at = NULL so they remain unapproved.
 *
 * Approval flips activated_at later from /hq/studio-approvals.
 */
type Body = {
  authUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  kind: "brand" | "creator";
  orgName: string;
};

export async function POST(req: NextRequest) {
  // Confirm the calling browser actually has an authed session with
  // the claimed user id (otherwise anyone could attach themselves to
  // anyone else's email).
  const supabase = await createStudioServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No active session." }, { status: 401 });
  }

  const body = (await req.json()) as Body;
  if (body.authUserId !== user.id) {
    return NextResponse.json(
      { error: "Auth user id mismatch." },
      { status: 403 },
    );
  }
  const email = body.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Email required." }, { status: 400 });
  }
  if (body.kind !== "brand" && body.kind !== "creator") {
    return NextResponse.json({ error: "Invalid kind." }, { status: 400 });
  }

  const admin = createStudioAdminClient();

  // Find existing member by email (case-insensitive). We do this
  // server-side under the service role so RLS doesn't block reads.
  const { data: existing } = await admin
    .from("members")
    .select("id, auth_user_id, member_type, organization")
    .ilike("email", email)
    .maybeSingle();

  if (existing) {
    // Existing CRM contact registers via Studio — attach the auth user.
    if (existing.auth_user_id && existing.auth_user_id !== body.authUserId) {
      return NextResponse.json(
        {
          error:
            "This email is already linked to another account. Contact support if this is unexpected.",
        },
        { status: 409 },
      );
    }
    const { error } = await admin
      .from("members")
      .update({
        auth_user_id: body.authUserId,
        first_name: body.firstName.trim() || existing.member_type,
        last_name: body.lastName.trim(),
        organization: body.orgName.trim() || existing.organization,
        member_type: body.kind,
      })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, memberId: existing.id, mode: "linked" });
  }

  // Brand-new registration — insert a fresh discern-phase member.
  const { data: inserted, error } = await admin
    .from("members")
    .insert({
      email,
      auth_user_id: body.authUserId,
      first_name: body.firstName.trim(),
      last_name: body.lastName.trim(),
      organization: body.orgName.trim(),
      member_type: body.kind,
      phase: "discern",
      phase_entered_at: new Date().toISOString(),
      notes: "Self-registered via Studio.",
    })
    .select("id")
    .single();
  if (error || !inserted) {
    return NextResponse.json(
      { error: error?.message ?? "Insert failed." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, memberId: inserted.id, mode: "created" });
}

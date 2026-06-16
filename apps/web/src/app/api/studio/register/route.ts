import { NextResponse, type NextRequest } from "next/server";

import { createStudioAdminClient } from "@/lib/studio-auth";

/**
 * POST /api/studio/register
 *
 * Called by the Studio register page right after the browser-side
 * `supabase.auth.signUp` succeeds. Creates or updates the matching
 * `members` row so the new auth user is linked to a CRM record from
 * day one.
 *
 * Verifies the claimed authUserId via the Supabase admin API rather
 * than the session cookie — when "Confirm email" is enabled in
 * Supabase Auth settings, signUp does NOT produce a session until
 * the user clicks the verification email, so the cookie-based check
 * always failed. The admin-API check works in both modes.
 *
 * Idempotent — existing rows by email get their auth_user_id
 * attached; new emails get a fresh discern-phase row with
 * activated_at = NULL. Co-founder flips activated_at from
 * /admin/studio-approvals.
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
  const body = (await req.json()) as Body;
  if (!body.authUserId) {
    return NextResponse.json({ error: "authUserId required." }, { status: 400 });
  }
  const email = body.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Email required." }, { status: 400 });
  }
  if (body.kind !== "brand" && body.kind !== "creator") {
    return NextResponse.json({ error: "Invalid kind." }, { status: 400 });
  }

  const admin = createStudioAdminClient();

  // Verify the authUserId actually exists in Supabase Auth AND
  // matches the claimed email. Protects against a hostile client
  // claiming someone else's email + an arbitrary auth user id.
  const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(
    body.authUserId,
  );
  if (authErr || !authUser?.user) {
    return NextResponse.json(
      { error: "Could not verify the new account. Try registering again." },
      { status: 401 },
    );
  }
  if (authUser.user.email?.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json(
      { error: "Auth user email does not match the submitted email." },
      { status: 403 },
    );
  }

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

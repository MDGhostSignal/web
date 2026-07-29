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
 * attached; new emails get a fresh discern-phase row.
 *
 * Open signup (2026-07-29): activated_at is set immediately on both
 * paths — the only gate is Supabase's email confirmation (the user
 * can't sign in until they click the link, and /api/studio/register
 * verifies the auth user's email matches, so linking to an existing
 * CRM row still requires proving control of that inbox).
 * /admin/studio-approvals remains as a manual fallback for any row
 * that predates open signup.
 */
type Body = {
  authUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  kind: "brand" | "creator";
  orgName: string;
};

type QuizLinks = {
  xq_submission_id?: string | null;
  xq_archetype?: string | null;
  rq_submission_id?: string | null;
  rq_code?: string | null;
};

/**
 * Identity unification: if this email already took the XQ and/or RQ
 * quiz before registering, adopt the latest scored submission onto the
 * member row. The member then sees their result in Studio instead of
 * a "fill out your XQ/RQ" prompt — no retake.
 *
 * Email is the join key on purpose: registration just proved control
 * of this inbox via Supabase's confirmation flow, which is a stronger
 * claim than any typed name match. Existing links are never
 * overwritten. Best-effort — a failure here must not fail signup.
 */
async function adoptQuizSubmissions(
  admin: ReturnType<typeof createStudioAdminClient>,
  memberId: string,
  email: string,
  current: QuizLinks,
): Promise<void> {
  try {
    const patch: Record<string, unknown> = {};

    if (!current.xq_submission_id) {
      const { data } = await admin
        .from("xq_submissions")
        .select("id, xq_code")
        .ilike("email", email)
        .not("xq_code", "is", null)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.id) {
        patch.xq_submission_id = data.id;
        if (data.xq_code && !current.xq_archetype) {
          patch.xq_archetype = data.xq_code;
        }
      }
    }

    if (!current.rq_submission_id) {
      const { data } = await admin
        .from("rq_submissions")
        .select("id, rq_code")
        .ilike("email", email)
        .not("rq_code", "is", null)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.id) {
        patch.rq_submission_id = data.id;
        if (data.rq_code && !current.rq_code) {
          patch.rq_code = data.rq_code;
        }
      }
    }

    if (Object.keys(patch).length > 0) {
      await admin.from("members").update(patch).eq("id", memberId);
    }
  } catch (err) {
    console.warn("[studio/register] quiz adoption skipped:", err);
  }
}

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
    .select(
      "id, auth_user_id, member_type, organization, activated_at, xq_submission_id, xq_archetype, rq_submission_id, rq_code",
    )
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
        activated_at: existing.activated_at ?? new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await adoptQuizSubmissions(admin, existing.id, email, existing);
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
      activated_at: new Date().toISOString(),
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
  await adoptQuizSubmissions(admin, inserted.id, email, {});
  return NextResponse.json({ ok: true, memberId: inserted.id, mode: "created" });
}

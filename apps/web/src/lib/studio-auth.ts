import "server-only";

/**
 * Studio auth — SERVER-SIDE entry point.
 *
 * For the browser-side client, import from `studio-auth-client.ts`
 * instead. They're split because Next.js bundlers conflate any file
 * that imports `next/headers` with server-only code and the browser
 * client can't co-exist in the same module.
 *
 * Three creation paths here, all server-only:
 *   - createStudioServerClient (Route Handlers / Server Components)
 *   - createStudioAdminClient (service-role; for admin-only writes
 *     like activating a registration)
 *   - loadCurrentStudioMember (reads the linked CRM row for the
 *     authed user)
 *
 * Distinct from /admin's shared-password admin cookie
 * (lib/admin-auth.ts). Each brand or creator has their own Supabase
 * auth user; the `members` table links their auth_user_id to their
 * CRM record + their brand_id / creator_id (which scopes what data
 * they can read).
 *
 * Approval gate: a Supabase auth user exists the moment someone
 * registers. They can sign in immediately. But we DO NOT let them
 * into /studio's protected pages until a co-founder marks their
 * member row's `activated_at`. Until then they land on /studio/pending.
 */

import { createServerClient } from "@supabase/ssr";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { linkMemberSubmissionsByEmail } from "@/lib/members";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function assertPublicEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Studio auth: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.",
    );
  }
}

/** Server-side client tied to the request's cookie jar.
 *  Use in Route Handlers, Server Components, and proxy.ts. */
export async function createStudioServerClient() {
  assertPublicEnv();
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          for (const c of toSet) cookieStore.set(c.name, c.value, c.options);
        } catch {
          // Server Components can't set cookies; safe to ignore — the
          // session will refresh on the next request that runs in a
          // mutable context.
        }
      },
    },
  });
}

/** Service-role client — bypasses RLS. Only use server-side for
 *  trusted admin operations (approving a registration, etc.). */
export function createStudioAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Studio auth admin: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.",
    );
  }
  return createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Shape of a Studio member after they're loaded from `members`. The
 *  CRM has many more fields; this is the subset the Studio UI reads. */
export type StudioMember = {
  id: string;
  authUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  kind: "brand" | "creator" | "other";
  brandId: string | null;
  creatorId: string | null;
  isApproved: boolean;
  xqArchetype: string | null;
  xqSubmissionId: string | null;
  rqCode: string | null;
  rqSubmissionId: string | null;
};

/** Thrown by the studio write-path helpers; carries the HTTP status
 *  a route should respond with. Route handlers convert it via
 *  `studioError()` in lib/studio-route.ts. */
export class StudioAuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "StudioAuthError";
  }
}

/** Load the member and hard-fail if missing or unapproved. Every
 *  /api/studio/* route that reads or writes member data should call
 *  this first — the proxy only checks *authentication*, so the
 *  approval gate lives here. */
export async function requireApprovedMember(): Promise<StudioMember> {
  const member = await loadCurrentStudioMember();
  if (!member) throw new StudioAuthError("Unauthorized.", 401);
  if (!member.isApproved) {
    throw new StudioAuthError("Account pending approval.", 403);
  }
  return member;
}

/** Update a row the caller owns. Because all studio DB access runs
 *  under the service role (RLS on members/brands/creators has no
 *  policies), this scoping IS the security boundary for member
 *  writes: the target row id always comes from the session-derived
 *  member, never from request input. Routes must pass only field
 *  values through `patch` — never a row id.
 *
 *  - "members"  → the caller's own members row
 *  - "brands"   → the caller's linked brand (409 if none)
 *  - "creators" → the caller's linked creator (409 if none) */
export async function scopedUpdate(
  member: StudioMember,
  table: "members" | "brands" | "creators",
  patch: Record<string, unknown>,
): Promise<void> {
  const targetId =
    table === "members"
      ? member.id
      : table === "brands"
        ? member.brandId
        : member.creatorId;
  if (!targetId) {
    throw new StudioAuthError(
      `No ${table === "members" ? "member" : table.slice(0, -1)} record is linked to this account.`,
      409,
    );
  }
  const admin = createStudioAdminClient();
  const { error } = await admin.from(table).update(patch).eq("id", targetId);
  if (error) throw new StudioAuthError(error.message, 500);
}

/** Load the currently-signed-in member from the database. Returns
 *  null when no auth session is active OR when the auth user isn't
 *  yet linked to a member row (shouldn't happen after registration,
 *  but defensive). */
export async function loadCurrentStudioMember(): Promise<StudioMember | null> {
  const supabase = await createStudioServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Use the service-role client to bypass RLS on members — the
  // current user is allowed to read their own row, but RLS policies
  // for the members table aren't authored yet, so we go through the
  // admin client. Scoped to the authed user's id only.
  const admin = createStudioAdminClient();
  const { data, error } = await admin
    .from("members")
    .select(
      "id, auth_user_id, email, first_name, last_name, member_type, brand_id, creator_id, activated_at, xq_archetype, xq_submission_id, rq_code, rq_submission_id",
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (error || !data) return null;

  let xqSubmissionId = data.xq_submission_id as string | null;
  let xqArchetype = data.xq_archetype as string | null;
  let rqSubmissionId = data.rq_submission_id as string | null;
  let rqCode = data.rq_code as string | null;

  // Best-effort re-link: the at-submit link (linkSubmissionToMember /
  // linkRqSubmissionToMember) only fires when the quiz is taken by an
  // email that already matches exactly one member. A member who took the
  // quiz before registering — or under a slightly different flow — ends
  // up with a completed submission but no link, so their Studio results
  // never appear. Here we link by the member's own email (their account,
  // so no PII ambiguity): newest completed submission wins. Runs only
  // while a link is missing, so it's a one-time cost per member.
  const linked = await linkMemberSubmissionsByEmail(
    data.id as string,
    data.email as string,
    { xq: xqSubmissionId !== null, rq: rqSubmissionId !== null },
  );
  if (linked.xq_submission_id) {
    xqSubmissionId = linked.xq_submission_id;
    if (linked.xq_archetype && !xqArchetype) xqArchetype = linked.xq_archetype;
  }
  if (linked.rq_submission_id) {
    rqSubmissionId = linked.rq_submission_id;
    if (linked.rq_code && !rqCode) rqCode = linked.rq_code;
  }

  const fn = data.first_name?.trim() ?? "";
  const ln = data.last_name?.trim() ?? "";
  const displayName = `${fn} ${ln}`.trim() || data.email || "Studio member";

  return {
    id: data.id as string,
    authUserId: data.auth_user_id as string,
    email: data.email as string,
    firstName: data.first_name,
    lastName: data.last_name,
    displayName,
    kind: data.member_type as "brand" | "creator" | "other",
    brandId: data.brand_id,
    creatorId: data.creator_id,
    isApproved: data.activated_at !== null,
    xqArchetype,
    xqSubmissionId,
    rqCode,
    rqSubmissionId,
  };
}

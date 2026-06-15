/**
 * Studio auth — per-user Supabase Auth for the client-facing
 * /studio surface.
 *
 * Distinct from /hq's shared-password admin cookie (lib/admin-auth.ts).
 * Each brand or creator has their own Supabase auth user; the
 * `members` table links their auth_user_id to their CRM record + their
 * brand_id / creator_id (which scopes what data they can read).
 *
 * Three creation paths, mirroring the @supabase/ssr conventions:
 *   - createStudioBrowserClient (Client Components)
 *   - createStudioServerClient (Route Handlers / Server Components)
 *   - createStudioAdminClient (service-role; for admin-only writes
 *     like activating a registration)
 *
 * Approval gate: a Supabase auth user exists the moment someone
 * registers. They can sign in immediately. But we DO NOT let them
 * into /studio's protected pages until a co-founder marks their
 * member row's `activated_at`. Until then they land on /studio/pending.
 */

import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

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

/** Client-component Supabase client. Use in 'use client' files only. */
export function createStudioBrowserClient() {
  assertPublicEnv();
  return createBrowserClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
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
  rqCode: string | null;
};

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
      "id, auth_user_id, email, first_name, last_name, member_type, brand_id, creator_id, activated_at, xq_archetype, rq_code",
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (error || !data) return null;

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
    xqArchetype: data.xq_archetype,
    rqCode: data.rq_code,
  };
}

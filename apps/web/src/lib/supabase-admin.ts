/**
 * Thin helper around Supabase's REST API for admin-side server routes.
 *
 * We don't pull in the `@supabase/supabase-js` client because every
 * admin endpoint is a single-shot CRUD call that the REST API handles
 * perfectly well with plain `fetch`. Avoiding the SDK keeps the Edge
 * runtime happy (no node-only imports) and the bundle small.
 *
 * Every request uses the service-role key so RLS is bypassed — which
 * is safe because these routes only run server-side and are gated by
 * the shared-password middleware (src/middleware.ts).
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function assertEnv() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }
}

type Init = RequestInit & { prefer?: string };

/**
 * Make a PostgREST call against the given table. Returns the parsed
 * JSON body (or null when the response has no body, e.g. DELETE with
 * no `return=representation`).
 */
export async function supabaseRest<T = unknown>(
  pathAndQuery: string,
  init: Init = {},
): Promise<{ ok: true; data: T } | { ok: false; status: number; detail: string }> {
  assertEnv();

  const headers = new Headers(init.headers);
  headers.set("apikey", SERVICE_ROLE_KEY!);
  headers.set("Authorization", `Bearer ${SERVICE_ROLE_KEY!}`);
  headers.set("Content-Type", "application/json");
  if (init.prefer) headers.set("Prefer", init.prefer);

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text();
    return { ok: false, status: res.status, detail };
  }

  // DELETE without `return=representation` returns an empty body.
  const text = await res.text();
  const data = text ? (JSON.parse(text) as T) : (null as unknown as T);
  return { ok: true, data };
}

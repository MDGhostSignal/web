/**
 * Thin typed wrapper around the Supabase Storage REST API.
 *
 * Used by the Marketing Asset Library to upload, delete, and link to
 * files in the `marketing-assets` bucket. Mirrors the style of
 * supabase-admin.ts — plain fetch + the service-role key, no SDK
 * dependency — so the bundle stays small and the Edge runtime stays
 * happy.
 *
 * Bucket setup is a one-time manual step documented in
 * docs/MARKETING_ASSETS.md. We do NOT create the bucket from code.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.MARKETING_ASSETS_BUCKET ?? "marketing-assets";

function assertEnv(): void {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase Storage is not configured. Set SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }
}

function authHeaders(): Record<string, string> {
  return {
    apikey: SERVICE_ROLE_KEY!,
    Authorization: `Bearer ${SERVICE_ROLE_KEY!}`,
  };
}

/**
 * Upload an object to the bucket. `path` is the path within the
 * bucket (e.g. `brand/brandmark-white.svg`). `body` is the raw bytes.
 *
 * Set `upsert=true` if you want to overwrite an existing object —
 * default is false so accidental collisions surface as 409s.
 */
export async function uploadObject(
  path: string,
  body: ArrayBuffer | Uint8Array | Blob,
  mimeType: string,
  options: { upsert?: boolean } = {},
): Promise<{ ok: true; path: string } | { ok: false; status: number; detail: string }> {
  assertEnv();

  const headers: Record<string, string> = {
    ...authHeaders(),
    "Content-Type": mimeType,
  };
  if (options.upsert) headers["x-upsert"] = "true";

  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${encodeBucketPath(BUCKET, path)}`,
    {
      method: "POST",
      headers,
      body: body as BodyInit,
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    return { ok: false, status: res.status, detail };
  }
  return { ok: true, path };
}

/**
 * Best-effort delete. Returns a result object — callers should log
 * failures but generally NOT fail the whole flow on this, since an
 * orphaned Storage object is a smaller problem than a broken DB row.
 */
export async function deleteObject(
  path: string,
): Promise<{ ok: true } | { ok: false; status: number; detail: string }> {
  assertEnv();

  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${encodeBucketPath(BUCKET, path)}`,
    {
      method: "DELETE",
      headers: authHeaders(),
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    return { ok: false, status: res.status, detail };
  }
  return { ok: true };
}

/**
 * For files in a PUBLIC bucket, this synthesises the canonical CDN URL.
 * Does not hit Supabase — just constructs the URL.
 */
export function getPublicUrl(path: string): string {
  assertEnv();
  return `${SUPABASE_URL}/storage/v1/object/public/${encodeBucketPath(BUCKET, path)}`;
}

/**
 * Generate a signed PUT URL that the browser can use to upload a file
 * directly to Storage, bypassing the Vercel function body-size limit.
 * Used for files larger than MAX_PROXY_UPLOAD_BYTES.
 *
 * Returned URL is valid for `expiresInSeconds` (default 1 hour). The
 * client PUTs the file with the appropriate Content-Type header.
 */
export async function createSignedUploadUrl(
  path: string,
  expiresInSeconds = 3600,
): Promise<
  | { ok: true; signedUrl: string; token: string }
  | { ok: false; status: number; detail: string }
> {
  assertEnv();

  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/upload/sign/${encodeBucketPath(BUCKET, path)}`,
    {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    return { ok: false, status: res.status, detail };
  }

  const json = (await res.json()) as { url?: string; token?: string };
  if (!json.url || !json.token) {
    return {
      ok: false,
      status: 502,
      detail: "Signed upload response missing url/token.",
    };
  }

  return {
    ok: true,
    signedUrl: `${SUPABASE_URL}/storage/v1${json.url}`,
    token: json.token,
  };
}

/* --- internal --------------------------------------------------------- */

function encodeBucketPath(bucket: string, path: string): string {
  // Strip any leading slashes from the user-provided path so we don't
  // produce `bucket//foo`.
  const clean = path.replace(/^\/+/, "");
  return `${encodeURIComponent(bucket)}/${clean
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

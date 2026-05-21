/**
 * Typed REST client for the esignatures.com API.
 *
 * Discovered facts (from apps/web/scripts/probe-esignatures.mjs against
 * the live account):
 *
 *  - Base URL: https://esignatures.com/api (no trailing slash).
 *  - Auth: HTTP Basic with the API token as the username, empty
 *    password. Bearer auth is REJECTED with 403; the official docs
 *    also list a `?token=` query-param variant, but Basic is what
 *    we use because it keeps the token out of URL logs.
 *  - All responses are wrapped in `{ status?, data }`. We unwrap at
 *    the boundary so callers receive the inner shape directly.
 *  - There is NO `GET /contracts` list endpoint. Trying it returns
 *    `{ status: "error", data: { error_code: "not-supported" } }`.
 *    Discoverability of contracts is via webhooks + caller-known ids
 *    only; this is by design per esignatures's "no polling" guidance.
 *
 * Env:
 *   ESIGNATURES_API_TOKEN   — required, the secret token from the
 *                              esignatures.com API page (UUID format).
 *   ESIGNATURES_BASE_URL    — optional, defaults to
 *                              https://esignatures.com/api.
 *
 * Docs:
 *   https://esignatures.com/docs/api
 */

import type {
  EsignaturesContract,
  EsignaturesSigner,
  EsignaturesTemplate,
} from "@/lib/esignatures-types";

export class EsignaturesError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
    public readonly path: string,
  ) {
    super(`esignatures ${status} on ${path}: ${detail.slice(0, 200)}`);
    this.name = "EsignaturesError";
  }
}

function getConfig(): { baseUrl: string; basicHeader: string } {
  const token = process.env.ESIGNATURES_API_TOKEN;
  const baseUrl = (
    process.env.ESIGNATURES_BASE_URL ?? "https://esignatures.com/api"
  ).replace(/\/+$/, "");
  if (!token) {
    throw new Error(
      "esignatures.com is not configured. Set ESIGNATURES_API_TOKEN in " +
        ".env.local. See docs/CONTRACTS_INTEGRATION.md.",
    );
  }
  // HTTP Basic with the token as username + empty password.
  const basic =
    "Basic " +
    Buffer.from(token + ":").toString("base64");
  return { baseUrl, basicHeader: basic };
}

/**
 * Internal: typed fetch against the esignatures API. Throws
 * EsignaturesError on non-2xx. Unwraps the standard `{ data }` envelope
 * so the caller receives the inner object directly.
 */
async function esignaturesFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { baseUrl, basicHeader } = getConfig();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(init.headers);
  headers.set("Authorization", basicHeader);
  headers.set("Accept", "application/json");
  // POST bodies are always JSON for this API.
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });

  const text = await res.text().catch(() => "");
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    // esignatures error envelope: { status: "error", data: { error_code, error_message } }
    const detail =
      (parsed as { data?: { error_message?: string } } | null)?.data
        ?.error_message ??
      text.slice(0, 400) ??
      `HTTP ${res.status}`;
    throw new EsignaturesError(res.status, detail, path);
  }

  // Standard envelope: { data: T } — unwrap.
  if (
    parsed &&
    typeof parsed === "object" &&
    "data" in (parsed as Record<string, unknown>)
  ) {
    return (parsed as { data: T }).data;
  }
  // Fallback: return whatever we parsed.
  return parsed as T;
}

/* ---------------- Templates ---------------- */

/** List all templates in the account. Returns the flat array. */
export async function listTemplates(): Promise<EsignaturesTemplate[]> {
  const data = await esignaturesFetch<EsignaturesTemplate[]>("/templates");
  return Array.isArray(data) ? data : [];
}

/** Get full metadata for a single template (includes placeholder_fields). */
export async function getTemplate(
  templateId: string,
): Promise<EsignaturesTemplate> {
  return esignaturesFetch<EsignaturesTemplate>(
    `/templates/${encodeURIComponent(templateId)}`,
  );
}

/* ---------------- Contracts ---------------- */

/**
 * Retrieve a single contract by id. This is the ONLY way to read
 * contract state from the API — there is no list endpoint.
 */
export async function getContract(
  contractId: string,
): Promise<EsignaturesContract> {
  // The /contracts/<id> endpoint returns { data: { contract } } — one
  // level deeper than the templates envelope. Unwrap manually.
  const wrapped = await esignaturesFetch<{ contract: EsignaturesContract }>(
    `/contracts/${encodeURIComponent(contractId)}`,
  );
  return wrapped.contract ?? (wrapped as unknown as EsignaturesContract);
}

/**
 * Send a new contract. esignatures.com expects template_id, signers,
 * and optional metadata + placeholder_fields. The response contains
 * the created contract object — caller persists it locally.
 */
export interface CreateContractInput {
  template_id: string;
  signers: Array<{
    name: string;
    email: string;
    mobile?: string;
    company_name?: string;
    signing_order?: number;
  }>;
  /** Optional per-template variable values. Empty array is fine. */
  placeholder_fields?: Array<{ api_key: string; value: string }>;
  /** Arbitrary user metadata. We attach { ghostsignal_member_id, source }. */
  metadata?: Record<string, unknown>;
  title?: string;
  /** If true, esignatures marks the contract as a test (no email sent). */
  test?: boolean;
}

export async function createContract(
  input: CreateContractInput,
): Promise<EsignaturesContract> {
  const wrapped = await esignaturesFetch<{ contract: EsignaturesContract }>(
    "/contracts",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return wrapped.contract ?? (wrapped as unknown as EsignaturesContract);
}

/** Withdraw / void a contract. Returns the queued-status envelope. */
export async function withdrawContract(contractId: string): Promise<void> {
  await esignaturesFetch(
    `/contracts/${encodeURIComponent(contractId)}/withdraw`,
    { method: "POST" },
  );
}

/** Resend the contract email to a specific signer (acts as a reminder). */
export async function resendSigner(
  contractId: string,
  signerId: string,
): Promise<void> {
  await esignaturesFetch(
    `/contracts/${encodeURIComponent(contractId)}/signers/${encodeURIComponent(signerId)}/send_contract`,
    { method: "POST" },
  );
}

/**
 * Re-export the signer type for callers that want it as a return
 * shape from a hypothetical future endpoint. Currently signers are
 * always nested inside the contract object.
 */
export type { EsignaturesSigner };

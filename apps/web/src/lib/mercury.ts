/**
 * Thin typed REST client for the Mercury (mercury.com) API.
 *
 * We don't pull in a third-party SDK — there isn't an official Node SDK
 * and the API is straightforward JSON over HTTPS with Bearer auth, so
 * plain `fetch` keeps the dependency surface small and the Edge runtime
 * happy.
 *
 * Money fields: Mercury returns balances/amounts as JSON numbers, but
 * we re-stringify them on receipt so currency math stays in bigint
 * cents (see lib/mercury-types.ts for the contract).
 *
 * Env:
 *   MERCURY_API_TOKEN     — Bearer token (sandbox or prod)
 *   MERCURY_API_BASE_URL  — e.g. https://api-sandbox.mercury.com/api/v1
 *                            or https://api.mercury.com/api/v1
 *
 * Docs:
 *   https://docs.mercury.com/reference
 */

import type {
  MercuryAccount,
  MercuryTransaction,
} from "@/lib/mercury-types";

export class MercuryError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
    public readonly path: string,
  ) {
    super(`Mercury ${status} on ${path}: ${detail.slice(0, 200)}`);
    this.name = "MercuryError";
  }
}

function getConfig(): { baseUrl: string; token: string } {
  const token = process.env.MERCURY_API_TOKEN;
  const baseUrl = process.env.MERCURY_API_BASE_URL;
  if (!token || !baseUrl) {
    throw new Error(
      "Mercury is not configured. Set MERCURY_API_TOKEN and " +
        "MERCURY_API_BASE_URL in .env.local. See docs/MERCURY_INTEGRATION.md.",
    );
  }
  // Strip trailing slash so callers can use absolute-ish paths.
  return { baseUrl: baseUrl.replace(/\/+$/, ""), token };
}

/**
 * Internal: typed GET against the Mercury REST API. Throws MercuryError
 * on any non-2xx; the caller decides whether that's fatal or surfaceable.
 */
async function mercuryFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const { baseUrl, token } = getConfig();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");

  const res = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new MercuryError(res.status, detail, path);
  }

  return (await res.json()) as T;
}

/* --- Money normalization ----------------------------------------------
 *
 * Mercury returns money as JSON numbers in the wire payload. We coerce
 * to strings via String(x) right at the boundary so downstream code
 * never sees a raw Number for a currency amount. This is the single
 * spot where the JSON number → string conversion happens.
 * --------------------------------------------------------------------- */

function normalizeAccount(raw: unknown): MercuryAccount {
  const r = raw as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    name: String(r.name ?? r.nickname ?? "Untitled account"),
    kind: typeof r.kind === "string" ? r.kind : null,
    accountNumber: typeof r.accountNumber === "string" ? r.accountNumber : null,
    availableBalance: String(r.availableBalance ?? r.available_balance ?? "0"),
    currentBalance: String(r.currentBalance ?? r.current_balance ?? "0"),
    currency: typeof r.currency === "string" ? r.currency : "USD",
    status: typeof r.status === "string" ? r.status : null,
  };
}

function normalizeTransaction(raw: unknown): MercuryTransaction {
  const r = raw as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    accountId: typeof r.accountId === "string" ? r.accountId : undefined,
    postedAt: typeof r.postedAt === "string" ? r.postedAt : null,
    createdAt: String(r.createdAt ?? r.created_at ?? new Date().toISOString()),
    amount: String(r.amount ?? "0"),
    kind: typeof r.kind === "string" ? r.kind : null,
    counterpartyName:
      typeof r.counterpartyName === "string" ? r.counterpartyName : null,
    counterpartyNickname:
      typeof r.counterpartyNickname === "string"
        ? r.counterpartyNickname
        : null,
    bankDescription:
      typeof r.bankDescription === "string" ? r.bankDescription : null,
    status: String(r.status ?? "unknown"),
    note: typeof r.note === "string" ? r.note : null,
  };
}

/* --- Public endpoints ------------------------------------------------- */

interface AccountsResponse {
  accounts: unknown[];
}

interface TransactionsResponse {
  transactions: unknown[];
  total?: number;
}

export async function listAccounts(): Promise<MercuryAccount[]> {
  const data = await mercuryFetch<AccountsResponse>("/accounts");
  const list = Array.isArray(data.accounts) ? data.accounts : [];
  return list.map(normalizeAccount).filter((a) => a.id);
}

export interface ListTransactionsParams {
  /** ISO date (YYYY-MM-DD) or full ISO timestamp. */
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
}

export async function listAccountTransactions(
  accountId: string,
  params: ListTransactionsParams = {},
): Promise<{ transactions: MercuryTransaction[]; total: number }> {
  const query = new URLSearchParams();
  if (params.start) query.set("start", params.start);
  if (params.end) query.set("end", params.end);
  if (params.limit != null) query.set("limit", String(params.limit));
  if (params.offset != null) query.set("offset", String(params.offset));

  const path = `/account/${encodeURIComponent(accountId)}/transactions${
    query.size > 0 ? `?${query.toString()}` : ""
  }`;

  const data = await mercuryFetch<TransactionsResponse>(path);
  const list = Array.isArray(data.transactions) ? data.transactions : [];
  return {
    transactions: list.map(normalizeTransaction).filter((t) => t.id),
    total: typeof data.total === "number" ? data.total : list.length,
  };
}

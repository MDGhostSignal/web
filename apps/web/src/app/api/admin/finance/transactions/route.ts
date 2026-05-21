import { NextResponse, type NextRequest } from "next/server";

import type { MercuryTransactionRow } from "@/lib/mercury-types";
import { supabaseRest } from "@/lib/supabase-admin";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;

/**
 * GET /api/admin/finance/transactions
 *
 * Query params:
 *  - limit:     1..200 (default 20)
 *  - offset:    >= 0 (default 0)
 *  - accountId: filter by mercury_accounts.id
 *  - since:     ISO date / timestamp; posted_at >= since
 *
 * Ordered by posted_at desc nullslast, then created_at desc — pending
 * transactions (null posted_at) bubble to the top because they're the
 * most actionable.
 *
 * Auth: handled by the proxy matcher in src/proxy.ts.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const limit = clampInt(searchParams.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = clampInt(searchParams.get("offset"), 0, 0, Number.MAX_SAFE_INTEGER);
  const accountId = searchParams.get("accountId");
  const since = searchParams.get("since");

  const filters: string[] = [];
  if (accountId) {
    filters.push(`account_id=eq.${encodeURIComponent(accountId)}`);
  }
  if (since) {
    // posted_at IS NULL for pending tx, so filter on posted_at OR created_at.
    // PostgREST supports the `or=(...)` syntax.
    const safeSince = encodeURIComponent(since);
    filters.push(
      `or=(posted_at.gte.${safeSince},and(posted_at.is.null,created_at.gte.${safeSince}))`,
    );
  }

  const query = [
    "select=*",
    "order=posted_at.desc.nullsfirst,created_at.desc",
    `limit=${limit}`,
    `offset=${offset}`,
    ...filters,
  ].join("&");

  const res = await supabaseRest<MercuryTransactionRow[]>(
    `mercury_transactions?${query}`,
  );

  if (!res.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load Mercury transactions.",
        detail: res.detail,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    transactions: res.data,
    count: res.data.length,
    limit,
    offset,
  });
}

function clampInt(
  raw: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

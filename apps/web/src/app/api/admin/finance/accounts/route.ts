import { NextResponse } from "next/server";

import type {
  MercuryAccountRow,
  MercurySyncRunRow,
} from "@/lib/mercury-types";
import { supabaseRest } from "@/lib/supabase-admin";

/**
 * GET /api/admin/finance/accounts
 *
 * Returns the cached account list from Supabase plus the most recent
 * sync run so the dashboard can render the "last synced X min ago"
 * badge and a stale-data warning if the latest run errored.
 *
 * No auth check here — the admin-cookie gate is enforced by
 * src/proxy.ts via the matcher entry "/api/admin/finance/accounts".
 */
export async function GET() {
  const [accountsRes, syncRes] = await Promise.all([
    supabaseRest<MercuryAccountRow[]>(
      "mercury_accounts?select=*&order=name.asc",
    ),
    supabaseRest<MercurySyncRunRow[]>(
      "mercury_sync_runs?select=*&order=started_at.desc&limit=1",
    ),
  ]);

  if (!accountsRes.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load Mercury accounts.",
        detail: accountsRes.detail,
      },
      { status: 502 },
    );
  }

  const lastSync = syncRes.ok && syncRes.data.length > 0 ? syncRes.data[0] : null;

  return NextResponse.json({
    ok: true,
    accounts: accountsRes.data,
    lastSync,
  });
}

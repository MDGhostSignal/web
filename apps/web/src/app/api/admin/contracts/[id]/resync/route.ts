import { NextResponse, type NextRequest } from "next/server";

import { EsignaturesError, getContract } from "@/lib/esignatures";
import { upsertContractFromApi } from "@/lib/esignatures-webhook";
import { supabaseRest } from "@/lib/supabase-admin";

/**
 * POST /api/admin/contracts/[id]/resync
 *
 * Force-refresh a single contract directly from esignatures.com. The
 * "safety valve" for the rare case of a webhook delivery failing all 6
 * retries — exposed as a "Resync now" button on the detail page.
 *
 * Idempotent: hitting it twice in a row is a no-op aside from
 * `updated_at` advancing.
 *
 * Auth: proxy matcher in src/proxy.ts.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id || id.length < 4) {
    return NextResponse.json(
      { ok: false, error: "Invalid contract id." },
      { status: 400 },
    );
  }

  // Start an audit row.
  const runRes = await supabaseRest<Array<{ id: string }>>(
    "contract_sync_runs",
    {
      method: "POST",
      body: JSON.stringify({ status: "running", scope: "single-contract" }),
      prefer: "return=representation",
    },
  );
  const runId = runRes.ok && runRes.data[0] ? runRes.data[0].id : null;

  let apiContract;
  try {
    apiContract = await getContract(id);
  } catch (err) {
    const detail =
      err instanceof EsignaturesError
        ? `esignatures ${err.status} on ${err.path}: ${err.detail.slice(0, 300)}`
        : err instanceof Error
          ? err.message
          : String(err);
    if (runId) await closeRun(runId, "error", { error_message: detail.slice(0, 2000) });
    return NextResponse.json(
      { ok: false, error: "esignatures fetch failed.", detail },
      { status: 502 },
    );
  }

  const upsert = await upsertContractFromApi(apiContract);
  if (!upsert.ok) {
    if (runId) {
      await closeRun(runId, "error", { error_message: upsert.detail.slice(0, 2000) });
    }
    return NextResponse.json(
      { ok: false, error: "Local upsert failed.", detail: upsert.detail },
      { status: 502 },
    );
  }

  if (runId) {
    await closeRun(runId, "ok", {
      contract_count: 1,
      signer_count: apiContract.signers?.length ?? 0,
    });
  }
  return NextResponse.json({ ok: true, contract: upsert.row });
}

async function closeRun(
  id: string,
  status: "ok" | "error",
  patch: Record<string, unknown>,
): Promise<void> {
  await supabaseRest(`contract_sync_runs?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      ...patch,
      status,
      finished_at: new Date().toISOString(),
    }),
  });
}

import { NextResponse, type NextRequest } from "next/server";

import {
  createContract,
  type CreateContractInput,
  EsignaturesError,
  getContract,
} from "@/lib/esignatures";
import {
  type ContractCounterpartyKind,
  type ContractRow,
  type ContractStatus,
  CONTRACT_STATUSES,
  COUNTERPARTY_KINDS,
} from "@/lib/esignatures-types";
import { upsertContractFromApi } from "@/lib/esignatures-webhook";
import { supabaseRest } from "@/lib/supabase-admin";

/**
 * GET  /api/admin/contracts
 *   List from local cache. No live API hits — esignatures has no list
 *   endpoint (verified), so the cache is the only readable surface.
 *
 *   Query params (all optional):
 *     status         — one of ContractStatus
 *     counterparty   — one of ContractCounterpartyKind
 *     unlinked       — "true" → only contracts with member_id is null
 *     archived       — "true" → only archived; default excludes archived
 *     search         — substring on title
 *     limit / offset — defaults 200 / 0
 *
 * POST /api/admin/contracts
 *   Two modes (dispatched by body shape):
 *
 *   1. `{ contract_id: "<esignatures id>" }` — Import-by-id. Calls
 *      GET /api/contracts/<id> against esignatures, upserts locally.
 *      Use this to backfill historical contracts the team cares about.
 *
 *   2. `{ template_id, signers, ... }` — Send-from-CRM (Phase C will
 *      flesh this out). For now we accept the same payload and just
 *      proxy to esignatures.createContract.
 *
 * Auth: proxy matcher in src/proxy.ts.
 */

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = clampInt(searchParams.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = clampInt(
    searchParams.get("offset"),
    0,
    0,
    Number.MAX_SAFE_INTEGER,
  );
  const status = searchParams.get("status");
  const counterparty = searchParams.get("counterparty");
  const unlinked = searchParams.get("unlinked") === "true";
  const archived = searchParams.get("archived") === "true";
  const search = searchParams.get("search")?.trim() ?? "";

  const filters: string[] = [];
  if (status && (CONTRACT_STATUSES as readonly string[]).includes(status)) {
    filters.push(`status=eq.${encodeURIComponent(status)}`);
  }
  if (
    counterparty &&
    (COUNTERPARTY_KINDS as readonly string[]).includes(counterparty)
  ) {
    filters.push(`counterparty_kind=eq.${encodeURIComponent(counterparty)}`);
  }
  if (unlinked) {
    filters.push("member_id=is.null");
  }
  // Archived filter: include or exclude depending on flag. Default is exclude.
  filters.push(archived ? "archived_at=not.is.null" : "archived_at=is.null");
  if (search) {
    filters.push(`title=ilike.${encodeURIComponent(`*${search}*`)}`);
  }

  const query = [
    "select=*",
    "order=updated_at.desc.nullslast,created_at.desc",
    `limit=${limit}`,
    `offset=${offset}`,
    ...filters,
  ].join("&");

  const res = await supabaseRest<ContractRow[]>(`contracts?${query}`);
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to load contracts.", detail: res.detail },
      { status: 502 },
    );
  }
  return NextResponse.json({
    ok: true,
    contracts: res.data,
    count: res.data.length,
    limit,
    offset,
    filters: {
      status: status as ContractStatus | null,
      counterparty: counterparty as ContractCounterpartyKind | null,
      unlinked: unlinked || null,
      archived: archived || null,
      search: search || null,
    },
  });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const contractId = typeof body.contract_id === "string" ? body.contract_id : null;
  const templateId = typeof body.template_id === "string" ? body.template_id : null;

  if (contractId) {
    return handleImportById(contractId);
  }
  if (templateId) {
    return handleSendFromCrm(body);
  }

  return NextResponse.json(
    {
      ok: false,
      error:
        "Provide either `contract_id` (to import an existing contract) or `template_id` (to send a new one).",
    },
    { status: 400 },
  );
}

/* --- Send from CRM (Phase C) --------------------------------------- */

async function handleSendFromCrm(
  body: Record<string, unknown>,
): Promise<NextResponse> {
  const templateId =
    typeof body.template_id === "string" ? body.template_id.trim() : "";
  if (!templateId) {
    return NextResponse.json(
      { ok: false, error: "template_id is required." },
      { status: 400 },
    );
  }

  const memberId =
    typeof body.member_id === "string" && body.member_id.length > 0
      ? body.member_id
      : null;

  // Signers: array of { name, email, mobile?, company_name?, signing_order? }
  const signersRaw = Array.isArray(body.signers) ? body.signers : [];
  if (signersRaw.length === 0) {
    return NextResponse.json(
      { ok: false, error: "At least one signer is required." },
      { status: 400 },
    );
  }
  const signers: CreateContractInput["signers"] = [];
  for (const raw of signersRaw) {
    if (!raw || typeof raw !== "object") continue;
    const s = raw as Record<string, unknown>;
    const name = typeof s.name === "string" ? s.name.trim() : "";
    const email = typeof s.email === "string" ? s.email.trim() : "";
    if (!name || !email || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Each signer needs a name and a valid email." },
        { status: 400 },
      );
    }
    signers.push({
      name,
      email,
      mobile: typeof s.mobile === "string" ? s.mobile : undefined,
      company_name:
        typeof s.company_name === "string" ? s.company_name : undefined,
      signing_order:
        typeof s.signing_order === "number" ? s.signing_order : undefined,
    });
  }

  const placeholderRaw = Array.isArray(body.placeholder_fields)
    ? body.placeholder_fields
    : [];
  const placeholder_fields: CreateContractInput["placeholder_fields"] = [];
  for (const raw of placeholderRaw) {
    if (!raw || typeof raw !== "object") continue;
    const f = raw as Record<string, unknown>;
    const api_key = typeof f.api_key === "string" ? f.api_key : "";
    const value = typeof f.value === "string" ? f.value : "";
    if (!api_key) continue;
    placeholder_fields.push({ api_key, value });
  }

  const title = typeof body.title === "string" ? body.title.trim() : undefined;
  const isTest = body.test === true;

  const metadataInput =
    body.metadata && typeof body.metadata === "object"
      ? (body.metadata as Record<string, unknown>)
      : {};

  const metadata: Record<string, unknown> = {
    ...metadataInput,
    source: "ghostsignal-crm",
  };
  if (memberId) metadata.ghostsignal_member_id = memberId;

  const input: CreateContractInput = {
    template_id: templateId,
    signers,
    placeholder_fields,
    metadata,
    title,
    test: isTest || undefined,
  };

  let apiContract;
  try {
    apiContract = await createContract(input);
  } catch (err) {
    const detail =
      err instanceof EsignaturesError
        ? `esignatures ${err.status} on ${err.path}: ${err.detail.slice(0, 300)}`
        : err instanceof Error
          ? err.message
          : String(err);
    return NextResponse.json(
      { ok: false, error: "esignatures create failed.", detail },
      { status: 502 },
    );
  }

  // Persist locally with the member link already set so the dashboard
  // doesn't have to wait on the webhook to learn about this contract.
  const upsert = await upsertContractFromApi(apiContract, {
    presetMemberId: memberId,
  });
  if (!upsert.ok) {
    // esignatures has the authoritative record — surface a warning but
    // the contract did send.
    return NextResponse.json(
      {
        ok: true,
        contract: { id: apiContract.id, status: apiContract.status },
        warning: "Contract sent, but local persist failed.",
        detail: upsert.detail,
      },
      { status: 200 },
    );
  }
  return NextResponse.json({ ok: true, contract: upsert.row }, { status: 201 });
}

/* --- Import by id --------------------------------------------------- */

async function handleImportById(rawId: string): Promise<NextResponse> {
  const contractId = rawId.trim();
  if (contractId.length < 4) {
    return NextResponse.json(
      { ok: false, error: "contract_id looks malformed." },
      { status: 400 },
    );
  }

  // Start an audit row.
  const runRes = await supabaseRest<Array<{ id: string }>>(
    "contract_sync_runs",
    {
      method: "POST",
      body: JSON.stringify({ status: "running", scope: "manual-import" }),
      prefer: "return=representation",
    },
  );
  const runId = runRes.ok && runRes.data[0] ? runRes.data[0].id : null;

  let apiContract;
  try {
    apiContract = await getContract(contractId);
  } catch (err) {
    const detail =
      err instanceof EsignaturesError
        ? `esignatures ${err.status} on ${err.path}: ${err.detail.slice(0, 300)}`
        : err instanceof Error
          ? err.message
          : String(err);
    if (runId) {
      await closeRun(runId, "error", { error_message: detail.slice(0, 2000) });
    }
    return NextResponse.json(
      { ok: false, error: "esignatures fetch failed.", detail },
      { status: 502 },
    );
  }

  const upsert = await upsertContractFromApi(apiContract);
  if (!upsert.ok) {
    if (runId) {
      await closeRun(runId, "error", {
        error_message: upsert.detail.slice(0, 2000),
      });
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

import { NextResponse, type NextRequest } from "next/server";

import {
  type ContractCounterpartyKind,
  type ContractRow,
  type ContractSignerRow,
  type ContractWithSigners,
  COUNTERPARTY_KINDS,
} from "@/lib/esignatures-types";
import { supabaseRest } from "@/lib/supabase-admin";

/**
 * GET    /api/admin/contracts/[id]   — contract + signers
 * PATCH  /api/admin/contracts/[id]   — admin-only fields (linking, notes, archive)
 * DELETE /api/admin/contracts/[id]   — soft-archive (sets archived_at)
 *
 * The `id` is the esignatures contract id (UUID-shaped but we don't
 * enforce that — esignatures emits opaque strings).
 *
 * Note: DELETE is intentionally soft. Esignatures.com retains the
 * authoritative record; deleting our cache row would just orphan any
 * inbound webhook events. Hard delete is not exposed.
 *
 * Auth: proxy matcher in src/proxy.ts.
 */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!validId(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid contract id." },
      { status: 400 },
    );
  }

  const [contractRes, signersRes] = await Promise.all([
    supabaseRest<ContractRow[]>(
      `contracts?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
    ),
    supabaseRest<ContractSignerRow[]>(
      `contract_signers?contract_id=eq.${encodeURIComponent(id)}&order=signing_order.asc.nullslast,created_at.asc`,
    ),
  ]);

  if (!contractRes.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to load contract.", detail: contractRes.detail },
      { status: 502 },
    );
  }
  if (!signersRes.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to load signers.", detail: signersRes.detail },
      { status: 502 },
    );
  }
  if (contractRes.data.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Contract not found." },
      { status: 404 },
    );
  }

  const contract: ContractWithSigners = {
    ...contractRes.data[0],
    signers: signersRes.data,
  };

  // Hydrate the linked + suggested member shorthand so the detail page
  // can render names without a second round-trip.
  const memberIds = Array.from(
    new Set(
      [contract.member_id, contract.suggested_member_id].filter(
        (x): x is string => typeof x === "string" && x.length > 0,
      ),
    ),
  );
  const memberMap: Record<
    string,
    {
      id: string;
      first_name: string | null;
      last_name: string | null;
      organization: string | null;
      member_type: string;
    }
  > = {};
  if (memberIds.length > 0) {
    const inList = memberIds.map(encodeURIComponent).join(",");
    const mRes = await supabaseRest<
      Array<{
        id: string;
        first_name: string | null;
        last_name: string | null;
        organization: string | null;
        member_type: string;
      }>
    >(
      `members?select=id,first_name,last_name,organization,member_type&id=in.(${inList})`,
    );
    if (mRes.ok) {
      for (const m of mRes.data) memberMap[m.id] = m;
    }
  }

  return NextResponse.json({
    ok: true,
    contract,
    linkedMember: contract.member_id ? memberMap[contract.member_id] ?? null : null,
    suggestedMember: contract.suggested_member_id
      ? memberMap[contract.suggested_member_id] ?? null
      : null,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!validId(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid contract id." },
      { status: 400 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const validated = validatePatch(body);
  if ("error" in validated) {
    return NextResponse.json(
      { ok: false, error: validated.error },
      { status: 400 },
    );
  }
  if (Object.keys(validated.payload).length === 0) {
    return NextResponse.json(
      { ok: false, error: "No editable fields in body." },
      { status: 400 },
    );
  }

  const patchBody = {
    ...validated.payload,
    updated_at: new Date().toISOString(),
  };

  const res = await supabaseRest<ContractRow[]>(
    `contracts?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patchBody),
      prefer: "return=representation",
    },
  );
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to update contract.", detail: res.detail },
      { status: 502 },
    );
  }
  const updated = Array.isArray(res.data) ? res.data[0] : res.data;
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "Contract not found." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, contract: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!validId(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid contract id." },
      { status: 400 },
    );
  }
  const res = await supabaseRest<ContractRow[]>(
    `contracts?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
      prefer: "return=representation",
    },
  );
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to archive contract.", detail: res.detail },
      { status: 502 },
    );
  }
  const updated = Array.isArray(res.data) ? res.data[0] : res.data;
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "Contract not found." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, contract: updated });
}

/* --- helpers -------------------------------------------------------- */

function validId(s: string): boolean {
  return typeof s === "string" && s.length >= 4 && s.length <= 128;
}

type ValidatedPatch =
  | { error: string }
  | { payload: Record<string, unknown> };

function validatePatch(body: Record<string, unknown>): ValidatedPatch {
  const out: Record<string, unknown> = {};

  // member_id: confirm or unlink. `null` unlinks; a string sets the
  // confirmed link AND clears any pending suggestion so we don't keep
  // nagging the user.
  if ("member_id" in body) {
    const v = body.member_id;
    if (v === null) {
      out.member_id = null;
    } else if (typeof v === "string" && v.length > 0) {
      if (!isUuid(v)) return { error: "member_id must be a UUID or null." };
      out.member_id = v;
      out.suggested_member_id = null;
    } else {
      return { error: "member_id must be a UUID string or null." };
    }
  }

  // suggested_member_id: explicit reject = set to null. Caller can also
  // PATCH this to a different uuid if they want to nudge the suggestion.
  if ("suggested_member_id" in body) {
    const v = body.suggested_member_id;
    if (v === null) {
      out.suggested_member_id = null;
    } else if (typeof v === "string" && isUuid(v)) {
      out.suggested_member_id = v;
    } else {
      return { error: "suggested_member_id must be a UUID or null." };
    }
  }

  if ("counterparty_kind" in body) {
    const v = body.counterparty_kind;
    if (v === null) {
      out.counterparty_kind = null;
    } else if (
      typeof v === "string" &&
      (COUNTERPARTY_KINDS as readonly string[]).includes(v)
    ) {
      out.counterparty_kind = v as ContractCounterpartyKind;
    } else {
      return { error: "counterparty_kind must be creator/brand/other or null." };
    }
  }

  if ("notes" in body) {
    const v = body.notes;
    if (v === null) {
      out.notes = null;
    } else if (typeof v === "string") {
      out.notes = v.length > 4000 ? v.slice(0, 4000) : v;
    } else {
      return { error: "notes must be a string or null." };
    }
  }

  if ("archived_at" in body) {
    const v = body.archived_at;
    if (v === null) {
      out.archived_at = null;
    } else if (typeof v === "string" && !Number.isNaN(new Date(v).getTime())) {
      out.archived_at = new Date(v).toISOString();
    } else {
      return { error: "archived_at must be an ISO string or null." };
    }
  }

  return { payload: out };
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(s: string): boolean {
  return UUID_REGEX.test(s);
}

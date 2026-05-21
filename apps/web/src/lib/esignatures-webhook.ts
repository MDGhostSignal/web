/**
 * esignatures.com webhook verification + event → DB upsert helper.
 *
 * Used by /api/admin/contracts/webhook. Kept in a separate module so the
 * route handler stays focused on HTTP plumbing.
 *
 * Signature contract (from the esignatures docs):
 *   - Header: `X-Signature-SHA256: <hex>`
 *   - HMAC-SHA256 of the raw request body, keyed with our API token.
 *   - Verification is timing-safe.
 *
 * Event payload (observed shape):
 *   { status, data: { event_type, contract: {...}, signer?: {...} } }
 * Field names + nesting vary by event type — we tolerate both
 * `data.contract` and a flat top-level contract object, since the docs
 * are mildly inconsistent.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

import {
  type ContractRow,
  type ContractSignerRow,
  normalizeStatus,
  parseIsoOrNull,
  type EsignaturesContract,
  type EsignaturesSigner,
} from "@/lib/esignatures-types";
import { findMembersByEmail } from "@/lib/members";
import { supabaseRest } from "@/lib/supabase-admin";

/** Verifies the X-Signature-SHA256 header against an HMAC of `body`. */
export function verifyEsignaturesSignature(
  rawBody: string,
  headerValue: string | null | undefined,
): boolean {
  if (!headerValue) return false;
  const token = process.env.ESIGNATURES_API_TOKEN;
  if (!token) return false;

  const expectedHex = createHmac("sha256", token).update(rawBody).digest("hex");
  // Both buffers must be the same length for timingSafeEqual to work.
  const provided = headerValue.trim().toLowerCase();
  const expected = expectedHex.toLowerCase();
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** Extract the contract object from a webhook payload, tolerating both shapes. */
export function extractContractFromPayload(
  payload: unknown,
): EsignaturesContract | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  // Most events nest under data.contract.
  const data = obj.data as Record<string, unknown> | undefined;
  if (data?.contract && typeof data.contract === "object") {
    return data.contract as EsignaturesContract;
  }
  // Some events may put the contract at the top level.
  if (obj.id && obj.signers) return obj as unknown as EsignaturesContract;
  return null;
}

export function extractEventType(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "unknown";
  const obj = payload as Record<string, unknown>;
  const data = obj.data as Record<string, unknown> | undefined;
  return (
    (typeof obj.event_type === "string" && obj.event_type) ||
    (typeof data?.event_type === "string" && data.event_type) ||
    (typeof obj.status === "string" && obj.status) ||
    "unknown"
  );
}

/**
 * Upsert one contract + its signers into Supabase. Used by the webhook
 * receiver, the manual resync route, and the create-from-CRM flow.
 *
 * Side effect: if any signer's email matches exactly one member in our
 * CRM AND the contract has no confirmed `member_id` yet, we set
 * `suggested_member_id` on the contract. We never auto-set `member_id`;
 * the admin confirms via the UI.
 *
 * The optional `presetMemberId` argument lets the create-from-CRM flow
 * skip the email-match dance — when we already know the member id we
 * write it straight into `member_id` (still respecting "don't overwrite
 * an existing confirmed link").
 */
export async function upsertContractFromApi(
  contract: EsignaturesContract,
  options: { presetMemberId?: string | null } = {},
): Promise<{ ok: true; row: ContractRow } | { ok: false; detail: string }> {
  if (!contract?.id) {
    return { ok: false, detail: "contract.id missing in payload" };
  }

  // Compute suggested_member_id (or use the preset).
  let suggestedMemberId: string | null = options.presetMemberId ?? null;
  if (!suggestedMemberId) {
    suggestedMemberId = await suggestMemberByContractSigners(contract.signers);
  }

  // Status normalisation — tolerant of unknown future strings.
  const status = normalizeStatus(contract.status as string);

  // Look up any existing row so we don't clobber notes / member_id / archived_at.
  const existingRes = await supabaseRest<ContractRow[]>(
    `contracts?id=eq.${encodeURIComponent(contract.id)}&select=member_id,notes,archived_at,counterparty_kind&limit=1`,
  );
  const existing = existingRes.ok && existingRes.data[0] ? existingRes.data[0] : null;

  const row: Partial<ContractRow> & { id: string; raw: unknown; updated_at: string } =
    {
      id: contract.id,
      template_id: contract.template_id ?? null,
      title: contract.title ?? null,
      status,
      counterparty_kind: existing?.counterparty_kind ?? null,
      // member_id: preset wins, then keep existing confirmed link, else null.
      member_id: options.presetMemberId ?? existing?.member_id ?? null,
      suggested_member_id:
        // Don't override a suggestion if the user has already confirmed.
        existing?.member_id ? null : suggestedMemberId,
      sent_at: parseIsoOrNull(contract.sent_at),
      signed_at: parseIsoOrNull(contract.signed_at),
      withdrawn_at: parseIsoOrNull(contract.withdrawn_at),
      effective_date: null, // pulled from placeholder_fields in a future pass
      expires_at: parseIsoOrNull(contract.expires_at),
      archived_at: existing?.archived_at ?? null,
      notes: existing?.notes ?? null,
      raw: contract,
      metadata: (contract.metadata ?? null) as Record<string, unknown> | null,
      updated_at: new Date().toISOString(),
    };

  const upsertRes = await supabaseRest<ContractRow[]>(
    "contracts?on_conflict=id",
    {
      method: "POST",
      body: JSON.stringify([row]),
      prefer: "resolution=merge-duplicates,return=representation",
    },
  );
  if (!upsertRes.ok) {
    return {
      ok: false,
      detail: `contracts upsert HTTP ${upsertRes.status}: ${upsertRes.detail.slice(0, 300)}`,
    };
  }

  // Upsert signers in a single batch — esignatures returns them inline
  // on the contract object.
  await upsertSigners(contract.id, contract.signers ?? []);

  const persisted = Array.isArray(upsertRes.data) ? upsertRes.data[0] : upsertRes.data;
  return { ok: true, row: persisted };
}

async function upsertSigners(
  contractId: string,
  signers: EsignaturesSigner[],
): Promise<void> {
  if (signers.length === 0) return;
  const rows: Array<
    Pick<
      ContractSignerRow,
      | "id"
      | "contract_id"
      | "name"
      | "email"
      | "status"
      | "signing_order"
      | "viewed_at"
      | "signed_at"
      | "raw"
    >
  > = signers
    .filter((s) => s?.id)
    .map((s) => ({
      id: s.id,
      contract_id: contractId,
      name: s.name ?? null,
      email: s.email ? s.email.toLowerCase() : null,
      status: String(s.status ?? "sent"),
      signing_order: typeof s.signing_order === "number" ? s.signing_order : null,
      viewed_at: parseIsoOrNull(s.viewed_at),
      signed_at: parseIsoOrNull(s.signed_at),
      raw: s,
    }));
  if (rows.length === 0) return;
  await supabaseRest("contract_signers?on_conflict=id", {
    method: "POST",
    body: JSON.stringify(rows),
    prefer: "resolution=merge-duplicates,return=minimal",
  });
}

/**
 * Given a contract's signer list, pick a single member id to suggest.
 *
 * Skips our own internal emails (`@ghostsignal.cloud`), which are the
 * GhostSignal countersigner, not the counterparty. If exactly one of
 * the remaining signer emails matches exactly one member, returns
 * that id. Otherwise null (admin links manually).
 */
async function suggestMemberByContractSigners(
  signers: EsignaturesSigner[] | undefined | null,
): Promise<string | null> {
  if (!signers || signers.length === 0) return null;
  const candidates = signers
    .map((s) => (s.email ?? "").trim().toLowerCase())
    .filter(
      (e) => e.length > 0 && e.includes("@") && !e.endsWith("@ghostsignal.cloud"),
    );
  // Try each candidate; first unique match wins.
  for (const email of candidates) {
    const matches = await findMembersByEmail(email);
    if (matches.length === 1) return matches[0].id;
  }
  return null;
}

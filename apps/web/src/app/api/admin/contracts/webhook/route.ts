import { NextResponse, type NextRequest } from "next/server";

import {
  extractContractFromPayload,
  extractEventType,
  upsertContractFromApi,
  verifyEsignaturesSignature,
} from "@/lib/esignatures-webhook";
import { supabaseRest } from "@/lib/supabase-admin";

/**
 * POST /api/admin/contracts/webhook
 *
 * esignatures.com posts event notifications here. The route is
 * allowlisted in src/proxy.ts (no admin cookie required) but signature
 * verification runs INSIDE the route, before any DB work.
 *
 * Flow:
 *  1. Read the raw body as text (HMAC needs the exact bytes).
 *  2. Verify X-Signature-SHA256 with our API token.
 *  3. Always insert an audit row into `contract_webhook_events` —
 *     regardless of validity. This gives us a forensic record of
 *     every delivery attempt.
 *  4. If invalid → 401 and stop.
 *  5. If valid → extract the contract object and upsert. Esignatures
 *     retries failed deliveries up to 6× over an hour, so we keep
 *     the response fast and the work idempotent.
 *
 * The route returns 200 even when the payload is malformed (no
 * contract object found) — the audit row is the source of truth, and
 * a 5xx would trigger esignatures retries that won't fix the underlying
 * problem. We log to console for visibility.
 */

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signatureHeader =
    req.headers.get("x-signature-sha256") ??
    req.headers.get("X-Signature-SHA256");

  const signatureValid = verifyEsignaturesSignature(rawBody, signatureHeader);
  const eventType = extractEventType(safeJson(rawBody));
  const contract = signatureValid
    ? extractContractFromPayload(safeJson(rawBody))
    : null;

  // Always audit the delivery (signature_valid drives whether the
  // event actually mutated DB state).
  await supabaseRest("contract_webhook_events", {
    method: "POST",
    body: JSON.stringify({
      event_type: eventType,
      contract_id: contract?.id ?? null,
      signature_valid: signatureValid,
      raw: safeJson(rawBody) ?? { raw_text: rawBody.slice(0, 4000) },
    }),
    prefer: "return=minimal",
  });

  if (!signatureValid) {
    return NextResponse.json(
      { ok: false, error: "Invalid signature." },
      { status: 401 },
    );
  }

  if (!contract) {
    // Could be an event type we don't model (e.g. SMS-only). Still
    // return 200 so esignatures doesn't keep retrying.
    return NextResponse.json({
      ok: true,
      via: "webhook",
      note: "Event accepted; no contract object to upsert.",
      eventType,
    });
  }

  const result = await upsertContractFromApi(contract);
  if (!result.ok) {
    // 200 with error detail: we accepted the delivery; the upsert
    // failure is on us, not esignatures. A 5xx here would trigger
    // their retry storm against the same broken handler.
    return NextResponse.json(
      { ok: false, error: "Upsert failed.", detail: result.detail },
      { status: 200 },
    );
  }

  return NextResponse.json({
    ok: true,
    via: "webhook",
    eventType,
    contractId: result.row.id,
    status: result.row.status,
  });
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

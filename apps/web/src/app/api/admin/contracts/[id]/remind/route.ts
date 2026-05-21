import { NextResponse, type NextRequest } from "next/server";

import { EsignaturesError, resendSigner } from "@/lib/esignatures";

/**
 * POST /api/admin/contracts/[id]/remind
 *
 * Body: { signer_id: string }
 *
 * Resends the contract email to a specific signer — esignatures.com
 * treats this as a reminder when the contract is already sent.
 *
 * Auth: proxy matcher in src/proxy.ts.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id || id.length < 4) {
    return NextResponse.json(
      { ok: false, error: "Invalid contract id." },
      { status: 400 },
    );
  }

  let body: { signer_id?: unknown };
  try {
    body = (await req.json()) as { signer_id?: unknown };
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }
  const signerId = typeof body.signer_id === "string" ? body.signer_id.trim() : "";
  if (!signerId) {
    return NextResponse.json(
      { ok: false, error: "signer_id is required." },
      { status: 400 },
    );
  }

  try {
    await resendSigner(id, signerId);
  } catch (err) {
    const detail =
      err instanceof EsignaturesError
        ? `esignatures ${err.status} on ${err.path}: ${err.detail.slice(0, 300)}`
        : err instanceof Error
          ? err.message
          : String(err);
    return NextResponse.json(
      { ok: false, error: "Reminder failed.", detail },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, contractId: id, signerId });
}

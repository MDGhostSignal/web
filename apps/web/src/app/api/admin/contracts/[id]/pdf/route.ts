import { NextResponse, type NextRequest } from "next/server";

import { EsignaturesError, getContract } from "@/lib/esignatures";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/contracts/:id/pdf
 *
 * Re-fetches the contract from esignatures.com live and 307-redirects
 * to the current signed PDF URL. Solves the expired-URL problem: the
 * `contract_pdf_url` esignatures returns is a time-limited signed S3
 * URL (~48 h TTL). Our `contracts.raw` jsonb cache stores it at sync
 * time, so it goes stale; embedding the stale URL surfaces an S3
 * "AccessDenied / Request has expired" error.
 *
 * Embedding via this proxy means the iframe targets a stable URL that
 * issues a fresh redirect on every load. The browser follows it
 * transparently. ESIGNATURES_API_TOKEN stays server-side.
 *
 * Auth via the existing `/api/admin/contracts/:path*` proxy matcher.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  if (!id || id.length < 8) {
    return NextResponse.json(
      { ok: false, error: "Invalid contract id." },
      { status: 400 },
    );
  }

  let contract;
  try {
    contract = await getContract(id);
  } catch (err) {
    const detail =
      err instanceof EsignaturesError
        ? `esignatures ${err.status} on ${err.path}: ${err.detail.slice(0, 300)}`
        : err instanceof Error
          ? err.message
          : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to fetch contract from esignatures.",
        detail,
      },
      { status: 502 },
    );
  }

  const pdfUrl = contract.contract_pdf_url;
  if (!pdfUrl) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "No signed PDF available yet. esignatures publishes the PDF after the first signature lands.",
      },
      { status: 404 },
    );
  }

  // 307 keeps the request method intact (GET stays GET). The browser
  // (iframe) follows the redirect to the fresh signed S3 URL.
  return NextResponse.redirect(pdfUrl, 307);
}

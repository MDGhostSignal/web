import { NextResponse } from "next/server";

import { EsignaturesError, listTemplates } from "@/lib/esignatures";

/**
 * GET /api/admin/contracts/templates
 *
 * Live-fetches the template list from esignatures.com on each call.
 * We don't cache templates locally yet — the corpus is tiny (a handful)
 * and the composer only opens occasionally, so a direct passthrough
 * keeps the data fresh without adding a sync surface.
 *
 * Auth: proxy matcher in src/proxy.ts.
 */
export async function GET() {
  try {
    const templates = await listTemplates();
    return NextResponse.json({
      ok: true,
      templates,
      count: templates.length,
    });
  } catch (err) {
    const detail =
      err instanceof EsignaturesError
        ? `esignatures ${err.status} on ${err.path}: ${err.detail.slice(0, 300)}`
        : err instanceof Error
          ? err.message
          : String(err);
    return NextResponse.json(
      { ok: false, error: "Failed to load templates.", detail },
      { status: 502 },
    );
  }
}

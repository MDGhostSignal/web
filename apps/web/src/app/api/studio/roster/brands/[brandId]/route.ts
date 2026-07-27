import { NextResponse, type NextRequest } from "next/server";

import { requireApprovedMember } from "@/lib/studio-auth";
import { studioError } from "@/lib/studio-route";
import { supabaseRest } from "@/lib/supabase-admin";
import {
  loadStudioRqSummary,
  loadStudioXqSummary,
} from "@/lib/studio-data";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/studio/roster/brands/:brandId
 *
 * Assessment detail for the roster pop-up: the brand contact's XQ and
 * RQ summaries, when they exist. Follows the world's press-E dossier
 * pattern (/api/studio/players/[authUserId]/summary): any APPROVED
 * member may read it — brands on the roster are visible to the whole
 * approved network by design; the static card data is already in the
 * roster payload.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ brandId: string }> },
) {
  try {
    await requireApprovedMember();

    const { brandId } = await params;
    if (!UUID_RE.test(brandId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid brand id." },
        { status: 400 },
      );
    }

    // First linked contact with any submission on file carries the
    // brand's assessment identity (same firstArchetype convention as
    // the marketplace loaders).
    const contacts = await supabaseRest<
      Array<{
        xq_submission_id: string | null;
        rq_submission_id: string | null;
      }>
    >(
      `members?select=xq_submission_id,rq_submission_id&brand_id=eq.${encodeURIComponent(brandId)}&order=created_at.asc`,
    );
    const contact =
      (contacts.ok &&
        contacts.data?.find(
          (c) => c.xq_submission_id !== null || c.rq_submission_id !== null,
        )) ||
      null;

    const [xq, rq] = await Promise.all([
      loadStudioXqSummary(contact?.xq_submission_id ?? null),
      loadStudioRqSummary(contact?.rq_submission_id ?? null),
    ]);

    return NextResponse.json({ ok: true, xq, rq });
  } catch (e) {
    return studioError(e);
  }
}

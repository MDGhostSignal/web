import { NextResponse, type NextRequest } from "next/server";

import { requireApprovedMember } from "@/lib/studio-auth";
import { studioError } from "@/lib/studio-route";
import { supabaseRest } from "@/lib/supabase-admin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/studio/contact-requests  { brandId, message? }
 *
 * Files a brokered-intro request from the signed-in member toward a
 * brand (roster pop-up "Request an intro"). member_id is forced from
 * the session — the body only names the *target* brand, which is the
 * point of the interaction. The GhostSignal team picks requests up
 * from the studio_contact_requests table and brokers the intro.
 *
 * Requires docs/STUDIO_LITE_CONTACT_REQUESTS.sql; until it runs the
 * insert fails and surfaces as the generic "couldn't file" error.
 */
export async function POST(req: NextRequest) {
  try {
    const member = await requireApprovedMember();

    const body = (await req.json().catch(() => null)) as {
      brandId?: string;
      message?: string;
    } | null;
    const brandId = body?.brandId ?? "";
    if (!UUID_RE.test(brandId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid brand id." },
        { status: 400 },
      );
    }
    const message =
      typeof body?.message === "string"
        ? body.message.trim().slice(0, 1000) || null
        : null;

    const res = await supabaseRest<Array<{ id: string }>>(
      "studio_contact_requests",
      {
        method: "POST",
        body: JSON.stringify({
          member_id: member.id,
          brand_id: brandId,
          message,
        }),
        prefer: "return=representation",
      },
    );

    if (!res.ok) {
      // Unique (member, brand) violation → they already asked.
      if (res.detail?.includes("studio_contact_requests_unique")) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "You've already requested an intro to this brand — the team is on it.",
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        {
          ok: false,
          error: "Couldn't file the request. Try again in a moment.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return studioError(e);
  }
}

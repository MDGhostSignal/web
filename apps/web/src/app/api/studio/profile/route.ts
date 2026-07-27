import { NextResponse, type NextRequest } from "next/server";

import {
  requireApprovedMember,
  scopedUpdate,
  StudioAuthError,
} from "@/lib/studio-auth";
import { studioError } from "@/lib/studio-route";

/**
 * PATCH /api/studio/profile
 *
 * Member-facing profile edit. The target rows are always the caller's
 * own (scopedUpdate derives them from the session) — the body carries
 * field values only, never row ids. Fields are whitelisted per member
 * kind; anything else in the body is ignored.
 *
 * Field semantics: absent → untouched, empty string → cleared (null).
 */

/** Trimmed string capped at `max`; null clears; undefined = absent. */
function cleanText(v: unknown, max: number): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? null : t.slice(0, max);
}

/** Like cleanText, but must parse as an http(s) URL (a bare domain
 *  gets https:// prefixed). Rejects javascript: and friends — these
 *  values render as links on member-visible surfaces later. */
function cleanUrl(v: unknown, field: string): string | null | undefined {
  const t = cleanText(v, 500);
  if (t === undefined || t === null) return t;
  const candidate = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    return url.toString();
  } catch {
    throw new StudioAuthError(`"${field}" is not a valid URL.`, 400);
  }
}

/** Drop absent (undefined) fields so PATCH only touches what was sent. */
function compact(patch: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined),
  );
}

export async function PATCH(req: NextRequest) {
  try {
    const member = await requireApprovedMember();
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body." },
        { status: 400 },
      );
    }

    if (member.kind === "creator") {
      const patch = compact({
        description: cleanText(body.description, 2000),
        podcast_url: cleanUrl(body.podcastUrl, "Podcast URL"),
        newsletter_url: cleanUrl(body.newsletterUrl, "Newsletter URL"),
      });
      if (Object.keys(patch).length > 0) {
        await scopedUpdate(member, "creators", patch);
      }
    } else if (member.kind === "brand") {
      const patch = compact({
        description: cleanText(body.description, 2000),
        website: cleanUrl(body.website, "Website"),
      });
      if (Object.keys(patch).length > 0) {
        await scopedUpdate(member, "brands", patch);
      }
    }

    const memberPatch = compact({
      first_name: cleanText(body.firstName, 80),
      last_name: cleanText(body.lastName, 80),
    });
    if (Object.keys(memberPatch).length > 0) {
      await scopedUpdate(member, "members", memberPatch);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return studioError(e);
  }
}

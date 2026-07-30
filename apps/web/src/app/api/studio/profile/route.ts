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

    // Org name is editable ("customize all the fields on the card")
    // but never clearable — an empty submission keeps the current name.
    const orgName = cleanText(body.orgName, 120) || undefined;

    const hasLinkedOrg =
      (member.kind === "creator" && member.creatorId !== null) ||
      (member.kind === "brand" && member.brandId !== null);

    // Set when the creators.rss_url column is missing (until
    // docs/STUDIO_LITE_RSS.sql runs) so the client can say the RSS
    // value didn't stick instead of silently dropping it.
    let pendingRss = false;

    if (member.kind === "creator" && member.creatorId) {
      const patch = compact({
        name: orgName,
        tagline: cleanText(body.tagline, 140),
        description: cleanText(body.description, 2000),
        podcast_url: cleanUrl(body.podcastUrl, "Podcast URL"),
        newsletter_url: cleanUrl(body.newsletterUrl, "Newsletter URL"),
        rss_url: cleanUrl(body.rssUrl, "RSS feed URL"),
      });
      if (Object.keys(patch).length > 0) {
        try {
          await scopedUpdate(member, "creators", patch);
        } catch (err) {
          if (!("rss_url" in patch)) throw err;
          // Retry without rss_url — the rest of the save still lands.
          const rest = { ...patch };
          delete rest.rss_url;
          pendingRss = true;
          if (Object.keys(rest).length > 0) {
            await scopedUpdate(member, "creators", rest);
          }
        }
      }
    } else if (member.kind === "brand" && member.brandId) {
      const patch = compact({
        name: orgName,
        tagline: cleanText(body.tagline, 140),
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
      // Personal card (no linked org row): tagline + descriptive text
      // live on the members row itself. Requires STUDIO_LITE_MEMBER_CARD.sql.
      ...(hasLinkedOrg
        ? {}
        : {
            tagline: cleanText(body.tagline, 140),
            bio: cleanText(body.description, 2000),
          }),
    });
    if (Object.keys(memberPatch).length > 0) {
      await scopedUpdate(member, "members", memberPatch);
    }

    return NextResponse.json({ ok: true, ...(pendingRss ? { pendingRss } : {}) });
  } catch (e) {
    return studioError(e);
  }
}

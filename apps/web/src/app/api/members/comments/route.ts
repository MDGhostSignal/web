import { NextResponse, type NextRequest } from "next/server";

import { resolveOpenAlertsForMember } from "@/lib/alerts";
import { MEMBER_OWNERS } from "@/lib/members";
import { supabaseRest } from "@/lib/supabase-admin";

const TABLE = process.env.MEMBER_COMMENTS_TABLE ?? "member_comments";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Comment = {
  id: string;
  member_id: string;
  author: string;
  content: string;
  created_at: string;
};

/**
 * GET /api/members/comments?member_id=:id
 *
 * Returns the full comment thread for a single member, newest first.
 */
export async function GET(req: NextRequest) {
  const memberId = req.nextUrl.searchParams.get("member_id");
  if (!memberId || !UUID_RE.test(memberId)) {
    return NextResponse.json(
      { ok: false, error: "Valid member_id is required." },
      { status: 400 },
    );
  }

  const res = await supabaseRest<Comment[]>(
    `${TABLE}?member_id=eq.${memberId}&select=*&order=created_at.desc`,
  );

  if (!res.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to fetch comments.",
        detail: res.detail,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, comments: res.data });
}

/**
 * POST /api/members/comments
 *
 * Body: { member_id, author, content }
 *   - member_id must be a UUID that exists in the members table
 *   - author must be one of MEMBER_OWNERS (the four founders)
 *   - content must be non-empty after trim
 */
export async function POST(req: NextRequest) {
  let body: Partial<Comment>;
  try {
    body = (await req.json()) as Partial<Comment>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const memberId = body.member_id?.toString() ?? "";
  const author = body.author?.toString() ?? "";
  const content = body.content?.toString().trim() ?? "";

  if (!UUID_RE.test(memberId)) {
    return NextResponse.json(
      { ok: false, error: "Valid member_id is required." },
      { status: 400 },
    );
  }
  if (!(MEMBER_OWNERS as readonly string[]).includes(author)) {
    return NextResponse.json(
      { ok: false, error: "Author must be one of the founders." },
      { status: 400 },
    );
  }
  if (content.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Comment content cannot be empty." },
      { status: 400 },
    );
  }

  const res = await supabaseRest<Comment[]>(TABLE, {
    method: "POST",
    body: JSON.stringify({
      member_id: memberId,
      author,
      content,
    }),
    prefer: "return=representation",
  });

  if (!res.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to create comment.",
        detail: res.detail,
      },
      { status: 502 },
    );
  }

  const created = Array.isArray(res.data) ? res.data[0] : res.data;

  // A fresh comment is a real touchpoint — clear any open `contact_cold`
  // alert for this member so the bell badge updates without waiting
  // for the next hourly sync. Best-effort; failure is logged inside
  // the helper and doesn't break the POST response.
  void resolveOpenAlertsForMember(memberId, ["contact_cold"]);

  return NextResponse.json({ ok: true, comment: created });
}

/**
 * DELETE /api/members/comments?id=:id
 */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Valid id is required." },
      { status: 400 },
    );
  }

  const res = await supabaseRest<Comment[]>(`${TABLE}?id=eq.${id}`, {
    method: "DELETE",
    prefer: "return=representation",
  });

  if (!res.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to delete comment.",
        detail: res.detail,
      },
      { status: 502 },
    );
  }

  const deleted = Array.isArray(res.data) ? res.data : [];
  if (deleted.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Comment not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, id });
}

import { NextResponse, type NextRequest } from "next/server";

import { supabaseRest } from "@/lib/supabase-admin";

/**
 * GET /api/admin/members/lite?ids=uuid1,uuid2,...
 *
 * Lightweight member lookup — returns id + name fields only. Used by
 * the Contracts dashboard to hydrate linked / suggested member labels
 * for a batch of contracts without pulling the full member shape.
 *
 * Also supports `?q=<search>` for a small search-by-name/email/org
 * variant the Phase C member picker uses.
 *
 * Auth: proxy matcher in src/proxy.ts (the /api/admin/* allowlist).
 */

const MAX_RESULTS = 50;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ids = searchParams.get("ids");
  const q = searchParams.get("q")?.trim() ?? "";

  if (ids) {
    const list = ids
      .split(",")
      .map((s) => s.trim())
      .filter((s) => UUID_REGEX.test(s));
    if (list.length === 0) {
      return NextResponse.json({ ok: true, members: [] });
    }
    const inList = list.map(encodeURIComponent).join(",");
    const res = await supabaseRest<
      Array<{
        id: string;
        first_name: string | null;
        last_name: string | null;
        organization: string | null;
        email: string | null;
        member_type: string;
      }>
    >(
      `members?select=id,first_name,last_name,organization,email,member_type&id=in.(${inList})`,
    );
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "Failed to load members.", detail: res.detail },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, members: res.data });
  }

  if (q) {
    // ilike on multiple fields via PostgREST `or=` syntax. Pattern is
    // `or=(field1.ilike.%q%,field2.ilike.%q%)`.
    const pattern = `*${q}*`;
    const enc = encodeURIComponent(pattern);
    const orClause = [
      `first_name.ilike.${enc}`,
      `last_name.ilike.${enc}`,
      `organization.ilike.${enc}`,
      `email.ilike.${enc}`,
    ].join(",");
    const res = await supabaseRest<
      Array<{
        id: string;
        first_name: string | null;
        last_name: string | null;
        organization: string | null;
        email: string | null;
        member_type: string;
      }>
    >(
      `members?select=id,first_name,last_name,organization,email,member_type&or=(${orClause})&limit=${MAX_RESULTS}`,
    );
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: "Failed to search members.", detail: res.detail },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, members: res.data });
  }

  return NextResponse.json(
    { ok: false, error: "Pass either `ids` or `q`." },
    { status: 400 },
  );
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

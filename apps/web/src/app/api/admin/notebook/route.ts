import { NextResponse } from "next/server";

import { supabaseRest } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Notebook API — plain-text scratch pages shown at /admin/tasks/notebook
 * as Google-Sheets-style tabs. Auth: the /api/admin/notebook matcher in
 * proxy.ts gates this behind the shared admin cookie.
 *
 *   GET    → { ok, tableMissing, docs: [{ id, title, body, position }] }
 *   POST   → create a page: body { title? } → { ok, doc }
 *   PUT    → update a page: body { id, title?, body? } → { ok }
 *   DELETE → ?id=<uuid> remove a page → { ok }
 *
 * Storage: docs/NOTEBOOK_SUPABASE_SCHEMA.sql (notebook_docs). Until that
 * runs, GET returns `tableMissing: true` (page shows a setup hint) and
 * writes 503 cleanly rather than 500-ing.
 */

type NotebookRow = {
  id: string;
  title: string;
  body: string;
  position: number;
  updated_at: string;
};

/** A missing table shows up either as the raw Postgres error (42P01 /
 *  "does not exist") or, more often, as PostgREST's schema-cache miss
 *  (PGRST205 / "Could not find the table … in the schema cache"). */
function isMissingTable(detail: string): boolean {
  return (
    detail.includes("42P01") ||
    detail.includes("PGRST205") ||
    detail.includes("does not exist") ||
    detail.includes("Could not find the table") ||
    detail.includes("schema cache")
  );
}

function missingTableResponse() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Notebook storage isn't set up yet — run docs/NOTEBOOK_SUPABASE_SCHEMA.sql.",
    },
    { status: 503 },
  );
}

export async function GET() {
  const res = await supabaseRest<NotebookRow[]>(
    "notebook_docs?select=id,title,body,position,updated_at&order=position.asc,created_at.asc",
  );

  if (!res.ok) {
    if (isMissingTable(res.detail)) {
      return NextResponse.json({ ok: true, tableMissing: true, docs: [] });
    }
    return NextResponse.json(
      { ok: false, error: res.detail },
      { status: res.status },
    );
  }

  return NextResponse.json({
    ok: true,
    tableMissing: false,
    docs: res.data ?? [],
  });
}

export async function POST(req: Request) {
  let payload: { title?: unknown };
  try {
    payload = (await req.json()) as { title?: unknown };
  } catch {
    payload = {};
  }
  const title =
    typeof payload.title === "string" && payload.title.trim()
      ? payload.title.trim().slice(0, 120)
      : "Untitled";

  // Append at the end: read the current max position, add 1.
  const posRes = await supabaseRest<Array<{ position: number }>>(
    "notebook_docs?select=position&order=position.desc&limit=1",
  );
  if (!posRes.ok) {
    if (isMissingTable(posRes.detail)) return missingTableResponse();
    return NextResponse.json(
      { ok: false, error: posRes.detail },
      { status: posRes.status },
    );
  }
  const nextPos = (posRes.data?.[0]?.position ?? -1) + 1;

  const res = await supabaseRest<NotebookRow[]>("notebook_docs", {
    method: "POST",
    body: JSON.stringify({ title, body: "", position: nextPos }),
    prefer: "return=representation",
  });
  if (!res.ok) {
    if (isMissingTable(res.detail)) return missingTableResponse();
    return NextResponse.json(
      { ok: false, error: res.detail },
      { status: res.status },
    );
  }
  return NextResponse.json({ ok: true, doc: res.data?.[0] ?? null });
}

export async function PUT(req: Request) {
  let payload: { id?: unknown; title?: unknown; body?: unknown };
  try {
    payload = (await req.json()) as {
      id?: unknown;
      title?: unknown;
      body?: unknown;
    };
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }
  if (typeof payload.id !== "string" || !payload.id) {
    return NextResponse.json(
      { ok: false, error: "Missing page id." },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof payload.title === "string") {
    patch.title = payload.title.trim().slice(0, 120) || "Untitled";
  }
  if (typeof payload.body === "string") patch.body = payload.body;

  const res = await supabaseRest(
    `notebook_docs?id=eq.${encodeURIComponent(payload.id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
      prefer: "return=minimal",
    },
  );
  if (!res.ok) {
    if (isMissingTable(res.detail)) return missingTableResponse();
    return NextResponse.json(
      { ok: false, error: res.detail },
      { status: res.status },
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Missing page id." },
      { status: 400 },
    );
  }
  const res = await supabaseRest(
    `notebook_docs?id=eq.${encodeURIComponent(id)}`,
    { method: "DELETE", prefer: "return=minimal" },
  );
  if (!res.ok) {
    if (isMissingTable(res.detail)) return missingTableResponse();
    return NextResponse.json(
      { ok: false, error: res.detail },
      { status: res.status },
    );
  }
  return NextResponse.json({ ok: true });
}

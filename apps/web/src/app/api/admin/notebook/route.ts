import { NextResponse } from "next/server";

import { supabaseRest } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Notebook API — two raw-text scratch docs (Business plan + Notes) shown
 * at /admin/tasks/notebook. Auth: the /api/admin/notebook matcher in
 * proxy.ts gates this behind the shared admin cookie.
 *
 *   GET  → { ok, tableMissing, docs: { business_plan, notes } }
 *   PUT  → upsert one doc: body { slug, body } → { ok }
 *
 * Storage: docs/NOTEBOOK_SUPABASE_SCHEMA.sql (notebook_docs). Until that
 * runs, GET returns `tableMissing: true` (page shows a setup hint) and
 * PUT 503s cleanly rather than 500-ing.
 */

const SLUGS = ["business_plan", "notes"] as const;
type Slug = (typeof SLUGS)[number];

type NotebookRow = { slug: string; body: string; updated_at: string };

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

export async function GET() {
  const res = await supabaseRest<NotebookRow[]>(
    "notebook_docs?select=slug,body,updated_at",
  );

  if (!res.ok) {
    if (isMissingTable(res.detail)) {
      return NextResponse.json({ ok: true, tableMissing: true, docs: {} });
    }
    return NextResponse.json(
      { ok: false, error: res.detail },
      { status: res.status },
    );
  }

  // Key by slug; default any missing doc to an empty body so the editor
  // always has both panels even before the seed rows exist.
  const docs: Record<string, { body: string; updated_at: string | null }> = {};
  for (const slug of SLUGS) docs[slug] = { body: "", updated_at: null };
  for (const row of res.data ?? []) {
    if ((SLUGS as readonly string[]).includes(row.slug)) {
      docs[row.slug] = { body: row.body ?? "", updated_at: row.updated_at };
    }
  }

  return NextResponse.json({ ok: true, tableMissing: false, docs });
}

export async function PUT(req: Request) {
  let payload: { slug?: unknown; body?: unknown };
  try {
    payload = (await req.json()) as { slug?: unknown; body?: unknown };
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const slug = payload.slug;
  if (typeof slug !== "string" || !(SLUGS as readonly string[]).includes(slug)) {
    return NextResponse.json(
      { ok: false, error: "Unknown notebook slug." },
      { status: 400 },
    );
  }
  const body = typeof payload.body === "string" ? payload.body : "";

  // Upsert on the slug primary key (Prefer resolution=merge-duplicates).
  const res = await supabaseRest("notebook_docs", {
    method: "POST",
    body: JSON.stringify({
      slug: slug as Slug,
      body,
      updated_at: new Date().toISOString(),
    }),
    prefer: "resolution=merge-duplicates,return=minimal",
  });

  if (!res.ok) {
    if (isMissingTable(res.detail)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Notebook storage isn't set up yet — run docs/NOTEBOOK_SUPABASE_SCHEMA.sql.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { ok: false, error: res.detail },
      { status: res.status },
    );
  }

  return NextResponse.json({ ok: true });
}

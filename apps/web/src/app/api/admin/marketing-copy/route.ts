import { NextResponse, type NextRequest } from "next/server";

import type {
  CopySnippetCreateInput,
  CopySnippetKind,
  CopySnippetPersona,
  CopySnippetRow,
} from "@/lib/copy-snippets-types";
import { KINDS, PERSONAS } from "@/lib/copy-snippets-types";
import { supabaseRest } from "@/lib/supabase-admin";

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 1000;

/**
 * GET /api/admin/marketing-copy
 *
 * Query params (all optional):
 *  - kind:     one of CopySnippetKind
 *  - persona:  one of CopySnippetPersona
 *  - tag:      a single tag string (matches if present in tags[])
 *  - search:   case-insensitive substring on text
 *  - favorite: "true" → only favourited entries
 *  - limit, offset (default 500 / 0)
 *
 * Returns the snippets ordered by favorite desc, then updated_at desc
 * so favourites bubble to the top of the catalog.
 *
 * Auth: proxy matcher in src/proxy.ts.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = clampInt(searchParams.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT);
  const offset = clampInt(
    searchParams.get("offset"),
    0,
    0,
    Number.MAX_SAFE_INTEGER,
  );

  const kind = searchParams.get("kind");
  const persona = searchParams.get("persona");
  const tag = searchParams.get("tag");
  const search = searchParams.get("search")?.trim() ?? "";
  const favorite = searchParams.get("favorite") === "true";

  const filters: string[] = [];
  if (kind && (KINDS as readonly string[]).includes(kind)) {
    filters.push(`kind=eq.${encodeURIComponent(kind)}`);
  }
  if (persona && (PERSONAS as readonly string[]).includes(persona)) {
    filters.push(`persona=eq.${encodeURIComponent(persona)}`);
  }
  if (tag) {
    // PostgREST `cs.{tag}` = "contains" — array contains the element.
    filters.push(`tags=cs.{${encodeURIComponent(tag)}}`);
  }
  if (favorite) {
    filters.push("favorite=eq.true");
  }
  if (search) {
    const safe = encodeURIComponent(`*${search}*`);
    filters.push(`text=ilike.${safe}`);
  }

  const query = [
    "select=*",
    "order=favorite.desc,updated_at.desc",
    `limit=${limit}`,
    `offset=${offset}`,
    ...filters,
  ].join("&");

  const res = await supabaseRest<CopySnippetRow[]>(`copy_snippets?${query}`);

  if (!res.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to load copy snippets.",
        detail: res.detail,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    snippets: res.data,
    count: res.data.length,
    limit,
    offset,
    filters: {
      kind: (kind as CopySnippetKind) || null,
      persona: (persona as CopySnippetPersona) || null,
      tag: tag || null,
      search: search || null,
      favorite: favorite || null,
    },
  });
}

/**
 * POST /api/admin/marketing-copy
 *
 * Body: { text, kind, persona?, source?, tags?, favorite? }
 * Returns the created row.
 */
export async function POST(req: NextRequest) {
  let body: CopySnippetCreateInput;
  try {
    body = (await req.json()) as CopySnippetCreateInput;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const validated = validateCreate(body);
  if ("error" in validated) {
    return NextResponse.json(
      { ok: false, error: validated.error },
      { status: 400 },
    );
  }

  const res = await supabaseRest<CopySnippetRow[]>("copy_snippets", {
    method: "POST",
    body: JSON.stringify(validated.payload),
    prefer: "return=representation",
  });

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to create snippet.", detail: res.detail },
      { status: 502 },
    );
  }

  const created = Array.isArray(res.data) ? res.data[0] : res.data;
  return NextResponse.json({ ok: true, snippet: created });
}

/* --- helpers --------------------------------------------------------- */

function clampInt(
  raw: string | null,
  fallback: number,
  min: number,
  max: number,
): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

type ValidatedCreate =
  | { error: string }
  | { payload: Record<string, unknown> };

function validateCreate(body: CopySnippetCreateInput): ValidatedCreate {
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length === 0) return { error: "Text is required." };
  if (text.length > 4000) return { error: "Text must be under 4000 chars." };

  if (!(KINDS as readonly string[]).includes(body.kind)) {
    return { error: "Invalid kind." };
  }

  const persona =
    body.persona && (PERSONAS as readonly string[]).includes(body.persona)
      ? body.persona
      : "both";

  const source =
    typeof body.source === "string" && body.source.trim().length > 0
      ? body.source.trim().slice(0, 500)
      : null;

  const tags = Array.isArray(body.tags)
    ? body.tags
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && t.length <= 50)
        .slice(0, 30)
    : [];

  return {
    payload: {
      text,
      kind: body.kind,
      persona,
      source,
      tags,
      favorite: body.favorite === true,
    },
  };
}

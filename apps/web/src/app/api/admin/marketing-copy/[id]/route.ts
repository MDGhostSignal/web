import { NextResponse, type NextRequest } from "next/server";

import type {
  CopySnippetPatchInput,
  CopySnippetRow,
} from "@/lib/copy-snippets-types";
import { KINDS, PERSONAS } from "@/lib/copy-snippets-types";
import { supabaseRest } from "@/lib/supabase-admin";

/**
 * GET    /api/admin/marketing-copy/[id]
 * PATCH  /api/admin/marketing-copy/[id]
 * DELETE /api/admin/marketing-copy/[id]
 *
 * Auth: proxy matcher in src/proxy.ts.
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid snippet id." },
      { status: 400 },
    );
  }

  const res = await supabaseRest<CopySnippetRow[]>(
    `copy_snippets?id=eq.${encodeURIComponent(id)}&limit=1`,
  );
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to load snippet.", detail: res.detail },
      { status: 502 },
    );
  }
  if (res.data.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Snippet not found." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, snippet: res.data[0] });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid snippet id." },
      { status: 400 },
    );
  }

  let body: CopySnippetPatchInput;
  try {
    body = (await req.json()) as CopySnippetPatchInput;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const validated = validatePatch(body);
  if ("error" in validated) {
    return NextResponse.json(
      { ok: false, error: validated.error },
      { status: 400 },
    );
  }
  if (Object.keys(validated.payload).length === 0) {
    return NextResponse.json(
      { ok: false, error: "No editable fields in body." },
      { status: 400 },
    );
  }

  const patchBody = {
    ...validated.payload,
    updated_at: new Date().toISOString(),
  };

  const res = await supabaseRest<CopySnippetRow[]>(
    `copy_snippets?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patchBody),
      prefer: "return=representation",
    },
  );
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to update snippet.", detail: res.detail },
      { status: 502 },
    );
  }
  const updated = Array.isArray(res.data) ? res.data[0] : res.data;
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "Snippet not found." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, snippet: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid snippet id." },
      { status: 400 },
    );
  }
  const res = await supabaseRest(
    `copy_snippets?id=eq.${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to delete snippet.", detail: res.detail },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}

/* --- helpers --------------------------------------------------------- */

type ValidatedPatch =
  | { error: string }
  | { payload: Record<string, unknown> };

function validatePatch(body: CopySnippetPatchInput): ValidatedPatch {
  const out: Record<string, unknown> = {};

  if (body.text !== undefined) {
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (text.length === 0) return { error: "Text cannot be empty." };
    if (text.length > 4000) return { error: "Text must be under 4000 chars." };
    out.text = text;
  }
  if (body.kind !== undefined) {
    if (!(KINDS as readonly string[]).includes(body.kind)) {
      return { error: "Invalid kind." };
    }
    out.kind = body.kind;
  }
  if (body.persona !== undefined) {
    if (!(PERSONAS as readonly string[]).includes(body.persona)) {
      return { error: "Invalid persona." };
    }
    out.persona = body.persona;
  }
  if (body.source !== undefined) {
    if (body.source === null) {
      out.source = null;
    } else if (typeof body.source === "string") {
      const s = body.source.trim();
      out.source = s.length > 0 ? s.slice(0, 500) : null;
    }
  }
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags)) return { error: "Tags must be an array." };
    out.tags = body.tags
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && t.length <= 50)
      .slice(0, 30);
  }
  if (body.favorite !== undefined) {
    out.favorite = body.favorite === true;
  }

  return { payload: out };
}

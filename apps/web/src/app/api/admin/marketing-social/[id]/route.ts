import { NextResponse, type NextRequest } from "next/server";

import type {
  SocialPlatform,
  SocialPostImageRow,
  SocialPostPatchInput,
  SocialPostRow,
  SocialPostStatus,
  SocialPostWithImages,
} from "@/lib/social-posts-types";
import { PLATFORMS, STATUSES } from "@/lib/social-posts-types";
import { supabaseRest } from "@/lib/supabase-admin";
import { deleteObject } from "@/lib/supabase-storage";

/**
 * GET    /api/admin/marketing-social/[id]   — post + its images
 * PATCH  /api/admin/marketing-social/[id]   — edit (partial)
 * DELETE /api/admin/marketing-social/[id]   — delete + cascade Storage
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
      { ok: false, error: "Invalid post id." },
      { status: 400 },
    );
  }

  const [postRes, imgRes] = await Promise.all([
    supabaseRest<SocialPostRow[]>(
      `social_posts?id=eq.${encodeURIComponent(id)}&limit=1`,
    ),
    supabaseRest<SocialPostImageRow[]>(
      `social_post_images?post_id=eq.${encodeURIComponent(id)}&order=position.asc,created_at.asc`,
    ),
  ]);

  if (!postRes.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to load post.", detail: postRes.detail },
      { status: 502 },
    );
  }
  if (!imgRes.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to load images.", detail: imgRes.detail },
      { status: 502 },
    );
  }
  if (postRes.data.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Post not found." },
      { status: 404 },
    );
  }

  const post: SocialPostWithImages = {
    ...postRes.data[0],
    images: imgRes.data,
  };
  return NextResponse.json({ ok: true, post });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid post id." },
      { status: 400 },
    );
  }

  let body: SocialPostPatchInput;
  try {
    body = (await req.json()) as SocialPostPatchInput;
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

  // When transitioning into 'posted', auto-stamp posted_at unless the
  // caller explicitly set one.
  if (
    validated.payload.status === "posted" &&
    !("posted_at" in validated.payload)
  ) {
    validated.payload.posted_at = new Date().toISOString();
  }
  // When transitioning OUT of 'posted', clear posted_at.
  if (
    "status" in validated.payload &&
    validated.payload.status !== "posted" &&
    !("posted_at" in validated.payload)
  ) {
    validated.payload.posted_at = null;
  }

  const patchBody = {
    ...validated.payload,
    updated_at: new Date().toISOString(),
  };

  const res = await supabaseRest<SocialPostRow[]>(
    `social_posts?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patchBody),
      prefer: "return=representation",
    },
  );
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to update post.", detail: res.detail },
      { status: 502 },
    );
  }
  const updated = Array.isArray(res.data) ? res.data[0] : res.data;
  if (!updated) {
    return NextResponse.json(
      { ok: false, error: "Post not found." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true, post: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      { ok: false, error: "Invalid post id." },
      { status: 400 },
    );
  }

  // Read image rows first so we can clear Storage objects.
  const imgRes = await supabaseRest<SocialPostImageRow[]>(
    `social_post_images?post_id=eq.${encodeURIComponent(id)}&select=id,storage_path`,
  );
  if (!imgRes.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to read images for delete.",
        detail: imgRes.detail,
      },
      { status: 502 },
    );
  }

  const storageFailures: Array<{ id: string; detail: string }> = [];
  await Promise.all(
    imgRes.data.map(async (img) => {
      const del = await deleteObject(img.storage_path);
      if (!del.ok) {
        storageFailures.push({ id: img.id, detail: del.detail });
      }
    }),
  );

  const delRes = await supabaseRest(
    `social_posts?id=eq.${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  if (!delRes.ok) {
    return NextResponse.json(
      { ok: false, error: "Failed to delete post.", detail: delRes.detail },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    storageFailures: storageFailures.length > 0 ? storageFailures : undefined,
  });
}

/* --- helpers --------------------------------------------------------- */

type ValidatedPatch =
  | { error: string }
  | { payload: Record<string, unknown> };

function validatePatch(body: SocialPostPatchInput): ValidatedPatch {
  const out: Record<string, unknown> = {};

  if (body.title !== undefined) {
    out.title = trimOrNull(body.title, 200);
  }
  if (body.body !== undefined) {
    const t = typeof body.body === "string" ? body.body.trim() : "";
    if (t.length === 0) return { error: "Body cannot be empty." };
    if (t.length > 50_000) return { error: "Body too long." };
    out.body = t;
  }
  if (body.body_facebook !== undefined) {
    out.body_facebook = trimOrNull(body.body_facebook, 50_000);
  }
  if (body.body_instagram !== undefined) {
    out.body_instagram = trimOrNull(body.body_instagram, 50_000);
  }
  if (body.body_substack !== undefined) {
    out.body_substack = trimOrNull(body.body_substack, 200_000);
  }
  if (body.platforms !== undefined) {
    if (!Array.isArray(body.platforms)) {
      return { error: "platforms must be an array." };
    }
    const filtered = body.platforms.filter((p): p is SocialPlatform =>
      (PLATFORMS as readonly string[]).includes(p),
    );
    if (filtered.length === 0) {
      return { error: "At least one valid platform required." };
    }
    out.platforms = filtered;
  }
  if (body.scheduled_at !== undefined) {
    const d = new Date(body.scheduled_at);
    if (Number.isNaN(d.getTime())) {
      return { error: "scheduled_at must be ISO." };
    }
    out.scheduled_at = d.toISOString();
  }
  if (body.posted_at !== undefined) {
    if (body.posted_at === null) {
      out.posted_at = null;
    } else {
      const d = new Date(body.posted_at);
      if (Number.isNaN(d.getTime())) {
        return { error: "posted_at must be ISO or null." };
      }
      out.posted_at = d.toISOString();
    }
  }
  if (body.status !== undefined) {
    if (!(STATUSES as readonly string[]).includes(body.status)) {
      return { error: "Invalid status." };
    }
    out.status = body.status as SocialPostStatus;
  }
  if (body.notes !== undefined) {
    out.notes = trimOrNull(body.notes, 5000);
  }

  return { payload: out };
}

function trimOrNull(v: unknown, max: number): string | null {
  if (v === null) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t.slice(0, max);
}

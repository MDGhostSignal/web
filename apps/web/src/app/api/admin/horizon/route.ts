import { NextResponse } from "next/server";

import { supabaseRest } from "@/lib/supabase-admin";

import {
  CADENCES,
  HORIZONS,
  STATUSES,
  asEnum,
  asText,
  isMissingTable,
  loadGoals,
  missingTableResponse,
  type GoalRow,
} from "./goals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET    → { ok, tableMissing, goals }
 * POST   → { title, note?, horizon?, cadence?, status?, parent_id?, owner? }
 * PATCH  → { id, ...fields }
 * DELETE → ?id=<uuid>
 *
 * Auth is the /api/admin/horizon matcher in proxy.ts.
 */

export async function GET() {
  const res = await loadGoals();
  if (!res.ok) {
    if (isMissingTable(res.detail)) {
      return NextResponse.json({ ok: true, tableMissing: true, goals: [] });
    }
    return NextResponse.json(
      { ok: false, error: "Failed to load goals.", detail: res.detail },
      { status: 502 },
    );
  }
  return NextResponse.json({
    ok: true,
    tableMissing: false,
    goals: res.data ?? [],
  });
}

export async function POST(req: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  const title = asText(payload.title, 160);
  if (!title) {
    return NextResponse.json(
      { ok: false, error: "A title is required." },
      { status: 400 },
    );
  }

  const horizon = asEnum<GoalRow["horizon"]>(payload.horizon, HORIZONS) ?? "short";
  const existing = await supabaseRest<Array<{ sort_order: number }>>(
    `company_goals?select=sort_order&horizon=eq.${horizon}&order=sort_order.desc&limit=1`,
  );
  if (!existing.ok) {
    if (isMissingTable(existing.detail)) return missingTableResponse();
    return NextResponse.json(
      { ok: false, error: existing.detail },
      { status: existing.status },
    );
  }

  const parentId =
    typeof payload.parent_id === "string" && payload.parent_id ? payload.parent_id : null;

  const row = {
    title,
    note: asText(payload.note, 600) ?? "",
    horizon,
    cadence: asEnum<GoalRow["cadence"]>(payload.cadence, CADENCES) ?? "month",
    status: asEnum<GoalRow["status"]>(payload.status, STATUSES) ?? "on_track",
    parent_id: parentId,
    owner: asText(payload.owner, 80) ?? "",
    sort_order: (existing.data?.[0]?.sort_order ?? -1) + 1,
  };

  const res = await supabaseRest<GoalRow[]>("company_goals", {
    method: "POST",
    body: JSON.stringify(row),
    prefer: "return=representation",
  });
  if (!res.ok) {
    if (isMissingTable(res.detail)) return missingTableResponse();
    return NextResponse.json(
      { ok: false, error: res.detail },
      { status: res.status },
    );
  }
  return NextResponse.json({ ok: true, goal: res.data?.[0] ?? null });
}

export async function PATCH(req: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Expected a JSON body." },
      { status: 400 },
    );
  }

  const id = asText(payload.id, 40);
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Missing goal id." },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("title" in payload) {
    const title = asText(payload.title, 160);
    if (!title) {
      return NextResponse.json(
        { ok: false, error: "A title is required." },
        { status: 400 },
      );
    }
    patch.title = title;
  }
  if ("note" in payload) patch.note = asText(payload.note, 600) ?? "";
  if ("owner" in payload) patch.owner = asText(payload.owner, 80) ?? "";
  if ("horizon" in payload) {
    const horizon = asEnum(payload.horizon, HORIZONS);
    if (!horizon) {
      return NextResponse.json(
        { ok: false, error: "Unknown horizon." },
        { status: 400 },
      );
    }
    patch.horizon = horizon;
  }
  if ("cadence" in payload) {
    const cadence = asEnum(payload.cadence, CADENCES);
    if (!cadence) {
      return NextResponse.json(
        { ok: false, error: "Unknown cadence." },
        { status: 400 },
      );
    }
    patch.cadence = cadence;
  }
  if ("status" in payload) {
    const status = asEnum(payload.status, STATUSES);
    if (!status) {
      return NextResponse.json(
        { ok: false, error: "Unknown status." },
        { status: 400 },
      );
    }
    patch.status = status;
  }
  if ("parent_id" in payload) {
    const parent = payload.parent_id;
    if (parent === null || parent === "") patch.parent_id = null;
    else if (typeof parent === "string") {
      if (parent === id) {
        return NextResponse.json(
          { ok: false, error: "A goal cannot connect to itself." },
          { status: 400 },
        );
      }
      patch.parent_id = parent;
    }
  }
  if ("sort_order" in payload && typeof payload.sort_order === "number") {
    patch.sort_order = payload.sort_order;
  }

  const res = await supabaseRest<GoalRow[]>(
    `company_goals?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
      prefer: "return=representation",
    },
  );
  if (!res.ok) {
    if (isMissingTable(res.detail)) return missingTableResponse();
    return NextResponse.json(
      { ok: false, error: res.detail },
      { status: res.status },
    );
  }
  return NextResponse.json({ ok: true, goal: res.data?.[0] ?? null });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Missing goal id." },
      { status: 400 },
    );
  }
  const res = await supabaseRest(
    `company_goals?id=eq.${encodeURIComponent(id)}`,
    { method: "DELETE" },
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

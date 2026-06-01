import { NextResponse } from "next/server";

import type { CrmAlert } from "@/lib/alerts";
import { supabaseRest } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  action: "snooze" | "resolve" | "reopen";
  /** For action=snooze. Defaults to 7 days. */
  snooze_days?: number;
};

/**
 * PATCH /api/admin/alerts/[id] — snooze, resolve, or reopen a single alert.
 *
 *   action=resolve  → resolved_at = now, snoozed_until = null
 *   action=snooze   → snoozed_until = now + snooze_days
 *   action=reopen   → resolved_at = null, snoozed_until = null
 *                     (admin can undo a manual resolve)
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as Partial<Body>;

  let patch: Record<string, string | null>;
  switch (body.action) {
    case "resolve":
      patch = { resolved_at: new Date().toISOString(), snoozed_until: null };
      break;
    case "reopen":
      patch = { resolved_at: null, snoozed_until: null };
      break;
    case "snooze": {
      const days = Math.max(
        1,
        Math.min(30, Math.round(body.snooze_days ?? 7)),
      );
      const until = new Date(Date.now() + days * 86_400_000);
      patch = { snoozed_until: until.toISOString() };
      break;
    }
    default:
      return NextResponse.json(
        { ok: false, error: "Invalid action." },
        { status: 400 },
      );
  }

  const res = await supabaseRest<CrmAlert[]>(
    `crm_alerts?id=eq.${id}`,
    {
      method: "PATCH",
      body: JSON.stringify(patch),
      prefer: "return=representation",
    },
  );

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: res.detail },
      { status: res.status },
    );
  }

  const row = (res.data ?? [])[0];
  return NextResponse.json({ ok: true, alert: row });
}

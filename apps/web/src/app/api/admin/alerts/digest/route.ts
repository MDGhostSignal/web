import { NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, verifyAdminCookie } from "@/lib/admin-auth";
import { supabaseRest } from "@/lib/supabase-admin";

import {
  CONTRACT_ALERT_OWNERS,
  type DigestAlert,
  fallbackEmail,
  ownerEmailFromEnv,
  ownerForAlert,
  sendDigestEmail,
} from "../emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/alerts/digest — daily digest entry point.
 *
 * Fetches every currently-open alert (resolved_at IS NULL,
 * snoozed_until is null/past), groups by member.owner, and sends one
 * email per group:
 *
 *   • Owner has a configured email (env ALERT_EMAIL_<SLUG>) → that
 *     address.
 *   • Owner has NO configured email, or owner is null → fall back to
 *     ALERT_EMAIL_FALLBACK (default hello@ghostsignal.cloud).
 *
 * Exception: `contract_expiring` (renewal/expiry) alerts ignore the
 * member's owner and always route to the contract owners — Mike + Jack
 * (see CONTRACT_ALERT_OWNERS in ../emails.ts). Both receive every
 * contract alert; they appear in no other owner's digest.
 *
 * Auth: Bearer CRON_SECRET (GitHub Actions) OR admin cookie (manual
 * "Send digest now" trigger from the UI).
 *
 * Returns counts so the cron run log shows what happened.
 */
export async function POST(req: Request) {
  // Auth — same dual path as the sync endpoint.
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const bearerOk = cronSecret && auth === `Bearer ${cronSecret}`;
  let ok = bearerOk;
  if (!ok) {
    const cookie = req.headers
      .get("cookie")
      ?.split("; ")
      .find((c) => c.startsWith(`${ADMIN_COOKIE_NAME}=`))
      ?.split("=")[1];
    ok = !!cookie && (await verifyAdminCookie(cookie));
  }
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  // Pull open + non-snoozed alerts. PostgREST embed pulls both the
  // member-side and task-side subject columns the digest renders;
  // exactly one of (member, task) is populated per row per the
  // subject-check constraint.
  const nowIso = new Date().toISOString();
  const path =
    "crm_alerts?select=*," +
    "member:members(id,first_name,last_name,owner,phase,organization)," +
    "task:design_tasks(id,title,status,priority,assigned_to,created_by)" +
    "&resolved_at=is.null" +
    // campaign_ending alerts get their own one-time email at detection
    // time (see campaign-alerts/sync), so keep them out of this digest.
    "&kind=neq.campaign_ending" +
    `&or=(snoozed_until.is.null,snoozed_until.lt.${nowIso})` +
    "&order=triggered_at.desc";

  const res = await supabaseRest<DigestAlert[]>(path);
  if (!res.ok) {
    return NextResponse.json(
      { ok: false, error: res.detail },
      { status: res.status },
    );
  }

  const alerts = res.data ?? [];
  if (alerts.length === 0) {
    return NextResponse.json({
      ok: true,
      total_alerts: 0,
      groups_sent: 0,
      details: [],
    });
  }

  // Group by owner ("" = fallback bucket). Member alerts route by
  // member.owner; task alerts route by task.assigned_to (or
  // task.created_by when unassigned). See `ownerForAlert` in
  // ../emails.ts for the resolution rule.
  //
  // Exception: contract renewal/expiry alerts always go to the contract
  // owners (Mike + Jack), regardless of the member's owner — so they
  // land in BOTH those buckets and nowhere else.
  const byOwner = new Map<string, DigestAlert[]>();
  const pushTo = (key: string, a: DigestAlert) => {
    const arr = byOwner.get(key) ?? [];
    arr.push(a);
    byOwner.set(key, arr);
  };
  for (const a of alerts) {
    if (a.kind === "contract_expiring") {
      for (const owner of CONTRACT_ALERT_OWNERS) pushTo(owner, a);
      continue;
    }
    pushTo(ownerForAlert(a) ?? "", a);
  }

  // Collapse owner buckets by their RESOLVED recipient address, so one
  // inbox never receives two digest emails in a single run — e.g. Jack
  // unconfigured falls back to the same address as the Unowned bucket,
  // or two owners share an address. Within a recipient, alerts are
  // de-duplicated by id (a contract alert routed to both Mike + Jack is
  // listed once if those names happen to resolve to the same inbox).
  const byRecipient = new Map<
    string,
    { to: string; ownerNames: string[]; alerts: DigestAlert[]; seen: Set<string> }
  >();
  for (const [ownerKey, group] of byOwner) {
    const isFallback = ownerKey === "";
    const ownerName = isFallback ? "Unowned" : ownerKey;
    const to = isFallback
      ? fallbackEmail()
      : ownerEmailFromEnv(ownerKey) ?? fallbackEmail();
    const key = to.trim().toLowerCase();
    const bucket =
      byRecipient.get(key) ??
      { to, ownerNames: [], alerts: [], seen: new Set<string>() };
    if (!bucket.ownerNames.includes(ownerName)) bucket.ownerNames.push(ownerName);
    for (const a of group) {
      if (bucket.seen.has(a.id)) continue;
      bucket.seen.add(a.id);
      bucket.alerts.push(a);
    }
    byRecipient.set(key, bucket);
  }

  const details: Array<{
    owner: string;
    recipient: string;
    count: number;
    sent: boolean;
    reason?: string;
  }> = [];

  for (const [, bucket] of byRecipient) {
    const ownerName = bucket.ownerNames.join(" + ");
    const r = await sendDigestEmail({
      to: bucket.to,
      ownerName,
      alerts: bucket.alerts,
    });
    details.push({
      owner: ownerName,
      recipient: bucket.to,
      count: bucket.alerts.length,
      sent: r.sent,
      reason: r.reason,
    });
  }

  return NextResponse.json({
    ok: true,
    total_alerts: alerts.length,
    groups_sent: details.filter((d) => d.sent).length,
    details,
  });
}

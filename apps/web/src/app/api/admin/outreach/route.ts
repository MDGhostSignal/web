import { NextResponse, type NextRequest } from "next/server";

import {
  coldOutreachEmailHtml,
  coldOutreachSubject,
} from "@/lib/cold-outreach-email";
import { supabaseRest } from "@/lib/supabase-admin";

/**
 * /api/admin/outreach — cold-email brand outreach (Mike's tab).
 *
 * GET  — the reachout list, newest first, for /admin/outreach.
 *        Tolerates a missing table (returns tableMissing so the page
 *        can point at docs/OUTREACH_SUPABASE_SCHEMA.sql).
 * POST — { name, email, message, force? }: files a cold_outreach row,
 *        then sends the email via Resend (template in
 *        lib/cold-outreach-email.ts — pitch copy still placeholder).
 *        Repeat sends to an email Mike already contacted 409 unless
 *        force is set, so nobody gets double-cold-emailed by accident.
 *        A Resend failure marks the row status 'failed' (visible in
 *        the list) and returns 502.
 *
 * No auth check here — cookie-gated by the proxy matcher entry
 * "/api/admin/outreach/:path*".
 */

export type OutreachRow = {
  id: string;
  name: string;
  email: string;
  message: string | null;
  status: string;
  sent_at: string | null;
  created_at: string | null;
};

export async function GET() {
  const res = await supabaseRest<OutreachRow[]>(
    "cold_outreach?select=id,name,email,message,status,sent_at,created_at&order=created_at.desc&limit=500",
  );
  if (!res.ok) {
    // Table not created yet — an empty tab with a setup hint beats a 502.
    if (res.detail.includes("cold_outreach")) {
      return NextResponse.json({ ok: true, outreach: [], tableMissing: true });
    }
    return NextResponse.json(
      { ok: false, error: "Failed to load outreach list.", detail: res.detail },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, outreach: res.data });
}

export async function POST(req: NextRequest) {
  let body: {
    name?: string;
    email?: string;
    message?: string;
    force?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const message = body.message?.trim() ?? "";
  if (!name) {
    return NextResponse.json({ error: "Name required." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json(
      { error: "Personal message required." },
      { status: 400 },
    );
  }

  const resendKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM;
  if (!resendKey || !resendFrom) {
    return NextResponse.json(
      { error: "Email sending is not configured (RESEND_API_KEY / RESEND_FROM)." },
      { status: 500 },
    );
  }

  // --- Duplicate guard -------------------------------------------
  const dupRes = await supabaseRest<Array<{ created_at: string | null }>>(
    `cold_outreach?select=created_at&email=ilike.${encodeURIComponent(email)}&order=created_at.desc&limit=1`,
  );
  if (!dupRes.ok && dupRes.detail.includes("cold_outreach")) {
    return NextResponse.json(
      {
        error:
          "The cold_outreach table doesn't exist yet — run docs/OUTREACH_SUPABASE_SCHEMA.sql in the Supabase SQL editor first.",
      },
      { status: 500 },
    );
  }
  const previous = dupRes.ok ? (dupRes.data?.[0] ?? null) : null;
  if (previous && body.force !== true) {
    return NextResponse.json(
      {
        error: "This address was already contacted.",
        alreadyContactedAt: previous.created_at,
      },
      { status: 409 },
    );
  }

  // --- 1 · File the row ------------------------------------------
  const ins = await supabaseRest<Array<{ id: string }>>("cold_outreach", {
    method: "POST",
    body: JSON.stringify({
      name,
      email,
      message,
      status: "sent",
      sent_at: new Date().toISOString(),
    }),
    prefer: "return=representation",
  });
  if (!ins.ok || !ins.data?.[0]?.id) {
    const detail = ins.ok ? "no row returned" : ins.detail.slice(0, 200);
    return NextResponse.json(
      { error: `Could not file the outreach row: ${detail}` },
      { status: 500 },
    );
  }
  const rowId = ins.data[0].id;

  // --- 2 · Send the email ----------------------------------------
  const sendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFrom,
      to: [email],
      subject: coldOutreachSubject(name),
      html: coldOutreachEmailHtml({ name, message }),
    }),
  });
  if (!sendRes.ok) {
    const detail = await sendRes.text();
    await supabaseRest(`cold_outreach?id=eq.${encodeURIComponent(rowId)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "failed" }),
      prefer: "return=minimal",
    });
    return NextResponse.json(
      {
        error: `Reachout filed, but the email failed to send (${sendRes.status}): ${detail.slice(0, 200)}`,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, id: rowId });
}

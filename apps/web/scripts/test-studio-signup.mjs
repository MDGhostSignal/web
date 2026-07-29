// End-to-end smoke test for open Studio signup (2026-07-29):
// auto-activation + quiz-submission adoption at registration.
//
// Flow (all sentinel data, deleted in `finally` even on crash):
//   1. Insert a sentinel scored XQ submission for a test email.
//   2. Create a pre-confirmed Supabase auth user for that email via
//      the admin API (stands in for the user clicking the email link).
//   3. POST the deployed /api/studio/register like the browser does.
//   4. Verify the created members row: activated_at set (open signup),
//      xq_submission_id adopted from step 1, xq_archetype denormalized.
//   5. Cleanup: members row, auth user, sentinel submission.
//
// Run: cd apps/web && node scripts/test-studio-signup.mjs

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, "..", ".env.local");

function loadEnv(path) {
  const out = {};
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

const env = loadEnv(ENV_PATH);
const SUPABASE_URL = env.SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const SITE = env.STUDIO_TEST_SITE_URL ?? "https://www.ghostsignal.cloud";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const TEST_EMAIL = `e2e-signup-${randomUUID().slice(0, 8)}@ghostsignal-test.invalid`;
const H = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function pg(path, init = {}) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...H, Prefer: "return=representation", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`PostgREST ${r.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

const results = [];
function step(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  let xqId = null;
  let authUserId = null;
  let memberId = null;

  console.log(`\nSentinel identity: ${TEST_EMAIL}\n`);
  try {
    // 1 · Sentinel scored XQ submission (pre-existing quiz history).
    const xq = await pg("xq_submissions", {
      method: "POST",
      body: JSON.stringify({
        source: "e2e-test-studio-signup",
        status: "complete",
        first_name: "E2E",
        last_name: "Signup",
        email: TEST_EMAIL,
        xq_code: "ARC",
        xq_archetype_name: "The Architect",
        submitted_at: new Date().toISOString(),
      }),
    });
    xqId = xq[0]?.id ?? null;
    step("sentinel XQ submission inserted", Boolean(xqId), xqId ?? "");

    // 2 · Pre-confirmed auth user (simulates the confirmed email).
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: H,
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: `E2e!${randomUUID()}`,
        email_confirm: true,
      }),
    });
    const authBody = await authRes.json();
    authUserId = authBody?.id ?? null;
    step("auth user created (pre-confirmed)", authRes.ok && Boolean(authUserId), authUserId ?? JSON.stringify(authBody).slice(0, 120));

    // 3 · Deployed register route, exactly as the browser calls it.
    const reg = await fetch(`${SITE}/api/studio/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authUserId,
        email: TEST_EMAIL,
        firstName: "E2E",
        lastName: "Signup",
        kind: "brand",
        orgName: "E2E Sentinel Org",
      }),
    });
    const regBody = await reg.json().catch(() => ({}));
    memberId = regBody?.memberId ?? null;
    step(
      "POST /api/studio/register succeeded",
      reg.ok && Boolean(memberId),
      reg.ok ? `mode=${regBody.mode}` : `${reg.status} ${JSON.stringify(regBody).slice(0, 160)}`,
    );

    // 4 · Verify the members row.
    if (memberId) {
      const rows = await pg(
        `members?select=activated_at,xq_submission_id,xq_archetype,rq_submission_id,first_name&id=eq.${memberId}`,
      );
      const m = rows[0] ?? {};
      step("open signup: activated_at set at registration", m.activated_at != null, m.activated_at ?? "null");
      step("adoption: xq_submission_id linked to sentinel quiz", m.xq_submission_id === xqId, `${m.xq_submission_id}`);
      step("adoption: xq_archetype denormalized from quiz", m.xq_archetype === "ARC", `${m.xq_archetype}`);
      step("no RQ history → rq_submission_id stays null", m.rq_submission_id === null);
      step("name captured on member row", m.first_name === "E2E", `${m.first_name}`);
    }
  } finally {
    console.log("\n═══ Cleanup ═══");
    if (memberId) {
      try {
        await pg(`members?id=eq.${memberId}`, { method: "DELETE" });
        step("sentinel members row deleted", true);
      } catch (e) {
        step("sentinel members row deleted", false, `MANUAL CLEANUP: ${e.message}`);
      }
    }
    if (authUserId) {
      try {
        const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${authUserId}`, {
          method: "DELETE",
          headers: H,
        });
        step("sentinel auth user deleted", r.ok, r.ok ? "" : `MANUAL CLEANUP: HTTP ${r.status}`);
      } catch (e) {
        step("sentinel auth user deleted", false, `MANUAL CLEANUP: ${e.message}`);
      }
    }
    if (xqId) {
      try {
        await pg(`xq_submissions?id=eq.${xqId}`, { method: "DELETE" });
        step("sentinel XQ submission deleted", true);
      } catch (e) {
        step("sentinel XQ submission deleted", false, `MANUAL CLEANUP: ${e.message}`);
      }
    }
  }

  console.log("\n═══ Summary ═══");
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`${passed}/${results.length} checks passed`);
  if (failed > 0) {
    console.log("\nFailures:");
    for (const r of results.filter((x) => !x.ok)) {
      console.log(`  ✗  ${r.name}: ${r.detail}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("\n✗  Fatal:", e);
  process.exit(1);
});

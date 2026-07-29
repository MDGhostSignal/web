// End-to-end smoke test for the Studio Lite curation tables + admin
// Studio surfaces: studio_brand_recommendations (GS Picks) and
// studio_contact_requests (intro requests), plus the tagline/bio
// columns from the 2026-07 migrations.
//
// Strategy: schema probes against the live DB, unauth gate checks
// against the deployed API routes, then an insert → verify → restore
// lifecycle that only ever touches rows THIS SCRIPT creates (tagged
// via a sentinel note/message) — existing team data is never mutated.
// A `finally` deletes the sentinel rows even on crash.
//
// The admin picks/requests routes are cookie-gated with no bearer
// path, so their happy paths are exercised at the PostgREST layer
// (the exact writes the routes perform) rather than through HTTP.
//
// Run: cd apps/web && node scripts/test-studio-picks.mjs

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

const REST = `${SUPABASE_URL}/rest/v1`;
const H_READ = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};
const H_WRITE = {
  ...H_READ,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const SENTINEL = "e2e-test-studio-picks — safe to delete";

async function pg(path, init = {}) {
  const r = await fetch(`${REST}/${path}`, {
    ...init,
    headers: { ...H_READ, ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const text = await r.text();
  if (!r.ok) {
    const err = new Error(`PostgREST ${r.status}: ${text}`);
    err.status = r.status;
    err.body = text;
    throw err;
  }
  return text ? JSON.parse(text) : null;
}

const results = [];
function step(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log("\n═══ 1 · Schema verification (2026-07 migrations) ═══");

  for (const probe of [
    ["studio_brand_recommendations table + columns", "studio_brand_recommendations?select=id,member_id,brand_id,position,note,created_at&limit=1"],
    ["studio_contact_requests table + columns", "studio_contact_requests?select=id,member_id,brand_id,message,status,created_at&limit=1"],
    ["brands.tagline column", "brands?select=id,tagline&limit=1"],
    ["creators.tagline column", "creators?select=id,tagline&limit=1"],
    ["members.tagline + members.bio columns", "members?select=id,tagline,bio&limit=1"],
  ]) {
    try {
      await pg(probe[1]);
      step(probe[0], true);
    } catch (e) {
      step(probe[0], false, e.message);
    }
  }

  console.log("\n═══ 2 · Deployed route gates (unauth) ═══");

  {
    const r = await fetch(`${SITE}/api/admin/studio/picks`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    step("PUT /api/admin/studio/picks unauth → 401", r.status === 401, `got ${r.status}`);
  }
  {
    const r = await fetch(
      `${SITE}/api/admin/studio/requests/00000000-0000-0000-0000-000000000000`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "done" }),
      },
    );
    step("PATCH /api/admin/studio/requests/:id unauth → 401", r.status === 401, `got ${r.status}`);
  }
  {
    const r = await fetch(`${SITE}/api/studio/contact-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    step("POST /api/studio/contact-requests unauth → 401", r.status === 401, `got ${r.status}`);
  }

  console.log("\n═══ 3 · GS Picks lifecycle (sentinel rows only) ═══");

  const members = await pg("members?select=id,first_name,last_name&limit=1");
  const brands = await pg("brands?select=id,name&order=name.asc&limit=2");
  const member = members[0];
  const canLifecycle = member && brands.length >= 2;
  if (!canLifecycle) {
    step("found a member + 2 brands to test with", false, `members=${members.length} brands=${brands.length}`);
  } else {
    step(
      "picked test member + brands",
      true,
      `${member.first_name ?? "?"} ${member.last_name ?? ""} / ${brands.map((b) => b.name).join(", ")}`,
    );
  }

  if (canLifecycle) {
    try {
      // Mirror the admin route's replace-all shape: positions 1..n.
      const inserted = await pg("studio_brand_recommendations", {
        method: "POST",
        headers: H_WRITE,
        body: JSON.stringify([
          { member_id: member.id, brand_id: brands[0].id, position: 1, note: SENTINEL },
          { member_id: member.id, brand_id: brands[1].id, position: 2, note: SENTINEL },
        ]),
      });
      step("inserted 2 sentinel picks", inserted.length === 2);

      // The roster loader's exact query shape (studio-data.ts).
      const loaded = await pg(
        `studio_brand_recommendations?select=brand_id,position,note&member_id=eq.${member.id}&order=position.asc&limit=4`,
      );
      const ours = loaded.filter((p) => p.note === SENTINEL);
      const ordered =
        ours.length === 2 &&
        ours[0].brand_id === brands[0].id &&
        ours[1].brand_id === brands[1].id;
      step("roster-loader query returns picks in position order", ordered, `${ours.length} sentinel rows`);

      // Unique (member, brand) — the constraint the admin route's
      // dedupe guards against.
      let uniqueFired = false;
      try {
        await pg("studio_brand_recommendations", {
          method: "POST",
          headers: H_WRITE,
          body: JSON.stringify({ member_id: member.id, brand_id: brands[0].id, position: 3, note: SENTINEL }),
        });
      } catch (e) {
        uniqueFired = e.status === 409 && e.body.includes("studio_brand_recommendations_unique");
      }
      step("duplicate (member, brand) pick rejected by unique constraint", uniqueFired);
    } finally {
      try {
        await pg(`studio_brand_recommendations?note=eq.${encodeURIComponent(SENTINEL)}`, {
          method: "DELETE",
        });
        const leftovers = await pg(
          `studio_brand_recommendations?select=id&note=eq.${encodeURIComponent(SENTINEL)}`,
        );
        step("sentinel picks cleaned up", leftovers.length === 0);
      } catch (e) {
        step("sentinel picks cleaned up", false, `MANUAL CLEANUP NEEDED: ${e.message}`);
      }
    }
  }

  console.log("\n═══ 4 · Intro-request lifecycle (sentinel rows only) ═══");

  if (canLifecycle) {
    try {
      // Mirror the member route's insert (status defaults to 'new').
      const ins = await pg("studio_contact_requests", {
        method: "POST",
        headers: H_WRITE,
        body: JSON.stringify({ member_id: member.id, brand_id: brands[0].id, message: SENTINEL }),
      });
      step("filed sentinel intro request", ins.length === 1);
      step("status defaulted to 'new'", ins[0]?.status === "new", `got '${ins[0]?.status}'`);

      // Duplicate → the 409 the member-facing route maps to
      // "already requested".
      let uniqueFired = false;
      try {
        await pg("studio_contact_requests", {
          method: "POST",
          headers: H_WRITE,
          body: JSON.stringify({ member_id: member.id, brand_id: brands[0].id, message: SENTINEL }),
        });
      } catch (e) {
        uniqueFired = e.status === 409 && e.body.includes("studio_contact_requests_unique");
      }
      step("duplicate request rejected by unique constraint", uniqueFired);

      // Mirror the admin triage route's status flip.
      const patched = await pg(`studio_contact_requests?id=eq.${ins[0].id}`, {
        method: "PATCH",
        headers: H_WRITE,
        body: JSON.stringify({ status: "done" }),
      });
      step("status flip new → done persisted", patched[0]?.status === "done");

      // Admin page's join query shape.
      const joined = await pg(
        `studio_contact_requests?select=id,status,members(first_name),brands(name)&id=eq.${ins[0].id}`,
      );
      step(
        "admin triage join (members + brands) resolves",
        joined.length === 1 && joined[0].brands?.name != null,
        joined[0] ? `brand=${joined[0].brands?.name}` : "no row",
      );
    } finally {
      try {
        await pg(`studio_contact_requests?message=eq.${encodeURIComponent(SENTINEL)}`, {
          method: "DELETE",
        });
        const leftovers = await pg(
          `studio_contact_requests?select=id&message=eq.${encodeURIComponent(SENTINEL)}`,
        );
        step("sentinel requests cleaned up", leftovers.length === 0);
      } catch (e) {
        step("sentinel requests cleaned up", false, `MANUAL CLEANUP NEEDED: ${e.message}`);
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

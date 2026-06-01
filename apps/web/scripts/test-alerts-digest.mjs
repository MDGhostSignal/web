// Live test of the daily email digest path.
//
// 1) Snapshots current open alert state
// 2) Picks an active member with an owner, backdates them
// 3) Hits prod /api/admin/alerts/sync to open a real alert
// 4) Hits prod /api/admin/alerts/digest to actually send an email
// 5) Reports which inbox the email went to + any send errors
// 6) Restores the member, re-syncs, confirms alert auto-resolved
//
// Run: cd apps/web && node scripts/test-alerts-digest.mjs

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, "..", ".env.local");

function loadEnv(p) {
  const out = {};
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
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
const CRON_SECRET = env.CRON_SECRET;
const BASE =
  env.SITE_ORIGIN ?? "https://www.ghostsignal.cloud";

const REST = `${SUPABASE_URL}/rest/v1`;
const H = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function pg(path, init = {}) {
  const r = await fetch(`${REST}/${path}`, {
    ...init,
    headers: { ...H, ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`PostgREST ${r.status}: ${t}`);
  return t ? JSON.parse(t) : null;
}

async function callProd(pathName) {
  const r = await fetch(`${BASE}${pathName}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, body };
}

console.log("Target prod base:", BASE);

// Pick an active member with an owner set so the digest has a real
// per-owner recipient to route to.
const candidates = await pg(
  "members?select=id,first_name,last_name,owner,phase,last_contact_at" +
    "&phase=not.in.(paused,churned)" +
    "&owner=not.is.null" +
    "&order=created_at.desc&limit=20",
);
const member = candidates.find((m) => m.last_contact_at != null);
if (!member) {
  console.error("No active member with owner + last_contact_at found. Aborting.");
  process.exit(1);
}
console.log(
  `Test member: ${member.first_name} ${member.last_name ?? ""} (owner: ${member.owner})`,
);

const original = member.last_contact_at;
let restored = false;

try {
  // ── Backdate ────────────────────────────────────────────────────────
  await pg(`members?id=eq.${member.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      last_contact_at: new Date(Date.now() - 40 * 86_400_000).toISOString(),
    }),
  });
  console.log("✓  backdated 40 days");

  // ── Sync → open alert ───────────────────────────────────────────────
  const sync = await callProd("/api/admin/alerts/sync");
  console.log(`✓  sync: ${JSON.stringify(sync.body)}`);

  // ── Digest → send real email ────────────────────────────────────────
  console.log("\n→ calling /api/admin/alerts/digest ...");
  const digest = await callProd("/api/admin/alerts/digest");
  console.log(`status: ${digest.status}`);
  console.log(JSON.stringify(digest.body, null, 2));

  if (digest.ok && digest.body.details) {
    console.log("\n── Email routing report ──");
    for (const d of digest.body.details) {
      const flag = d.sent ? "✓ SENT" : "✗ FAILED";
      console.log(
        `${flag}  ${d.owner.padEnd(20)} → ${d.recipient}  (${d.count} alerts)`,
      );
      if (d.reason) console.log(`        reason: ${d.reason}`);
    }
  }
} finally {
  // ── Restore + clean up ──────────────────────────────────────────────
  try {
    await pg(`members?id=eq.${member.id}`, {
      method: "PATCH",
      body: JSON.stringify({ last_contact_at: original }),
    });
    restored = true;
    console.log("\n✓  restored original last_contact_at");
    const cleanup = await callProd("/api/admin/alerts/sync");
    console.log(`✓  cleanup sync: resolved=${cleanup.body.resolved}`);
  } catch (e) {
    console.error("✗ restore failed:", e.message);
  }
  if (!restored) {
    console.error(
      `\n⚠  MANUAL REVERT NEEDED: update members set last_contact_at='${original}' where id='${member.id}';`,
    );
  }
}

// End-to-end test for the ART19 integration. Verifies schema,
// exercises the sync endpoint, confirms rows landed in Supabase, and
// pings each read endpoint.
//
// Designed to be useful in three phases of the rollout:
//   (a) before ART19 creds work: schema + endpoint shape only
//   (b) after creds land: full end-to-end (sync + data + reads)
//   (c) after listen metrics land: same + the listens endpoint shows
//       hasData=true and totals > 0
//
// Read-only against ART19 (we never mutate the upstream). All writes
// are to our own Supabase. Safe to re-run.
//
// Run: cd apps/web && node scripts/test-art19.mjs

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
const SYNC_URL =
  env.ART19_SYNC_URL ?? "https://www.ghostsignal.cloud/api/admin/art19/sync";
const READ_BASE =
  env.SITE_ORIGIN ?? "https://www.ghostsignal.cloud";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const REST = `${SUPABASE_URL}/rest/v1`;
const H_READ = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

async function pg(path) {
  const r = await fetch(`${REST}/${path}`, { headers: H_READ, cache: "no-store" });
  const text = await r.text();
  if (!r.ok) throw new Error(`PostgREST ${r.status}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

const results = [];
function step(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "✓" : "✗"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log("\n═══ 1 · Schema verification ═══");
  const tables = [
    "art19_network",
    "art19_shows",
    "art19_episodes",
    "art19_listens_daily",
    "art19_sync_runs",
  ];
  for (const t of tables) {
    try {
      await pg(`${t}?select=*&limit=0`);
      step(`table ${t} exists`, true);
    } catch (e) {
      step(`table ${t} exists`, false, e.message);
    }
  }

  // Spot-check critical columns by selecting them.
  try {
    await pg("art19_shows?select=id,title,network_id,episode_count,art19_updated_at&limit=0");
    step("art19_shows critical columns present", true);
  } catch (e) {
    step("art19_shows critical columns present", false, e.message);
  }
  try {
    await pg("art19_episodes?select=id,show_id,title,published_at,duration_seconds&limit=0");
    step("art19_episodes critical columns present", true);
  } catch (e) {
    step("art19_episodes critical columns present", false, e.message);
  }
  try {
    await pg("art19_listens_daily?select=show_id,date,listens,downloads&limit=0");
    step("art19_listens_daily critical columns present", true);
  } catch (e) {
    step("art19_listens_daily critical columns present", false, e.message);
  }

  console.log("\n═══ 2 · Current state ═══");
  const shows = await pg("art19_shows?select=id");
  const eps = await pg("art19_episodes?select=id");
  const runs = await pg(
    "art19_sync_runs?select=status,started_at,show_count,episode_count,error_message&order=started_at.desc&limit=1",
  );
  const lastRun = runs?.[0] ?? null;
  console.log(`   shows=${shows.length}  episodes=${eps.length}  lastRun=${lastRun ? lastRun.status : "(none)"}`);
  step("queried current cache", true);

  console.log("\n═══ 3 · Sync endpoint ═══");
  if (!CRON_SECRET) {
    step("triggered sync", false, "CRON_SECRET missing in .env.local");
  } else {
    const r = await fetch(SYNC_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    const body = await r.json().catch(() => ({}));
    if (r.ok) {
      step(
        "sync returned ok",
        true,
        `opened shows=${body.showCount} episodes=${body.episodeCount}`,
      );
    } else if (r.status === 503) {
      step(
        "sync returned 503 (expected before credentials land)",
        true,
        body.error ?? "not configured",
      );
    } else if (r.status === 502) {
      step(
        "sync returned 502 (ART19 rejected credentials)",
        false,
        (body.error ?? "").slice(0, 200),
      );
    } else {
      step("sync returned unexpected status", false, `HTTP ${r.status}`);
    }
  }

  console.log("\n═══ 4 · Post-sync data (only meaningful after creds work) ═══");
  const showsAfter = await pg("art19_shows?select=id");
  const epsAfter = await pg("art19_episodes?select=id");
  if (showsAfter.length > 0 || epsAfter.length > 0) {
    step(
      "tables populated",
      true,
      `shows=${showsAfter.length} episodes=${epsAfter.length}`,
    );
    const sampleShow = await pg(
      "art19_shows?select=id,title,episode_count&limit=1",
    );
    if (sampleShow[0]) {
      step(
        "sample show",
        true,
        `"${sampleShow[0].title}" (${sampleShow[0].episode_count ?? "—"} eps)`,
      );
    }
  } else {
    step("tables populated", false, "still empty — credentials not yet active");
  }

  console.log("\n═══ 5 · Read endpoints (no auth — they require admin cookie in prod) ═══");
  // These hits will return 401 from the live site because the script
  // doesn't carry the admin cookie. That's still meaningful: a 401
  // means the route exists + reaches the auth gate. A 404 means the
  // route file isn't deployed yet.
  const reads = [
    "/api/admin/art19/summary",
    "/api/admin/art19/shows",
    "/api/admin/art19/episodes",
    "/api/admin/art19/listens?range=30d",
  ];
  for (const p of reads) {
    try {
      const r = await fetch(`${READ_BASE}${p}`);
      const expected = r.status === 401 || r.status === 200;
      step(
        `${p} reachable (HTTP ${r.status})`,
        expected,
        r.status === 401
          ? "auth-gated as expected"
          : r.status === 200
            ? "returned ok"
            : "unexpected status",
      );
    } catch (e) {
      step(`${p} reachable`, false, e.message);
    }
  }

  console.log("\n═══ Summary ═══");
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`${passed}/${results.length} checks passed`);
  if (failed > 0) {
    console.log("\nFailures:");
    for (const r of results.filter((x) => !x.ok)) console.log(`  ✗  ${r.name}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("\n✗ Fatal:", e);
  process.exit(1);
});

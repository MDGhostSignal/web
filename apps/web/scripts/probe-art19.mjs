// ART19 discovery — round 2. Now that we know the base is
// https://art19.com/api/ and the API is JSON:API style, drill into
// resource names and dump 404/200/401 bodies for clues.
//
// Never prints the token.
// Run: cd apps/web && node scripts/probe-art19.mjs

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
const TOKEN = env.ART19_API_TOKEN;
console.log(`Token: len=${TOKEN.length} prefix=${TOKEN.slice(0, 4)}…\n`);

const BASE = "https://art19.com/api";

// ART19 resources (best guesses based on JSON:API conventions + the
// platform's public surface area).
const PATHS = [
  // Identity
  "/",
  "/me",
  "/account",
  "/users/me",
  "/auth/me",
  "/sessions/current",
  // Content surface
  "/podcasts",
  "/shows",
  "/series",
  "/episodes",
  "/distributions",
  "/distribution_groups",
  "/networks",
  "/organizations",
  "/publishers",
  // Metrics
  "/audio_engagements",
  "/audio_engagement",
  "/downloads",
  "/listens",
  "/stats",
  "/reports",
  "/audience_metrics",
  // Ads
  "/campaigns",
  "/sponsorships",
  "/advertisers",
];

const AUTH_HEADERS = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.api+json",
};

async function probe(path) {
  const url = `${BASE}${path}`;
  try {
    const r = await fetch(url, { method: "GET", headers: AUTH_HEADERS, redirect: "manual" });
    const t = await r.text();
    return { status: r.status, body: t, ctype: r.headers.get("content-type") ?? "" };
  } catch (err) {
    return { status: 0, body: err.message, ctype: "" };
  }
}

console.log("┌─ Resource scan (Bearer auth) ──────────────────────────");
const interesting = [];
for (const p of PATHS) {
  const r = await probe(p);
  const flag = r.status === 200 ? "✓✓" : r.status === 401 || r.status === 403 ? "🔒" : r.status === 404 ? "—" : "?";
  const summary = r.body.slice(0, 110).replace(/\s+/g, " ");
  console.log(`  ${flag} ${r.status.toString().padStart(3)}  ${p.padEnd(24)}  ${summary}`);
  if (r.status !== 404) interesting.push({ path: p, ...r });
}
console.log("└────────────────────────────────────────────────────────\n");

if (interesting.length === 0) {
  console.log("All 404. The API is likely real but rejects path-only requests.");
  console.log("Trying alt auth shapes against /series and / ...");
  for (const headerName of ["X-Art19-Token", "X-Token", "X-Auth-Token"]) {
    const r = await fetch(`${BASE}/series`, {
      method: "GET",
      headers: { [headerName]: TOKEN, Accept: "application/vnd.api+json" },
      redirect: "manual",
    }).catch((e) => ({ status: 0, error: e.message }));
    console.log(`  ${r.status}  header=${headerName}  /series`);
  }
  process.exit(0);
}

console.log("┌─ Interesting responses (full bodies) ─────────────────");
for (const i of interesting) {
  console.log(`\n>>> ${i.status}  ${i.path}`);
  console.log(`    content-type: ${i.ctype}`);
  console.log(`    body: ${i.body.slice(0, 800)}`);
}
console.log("\n└────────────────────────────────────────────────────────");

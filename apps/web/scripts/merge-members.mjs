/**
 * merge-members — consolidate duplicate member rows into one survivor.
 *
 * Usage:
 *   node scripts/merge-members.mjs <survivorId> <loserId> [loserId...]
 *   node scripts/merge-members.mjs --dry <survivorId> <loserId...>   # no writes
 *
 * What it does, in order:
 *   1. Snapshots the survivor + every loser (printed, for reversibility).
 *   2. Repoints every member-referencing child row from each loser to the
 *      survivor (contracts, crm_alerts, member_comments, studio_* ...).
 *   3. Deletes the loser member rows.
 *
 * It does NOT merge scalar fields on `members` itself — do any field
 * carry-over (auth_user_id, xq/rq links, avatar, contract, lifecycle)
 * on the survivor first, then run this to clean up the emptied dupes.
 * Guard rails: refuses to delete a loser that still holds an auth_user_id
 * (so you can't orphan a live login by accident).
 *
 * Env: reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from apps/web/.env.local
 * (same service-role path the server uses).
 */
import { readFileSync } from "node:fs";

// Every uuid column in public.* that points at members.id (from a schema
// scan — update if the schema grows new member references).
const MEMBER_REFS = [
  ["contracts", "member_id"],
  ["contracts", "suggested_member_id"],
  ["crm_alerts", "member_id"],
  ["member_comments", "member_id"],
  ["studio_brand_recommendations", "member_id"],
  ["studio_contact_requests", "member_id"],
];

const argv = process.argv.slice(2);
const DRY = argv[0] === "--dry";
const [survivor, ...losers] = DRY ? argv.slice(1) : argv;
if (!survivor || losers.length === 0) {
  console.error("Usage: node scripts/merge-members.mjs [--dry] <survivorId> <loserId...>");
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);
const BASE = env.SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!BASE || !KEY) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function rows(idsCsv, cols = "id,first_name,last_name,email,auth_user_id,xq_submission_id,rq_submission_id") {
  const r = await fetch(`${BASE}/rest/v1/members?id=in.(${idsCsv})&select=${cols}`, { headers: H, cache: "no-store" });
  return r.json();
}
async function countRefs(table, col, id) {
  const r = await fetch(`${BASE}/rest/v1/${table}?${col}=eq.${id}&select=${col}`, {
    headers: { ...H, Prefer: "count=exact", Range: "0-0" },
    cache: "no-store",
  });
  const cr = r.headers.get("content-range"); // "0-0/N" or "*/N"
  return Number((cr?.split("/")[1]) ?? 0);
}
async function repoint(table, col, fromId, toId) {
  const r = await fetch(`${BASE}/rest/v1/${table}?${col}=eq.${fromId}`, {
    method: "PATCH", headers: { ...H, Prefer: "return=minimal" }, body: JSON.stringify({ [col]: toId }),
  });
  if (!r.ok) throw new Error(`repoint ${table}.${col} ${fromId}→${toId} failed ${r.status}: ${await r.text()}`);
}
async function del(id) {
  const r = await fetch(`${BASE}/rest/v1/members?id=eq.${id}`, { method: "DELETE", headers: { ...H, Prefer: "return=minimal" } });
  if (!r.ok) throw new Error(`delete ${id} failed ${r.status}: ${await r.text()}`);
}

const all = [survivor, ...losers].join(",");
console.log(`SNAPSHOT (survivor=${survivor}, losers=${losers.join(", ")})${DRY ? "  [DRY RUN]" : ""}`);
console.log(JSON.stringify(await rows(all), null, 2));

// Safety: never delete a loser that still holds a live auth login.
const loserRows = await rows(losers.join(","), "id,auth_user_id");
for (const lr of loserRows) {
  if (lr.auth_user_id) {
    throw new Error(`Refusing: loser ${lr.id} still has auth_user_id=${lr.auth_user_id}. Move the login to the survivor first.`);
  }
}

for (const loser of losers) {
  for (const [table, col] of MEMBER_REFS) {
    const n = await countRefs(table, col, loser);
    if (n > 0) {
      console.log(`  ${DRY ? "would repoint" : "repointing"} ${n} × ${table}.${col}: ${loser} → ${survivor}`);
      if (!DRY) await repoint(table, col, loser, survivor);
    }
  }
  if (DRY) {
    console.log(`  would delete member ${loser}`);
  } else {
    await del(loser);
    console.log(`  deleted member ${loser}`);
  }
}

console.log("\nAFTER survivor:", JSON.stringify(await rows(survivor), null, 2));
console.log(DRY ? "\nDry run complete — no writes." : "\nMerge complete.");

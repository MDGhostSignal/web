#!/usr/bin/env node
/**
 * Restore Supabase tables from a snapshot taken by
 * `snapshot-pre-migration.mjs`.
 *
 * DESTRUCTIVE: this DELETEs every row in each target table before
 * re-inserting the snapshot rows. Confirms twice before running.
 *
 * Usage (from apps/web):
 *   node scripts/restore-from-snapshot.mjs --dir=pre-migration-2026-06-15T15-30-00 --all
 *   node scripts/restore-from-snapshot.mjs --dir=pre-migration-2026-06-15T15-30-00 --table=members
 *   node scripts/restore-from-snapshot.mjs --dir=pre-migration-2026-06-15T15-30-00 --all --yes
 *
 * `--yes` skips the interactive confirm (use only in scripted recovery).
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createInterface } from "node:readline";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(WEB_ROOT, "..", "..");

/* --- CLI args ------------------------------------------------------ */

const args = process.argv.slice(2);
function arg(name, fallback) {
  const hit = args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  if (hit === `--${name}`) return true;
  return hit.slice(`--${name}=`.length);
}
const DIR = arg("dir", "");
const TABLE = arg("table", "");
const ALL = arg("all", false) === true;
const YES = arg("yes", false) === true;
const BATCH = Number(arg("batch", 500));

if (!DIR) {
  console.error("Missing --dir=<snapshot-dir>. Available:");
  const backupsRoot = resolve(REPO_ROOT, "backups");
  if (existsSync(backupsRoot)) {
    for (const name of readdirSync(backupsRoot)) console.error(`  ${name}`);
  }
  process.exit(2);
}
if (!ALL && !TABLE) {
  console.error("Pass either --all or --table=<table>.");
  process.exit(2);
}

const SNAPSHOT_DIR = resolve(REPO_ROOT, "backups", DIR);
if (!existsSync(SNAPSHOT_DIR)) {
  console.error(`Snapshot dir not found: ${SNAPSHOT_DIR}`);
  process.exit(2);
}

const manifestPath = resolve(SNAPSHOT_DIR, "manifest.json");
if (!existsSync(manifestPath)) {
  console.error(`Missing manifest.json in ${SNAPSHOT_DIR}`);
  process.exit(2);
}
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

/* --- Env ----------------------------------------------------------- */

const ENV_PATH = resolve(WEB_ROOT, ".env.local");
if (!existsSync(ENV_PATH)) {
  console.error(`Missing ${ENV_PATH}.`);
  process.exit(2);
}
const ENV = parseDotEnv(readFileSync(ENV_PATH, "utf8"));
const SUPABASE_URL = ENV.SUPABASE_URL;
const SERVICE_ROLE_KEY = ENV.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env.local.");
  process.exit(2);
}

if (SUPABASE_URL !== manifest.supabaseUrl) {
  console.error(
    `\nREFUSING TO RESTORE — snapshot is from a different project.\n` +
      `  snapshot: ${manifest.supabaseUrl}\n` +
      `  current:  ${SUPABASE_URL}\n` +
      `Set SUPABASE_URL to match the snapshot or pick a different snapshot.\n`,
  );
  process.exit(3);
}

function parseDotEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    let value = m[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[m[1]] = value;
  }
  return out;
}

/* --- Supabase REST helper ----------------------------------------- */

async function rest(method, pathAndQuery, body, extraHeaders = {}) {
  const headers = {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    ...extraHeaders,
  };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${pathAndQuery} → ${res.status}: ${text.slice(0, 400)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function deleteAll(table) {
  // PostgREST requires a filter; we delete-by-true via the dummy
  // `id=not.is.null` pattern (works when there's an `id` column).
  // For tables without `id`, fall back to a `created_at` filter or
  // skip — caller can opt out per table.
  return rest("DELETE", `${table}?id=not.is.null`);
}

async function insertBatch(table, rows) {
  if (!rows.length) return;
  return rest("POST", table, rows, { Prefer: "return=minimal" });
}

/* --- Confirm ------------------------------------------------------ */

async function confirm(text) {
  if (YES) return true;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolveP) => {
    rl.question(text, (ans) => {
      rl.close();
      resolveP(ans.trim().toLowerCase() === "yes");
    });
  });
}

/* --- Run ----------------------------------------------------------- */

const targets = ALL
  ? Object.keys(manifest.tables).filter((t) => !manifest.tables[t].error)
  : [TABLE];

if (TABLE && !manifest.tables[TABLE]) {
  console.error(`Table "${TABLE}" not in manifest.`);
  process.exit(2);
}

console.log(
  `\nAbout to RESTORE from snapshot ${DIR}.\n` +
    `Project: ${SUPABASE_URL}\n` +
    `Tables (will DELETE then INSERT):\n`,
);
for (const t of targets) {
  console.log(`  ${t}  (${manifest.tables[t].rows} rows)`);
}

const go = await confirm(
  "\nThis is destructive. Type exactly 'yes' to continue: ",
);
if (!go) {
  console.log("Aborted.");
  process.exit(1);
}

const go2 = await confirm(
  "Last chance. Type 'yes' again to actually wipe and restore: ",
);
if (!go2) {
  console.log("Aborted.");
  process.exit(1);
}

for (const table of targets) {
  process.stdout.write(`\n${table}: `);
  const file = resolve(SNAPSHOT_DIR, `${table}.json`);
  if (!existsSync(file)) {
    console.log("✗ snapshot file missing — skipping");
    continue;
  }
  const rows = JSON.parse(readFileSync(file, "utf8"));
  try {
    await deleteAll(table);
    process.stdout.write(`cleared, inserting ${rows.length} rows`);
    for (let i = 0; i < rows.length; i += BATCH) {
      await insertBatch(table, rows.slice(i, i + BATCH));
      process.stdout.write(".");
    }
    console.log(` ✓`);
  } catch (err) {
    console.log(` ✗ ${err.message ?? err}`);
  }
}

console.log("\nRestore complete.\n");

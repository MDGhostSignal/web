#!/usr/bin/env node
/**
 * Pre-migration snapshot — Supabase tables touched by the upcoming
 * brands/creators/members refactor. Dumps every row to local JSON
 * files so we can restore if the migration goes sideways.
 *
 * Captures:
 *   - members             (the existing CRM/leads table)
 *   - member_comments
 *   - xq_submissions
 *   - rq_submissions
 *   - art19_network
 *   - art19_shows
 *   - art19_episodes
 *   - art19_listens_daily
 *   - art19_sync_runs
 *
 * Usage (from apps/web):
 *   node scripts/snapshot-pre-migration.mjs
 *   node scripts/snapshot-pre-migration.mjs --label=before-studio
 *
 * Output:
 *   ../backups/pre-migration-{ISO timestamp}-{label?}/
 *     - manifest.json           — table names, row counts, schema version
 *     - {table}.json            — full dump per table (lossless,
 *                                  restorable via restore-from-snapshot.mjs)
 *     - {table}.csv             — same data as CSV for human inspection
 *                                  (Excel / Sheets / Numbers). JSONB +
 *                                  array columns get stringified — use
 *                                  the .json file when restoring.
 *     - RESTORE.md              — restore instructions
 *
 * The backups directory is gitignored (see .gitignore changes).
 * This script is the safe-mode counterpart to apply_migration; run it
 * BEFORE every migration that touches the identity tables.
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(__dirname, "..");
const REPO_ROOT = resolve(WEB_ROOT, "..", "..");

/* --- CLI args -------------------------------------------------------- */

const args = process.argv.slice(2);
function arg(name, fallback) {
  const hit = args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  if (hit === `--${name}`) return true;
  return hit.slice(`--${name}=`.length);
}
const LABEL = (arg("label", "") || "").toString().trim();
const PAGE_SIZE = Number(arg("page-size", 1000));

/* --- Env ------------------------------------------------------------- */

const ENV_PATH = resolve(WEB_ROOT, ".env.local");
if (!existsSync(ENV_PATH)) {
  console.error(`Missing ${ENV_PATH}. Cannot read Supabase credentials.`);
  process.exit(2);
}
const ENV = parseDotEnv(readFileSync(ENV_PATH, "utf8"));
const SUPABASE_URL = ENV.SUPABASE_URL;
const SERVICE_ROLE_KEY = ENV.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env.local.");
  process.exit(2);
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

/* --- Supabase REST helper ------------------------------------------- */

async function restGet(table, params = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}${params ? `?${params}` : ""}`;
  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Range: `0-${PAGE_SIZE - 1}`,
      Prefer: "count=exact",
    },
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`GET ${table} → ${res.status}: ${body.slice(0, 400)}`);
  }
  const range = res.headers.get("content-range") ?? "*";
  return { rows: JSON.parse(body), range };
}

/** Fetch every row in a table by paging through with `Range:` headers. */
async function dumpTable(table) {
  let offset = 0;
  const all = [];
  let total = null;
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&order=id`;
    const res = await fetch(url, {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Range: `${offset}-${offset + PAGE_SIZE - 1}`,
        Prefer: "count=exact",
      },
    });
    const body = await res.text();
    if (!res.ok) {
      // Some tables don't have an `id` column; fall back to no order.
      if (res.status === 400 && body.includes("column \"id\"")) {
        return await dumpTableUnordered(table);
      }
      throw new Error(`dump ${table} → ${res.status}: ${body.slice(0, 400)}`);
    }
    const rows = JSON.parse(body);
    const range = res.headers.get("content-range") ?? "";
    const m = range.match(/\d+-\d+\/(\d+|\*)/);
    if (m && m[1] !== "*") total = Number(m[1]);
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return { rows: all, total: total ?? all.length };
}

async function dumpTableUnordered(table) {
  // For tables without an `id` column, just fetch everything in one go.
  const { rows } = await restGet(table, "select=*");
  return { rows, total: rows.length };
}

/* --- Tables to snapshot -------------------------------------------- */

const TABLES = [
  // Identity / CRM
  "members",
  "member_comments",
  // Quiz responses (the XQ + RQ data we'll link to)
  "xq_submissions",
  "rq_submissions",
  // ART19 (creator-side platform data; we'll link shows to creators)
  "art19_network",
  "art19_shows",
  "art19_episodes",
  "art19_listens_daily",
  "art19_sync_runs",
];

/* --- Run ----------------------------------------------------------- */

const TS = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const dirName = `pre-migration-${TS}${LABEL ? `-${LABEL}` : ""}`;
const OUT_DIR = resolve(REPO_ROOT, "backups", dirName);
mkdirSync(OUT_DIR, { recursive: true });

console.log(`\nSnapshot → ${OUT_DIR}\n`);

const manifest = {
  takenAt: new Date().toISOString(),
  label: LABEL || null,
  supabaseUrl: SUPABASE_URL,
  tables: {},
};

let totalRows = 0;
for (const table of TABLES) {
  process.stdout.write(`  ${table.padEnd(24)} `);
  try {
    const { rows, total } = await dumpTable(table);
    writeFileSync(
      resolve(OUT_DIR, `${table}.json`),
      JSON.stringify(rows, null, 2),
    );
    writeFileSync(resolve(OUT_DIR, `${table}.csv`), rowsToCsv(rows));
    manifest.tables[table] = { rows: rows.length, total };
    totalRows += rows.length;
    console.log(`✓ ${rows.length} rows (json + csv)`);
  } catch (err) {
    manifest.tables[table] = { error: String(err.message ?? err) };
    console.log(`✗ ${err.message ?? err}`);
  }
}

/** Convert an array of row objects to RFC-4180-style CSV.
 *  Column order = union of all keys, sorted. Nested objects + arrays
 *  are JSON-stringified into the cell so the file stays openable in
 *  Excel without import errors. Use the .json file when restoring;
 *  CSV is for human inspection only. */
function rowsToCsv(rows) {
  if (!rows.length) return "";
  const keys = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r))),
  ).sort();
  const header = keys.map(csvCell).join(",");
  const lines = rows.map((row) =>
    keys.map((k) => csvCell(row[k])).join(","),
  );
  return [header, ...lines].join("\r\n") + "\r\n";
}

function csvCell(v) {
  if (v === null || v === undefined) return "";
  let s;
  if (typeof v === "string") s = v;
  else if (typeof v === "number" || typeof v === "boolean") s = String(v);
  else s = JSON.stringify(v);
  // RFC-4180: wrap in quotes if the cell contains a comma, quote,
  // CR, or LF. Double up any internal quotes.
  if (/[",\r\n]/.test(s)) {
    s = `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

writeFileSync(
  resolve(OUT_DIR, "manifest.json"),
  JSON.stringify(manifest, null, 2),
);

writeFileSync(
  resolve(OUT_DIR, "RESTORE.md"),
  `# Restore from this snapshot

Snapshot taken: ${manifest.takenAt}
Total rows: ${totalRows}

## To restore one table to the state captured here:

\`\`\`bash
cd apps/web
node scripts/restore-from-snapshot.mjs --dir=${dirName} --table=members
\`\`\`

## To restore all tables (destructive — confirm twice):

\`\`\`bash
node scripts/restore-from-snapshot.mjs --dir=${dirName} --all
\`\`\`

The restore script TRUNCATEs each target table before re-inserting
the JSON rows. It will prompt for confirmation before anything
destructive. Newly-added schema columns won't be in the JSON; they
just stay at their default (usually NULL) after restore.

## CSV (human-readable copy)

Each table also has a \`{table}.csv\` you can open in Excel /
Sheets / Numbers. The CSV is for inspection only — restore from the
JSON. JSONB and array columns are stringified to JSON inside the
CSV cells, so re-importing them needs explicit type casts.

## Table inventory

| Table | Rows | Notes |
|---|---:|---|
${Object.entries(manifest.tables)
  .map(([t, m]) =>
    m.error
      ? `| ${t} | — | error: ${m.error.slice(0, 60)} |`
      : `| ${t} | ${m.rows ?? 0} | ${m.total !== m.rows ? `(${m.total} server-side)` : "OK"} |`,
  )
  .join("\n")}
`,
);

console.log(
  `\n${totalRows} rows captured across ${Object.keys(manifest.tables).length} tables.`,
);
console.log(`Manifest: ${resolve(OUT_DIR, "manifest.json")}`);
console.log(`Restore guide: ${resolve(OUT_DIR, "RESTORE.md")}\n`);

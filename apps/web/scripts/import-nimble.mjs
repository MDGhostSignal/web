/**
 * Import contacts from a Nimble CSV export into the GhostSignal CRM.
 *
 * Maps each row to a Member shape and POSTs to /api/members. Each
 * contact lands either on /admin/leads (most stages) or directly in
 * the marketplace pool (Signal Tune - Membership stage = fully
 * fledged member, sets `became_member_at` so the row surfaces in
 * /admin/marketplace?view=pool automatically via the existing
 * graduation flow).
 *
 * Usage:
 *   node scripts/import-nimble.mjs --dry-run            # preview only
 *   node scripts/import-nimble.mjs --file=path.csv      # custom path
 *   node scripts/import-nimble.mjs --api=http://...     # custom host
 *   node scripts/import-nimble.mjs                      # live import
 *
 * Requires the dev server (or any host that exposes /api/members) to
 * be reachable. Defaults assume `npm run dev` on localhost:3000.
 *
 * Re-runs are safe-ish — there's no dedupe (the API doesn't enforce
 * unique emails). Run --dry-run first; if you've already imported,
 * `git diff` won't show DB state so check /admin/leads counts.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- CLI args -------------------------------------------------

const args = process.argv.slice(2);
const arg = (name, def) => {
  const hit = args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return def;
  if (hit === `--${name}`) return true;
  return hit.slice(`--${name}=`.length);
};

const DRY = arg("dry-run", false) === true;
// When true, skip rows that have no Nimble pipeline assignment. The
// stageless rows are people Mike collected as contacts but never
// pushed into an active pipeline — not worth importing as leads.
const PIPELINED_ONLY = arg("pipelined-only", false) === true;
// Inverse — only import rows WITHOUT a Nimble pipeline/stage. Used
// for a second pass after the pipelined batch is already in the DB:
// `--pipelined-only` got the 42 stage-assigned ones, then
// `--stageless-only` brings in the rest without re-importing the
// first batch.
const STAGELESS_ONLY = arg("stageless-only", false) === true;
const CSV_PATH = resolve(
  __dirname,
  "..",
  "..",
  "..",
  String(arg("file", "docs/nimble_contacts.csv")),
);
const API = String(arg("api", "http://localhost:3000")).replace(/\/+$/, "");

// ---------- CSV parser (RFC-4180-ish) --------------------------------

/** Parse a single CSV line that may contain quoted fields with commas. */
function parseLine(line) {
  const cells = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuote = true;
    } else if (ch === ",") {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

/** Parse a whole CSV string into an array of header-keyed objects.
 *  Joins continuation lines (when a quoted field spans newlines). */
function parseCsv(text) {
  // Combine lines that are part of a multi-line quoted field.
  const rawLines = text.replace(/\r\n?/g, "\n").split("\n");
  const lines = [];
  let buf = "";
  let openQuotes = 0;
  for (const raw of rawLines) {
    const quotesInLine = (raw.match(/"/g) || []).length;
    if (buf) {
      buf += "\n" + raw;
    } else {
      buf = raw;
    }
    openQuotes = (openQuotes + quotesInLine) % 2;
    if (openQuotes === 0) {
      lines.push(buf);
      buf = "";
    }
  }
  if (buf) lines.push(buf);

  const header = parseLine(lines[0]).map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cells = parseLine(lines[i]);
    const row = {};
    for (let j = 0; j < header.length; j++) {
      row[header[j]] = (cells[j] ?? "").trim();
    }
    rows.push(row);
  }
  return rows;
}

// ---------- Mapping --------------------------------------------------

const OWNER_BY_EMAIL = {
  "mike@ghostsignal.cloud": "Mike Sense",
  "jack@ghostsignal.cloud": "Jack W Harding",
  "martin@ghostsignal.cloud": "Martin Drexler",
  "jeremy@ghostsignal.cloud": "Jeremy Reeves",
};

const TYPE_BY_PIPELINE = {
  "Creators": "creator",
  "Advertisers / Brands": "brand",
};

// Stage → { phase, completedSteps[] }. Lifecycle steps cascade — a
// later stage implies the earlier ones are also done.
const COURT_STEPS = [
  "first_contact",
  "meeting",
  "deck_sent",
  "ad_copy_sent",
  "rq_quiz",
];

const STAGE_MAP = {
  "Signal Search - Conversation": {
    phase: "discern",
    completed: ["discernment"],
    isMember: false,
  },
  "Signal - Staging Area": {
    phase: "court",
    completed: ["discernment"],
    isMember: false,
  },
  "Signal Ping Yu Go": {
    phase: "court",
    completed: ["discernment", "first_contact"],
    isMember: false,
  },
  "Membership Offered": {
    phase: "sign",
    completed: ["discernment", ...COURT_STEPS, "membership_sent"],
    isMember: false,
  },
  "Signal Tune - Membership": {
    phase: "run",
    completed: [
      "discernment",
      ...COURT_STEPS,
      "membership_sent",
      "membership_signed",
    ],
    isMember: true, // sets became_member_at → lands in marketplace pool
  },
};

const DEFAULT_STAGE = {
  phase: "discern",
  completed: [],
  isMember: false,
};

/** Parse "DD/MM/YYYY HH:MM:SS" → ISO. Returns null on failure. */
function parseDate(s) {
  if (!s) return null;
  const m = s.match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/,
  );
  if (!m) return null;
  const [, dd, mm, yyyy, hh = "00", mi = "00", ss = "00"] = m;
  const iso = `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function firstNonEmpty(...vals) {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/** Map a CSV row to a MemberWritable payload or null if skip. */
function mapRow(row) {
  const first = (row["first name"] || "").trim();
  const last = (row["last name"] || "").trim();
  const org = (row["company"] || row["contact employment 1 - company_name"] || "").trim();

  // Skip rows with nothing identifiable.
  if (!first && !last && !org) return null;

  const pipeline = row["Pipeline name 1"] || row["segment"] || "";
  const member_type = TYPE_BY_PIPELINE[pipeline] || "other";

  const stage = row["Stage name 1"] || "";
  const stageDef = STAGE_MAP[stage] || DEFAULT_STAGE;

  // Build lifecycle_steps with completed_at = the row's Created date
  // (so the lifecycle reads as historical, not "completed today").
  const createdAt = parseDate(row["Created"]);
  const completedAt = createdAt ? createdAt.slice(0, 10) : null;
  const lifecycle_steps = {};
  for (const key of stageDef.completed) {
    lifecycle_steps[key] = {
      status: "done",
      completed_at: completedAt,
    };
  }

  // Email — work email first, fall back to discovered emails 1.
  const email = firstNonEmpty(
    row["work email"],
    row["discovered emails 1"],
    row["discovered emails 2"],
  );

  // Phone — discovered phone 1.
  const phone = firstNonEmpty(
    row["discovered phone 1"],
    row["discovered phone 2"],
  );

  // Website — twitter website, then first social URL.
  const website = firstNonEmpty(
    row["twitter website"],
    row["domain"],
    row["linkedin"],
    row["twitter"],
    row["facebook"],
    row["instagram"],
    row["angel list"],
  );

  // Owner — map email to founder name.
  const ownerEmail = (row["Owner"] || "").trim().toLowerCase();
  const owner = OWNER_BY_EMAIL[ownerEmail] || null;

  // Tags — industry 1 + genre + segment + Tag 1-40, deduped + trimmed.
  const tagSources = [
    row["industry 1"],
    row["industry 2"],
    row["genre"],
    row["host"],
  ];
  for (let i = 1; i <= 40; i++) tagSources.push(row[`Tag ${i}`]);
  const tags = [
    ...new Set(
      tagSources
        .map((t) => (t || "").trim())
        .filter((t) => t.length > 0 && t !== pipeline /* drop redundant */),
    ),
  ];

  const payload = {
    first_name: first || null,
    last_name: last || null,
    organization: org || null,
    email: email,
    phone: phone,
    website: website,
    member_type,
    phase: stageDef.phase,
    owner,
    tags,
    lifecycle_steps,
  };

  if (stageDef.isMember) {
    payload.became_member_at = createdAt || new Date().toISOString();
  }

  return payload;
}

// ---------- Run ------------------------------------------------------

const csvText = readFileSync(CSV_PATH, "utf8");
const rows = parseCsv(csvText);

const mapped = [];
const skipped = [];
const skippedStageless = [];
for (const row of rows) {
  const pipeline = (row["Pipeline name 1"] || "").trim();
  const stage = (row["Stage name 1"] || "").trim();
  const isStageless = !pipeline && !stage;
  if (PIPELINED_ONLY && isStageless) {
    skippedStageless.push(row);
    continue;
  }
  if (STAGELESS_ONLY && !isStageless) {
    // Inverse skip — drop the pipelined rows, keep stageless only.
    skippedStageless.push(row);
    continue;
  }
  const m = mapRow(row);
  if (m) mapped.push({ row, payload: m });
  else skipped.push(row);
}

// Summary
const byType = {};
const byStage = {};
const memberCount = mapped.filter((x) => x.payload.became_member_at).length;
for (const { payload, row } of mapped) {
  byType[payload.member_type] = (byType[payload.member_type] || 0) + 1;
  const stage = row["Stage name 1"] || "(no stage)";
  byStage[stage] = (byStage[stage] || 0) + 1;
}

console.log("=".repeat(64));
console.log("Nimble import — preview");
console.log("=".repeat(64));
console.log("Source:", CSV_PATH);
console.log("Total rows:", rows.length);
console.log("Skipped (no name + no org):", skipped.length);
if (PIPELINED_ONLY) {
  console.log("Skipped (no Nimble pipeline):", skippedStageless.length);
}
console.log("Mapped (will be imported):", mapped.length);
console.log("");
console.log("By member_type:");
for (const [k, v] of Object.entries(byType)) console.log(`  ${k}: ${v}`);
console.log("");
console.log("By Nimble stage:");
for (const [k, v] of Object.entries(byStage)) console.log(`  ${k}: ${v}`);
console.log("");
console.log(`Of those, ${memberCount} will land in the marketplace pool`);
console.log("(Stage = 'Signal Tune - Membership' → became_member_at set).");
console.log("");

// Show a couple of examples
console.log("Sample payloads:");
for (const sample of [mapped[0], mapped[Math.floor(mapped.length / 2)], mapped[mapped.length - 1]]) {
  if (!sample) continue;
  console.log(JSON.stringify(sample.payload, null, 2));
  console.log("---");
}

if (DRY) {
  console.log("\n[dry-run] No POSTs sent. Re-run without --dry-run to import.");
  process.exit(0);
}

// /api/members/* is gated by the admin shared-password cookie set
// by /api/admin/login (see src/lib/admin-auth.ts). The script logs
// in first, captures the `admin_auth` cookie, and reuses it for
// every subsequent /api/members POST. Password comes from a
// --password=... flag or the ADMIN_PASSWORD env var (so a CI run
// can set it without committing the secret to a flag string).
const adminPassword = String(
  arg("password", "") || process.env.ADMIN_PASSWORD || "",
);
if (!adminPassword) {
  console.error(
    "\n[error] ADMIN_PASSWORD is required for live import.\n" +
      "Pass --password=... or set ADMIN_PASSWORD in the environment.\n" +
      "(Same password you use at /admin/login.)",
  );
  process.exit(1);
}

console.log(`\nLogging in at ${API}/api/admin/login …`);
const loginRes = await fetch(`${API}/api/admin/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ password: adminPassword }),
});
if (!loginRes.ok) {
  const text = await loginRes.text().catch(() => "");
  console.error(`Login failed (${loginRes.status}): ${text}`);
  process.exit(1);
}
const setCookie = loginRes.headers.get("set-cookie") || "";
const cookieMatch = setCookie.match(/admin_auth=([^;]+)/);
if (!cookieMatch) {
  console.error("Login succeeded but no admin_auth cookie was returned.");
  process.exit(1);
}
const adminCookie = `admin_auth=${cookieMatch[1]}`;
console.log("Login OK.");

console.log(`POSTing to ${API}/api/members …\n`);
let ok = 0;
let fail = 0;
const failures = [];
for (const { payload } of mapped) {
  try {
    const res = await fetch(`${API}/api/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookie,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      ok++;
    } else {
      fail++;
      failures.push({
        identity: payload.organization || `${payload.first_name} ${payload.last_name}`,
        status: res.status,
        error: data.error || data.detail || "unknown",
      });
    }
  } catch (err) {
    fail++;
    failures.push({
      identity: payload.organization || `${payload.first_name} ${payload.last_name}`,
      error: String(err),
    });
  }
}

console.log(`\nImport complete: ${ok} ok, ${fail} failed.`);
if (failures.length) {
  console.log("\nFailures:");
  for (const f of failures) console.log(`  - ${f.identity}: ${f.error}`);
}

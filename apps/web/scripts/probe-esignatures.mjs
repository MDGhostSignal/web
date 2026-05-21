/**
 * One-off discovery probe for the esignatures.com API.
 *
 * Read-only: lists templates + the first page of contracts, prints
 * field shapes + counts + auth + pagination behaviour so we can lock
 * the Supabase schema in Phase A.3 against ground truth rather than
 * against docs that have known gaps.
 *
 * Usage (from apps/web):
 *   node scripts/probe-esignatures.mjs
 *
 * Reads ESIGNATURES_API_TOKEN from apps/web/.env.local. Nothing is
 * written to Supabase or to disk. Safe to re-run.
 *
 * What we're looking to learn:
 *   - Which auth method actually works (Basic with token / query
 *     ?token= / Bearer header). The docs are inconsistent.
 *   - The pagination shape (?limit/offset vs ?page).
 *   - The actual top-level fields on a contract + signer.
 *   - The placeholder_fields shape — strings? typed objects?
 *   - Whether any existing contract already carries a
 *     `ghostsignal_member_id` in its metadata.
 *   - The exact set of status enum strings the API returns.
 *
 * Don't paste the dumped output anywhere public — contract titles and
 * signer emails are real PII for the company.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(__dirname, "..");

/* --- env ----------------------------------------------------------- */

const ENV_PATH = resolve(WEB_ROOT, ".env.local");
if (!existsSync(ENV_PATH)) {
  console.error(`Missing ${ENV_PATH}.`);
  process.exit(2);
}
const ENV = Object.fromEntries(
  readFileSync(ENV_PATH, "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
const TOKEN = ENV.ESIGNATURES_API_TOKEN;
const BASE = (ENV.ESIGNATURES_BASE_URL ?? "https://esignatures.com/api").replace(
  /\/+$/,
  "",
);
if (!TOKEN) {
  console.error("ESIGNATURES_API_TOKEN missing in .env.local.");
  process.exit(2);
}

/* --- helpers ------------------------------------------------------- */

function header(t) {
  console.log("\n=== " + t + " ".padEnd(60 - t.length, "=") + "\n");
}

function topLevelShape(obj) {
  if (obj == null || typeof obj !== "object") return String(typeof obj);
  return Object.keys(obj)
    .map((k) => {
      const v = obj[k];
      if (v == null) return `${k}: null`;
      if (Array.isArray(v)) return `${k}: Array(${v.length})`;
      if (typeof v === "object") return `${k}: object(${Object.keys(v).length} keys)`;
      return `${k}: ${typeof v}`;
    })
    .join(", ");
}

async function tryFetch(label, path, init = {}) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  let res;
  try {
    res = await fetch(url, init);
  } catch (e) {
    return { label, ok: false, status: 0, error: e.message };
  }
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { label, ok: res.ok, status: res.status, body };
}

/* --- auth probing -------------------------------------------------- */

async function probeAuth() {
  header("AUTH PROBE — which auth method does esignatures accept?");
  const candidates = [
    {
      label: "Bearer header: GET /templates",
      init: { headers: { Authorization: `Bearer ${TOKEN}` } },
      url: "/templates",
    },
    {
      label: "Basic auth (token as user): GET /templates",
      init: {
        headers: {
          Authorization: "Basic " + Buffer.from(TOKEN + ":").toString("base64"),
        },
      },
      url: "/templates",
    },
    {
      label: "Query param ?token=: GET /templates",
      init: {},
      url: `/templates?token=${encodeURIComponent(TOKEN)}`,
    },
  ];

  let winning = null;
  for (const c of candidates) {
    const r = await tryFetch(c.label, c.url, c.init);
    const summary = r.ok
      ? "✓ 200"
      : r.status === 0
        ? `✗ network: ${r.error}`
        : `✗ ${r.status}`;
    console.log("  " + summary.padEnd(22) + " " + c.label);
    if (r.ok && !winning) winning = { ...c, response: r };
  }
  if (!winning) {
    console.log(
      "\n  No auth method accepted. Dumping the first response body for clues:",
    );
    const first = await tryFetch(candidates[0].label, candidates[0].url, candidates[0].init);
    console.log(
      "  " +
        (typeof first.body === "string"
          ? first.body.slice(0, 800)
          : JSON.stringify(first.body, null, 2).slice(0, 800)),
    );
    process.exit(1);
  }
  console.log("\n  Winner → " + winning.label);
  return winning;
}

/* --- main probe ---------------------------------------------------- */

async function call(auth, path) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const sep = url.includes("?") ? "&" : "?";
  let final = url;
  let init = { ...auth.init, headers: { ...(auth.init.headers ?? {}) } };
  if (auth.label.startsWith("Query param")) {
    final = url + sep + "token=" + encodeURIComponent(TOKEN);
  }
  const r = await fetch(final, init);
  const text = await r.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { ok: r.ok, status: r.status, body, headers: Object.fromEntries(r.headers) };
}

async function main() {
  console.log(`Base URL: ${BASE}`);
  console.log(`Token: ${TOKEN.slice(0, 4)}…${TOKEN.slice(-4)} (length=${TOKEN.length})\n`);

  const auth = await probeAuth();

  /* templates */
  header("TEMPLATES — GET /templates");
  const tpls = await call(auth, "/templates");
  console.log("HTTP", tpls.status);
  // Esignatures wraps response in { status, data: { ... } } per docs.
  const tplList = Array.isArray(tpls.body?.data?.templates)
    ? tpls.body.data.templates
    : Array.isArray(tpls.body?.templates)
      ? tpls.body.templates
      : Array.isArray(tpls.body)
        ? tpls.body
        : null;
  if (!tplList) {
    console.log("Unexpected shape. Top-level keys:", Object.keys(tpls.body ?? {}));
    console.log("First 800 chars of response:");
    console.log(JSON.stringify(tpls.body, null, 2).slice(0, 800));
  } else {
    console.log("Template count:", tplList.length);
    for (const t of tplList.slice(0, 3)) {
      console.log("\n  --- template ---");
      console.log("  shape:", topLevelShape(t));
      console.log("  id/title:", t.id ?? t.template_id, "|", t.name ?? t.title);
      if (t.placeholder_fields || t.fields) {
        console.log(
          "  placeholder_fields keys:",
          Object.keys(t.placeholder_fields ?? t.fields ?? {}),
        );
      }
      if (t.signers || t.roles) {
        console.log("  signers/roles:", JSON.stringify(t.signers ?? t.roles).slice(0, 400));
      }
    }
  }

  /* contracts — first page */
  header("CONTRACTS — GET /contracts (first page)");
  const cs = await call(auth, "/contracts");
  console.log("HTTP", cs.status);
  console.log("Response headers (subset):");
  for (const k of Object.keys(cs.headers).filter((k) =>
    /link|page|count|x-|total/i.test(k),
  )) {
    console.log("  " + k + ": " + cs.headers[k]);
  }
  const contractList = Array.isArray(cs.body?.data?.contracts)
    ? cs.body.data.contracts
    : Array.isArray(cs.body?.contracts)
      ? cs.body.contracts
      : Array.isArray(cs.body)
        ? cs.body
        : null;
  if (!contractList) {
    console.log("Unexpected shape. Top-level keys:", Object.keys(cs.body ?? {}));
    console.log("Top-level shape:", topLevelShape(cs.body));
    console.log("First 800 chars of response:");
    console.log(JSON.stringify(cs.body, null, 2).slice(0, 800));
  } else {
    console.log("Contracts in first page:", contractList.length);

    /* status histogram */
    const statusCounts = {};
    for (const c of contractList) {
      const s = c.status ?? "(missing)";
      statusCounts[s] = (statusCounts[s] ?? 0) + 1;
    }
    console.log("Status histogram:", statusCounts);

    /* metadata presence */
    let withMeta = 0;
    let withGsId = 0;
    for (const c of contractList) {
      if (c.metadata && Object.keys(c.metadata).length > 0) withMeta++;
      const idStr = JSON.stringify(c.metadata ?? "");
      if (idStr.includes("ghostsignal_member_id")) withGsId++;
    }
    console.log(
      `Metadata: ${withMeta}/${contractList.length} contracts have non-empty metadata.`,
    );
    console.log(
      `ghostsignal_member_id present in any metadata: ${withGsId}/${contractList.length}`,
    );

    /* sample five contracts */
    for (const c of contractList.slice(0, 5)) {
      console.log("\n  --- contract ---");
      console.log("  shape:", topLevelShape(c));
      console.log("  id:", c.id ?? c.contract_id);
      console.log("  status:", c.status);
      console.log("  title:", (c.title ?? c.name ?? "").slice(0, 80));
      console.log("  template_id:", c.template_id ?? c.template?.id);
      console.log(
        "  signers:",
        (c.signers ?? []).map((s) => `${s.name ?? "?"} <${s.email ?? "?"}> [${s.status ?? "?"}]`).join(" · ") ||
          "(none)",
      );
      if (c.placeholder_fields) {
        console.log(
          "  placeholder_fields keys:",
          Object.keys(c.placeholder_fields).slice(0, 12),
        );
      }
      if (c.metadata) {
        console.log("  metadata:", JSON.stringify(c.metadata).slice(0, 400));
      }
      const dateKeys = Object.keys(c).filter((k) =>
        /(_at|_date|expires|effective|created|updated|sent|signed|finalized)/i.test(k),
      );
      if (dateKeys.length) {
        console.log(
          "  date-ish fields:",
          dateKeys.map((k) => `${k}=${c[k]}`).join(" · "),
        );
      }
    }
  }

  /* pagination probe — try a few common patterns */
  header("PAGINATION PROBE");
  for (const variant of ["?limit=2", "?per_page=2", "?page_size=2", "?page=2"]) {
    const r = await call(auth, "/contracts" + variant);
    const list =
      r.body?.data?.contracts ?? r.body?.contracts ?? (Array.isArray(r.body) ? r.body : null);
    console.log(
      `  ${variant.padEnd(14)} → HTTP ${r.status} · count=${list ? list.length : "?"}`,
    );
  }
}

main().catch((e) => {
  console.error("\nProbe failed:", e);
  process.exit(1);
});

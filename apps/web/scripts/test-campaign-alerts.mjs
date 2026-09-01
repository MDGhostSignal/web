// Boundary checks for campaign-ending fire-once. Run:
//   cd apps/web && node scripts/test-campaign-alerts.mjs
//
// alreadyNotifiedCampaignIds is copied here so this stays a plain Node
// script (campaign-alerts.ts uses @/ imports). Keep in sync with
// src/lib/campaign-alerts.ts.

function alreadyNotifiedCampaignIds(rows) {
  const ids = new Set();
  for (const r of rows) {
    if (r.campaign_id) ids.add(r.campaign_id);
  }
  return ids;
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "✓" : "✗"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const fired = alreadyNotifiedCampaignIds([
  { campaign_id: "unseriously" },
  { campaign_id: "unseriously" },
  { campaign_id: "tektones" },
  { campaign_id: null },
]);
check("dedupes resolved + open rows for the same campaign", fired.size === 2);
check("counts a resolved row as already notified", fired.has("unseriously"));
check("counts a second campaign separately", fired.has("tektones"));
check("ignores null campaign_id", !fired.has(null) && !fired.has(""));

const qualifying = ["unseriously", "tektones", "brand-new"];
const toInsert = qualifying.filter((id) => !fired.has(id));
check(
  "skips campaigns that already have any campaign_ending row",
  toInsert.length === 1 && toInsert[0] === "brand-new",
);

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exit(1);

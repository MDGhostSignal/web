/**
 * Bootstrap the Marketing Copy Library with the team's canonical
 * phrases harvested from the public website + the social-post packs
 * at the repo root.
 *
 * Idempotent: lookup by (kind, lower(text)) before inserting; re-runs
 * are safe and leave user edits / favorites / new tags untouched.
 *
 * Usage (from apps/web):
 *   node scripts/seed-copy-snippets.mjs --dry-run
 *   node scripts/seed-copy-snippets.mjs
 *   node scripts/seed-copy-snippets.mjs --only=tagline
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from apps/web/.env.local.
 * No dev server required.
 *
 * See docs/MARKETING_COPY_LIBRARY.md for the runbook.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = resolve(__dirname, "..");

/* --- CLI args -------------------------------------------------------- */

const args = process.argv.slice(2);
function arg(name, fallback) {
  const hit = args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  if (hit === `--${name}`) return true;
  return hit.slice(`--${name}=`.length);
}
const DRY = arg("dry-run", false) === true;
const ONLY = (arg("only", null) || "").trim() || null;

/* --- Load env from .env.local --------------------------------------- */

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

/* --- Supabase REST helper -------------------------------------------- */

async function rest(pathAndQuery, init = {}) {
  const headers = {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };
  if (init.prefer) headers.Prefer = init.prefer;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Supabase ${init.method ?? "GET"} ${pathAndQuery} → ${res.status}: ${text.slice(0, 400)}`,
    );
  }
  return text ? JSON.parse(text) : null;
}

/* --- Seed data ------------------------------------------------------- */

/**
 * @typedef {Object} Seed
 * @property {string} text
 * @property {"tagline"|"headline"|"subhead"|"value_prop"|"cta"|"social_hook"|"long_form"|"glossary"} kind
 * @property {"creators"|"advertisers"|"both"} [persona]
 * @property {string} [source]
 * @property {string[]} [tags]
 * @property {boolean} [favorite]
 */

/** @type {Seed[]} */
const SEEDS = [
  /* -------- Core taglines (favorites; pin to top) -------- */
  { text: "This is the signal. Everything else is static.", kind: "tagline", source: "/what-is-this/page.tsx", tags: ["anchor"], favorite: true },
  { text: "Resonance is the new reach.", kind: "tagline", source: "/signal-sheet/page.tsx", tags: ["anchor"], favorite: true },
  { text: "Soulful partnerships for podcasters and advertisers who care.", kind: "tagline", source: "/page.tsx (hero)", tags: ["anchor"], favorite: true },
  { text: "Find Your Frequency", kind: "cta", source: "/for-advertisers/page.tsx", tags: ["primary-cta"], favorite: true },

  /* -------- Creator headlines + value props -------- */
  { text: "Your podcast is cultural architecture. You are building the future.", kind: "headline", persona: "creators", source: "/for-creators/page.tsx" },
  { text: "Your voice is not for sale. Your audience is not a data point. Your work is not merely content.", kind: "headline", persona: "creators", source: "/for-creators/page.tsx" },
  { text: "You don't need a million downloads to matter.", kind: "headline", persona: "creators", source: "/for-creators/page.tsx" },
  { text: "You just need conviction and the right partner to amplify your voice.", kind: "subhead", persona: "creators", source: "/for-creators/page.tsx" },
  { text: "We match you with brands whose products and mission align with your own.", kind: "value_prop", persona: "creators", source: "/for-creators/page.tsx" },
  { text: "We reach for the stars with considered monetisation models that are true to your show's reach and values.", kind: "value_prop", persona: "creators", source: "/for-creators/page.tsx" },
  { text: "We handle the paperwork, contracts, reporting, and payment tracking so you are freed up to create.", kind: "value_prop", persona: "creators", source: "/for-creators/page.tsx" },
  { text: "We protect your voice, honor your audience, and help you find the partners who will make the world alongside you.", kind: "value_prop", persona: "creators", source: "/for-creators/page.tsx" },

  /* -------- Advertiser headlines + value props -------- */
  { text: "The right audience changes everything.", kind: "headline", persona: "advertisers", source: "/for-advertisers/page.tsx" },
  { text: "We connect you with audiences who already believe what you believe.", kind: "headline", persona: "advertisers", source: "/for-advertisers/page.tsx" },
  { text: "Most ad buys chase impressions. We curate conviction.", kind: "headline", persona: "advertisers", source: "/for-advertisers/page.tsx" },
  { text: "We locate you in front of considered communities where alignment runs deep.", kind: "value_prop", persona: "advertisers", source: "/for-advertisers/page.tsx" },
  { text: "Every dollar is focused on maximizing impact, not impressions.", kind: "value_prop", persona: "advertisers", source: "/for-advertisers/page.tsx" },
  { text: "We handle invoicing, payments, ensuring efficiency and transparency — without individual podcaster contracts, simplifying your process.", kind: "value_prop", persona: "advertisers", source: "/for-advertisers/page.tsx" },
  { text: "Audiences who are aligned and feel seen are far more likely to become customers.", kind: "value_prop", persona: "advertisers", source: "/for-advertisers/page.tsx" },
  { text: "When your brand shows up in a podcast community that shares your values, you're not fighting for attention. You're joining a conversation that's already happening.", kind: "value_prop", persona: "advertisers", source: "/for-advertisers/page.tsx" },

  /* -------- Section subheads -------- */
  { text: "Why this works", kind: "subhead", source: "/for-creators + /for-advertisers" },
  { text: "What if advertising could make harmony?", kind: "subhead", source: "/what-is-this/page.tsx" },
  { text: "Values Create Value", kind: "subhead", source: "/what-is-this/page.tsx" },
  { text: "This is values-based advertising. This is world making.", kind: "subhead", source: "/what-is-this/page.tsx" },
  { text: "Every partnership starts with a chat", kind: "subhead", source: "/get-in-touch/page.tsx" },
  { text: "GHOSTSignal is Advertising-as-Support-System", kind: "subhead", persona: "creators", source: "/for-creators/page.tsx" },
  { text: "We remove the static, so you can focus on the signal.", kind: "subhead", source: "/for-creators/page.tsx" },

  /* -------- CTAs -------- */
  { text: "Learn more", kind: "cta", source: "/page.tsx" },
  { text: "Get In Touch", kind: "cta", source: "/for-creators/page.tsx" },
  { text: "Find my match", kind: "cta", source: "/what-is-this/page.tsx" },
  { text: "Read our white paper", kind: "cta", source: "/what-is-this/page.tsx" },
  { text: "Subscribe on Substack", kind: "cta", source: "/snowdrift/page.tsx" },
  { text: "I am a Creator", kind: "cta", persona: "creators", source: "/what-is-this/page.tsx" },
  { text: "I am an Advertiser", kind: "cta", persona: "advertisers", source: "/what-is-this/page.tsx" },

  /* -------- Social hooks (ready-made post snippets) -------- */
  { text: "Dive into the Snow Drift: our newsletter exploring how values-based advertising turns static noise into clear signals of meaning.", kind: "social_hook", source: "social_media_posts.md", tags: ["instagram", "linkedin", "newsletter"] },
  { text: "Build stronger partnerships with the Resonance Quotient. Assess mission convergence and content safety to ensure authentic endorsements.", kind: "social_hook", source: "social_media_posts.md", tags: ["instagram", "linkedin", "educational"] },
  { text: "A podcast creator partnered with a mission-aligned brand via GhostSignal — engagement up 40%, audience loyalty stronger than ever.", kind: "social_hook", source: "social_media_posts.md", tags: ["instagram", "linkedin", "story", "proof"] },
  { text: "What's your biggest challenge in finding value-aligned partners? A) Lack of options B) Misalignment risks C) Time to vet D) Other.", kind: "social_hook", source: "social_media_posts.md", tags: ["instagram", "poll", "engagement"] },
  { text: "Ever wondered why most ads feel like noise? At GhostSignal, we turn resonance into real impact.", kind: "social_hook", source: "improved_social_posts_pack.txt", tags: ["instagram", "reel", "hook"] },
  { text: "Struggling with mismatched ads? Here's how GhostSignal's Resonance Quotient helps: 1) Mission alignment, 2) Authentic endorsements, 3) Higher engagement.", kind: "social_hook", source: "improved_social_posts_pack.txt", tags: ["instagram", "carousel", "tip"] },
  { text: "Is Your Advertising Static or Signal? Here's How to Tell", kind: "social_hook", source: "improved_social_posts_pack.txt", tags: ["linkedin", "headline"] },
  { text: "Ads Suck — Unless They're Soulful. Thread 🧵", kind: "social_hook", source: "improved_social_posts_pack.txt", tags: ["x", "thread"] },
  { text: "Most ads fail because they optimize reach, not meaning. We match brands + creators by worldview, then build campaigns that feel native.", kind: "social_hook", source: "ghost_signal_all_social_posts_pack.txt", tags: ["x", "linkedin", "hook"] },

  /* -------- Long-form paragraphs (deck / proposal / about copy) -------- */
  { text: "What if you could monetize your podcast while maintaining your voice and values? The traditional ad model forces impossible choices: compromise your voice, risk your audience's trust, or drown in administrative tasks. We are here to protect your voice, honor your audience, and help you find the partners who will make the world alongside you.", kind: "long_form", persona: "creators", source: "/for-creators/page.tsx" },
  { text: "When alignment is authentic, trust flows naturally — and trust is the soil where conversion grows.", kind: "long_form", persona: "advertisers", source: "/for-advertisers/page.tsx", favorite: true },
  { text: "Values-Based Advertising means: Creators earn without selling out. Brands are promoted without compromise. Audiences sense harmony instead of interruption.", kind: "long_form", source: "/what-is-this/page.tsx" },
  { text: "Most advertising is built on reach, not resonance. But what if advertising could make harmony? We call it Values-Based Advertising, or simply, The Signal — a new model where partnerships are rooted in shared conviction. Where a brand's message amplifies a creator's voice, and a creator builds trust for the brand.", kind: "long_form", source: "/what-is-this/page.tsx" },
  { text: "GHOSTSignal was created as an act of world making, to help you make yours. We believe that advertising doesn't have to be extractive, it can be creative and good. Our goal is to see creators, thinkers, and doers in good partnerships that support their work, and good companies to have their story heard by audiences with whom they resonate.", kind: "long_form", source: "/who-are-we/page.tsx" },
  { text: "We make partnerships with soul and resonance, so you can make a world of harmony and goodness.", kind: "long_form", source: "/who-are-we/page.tsx" },
  { text: "Snowdrift is your early-warning system for the cultural shifts reshaping media, meaning, and money. Every month, we surface the sharpest thinking on values-based advertising, podcast storytelling, and staying human in an increasingly tech-full world.", kind: "long_form", source: "/snowdrift/page.tsx", tags: ["substack", "newsletter"] },
  { text: "Podcasters: advertisements on your show deepen audience trust. Brands: you'll be paired with podcasters whose audience is already tuned to what you are doing. Resonance is the new reach.", kind: "long_form", source: "/signal-sheet/page.tsx" },

  /* -------- Glossary anchors -------- */
  { text: "The Signal: the rare, hard-won moment when advertising stops being interruption and becomes the conversation an audience was already having.", kind: "glossary", source: "/signal-sheet/page.tsx" },
  { text: "The Static: everything in advertising that optimizes for reach instead of resonance — the noise we're built to cut through.", kind: "glossary", source: "/signal-sheet/page.tsx" },
  { text: "World-Making: the idea that every ad either reinforces or diminishes the kind of future we're building. Choosing partners is choosing a world.", kind: "glossary", source: "/signal-sheet/page.tsx" },
  { text: "Resonance Quotient (RQ): our human-led framework for matching creators and brands by worldview, content safety, and mission convergence — not by demographics alone.", kind: "glossary", source: "/signal-sheet/page.tsx" },
  { text: "Values-Based Advertising: partnerships rooted in shared conviction, where a brand's message amplifies a creator's voice and a creator builds trust for the brand.", kind: "glossary", source: "/what-is-this/page.tsx" },
];

/* --- Main ------------------------------------------------------------ */

async function exists(kind, text) {
  const data = await rest(
    `copy_snippets?select=id&kind=eq.${encodeURIComponent(kind)}&text=eq.${encodeURIComponent(text)}&limit=1`,
  );
  return Array.isArray(data) && data.length > 0;
}

async function insertOne(seed) {
  await rest("copy_snippets", {
    method: "POST",
    body: JSON.stringify({
      text: seed.text,
      kind: seed.kind,
      persona: seed.persona ?? "both",
      source: seed.source ?? null,
      tags: seed.tags ?? [],
      favorite: seed.favorite ?? false,
    }),
    prefer: "return=minimal",
  });
}

async function main() {
  console.log(
    `Seeding copy snippets${DRY ? " (DRY RUN)" : ""}${ONLY ? ` (kind=${ONLY})` : ""}…`,
  );

  const planned = SEEDS.filter((s) => !ONLY || s.kind === ONLY);

  let inserted = 0;
  let skipped = 0;

  for (const seed of planned) {
    const tag = `[${seed.kind}${seed.persona && seed.persona !== "both" ? `/${seed.persona}` : ""}]`;
    const preview = seed.text.length > 80 ? seed.text.slice(0, 77) + "…" : seed.text;

    if (DRY) {
      console.log(`  + ${tag.padEnd(20)} ${preview}`);
      inserted++;
      continue;
    }

    if (await exists(seed.kind, seed.text)) {
      console.log(`  · ${tag.padEnd(20)} (exists) ${preview}`);
      skipped++;
      continue;
    }

    await insertOne(seed);
    console.log(`  + ${tag.padEnd(20)} ${preview}`);
    inserted++;
  }

  console.log(
    `\nDone. ${DRY ? "(dry run) " : ""}inserted ${inserted}, skipped ${skipped}.`,
  );
}

main().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});

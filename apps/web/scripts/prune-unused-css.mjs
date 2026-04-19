#!/usr/bin/env node
// One-shot script that prunes CSS rules whose selectors reference only
// unused `styles.xxx` class names, for a set of page-level CSS Modules.
// Walks each file with a tiny brace-matching parser so top-level rules
// and rules inside @media / @supports blocks are handled correctly.
//
// Usage (from apps/web):
//   node scripts/prune-unused-css.mjs            # dry run
//   node scripts/prune-unused-css.mjs --write    # actually modify files

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoWeb = path.resolve(__dirname, "..");

/** Map of CSS module path -> list of tsx files that consume it. */
const targets = [
  {
    css: "src/app/who-are-we/page.module.css",
    tsx: ["src/app/who-are-we/page.tsx", "src/app/who-are-we/FoundersSection.tsx", "src/app/who-are-we/SplineEmbed.tsx"],
  },
  {
    css: "src/app/for-creators/page.module.css",
    tsx: ["src/app/for-creators/page.tsx"],
  },
  {
    css: "src/app/for-advertisers/page.module.css",
    tsx: ["src/app/for-advertisers/page.tsx", "src/app/for-advertisers/StarFogBackground.tsx"],
  },
  {
    css: "src/app/what-is-this/page.module.css",
    tsx: ["src/app/what-is-this/page.tsx"],
  },
  {
    css: "src/app/get-in-touch/page.module.css",
    tsx: ["src/app/get-in-touch/page.tsx"],
  },
  {
    css: "src/app/snowdrift/page.module.css",
    tsx: ["src/app/snowdrift/page.tsx"],
  },
];

function classesUsedInTsx(files) {
  const used = new Set();
  for (const rel of files) {
    const p = path.join(repoWeb, rel);
    if (!fs.existsSync(p)) continue;
    const src = fs.readFileSync(p, "utf8");
    // styles.xxx
    for (const m of src.matchAll(/\bstyles\.([A-Za-z0-9_]+)/g)) used.add(m[1]);
    // styles["xxx"] or styles['xxx']
    for (const m of src.matchAll(/\bstyles\[['"]([A-Za-z0-9_-]+)['"]\]/g)) used.add(m[1]);
  }
  return used;
}

/**
 * Split CSS into top-level items: either a normal rule (selectorList { body })
 * or an at-rule block (like @media ... { rules }) which we recurse into.
 * Keeps original whitespace by recording each item's start/end in the source.
 */
function parseTopLevelItems(src) {
  const items = [];
  let i = 0;
  const len = src.length;

  const skipCommentsAndWs = () => {
    while (i < len) {
      // whitespace
      while (i < len && /\s/.test(src[i])) i++;
      // comment
      if (i + 1 < len && src[i] === "/" && src[i + 1] === "*") {
        const end = src.indexOf("*/", i + 2);
        i = end === -1 ? len : end + 2;
        continue;
      }
      break;
    }
  };

  while (i < len) {
    skipCommentsAndWs();
    if (i >= len) break;
    const start = i;

    // Read selector / at-rule header up to the next '{' or ';'
    while (i < len && src[i] !== "{" && src[i] !== ";") i++;

    if (i >= len) {
      // Trailing junk — keep as-is.
      items.push({ kind: "raw", text: src.slice(start, len), start, end: len });
      break;
    }

    if (src[i] === ";") {
      // at-rule like @charset or @import terminating with ';'
      i++;
      items.push({ kind: "at-simple", text: src.slice(start, i), start, end: i });
      continue;
    }

    // src[i] === '{'
    const header = src.slice(start, i).trim();
    // Find matching brace
    let depth = 1;
    let j = i + 1;
    while (j < len && depth > 0) {
      const c = src[j];
      if (c === "/" && src[j + 1] === "*") {
        const end = src.indexOf("*/", j + 2);
        j = end === -1 ? len : end + 2;
        continue;
      }
      if (c === "{") depth++;
      else if (c === "}") depth--;
      j++;
    }
    const bodyStart = i + 1;
    const bodyEnd = j - 1; // position of '}'
    const isAtRule = header.startsWith("@");
    const item = {
      kind: isAtRule ? "at-block" : "rule",
      header,
      bodyStart,
      bodyEnd,
      start,
      end: j,
      text: src.slice(start, j),
    };
    items.push(item);
    i = j;
  }
  return items;
}

/**
 * A rule's selector list looks like `.a, .b .c, .d:hover { ... }`.
 * Return true if EVERY selector in the list references only "unused" classes.
 * Selectors that reference non-class things (bare tag names, :pseudo, [attr],
 * `from`/`to` inside @keyframes) are treated as "used" so we never drop them.
 */
function selectorListIsEntirelyUnused(selectorList, usedSet, allDefined) {
  const selectors = selectorList.split(",").map((s) => s.trim()).filter(Boolean);
  if (selectors.length === 0) return false;

  for (const selector of selectors) {
    // Collect all class names referenced in this single selector
    const classMatches = [...selector.matchAll(/\.([A-Za-z][A-Za-z0-9_-]*)/g)].map((m) => m[1]);

    if (classMatches.length === 0) {
      // No class names at all — bare tag, pseudo-selector, keyframe keyword.
      // Never touch these.
      return false;
    }

    // If ANY class in this selector is actually used (or is unknown to us —
    // e.g. referenced by another module or by a :global), treat the selector
    // as used.
    for (const cls of classMatches) {
      if (!allDefined.has(cls)) {
        // Not defined in this file at all — could be :global or a framework
        // class. Never remove.
        return false;
      }
      if (usedSet.has(cls)) {
        return false;
      }
    }
  }
  return true; // every selector referenced only unused locally-defined classes
}

/** Collect top-level class names defined in the CSS source. */
function collectDefinedClasses(items) {
  const defined = new Set();
  for (const item of items) {
    if (item.kind === "rule") {
      for (const m of item.header.matchAll(/\.([A-Za-z][A-Za-z0-9_-]*)/g)) {
        defined.add(m[1]);
      }
    } else if (item.kind === "at-block") {
      // recurse into nested rules
      const inner = parseTopLevelItems(item.text.slice(item.text.indexOf("{") + 1, -1));
      for (const sub of inner) {
        if (sub.kind === "rule") {
          for (const m of sub.header.matchAll(/\.([A-Za-z][A-Za-z0-9_-]*)/g)) {
            defined.add(m[1]);
          }
        }
      }
    }
  }
  return defined;
}

function pruneCss(src, usedSet) {
  const topItems = parseTopLevelItems(src);
  const allDefined = collectDefinedClasses(topItems);

  const keepRanges = [];
  let removedSelectors = 0;

  for (const item of topItems) {
    if (item.kind === "raw" || item.kind === "at-simple") {
      keepRanges.push([item.start, item.end]);
      continue;
    }

    if (item.kind === "rule") {
      if (selectorListIsEntirelyUnused(item.header, usedSet, allDefined)) {
        removedSelectors++;
        continue; // drop this rule
      }
      keepRanges.push([item.start, item.end]);
      continue;
    }

    if (item.kind === "at-block") {
      // @media / @supports / @keyframes: recurse into the body.
      // Keep @keyframes entirely (it uses `from`/`to`, not class names).
      if (item.header.startsWith("@keyframes") || item.header.startsWith("@font-face")) {
        keepRanges.push([item.start, item.end]);
        continue;
      }

      const body = src.slice(item.bodyStart, item.bodyEnd);
      const innerItems = parseTopLevelItems(body);
      const innerKept = [];
      let anyInnerKept = false;
      for (const sub of innerItems) {
        if (sub.kind === "rule" && selectorListIsEntirelyUnused(sub.header, usedSet, allDefined)) {
          removedSelectors++;
          continue;
        }
        innerKept.push(body.slice(sub.start, sub.end));
        anyInnerKept = true;
      }
      if (!anyInnerKept) {
        continue; // empty @media block — drop it entirely
      }
      // Rebuild this at-block with only the surviving inner rules
      const newBlock = `${item.header} {\n  ${innerKept.join("\n\n  ").trim()}\n}`;
      keepRanges.push([item.start, item.end, newBlock]);
      continue;
    }
  }

  // Stitch the surviving ranges back together while preserving the
  // original whitespace *between* them.
  let out = "";
  let lastEnd = 0;
  for (const range of keepRanges) {
    const [s, e, replacement] = range;
    // preserve gap between previous block and this one
    out += src.slice(lastEnd, s);
    out += replacement ?? src.slice(s, e);
    lastEnd = e;
  }
  // trailing whitespace after the last kept block is dropped on purpose —
  // collapse repeated blank lines so the diff stays tight.
  out = out.replace(/\n{3,}/g, "\n\n");
  return { output: out, removedSelectors };
}

const shouldWrite = process.argv.includes("--write");
let totalRemoved = 0;
let totalBytesBefore = 0;
let totalBytesAfter = 0;

for (const target of targets) {
  const cssPath = path.join(repoWeb, target.css);
  if (!fs.existsSync(cssPath)) {
    console.warn(`skip (missing): ${target.css}`);
    continue;
  }
  const src = fs.readFileSync(cssPath, "utf8");
  const used = classesUsedInTsx(target.tsx);
  const { output, removedSelectors } = pruneCss(src, used);
  totalRemoved += removedSelectors;
  totalBytesBefore += src.length;
  totalBytesAfter += output.length;
  const delta = src.length - output.length;
  console.log(
    `${target.css}: −${removedSelectors} rules, −${delta} bytes (${src.length} → ${output.length})`,
  );
  if (shouldWrite) {
    fs.writeFileSync(cssPath, output);
  }
}

console.log(
  `\nTotal: −${totalRemoved} rules, −${totalBytesBefore - totalBytesAfter} bytes (${totalBytesBefore} → ${totalBytesAfter})`,
);
if (!shouldWrite) {
  console.log("\n(Dry run. Pass --write to apply.)");
}

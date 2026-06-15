#!/usr/bin/env node
// Alpha-scan a sprite-sheet PNG to derive true cell pitch.
//
// Why: HM rips and similar sheets often have trailing transparent
// padding that fools `sheetWidth ÷ visibleCols`. Dividing by the wrong
// number leaks the next cell's content into every frame. Scanning the
// alpha channel for runs of opaque vs. gap columns gives the real
// content rectangles, from which the pitch falls out.
//
// Usage:
//   node scripts/scan-sprite-sheet.mjs <png-path> [--alpha=N] [--min-gap=N] [--json]
//
//   --alpha=N    pixel is "opaque" if A >= N (default 32, on 0–255)
//   --min-gap=N  collapse single-row/col gaps shorter than N (default 1)
//   --json       emit a JSON manifest of bands + suggested cell rects
//
// Examples:
//   node scripts/scan-sprite-sheet.mjs public/world/sprites/SNES\ -\ Harvest\ Moon\ -\ Animals\ -\ Horse.png
//   node scripts/scan-sprite-sheet.mjs ./cow.png --json > cow.frames.json

import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const args = process.argv.slice(2);
if (args.length === 0 || args[0].startsWith("-")) {
  console.error("usage: scan-sprite-sheet.mjs <png> [--alpha=N] [--min-gap=N] [--json]");
  process.exit(2);
}

const pngPath = args[0];
const flags = Object.fromEntries(
  args.slice(1).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const ALPHA = Number(flags.alpha ?? 32);
const MIN_GAP = Number(flags["min-gap"] ?? 1);
const JSON_OUT = Boolean(flags.json);

const img = sharp(pngPath).ensureAlpha();
const meta = await img.metadata();
const { width, height } = meta;
if (!width || !height) {
  console.error(`could not read dimensions for ${pngPath}`);
  process.exit(1);
}

const raw = await img.raw().toBuffer();
const stride = width * 4;

// For each row: does it have any opaque pixel?
const rowOpaque = new Uint8Array(height);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    if (raw[y * stride + x * 4 + 3] >= ALPHA) {
      rowOpaque[y] = 1;
      break;
    }
  }
}

// Group consecutive opaque rows into bands, ignoring gaps < MIN_GAP.
const bands = runs(rowOpaque, MIN_GAP);

// For each band, scan columns and find cell rects (runs of opaque cols).
const result = bands.map((band, bandIdx) => {
  const colOpaque = new Uint8Array(width);
  for (let x = 0; x < width; x++) {
    for (let y = band.start; y < band.end; y++) {
      if (raw[y * stride + x * 4 + 3] >= ALPHA) {
        colOpaque[x] = 1;
        break;
      }
    }
  }
  const cellRuns = runs(colOpaque, MIN_GAP);
  // Pitch estimate: avg distance between adjacent cell starts.
  let pitch = null;
  if (cellRuns.length >= 2) {
    let sum = 0;
    for (let i = 1; i < cellRuns.length; i++) {
      sum += cellRuns[i].start - cellRuns[i - 1].start;
    }
    pitch = Math.round(sum / (cellRuns.length - 1));
  }
  return {
    bandIdx,
    yStart: band.start,
    yEnd: band.end,
    height: band.end - band.start,
    cellCount: cellRuns.length,
    pitch,
    cells: cellRuns.map((c) => ({ x: c.start, width: c.end - c.start })),
  };
});

if (JSON_OUT) {
  console.log(
    JSON.stringify(
      { source: path.basename(pngPath), width, height, alpha: ALPHA, bands: result },
      null,
      2,
    ),
  );
  process.exit(0);
}

// Pretty report.
console.log(`\nSheet: ${pngPath}`);
console.log(`Dimensions: ${width} × ${height}   alpha-cutoff: ${ALPHA}\n`);
console.log(`Bands (rows of sprites):`);
for (const b of result) {
  console.log(
    `  band ${b.bandIdx}: y=${b.yStart}..${b.yEnd}  (h=${b.height})  ` +
      `cells=${b.cellCount}  pitch≈${b.pitch ?? "?"}px`,
  );
}
console.log(`\nPer-band cell rects (x, width):`);
for (const b of result) {
  console.log(`  band ${b.bandIdx} (y=${b.yStart}, h=${b.height}):`);
  const sample = b.cells.slice(0, 16).map((c) => `(${c.x},w${c.width})`).join(" ");
  console.log(`    ${sample}${b.cells.length > 16 ? ` … +${b.cells.length - 16} more` : ""}`);
}
console.log(
  `\nSuggested registerFrames call (pitch-based, copy-paste & edit names):\n`,
);
for (const b of result) {
  if (!b.pitch) continue;
  const h = b.height;
  console.log(`  // band ${b.bandIdx} — h=${h}`);
  for (let i = 0; i < b.cellCount; i++) {
    console.log(`  add("name-${b.bandIdx}-${i}", 0, ${b.cells[0].x + i * b.pitch}, ${b.yStart}, ${b.pitch}, ${h});`);
  }
}

function runs(arr, minGap) {
  const out = [];
  let i = 0;
  while (i < arr.length) {
    if (!arr[i]) {
      i++;
      continue;
    }
    const start = i;
    while (i < arr.length && (arr[i] || lookahead(arr, i, minGap))) i++;
    out.push({ start, end: i });
  }
  return out;
}

function lookahead(arr, i, minGap) {
  // True if there's an opaque value within the next `minGap` slots,
  // so we can bridge tiny gaps inside a band/cell.
  if (minGap <= 1) return false;
  for (let k = 1; k <= minGap; k++) {
    if (arr[i + k]) return true;
  }
  return false;
}

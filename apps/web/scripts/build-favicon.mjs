#!/usr/bin/env node
/**
 * Build the GhostSignal cloud-mark favicon set from the brand assets.
 *
 * The source `cloudmark-white.png` is a halftone-textured cloud
 * silhouette with the "GS" letters cut out — designed for print, not
 * for 16-32px favicon use. At small sizes the halftone dots disappear
 * and only the GS letters survive, which looks broken.
 *
 * This script flattens the halftone into a solid white cloud
 * silhouette via heavy alpha blur + threshold, then exports:
 *
 *   apps/web/src/app/favicon.ico      — multi-size (16, 32, 48) ICO
 *   apps/web/src/app/icon.png         — 32x32 PNG (modern browsers)
 *   apps/web/src/app/apple-icon.png   — 180x180 PNG for iOS home screen
 *
 * Next.js' App Router picks these up automatically and emits the
 * matching `<link rel="icon">` tags for every route, including /admin.
 *
 * Re-run when the brand cloud-mark changes.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const SRC = path.join(
  REPO_ROOT,
  "public",
  "brand",
  "png",
  "cloudmark-white.png",
);
const OUT_DIR = path.join(REPO_ROOT, "src", "app");

/** Recover a solid white cloud silhouette from the halftone-textured
 *  source. Strategy: heavily downscale first — the natural box-filter
 *  averaging collapses the halftone dots into a smooth gradient — then
 *  threshold the alpha to recover a sharp silhouette, and tint every
 *  remaining pixel to pure white. Returns a square RGBA PNG buffer
 *  with the cloud centered on a transparent canvas. */
async function buildCloudSilhouette(size) {
  // Inner cloud fills ~84% of the canvas with breathing room on all
  // sides. Halftone source aspect is ~341×225 (~1.51), so contain-fit
  // gives a wider-than-tall silhouette centered vertically.
  const inset = Math.max(1, Math.round(size * 0.08));
  const inner = size - inset * 2;

  // 1) Downscale the halftone source into the inner region — sharp's
  //    default lanczos resize naturally smooths the halftone into a
  //    continuous gradient at small sizes.
  const fitted = await sharp(SRC)
    .resize(inner, inner, {
      fit: "inside",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data: fittedData, info: fittedInfo } = fitted;
  const fittedW = fittedInfo.width;
  const fittedH = fittedInfo.height;

  // 2) Threshold the alpha into a binary mask and tint to pure white.
  //    Pixels above the threshold survive as opaque white; the rest
  //    drop to fully transparent. Threshold tuned so the halftone
  //    body reads as a continuous cloud but stray dots don't bleed
  //    into the margins.
  const threshold = 50;
  const innerRgba = Buffer.alloc(fittedW * fittedH * 4);
  for (let j = 0; j < fittedData.length; j += 4) {
    const a = fittedData[j + 3];
    const lit = a >= threshold;
    innerRgba[j] = 255;
    innerRgba[j + 1] = 255;
    innerRgba[j + 2] = 255;
    innerRgba[j + 3] = lit ? 255 : 0;
  }

  // 3) Center the silhouette on the final size×size canvas with a
  //    transparent background. The inner image is already smaller than
  //    the outer canvas due to inset, so the composite centers it
  //    cleanly.
  const innerPng = await sharp(innerRgba, {
    raw: { width: fittedW, height: fittedH, channels: 4 },
  })
    .png()
    .toBuffer();

  const png = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: innerPng, gravity: "center" }])
    .png()
    .toBuffer();

  return png;
}

/** Same as the silhouette but flattened onto a dark background — iOS
 *  doesn't honor transparency on home-screen icons and rounds the
 *  corners automatically. Dark background also matches GhostSignal's
 *  brand surface. */
async function buildAppleIcon(size) {
  const silhouette = await buildCloudSilhouette(size);
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 11, g: 15, b: 18, alpha: 1 },
    },
  })
    .composite([{ input: silhouette }])
    .png()
    .toBuffer();
}

/** Encode a multi-size ICO file. We embed each size as a PNG payload
 *  (supported by every ICO consumer since Vista — and meaningfully
 *  smaller than raw BMP). Structure:
 *
 *    ICONDIR     (6 bytes)
 *    ICONDIRENTRY × N (16 bytes each)
 *    PNG payloads concatenated
 */
function buildIco(pngEntries) {
  const ICONDIR_SIZE = 6;
  const ICONDIRENTRY_SIZE = 16;
  const header = Buffer.alloc(ICONDIR_SIZE);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(pngEntries.length, 4); // count

  let imageDataOffset =
    ICONDIR_SIZE + pngEntries.length * ICONDIRENTRY_SIZE;
  const entries = [];
  for (const { size, png } of pngEntries) {
    const entry = Buffer.alloc(ICONDIRENTRY_SIZE);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8); // image data size
    entry.writeUInt32LE(imageDataOffset, 12); // image data offset
    entries.push(entry);
    imageDataOffset += png.length;
  }

  return Buffer.concat([
    header,
    ...entries,
    ...pngEntries.map((e) => e.png),
  ]);
}

async function main() {
  console.log(`Source: ${path.relative(REPO_ROOT, SRC)}`);

  const sizes = [16, 32, 48];
  const pngEntries = [];
  for (const size of sizes) {
    const png = await buildCloudSilhouette(size);
    pngEntries.push({ size, png });
  }

  const ico = buildIco(pngEntries);
  const icoPath = path.join(OUT_DIR, "favicon.ico");
  await fs.writeFile(icoPath, ico);
  console.log(
    `  wrote ${path.relative(REPO_ROOT, icoPath)} (${ico.length} bytes, ${sizes.join("/")}px)`,
  );

  const iconPng = await buildCloudSilhouette(32);
  const iconPath = path.join(OUT_DIR, "icon.png");
  await fs.writeFile(iconPath, iconPng);
  console.log(
    `  wrote ${path.relative(REPO_ROOT, iconPath)} (${iconPng.length} bytes, 32px)`,
  );

  const appleIcon = await buildAppleIcon(180);
  const applePath = path.join(OUT_DIR, "apple-icon.png");
  await fs.writeFile(applePath, appleIcon);
  console.log(
    `  wrote ${path.relative(REPO_ROOT, applePath)} (${appleIcon.length} bytes, 180px)`,
  );

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

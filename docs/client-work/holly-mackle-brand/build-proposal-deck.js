/**
 * Holly Mackle — Brand Proposal Deck (V1)
 * GhostSignal · Jeremy copy kept intact on the scope slide
 *
 * Slides (6): Cover → Opportunity → Overview → Timeline → Scope+Investment → Next Steps
 */
const pptxgen = require("pptxgenjs");
const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "../../..");
const LOGO_WHITE = path.join(ROOT, "logo/PNG/brandmark-hor-white@2x.png");
const LOGO_BLACK = path.join(ROOT, "logo/PNG/brandmark-hor-black@2x.png");
const CLOUD_WHITE = path.join(ROOT, "logo/PNG/cloudmark-white@2x.png");

const C = {
  terracotta: "D66157",
  wine: "9F71AF",
  green: "00B29C",
  pink: "FF7BAD",
  saffron: "FBAD25",
  ink: "141414",
  charcoal: "1C1C1C",
  paper: "FAF8F5",
  cream: "F3EEE6",
  muted: "6B6560",
  soft: "E8E2D9",
  white: "FFFFFF",
};

/** Site-aligned sans; Georgia for display headlines (Work Sans not universal in PPT). */
const FONT = "Arial";
const FONT_DISPLAY = "Georgia";
const TOTAL = 6;

function makeShadow() {
  return { type: "outer", color: "000000", blur: 16, offset: 3, angle: 135, opacity: 0.12 };
}

function addColorBars(slide, y = 5.4) {
  const colors = [C.terracotta, C.wine, C.green, C.pink, C.saffron];
  const w = 10 / colors.length;
  colors.forEach((color, i) => {
    slide.addShape(pres.shapes.RECTANGLE, {
      x: i * w,
      y,
      w,
      h: 0.225,
      fill: { color },
      line: { color, width: 0 },
    });
  });
}

function addFooterMeta(slide, page, dark = false) {
  slide.addText("GHOSTSIGNAL  ·  PROPOSAL V1", {
    x: 0.45,
    y: 5.12,
    w: 5.5,
    h: 0.22,
    fontFace: FONT,
    fontSize: 9,
    color: dark ? "A8A29A" : C.muted,
    charSpacing: 2,
    margin: 0,
  });
  slide.addText(String(page).padStart(2, "0") + " / " + String(TOTAL).padStart(2, "0"), {
    x: 8.3,
    y: 5.12,
    w: 1.25,
    h: 0.22,
    fontFace: FONT,
    fontSize: 9,
    bold: true,
    color: dark ? "A8A29A" : C.muted,
    align: "right",
    margin: 0,
  });
}

function phaseAccent(i) {
  return [C.green, C.wine, C.terracotta, C.saffron][i];
}

const phases = [
  {
    num: "01",
    title: "Discovery",
    body:
      "This project begins with understanding: through a guided conversation we discover your hopes and aspirations for the future of your brand. This step forms the foundation for the steps that follow, ensuring we stay authentic to who you are.",
  },
  {
    num: "02",
    title: "Brand Strategy",
    body:
      "Building on the Discovery step, we develop a Brand Strategy report, detailing the direction and aims of the brand. Here, we codify the role of each of the brand’s current platforms, describe the voice of the brand, and recommend steps for future growth.",
  },
  {
    num: "03",
    title: "Visual Identity",
    body:
      "Based on the Discovery and Strategy steps, we develop a cohesive Visual Identity for the overall brand. Including logo, color palette, and fonts, this step develops the entire visual environment for the brand.",
  },
  {
    num: "04",
    title: "Website + Platform Assets",
    body:
      "Finally, we apply all the previous work to a new website for the brand. Serving as a hub for all of your offerings, the website gives your audience the ease of a singular gathering place from which you communicate. This step also includes visual assets necessary for creating brand consistency across all of your current platforms.",
  },
];

const pres = new pptxgen();
pres.defineLayout({ name: "WIDE_1920", width: 13.333, height: 7.5 }); // 1920×1080 at 144dpi inches
pres.layout = "WIDE_1920";
pres.author = "GHOSTSignal";
pres.title = "Holly Mackle — Brand Proposal V1";
pres.subject = "Brand strategy, visual identity, website + platform assets";

// Layout helpers for 13.333 × 7.5
const W = 13.333;
const H = 7.5;
const M = 0.7; // outer margin

function addColorBarsWide(slide, y = 7.35) {
  // Half the prior 0.3" strip height
  const colors = [C.terracotta, C.wine, C.green, C.pink, C.saffron];
  const w = W / colors.length;
  const h = 0.15;
  colors.forEach((color, i) => {
    slide.addShape(pres.shapes.RECTANGLE, {
      x: i * w,
      y,
      w,
      h,
      fill: { color },
      line: { color, width: 0 },
    });
  });
}

function addFooterWide(slide, page, dark = false) {
  slide.addText("GHOSTSIGNAL  ·  PROPOSAL V1", {
    x: M,
    y: 6.9,
    w: 6,
    h: 0.25,
    fontFace: FONT,
    fontSize: 11,
    color: dark ? "A8A29A" : C.muted,
    charSpacing: 2,
    margin: 0,
  });
  slide.addText(String(page).padStart(2, "0") + " / " + String(TOTAL).padStart(2, "0"), {
    x: W - M - 1.4,
    y: 6.9,
    w: 1.4,
    h: 0.25,
    fontFace: FONT,
    fontSize: 11,
    bold: true,
    color: dark ? "A8A29A" : C.muted,
    align: "right",
    margin: 0,
  });
}

// ─────────────────────────────────────────────
// 1 · COVER
// Live web cover uses invitation cloud video + white-backed spin GIF.
// PPTX uses the invitation poster still (video cannot embed here).
// ─────────────────────────────────────────────
{
  const slide = pres.addSlide();
  const COVER_POSTER = path.join(
    ROOT,
    "apps/web/public/videos/invitation-hero-prev-poster.jpg"
  );
  const SPIN_WHITE = path.join(ROOT, "apps/web/public/images/email/logo-spin.gif");

  if (fs.existsSync(COVER_POSTER)) {
    slide.addImage({
      path: COVER_POSTER,
      x: 0,
      y: 0,
      w: W,
      h: H,
      altText: "Cloud field",
    });
  } else {
    slide.background = { color: "F5F0E8" };
  }

  // Soft dark lift behind the bottom-left white type stack
  slide.addShape(pres.shapes.OVAL, {
    x: 0.1,
    y: 4.0,
    w: 7.4,
    h: 3.3,
    fill: { color: "141414", transparency: 45 },
    line: { color: "141414", transparency: 100, width: 0 },
  });

  // 100px ≈ 100/144 ≈ 0.694" at 144dpi (this deck’s inch grid)
  const inset = 100 / 144;

  if (fs.existsSync(SPIN_WHITE)) {
    slide.addImage({
      path: SPIN_WHITE,
      x: inset,
      y: inset,
      w: 0.95,
      h: 0.95,
      altText: "GHOSTSignal spinning cloud",
    });
  }

  slide.addText("BRAND PROPOSAL", {
    x: inset,
    y: H - inset - 1.45,
    w: 8,
    h: 0.35,
    fontFace: FONT,
    fontSize: 16,
    bold: true,
    color: C.white,
    align: "left",
    charSpacing: 4,
    margin: 0,
  });

  slide.addText("Holly Mackle", {
    x: inset,
    y: H - inset - 1.05,
    w: 8,
    h: 0.55,
    fontFace: FONT,
    fontSize: 36,
    bold: true,
    color: C.white,
    align: "left",
    margin: 0,
  });

  slide.addText("Brand Strategy & Visual Identity", {
    x: inset,
    y: H - inset - 0.45,
    w: 8,
    h: 0.4,
    fontFace: FONT,
    fontSize: 18,
    color: "E8E2D9",
    align: "left",
    margin: 0,
  });
}

// ─────────────────────────────────────────────
// 2 · INTRO / OPPORTUNITY
// Live web slide: half-size cloudmark, smaller body + support type,
// purple bar stretched to the support text box height.
// ─────────────────────────────────────────────
{
  const slide = pres.addSlide();
  slide.background = { color: C.paper };
  // Same horizontal black brandmark as before; slightly smaller than the prior 2.2" × 0.44"
  if (fs.existsSync(LOGO_BLACK)) {
    slide.addImage({
      path: LOGO_BLACK,
      x: M,
      y: 0.45,
      w: 1.7,
      h: 0.34,
      altText: "GHOSTSignal",
    });
  }

  const HEADSHOT = path.join(
    ROOT,
    "apps/web/public/images/proposals/holly-mackle/holly-mackle-headshot.jpg"
  );
  const copyW = 7.2;

  // Type template: H1 36 / lead 24 / support 16
  slide.addText("The Opportunity", {
    x: M,
    y: 1.0,
    w: copyW,
    h: 0.55,
    fontFace: FONT,
    fontSize: 36,
    bold: true,
    color: C.ink,
    margin: 0,
  });

  slide.addShape(pres.shapes.RECTANGLE, {
    x: M,
    y: 1.6,
    w: 0.7,
    h: 0.05,
    fill: { color: C.terracotta },
    line: { color: C.terracotta, width: 0 },
  });

  slide.addText(
    "Holly Mackle is a writer, podcaster, former-librarian book-recommender, and all-around force for joy in the world. Holly is at an important inflection point: having built a strong following and collection of products, Holly deserves a clear brand strategy to organize all her efforts, giving her audience a singular hub and touchpoint.",
    {
      x: M,
      y: 1.85,
      w: copyW,
      h: 2.35,
      fontFace: FONT,
      fontSize: 24,
      color: C.ink,
      margin: 0,
    }
  );

  // Support block — bar height matched to this text box
  const supportY = 4.4;
  const supportH = 1.7;
  slide.addShape(pres.shapes.RECTANGLE, {
    x: M,
    y: supportY,
    w: 0.08,
    h: supportH,
    fill: { color: C.wine },
    line: { color: C.wine, width: 0 },
  });

  slide.addText(
    "GHOSTSignal loves to help people clarify themselves through strategy and visuals that generate real connection. Through deep listening and targeted design, we help clients map a path to their brand’s future. We are honored to offer this proposal, and appreciate the opportunity.",
    {
      x: M + 0.3,
      y: supportY,
      w: copyW - 0.3,
      h: supportH,
      fontFace: FONT,
      fontSize: 16,
      color: C.muted,
      margin: 0,
    }
  );

  if (fs.existsSync(HEADSHOT)) {
    slide.addImage({
      path: HEADSHOT,
      x: 8.55,
      y: 0.55,
      w: 4.1,
      h: 6.4,
      sizing: { type: "cover", w: 4.1, h: 6.4 },
      altText: "Holly Mackle",
    });
  }
}

// ─────────────────────────────────────────────
// 3 · OVERVIEW (short four cards — 2×2, rounded)
// Type template: H1 36 / subhead 20 / card title 14 caps / support 16
// ─────────────────────────────────────────────
{
  const slide = pres.addSlide();
  slide.background = { color: C.paper };

  if (fs.existsSync(LOGO_BLACK)) {
    slide.addImage({
      path: LOGO_BLACK,
      x: M,
      y: 0.35,
      w: 1.7,
      h: 0.34,
      altText: "GHOSTSignal",
    });
  }

  slide.addText("The Work", {
    x: M,
    y: 0.9,
    w: 11,
    h: 0.5,
    fontFace: FONT,
    fontSize: 36,
    bold: true,
    color: C.ink,
    margin: 0,
  });
  slide.addText("Four connected steps", {
    x: M,
    y: 1.4,
    w: 11,
    h: 0.35,
    fontFace: FONT,
    fontSize: 20,
    color: C.muted,
    margin: 0,
  });

  const cardW = 2.85;
  const cardH = 4.7;
  const gapX = 0.22;
  const startX = M;
  const startY = 1.95;
  const short = [
    "Guided conversation to surface hopes and aspirations for the brand’s future.",
    "A Brand Strategy report: platforms, voice, and recommended growth steps.",
    "Logo, color palette, and fonts — the full visual environment.",
    "A website hub for your offerings, plus assets for cross-platform consistency.",
  ];

  phases.forEach((p, i) => {
    const x = startX + i * (cardW + gapX);
    const y = startY;
    const accent = phaseAccent(i);

    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x,
      y,
      w: cardW,
      h: cardH,
      fill: { color: C.white },
      line: { color: C.soft, width: 1 },
      shadow: makeShadow(),
      rectRadius: 0.12,
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x,
      y,
      w: 0.08,
      h: cardH,
      fill: { color: accent },
      line: { color: accent, width: 0 },
    });
    slide.addText(p.num, {
      x: x + 0.3,
      y: y + 0.25,
      w: cardW - 0.5,
      h: 0.4,
      fontFace: FONT,
      fontSize: 24,
      color: accent,
      bold: true,
      margin: 0,
    });
    const titleLines = [
      ["DISCOVERY"],
      ["BRAND", "STRATEGY"],
      ["VISUAL", "IDENTITY"],
      ["WEBSITE +", "PLATFORM ASSETS"],
    ][i];
    slide.addText(titleLines.join("\n"), {
      x: x + 0.22,
      y: y + 0.75,
      w: cardW - 0.44,
      h: 1.2,
      fontFace: FONT,
      fontSize: 22,
      bold: true,
      color: C.ink,
      charSpacing: 1,
      margin: 0,
      valign: "top",
    });
    slide.addText(short[i], {
      x: x + 0.22,
      y: y + 2.2,
      w: cardW - 0.44,
      h: 2.2,
      fontFace: FONT,
      fontSize: 18,
      color: C.muted,
      margin: 0,
    });
  });
}

// ─────────────────────────────────────────────
// 4 · TIMELINE — 4-week calendar grid (one phase / week)
// ─────────────────────────────────────────────
{
  const slide = pres.addSlide();
  slide.background = { color: C.paper };

  if (fs.existsSync(LOGO_BLACK)) {
    slide.addImage({
      path: LOGO_BLACK,
      x: M,
      y: 0.3,
      w: 1.7,
      h: 0.34,
      altText: "GHOSTSignal",
    });
  }

  slide.addText("The Timeline", {
    x: M,
    y: 0.8,
    w: 11,
    h: 0.45,
    fontFace: FONT,
    fontSize: 36,
    bold: true,
    color: C.ink,
    margin: 0,
  });
  slide.addText("About four weeks, end to end", {
    x: M,
    y: 1.3,
    w: 11,
    h: 0.3,
    fontFace: FONT,
    fontSize: 20,
    color: C.muted,
    margin: 0,
  });
  slide.addText("A suggested pace — exact dates lock once we kick off together.", {
    x: M,
    y: 1.65,
    w: 11,
    h: 0.3,
    fontFace: FONT,
    fontSize: 16,
    color: C.muted,
    margin: 0,
  });

  // One month frame
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: M,
    y: 2.1,
    w: W - M * 2,
    h: 4.85,
    fill: { color: C.white },
    line: { color: C.soft, width: 1 },
    shadow: makeShadow(),
    rectRadius: 0.12,
  });

  const weeks = [
    { label: "WEEK 1", title: "DISCOVERY", focus: "Listen & surface hopes for the brand’s future.", color: C.green },
    { label: "WEEK 2", title: "BRAND STRATEGY", focus: "Platforms, voice, and the growth path.", color: C.wine },
    { label: "WEEK 3", title: "VISUAL IDENTITY", focus: "Logo, color, and the full visual environment.", color: C.terracotta },
    { label: "WEEK 4", title: "WEBSITE + PLATFORM ASSETS", focus: "The hub plus assets for every channel.", color: C.saffron },
  ];
  const rowH = 1.05;
  const startY = 2.45;

  weeks.forEach((w, i) => {
    const y = startY + i * rowH;
    slide.addText(w.label, {
      x: M + 0.25,
      y: y + 0.28,
      w: 1.3,
      h: 0.4,
      fontFace: FONT,
      fontSize: 12,
      bold: true,
      color: w.color,
      charSpacing: 1,
      margin: 0,
    });
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: M + 1.7,
      y: y + 0.12,
      w: W - M * 2 - 2.1,
      h: 0.78,
      fill: { color: w.color },
      line: { color: w.color, width: 0 },
      rectRadius: 0.08,
    });
    slide.addText(`${w.title}  ·  ${w.focus}`, {
      x: M + 1.95,
      y: y + 0.28,
      w: W - M * 2 - 2.6,
      h: 0.45,
      fontFace: FONT,
      fontSize: 14,
      bold: true,
      color: C.white,
      margin: 0,
    });
  });

  // No footer meta / brand bars on Timeline
}

// ─────────────────────────────────────────────
// 5 · SCOPE — four tall columns + investment
// ─────────────────────────────────────────────
{
  const slide = pres.addSlide();
  slide.background = { color: C.paper };

  slide.addText("SCOPE OF WORK", {
    x: M,
    y: 0.22,
    w: 8,
    h: 0.24,
    fontFace: FONT,
    fontSize: 12,
    color: C.green,
    charSpacing: 4,
    margin: 0,
  });
  slide.addText("What we will do together", {
    x: M,
    y: 0.45,
    w: 10,
    h: 0.38,
    fontFace: FONT_DISPLAY,
    fontSize: 26,
    color: C.ink,
    margin: 0,
  });

  const colW = 2.9;
  const gap = 0.16;
  const startX = M;
  const colTop = 0.95;
  const colH = 4.85;

  phases.forEach((p, i) => {
    const x = startX + i * (colW + gap);
    const accent = phaseAccent(i);

    slide.addShape(pres.shapes.RECTANGLE, {
      x,
      y: colTop,
      w: colW,
      h: colH,
      fill: { color: C.white },
      line: { color: C.soft, width: 1 },
      shadow: makeShadow(),
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x,
      y: colTop,
      w: 0.12,
      h: colH,
      fill: { color: accent },
      line: { color: accent, width: 0 },
    });
    slide.addText(p.num, {
      x: x + 0.26,
      y: colTop + 0.18,
      w: colW - 0.42,
      h: 0.34,
      fontFace: FONT,
      fontSize: 20,
      color: accent,
      bold: true,
      margin: 0,
    });
    slide.addText(p.title, {
      x: x + 0.26,
      y: colTop + 0.55,
      w: colW - 0.42,
      h: 0.7,
      fontFace: FONT_DISPLAY,
      fontSize: 18,
      color: C.ink,
      margin: 0,
    });
    slide.addText(p.body, {
      x: x + 0.26,
      y: colTop + 1.35,
      w: colW - 0.42,
      h: 3.25,
      fontFace: FONT,
      fontSize: 11,
      color: C.muted,
      margin: 0,
      valign: "top",
    });
  });

  // Investment summary below the four columns
  slide.addShape(pres.shapes.RECTANGLE, {
    x: M,
    y: 5.95,
    w: W - M * 2,
    h: 0.9,
    fill: { color: C.ink },
    line: { color: C.ink, width: 0 },
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: M,
    y: 5.95,
    w: 0.14,
    h: 0.9,
    fill: { color: C.green },
    line: { color: C.green, width: 0 },
  });
  slide.addText("PROJECT INVESTMENT  ·  TOTAL FOR ALL FOUR STEPS", {
    x: M + 0.4,
    y: 6.1,
    w: 8,
    h: 0.6,
    fontFace: FONT,
    fontSize: 14,
    color: "A8A29A",
    charSpacing: 1,
    valign: "middle",
    margin: 0,
  });
  slide.addText("$4,850", {
    x: W - M - 2.6,
    y: 6.05,
    w: 2.4,
    h: 0.7,
    fontFace: FONT_DISPLAY,
    fontSize: 34,
    color: C.white,
    align: "right",
    valign: "middle",
    margin: 0,
  });

  // No brand-color footer bars on Scope (matches live slide)
}

// ─────────────────────────────────────────────
// 6 · NEXT STEPS — dark inverted close; no price / no brand bars
// ─────────────────────────────────────────────
{
  const slide = pres.addSlide();
  slide.background = { color: C.ink };
  const LOGO_CLOUD = path.join(ROOT, "apps/web/public/images/brand/cloudmark-white.png");
  const inset = 100 / 144;

  if (fs.existsSync(LOGO_CLOUD)) {
    slide.addImage({
      path: LOGO_CLOUD,
      x: W - inset - 0.55,
      y: inset,
      w: 0.55,
      h: 0.55,
      altText: "GHOSTSignal cloudmark",
    });
  }

  slide.addText("Next Steps", {
    x: inset,
    y: inset,
    w: 10,
    h: 0.5,
    fontFace: FONT,
    fontSize: 36,
    bold: true,
    color: C.white,
    margin: 0,
  });
  slide.addText("Ready when you are.", {
    x: inset,
    y: inset + 0.55,
    w: 10,
    h: 0.35,
    fontFace: FONT,
    fontSize: 20,
    color: "A8A29A",
    margin: 0,
  });
  slide.addText(
    "Thank you for the opportunity to make this proposal. With questions or to get started, simply email Jeremy.",
    {
      x: inset,
      y: 2.4,
      w: 10,
      h: 1.2,
      fontFace: FONT,
      fontSize: 24,
      color: "E8E2D9",
      margin: 0,
    }
  );

  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: inset,
    y: 4.4,
    w: 7.2,
    h: 1.35,
    fill: { color: C.charcoal },
    line: { color: "2A2A2A", width: 1 },
    shadow: makeShadow(),
    rectRadius: 0.12,
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: inset,
    y: 4.4,
    w: 0.08,
    h: 1.35,
    fill: { color: C.saffron },
    line: { color: C.saffron, width: 0 },
  });
  slide.addText("GET STARTED", {
    x: inset + 0.35,
    y: 4.55,
    w: 6.5,
    h: 0.3,
    fontFace: FONT,
    fontSize: 12,
    bold: true,
    color: "8A847C",
    charSpacing: 2,
    margin: 0,
  });
  slide.addText("jeremy@ghostsignal.cloud", {
    x: inset + 0.35,
    y: 4.95,
    w: 6.5,
    h: 0.45,
    fontFace: FONT,
    fontSize: 24,
    bold: true,
    color: C.white,
    margin: 0,
  });
  slide.addText("Welcome to the Signal.", {
    x: inset,
    y: 6.05,
    w: 10,
    h: 0.35,
    fontFace: FONT,
    fontSize: 16,
    italic: true,
    color: "8A847C",
    margin: 0,
  });
}

const out = path.join(__dirname, "holly-mackle-brand-proposal.pptx");
pres.writeFile({ fileName: out }).then(() => {
  console.log("Wrote", out, `(${TOTAL} slides @ 1920×1080)`);
});

/**
 * Approximate slide previews via SVG → PNG for visual QA (no LibreOffice).
 * 1920×1080 (16:9) matching the deck layouts.
 */
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "slides");
fs.mkdirSync(OUT, { recursive: true });

const C = {
  terracotta: "#D66157",
  wine: "#9F71AF",
  green: "#00B29C",
  pink: "#FF7BAD",
  saffron: "#FBAD25",
  ink: "#141414",
  charcoal: "#1C1C1C",
  paper: "#FAF8F5",
  cream: "#F3EEE6",
  muted: "#6B6560",
  soft: "#E8E2D9",
  white: "#FFFFFF",
};

const W = 1920;
const H = 1080;
const ROOT = path.resolve(__dirname, "../../..");
const logoWhite = path.join(ROOT, "logo/PNG/brandmark-hor-white@2x.png");
const logoBlack = path.join(ROOT, "logo/PNG/brandmark-hor-black@2x.png");
const cloudWhite = path.join(ROOT, "logo/PNG/cloudmark-white@2x.png");

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function colorBars(y = 1028) {
  const colors = [C.terracotta, C.wine, C.green, C.pink, C.saffron];
  const bw = W / colors.length;
  return colors
    .map(
      (c, i) =>
        `<rect x="${i * bw}" y="${y}" width="${bw}" height="52" fill="${c}"/>`
    )
    .join("");
}

function footer(page, dark = false) {
  const col = dark ? "#A8A29A" : C.muted;
  return `
    <text x="96" y="970" font-family="Calibri, Arial, sans-serif" font-size="16" fill="${col}" letter-spacing="2">GHOSTSIGNAL  ·  PROPOSAL</text>
    <text x="1824" y="970" text-anchor="end" font-family="Calibri, Arial, sans-serif" font-size="16" fill="${col}">${String(page).padStart(2, "0")} / 09</text>
  `;
}

function wrapText(text, maxChars, maxLines = 8) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? cur + " " + w : w;
    if (next.length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
      if (lines.length >= maxLines) break;
    } else cur = next;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines;
}

async function writeSvg(name, svg, composites = []) {
  const base = await sharp(Buffer.from(svg)).png().toBuffer();
  let img = sharp(base);
  if (composites.length) {
    img = sharp(base).composite(composites);
  }
  const out = path.join(OUT, name);
  await img.png().toFile(out);
  console.log("wrote", name);
}

async function main() {
  // Slide 1 — Cover
  await writeSvg(
    "slide-01.png",
    `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${C.ink}"/>
  <rect x="1420" y="0" width="500" height="${H}" fill="${C.charcoal}"/>
  <rect x="1420" y="0" width="28" height="${H}" fill="${C.green}"/>
  <rect x="1708" y="0" width="212" height="346" fill="${C.wine}"/>
  <rect x="1574" y="690" width="346" height="390" fill="${C.terracotta}"/>
  <rect x="1450" y="384" width="172" height="230" fill="${C.saffron}"/>
  <rect x="1795" y="412" width="125" height="172" fill="${C.pink}"/>
  <text x="106" y="340" font-family="Calibri, Arial, sans-serif" font-size="24" fill="${C.green}" letter-spacing="6">BRAND PROPOSAL</text>
  <text x="106" y="430" font-family="Georgia, serif" font-size="84" fill="${C.white}">Holly Mackle</text>
  <text x="106" y="520" font-family="Calibri, Arial, sans-serif" font-size="32" fill="#D6D0C8">A clear brand strategy, visual identity,</text>
  <text x="106" y="565" font-family="Calibri, Arial, sans-serif" font-size="32" fill="#D6D0C8">and singular hub for everything she offers.</text>
  <text x="106" y="940" font-family="Calibri, Arial, sans-serif" font-size="22" fill="#8A847C">Prepared by GHOSTSignal  ·  jeremy@ghostsignal.cloud</text>
</svg>`,
    fs.existsSync(logoWhite)
      ? [{ input: await sharp(logoWhite).resize({ width: 400 }).png().toBuffer(), left: 106, top: 80 }]
      : []
  );

  // Slide 2 — Intro
  const intro1 = wrapText(
    "Holly Mackle is a writer, podcaster, former-librarian book-recommender, and all-around force for joy in the world. Holly is at an important inflection point: having built a strong following and collection of products, Holly deserves a clear brand strategy to organize all her efforts, giving her audience a singular hub and touchpoint.",
    72,
    5
  );
  const intro2 = wrapText(
    "GHOSTSignal loves to help people clarify themselves through strategy and visuals that generate real connection. Through deep listening and targeted design, we help clients map a path to their brand’s future. We are honored to offer this proposal, and appreciate the opportunity.",
    78,
    5
  );
  await writeSvg(
    "slide-02.png",
    `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${C.paper}"/>
  <text x="106" y="210" font-family="Calibri, Arial, sans-serif" font-size="22" fill="${C.green}" letter-spacing="4">THE OPPORTUNITY</text>
  ${intro1
    .map(
      (l, i) =>
        `<text x="106" y="${290 + i * 42}" font-family="Georgia, serif" font-size="30" fill="${C.ink}">${esc(l)}</text>`
    )
    .join("\n")}
  <rect x="106" y="560" width="14" height="280" fill="${C.wine}"/>
  ${intro2
    .map(
      (l, i) =>
        `<text x="150" y="${590 + i * 36}" font-family="Calibri, Arial, sans-serif" font-size="26" fill="${C.muted}">${esc(l)}</text>`
    )
    .join("\n")}
  ${footer(2)}
  ${colorBars()}
</svg>`,
    fs.existsSync(logoBlack)
      ? [{ input: await sharp(logoBlack).resize({ width: 320 }).png().toBuffer(), left: 106, top: 60 }]
      : []
  );

  // Slide 3 — Four cards
  const shorts = [
    "Guided conversation to surface hopes and aspirations for the brand’s future.",
    "A Brand Strategy report: platforms, voice, and recommended growth steps.",
    "Logo, color palette, and fonts — the full visual environment.",
    "A new website hub plus assets for consistency across platforms.",
  ];
  const titles = ["Discovery", "Brand Strategy", "Visual Identity", "Website + Platform Assets"];
  const accents = [C.green, C.wine, C.terracotta, C.saffron];
  const cardW = 412;
  const gap = 34;
  const startX = 86;
  let cards = "";
  for (let i = 0; i < 4; i++) {
    const x = startX + i * (cardW + gap);
    const body = wrapText(shorts[i], 28, 6);
    cards += `
      <rect x="${x}" y="260" width="${cardW}" height="640" fill="${C.white}" stroke="${C.soft}" stroke-width="2"/>
      <rect x="${x}" y="260" width="${cardW}" height="22" fill="${accents[i]}"/>
      <text x="${x + 34}" y="340" font-family="Calibri, Arial, sans-serif" font-size="36" font-weight="700" fill="${accents[i]}">0${i + 1}</text>
      <text x="${x + 34}" y="420" font-family="Georgia, serif" font-size="30" fill="${C.ink}">${esc(titles[i].split(" ")[0])}</text>
      ${titles[i].includes(" ") ? `<text x="${x + 34}" y="458" font-family="Georgia, serif" font-size="30" fill="${C.ink}">${esc(titles[i].split(" ").slice(1).join(" "))}</text>` : ""}
      ${body
        .map(
          (l, li) =>
            `<text x="${x + 34}" y="${560 + li * 32}" font-family="Calibri, Arial, sans-serif" font-size="20" fill="${C.muted}">${esc(l)}</text>`
        )
        .join("")}
    `;
  }
  await writeSvg(
    "slide-03.png",
    `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${C.paper}"/>
  <text x="86" y="90" font-family="Calibri, Arial, sans-serif" font-size="22" fill="${C.green}" letter-spacing="4">THE WORK</text>
  <text x="86" y="160" font-family="Georgia, serif" font-size="48" fill="${C.ink}">Four connected steps</text>
  ${cards}
  ${footer(3)}
  ${colorBars()}
</svg>`
  );

  // Slide 4 — Timeline
  await writeSvg(
    "slide-04.png",
    `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${C.charcoal}"/>
  <text x="106" y="100" font-family="Calibri, Arial, sans-serif" font-size="22" fill="${C.green}" letter-spacing="4">TIMELINE</text>
  <text x="106" y="175" font-family="Georgia, serif" font-size="48" fill="${C.white}">About two weeks, end to end</text>
  <text x="106" y="240" font-family="Calibri, Arial, sans-serif" font-size="24" fill="#A8A29A">A suggested pace — exact dates lock once we kick off together.</text>
  <rect x="134" y="490" width="1650" height="10" fill="#3A3A3A"/>
  <circle cx="480" cy="495" r="28" fill="${C.green}"/>
  <circle cx="1440" cy="495" r="28" fill="${C.saffron}"/>
  <text x="480" y="580" text-anchor="middle" font-family="Calibri, Arial, sans-serif" font-size="20" fill="${C.green}" letter-spacing="3">WEEK 1</text>
  <text x="1440" y="580" text-anchor="middle" font-family="Calibri, Arial, sans-serif" font-size="20" fill="${C.saffron}" letter-spacing="3">WEEK 2</text>
  <text x="480" y="660" text-anchor="middle" font-family="Georgia, serif" font-size="34" fill="${C.white}">Discovery</text>
  <text x="480" y="710" text-anchor="middle" font-family="Georgia, serif" font-size="28" fill="#A8A29A">+</text>
  <text x="480" y="760" text-anchor="middle" font-family="Georgia, serif" font-size="34" fill="${C.white}">Brand Strategy</text>
  <text x="1440" y="660" text-anchor="middle" font-family="Georgia, serif" font-size="34" fill="${C.white}">Visual Identity</text>
  <text x="1440" y="710" text-anchor="middle" font-family="Georgia, serif" font-size="28" fill="#A8A29A">+</text>
  <text x="1440" y="760" text-anchor="middle" font-family="Georgia, serif" font-size="34" fill="${C.white}">Website + Assets</text>
  ${footer(4, true)}
  ${colorBars()}
</svg>`
  );

  // Slides 5–8 — phases
  const phases = [
    {
      num: "01",
      title: "Discovery",
      body: "This project begins with understanding: through a guided conversation we discover your hopes and aspirations for the future of your brand. This step forms the foundation for the steps that follow, ensuring we stay authentic to who you are.",
      bg: C.paper,
      accent: C.green,
    },
    {
      num: "02",
      title: "Brand Strategy",
      body: "Building on the Discovery step, we develop a Brand Strategy report, detailing the direction and aims of the brand. Here, we codify the role of each of the brand’s current platforms, describe the voice of the brand, and recommend steps for future growth.",
      bg: C.cream,
      accent: C.wine,
    },
    {
      num: "03",
      title: "Visual Identity",
      body: "Based on the Discovery and Strategy steps, we develop a cohesive Visual Identity for the overall brand. Including logo, color palette, and fonts, this step develops the entire visual environment for the brand.",
      bg: C.paper,
      accent: C.terracotta,
    },
    {
      num: "04",
      title: "Website + Platform Assets",
      body: "Finally, we apply all the previous work to a new website for the brand. Serving as a hub for all of your offerings, the website gives your audience the ease of a singular gathering place from which you communicate. This step also includes visual assets necessary for creating brand consistency across all of your current platforms.",
      bg: C.cream,
      accent: C.saffron,
    },
  ];

  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    const lines = wrapText(p.body, 58, 8);
    await writeSvg(
      `slide-0${5 + i}.png`,
      `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${p.bg}"/>
  <rect x="0" y="0" width="42" height="${H}" fill="${p.accent}"/>
  <text x="125" y="110" font-family="Calibri, Arial, sans-serif" font-size="22" fill="${p.accent}" letter-spacing="4">STEP ${p.num}</text>
  <text x="125" y="200" font-family="Georgia, serif" font-size="60" fill="${C.ink}">${esc(p.title)}</text>
  ${lines
    .map(
      (l, li) =>
        `<text x="125" y="${320 + li * 40}" font-family="Calibri, Arial, sans-serif" font-size="26" fill="${C.muted}">${esc(l)}</text>`
    )
    .join("\n")}
  <rect x="1370" y="300" width="450" height="450" fill="${C.ink}"/>
  <rect x="1370" y="300" width="450" height="18" fill="${p.accent}"/>
  <text x="1410" y="390" font-family="Calibri, Arial, sans-serif" font-size="18" fill="#A8A29A" letter-spacing="1">PROJECT</text>
  <text x="1410" y="420" font-family="Calibri, Arial, sans-serif" font-size="18" fill="#A8A29A" letter-spacing="1">INVESTMENT</text>
  <text x="1410" y="520" font-family="Georgia, serif" font-size="52" fill="${C.white}">$4,850</text>
  <text x="1410" y="590" font-family="Calibri, Arial, sans-serif" font-size="18" fill="#8A847C">Total for all four steps</text>
  ${footer(5 + i)}
  ${colorBars()}
</svg>`
    );
  }

  // Slide 9 — End
  await writeSvg(
    "slide-09.png",
    `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${C.ink}"/>
  <text x="106" y="200" font-family="Calibri, Arial, sans-serif" font-size="22" fill="${C.green}" letter-spacing="4">NEXT STEPS</text>
  <text x="106" y="290" font-family="Georgia, serif" font-size="64" fill="${C.white}">Ready when you are.</text>
  <text x="106" y="390" font-family="Calibri, Arial, sans-serif" font-size="28" fill="#C9C3BB">Thanks again for the opportunity to make this proposal. With questions</text>
  <text x="106" y="435" font-family="Calibri, Arial, sans-serif" font-size="28" fill="#C9C3BB">or to get started, simply email Jeremy at jeremy@ghostsignal.cloud</text>
  <rect x="106" y="560" width="800" height="220" fill="${C.charcoal}" stroke="#2A2A2A"/>
  <text x="140" y="630" font-family="Calibri, Arial, sans-serif" font-size="18" fill="${C.green}" letter-spacing="3">TOTAL INVESTMENT</text>
  <text x="140" y="720" font-family="Georgia, serif" font-size="56" fill="${C.white}">$4,850</text>
  <text x="980" y="650" font-family="Calibri, Arial, sans-serif" font-size="32" fill="${C.saffron}">jeremy@ghostsignal.cloud</text>
  <text x="980" y="710" font-family="Georgia, serif" font-size="24" fill="#8A847C" font-style="italic">Welcome to the Signal.</text>
  ${colorBars()}
</svg>`,
    fs.existsSync(cloudWhite)
      ? [{ input: await sharp(cloudWhite).resize({ width: 160 }).png().toBuffer(), left: 1680, top: 70 }]
      : []
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

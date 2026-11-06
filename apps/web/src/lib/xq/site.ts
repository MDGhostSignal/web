/**
 * Public XQ site copy. The quiz data stays in `constants.ts`.
 * Character essays reuse each archetype's existing description.
 * Resonance scoring stays in `lib/rq`. This file only names the poles
 * the way the consolidated site doc does.
 */

import { ARCHETYPES, type ArchetypeCode } from "./constants";

/** Unlisted feedback build. Not linked from the public nav. */
export const XQ_SITE_BASE = "/experimental/xq";

export function xqPath(path = ""): string {
  return path ? `${XQ_SITE_BASE}/${path}` : XQ_SITE_BASE;
}
import { CHARACTER_ORDER } from "./characters";

export type XqCharacterPage = {
  code: ArchetypeCode;
  slug: string;
  name: string;
  tagline: string;
  /** Short line for the Character index. */
  summary: string;
  /** Full description. The longer essay is not written yet. */
  essay: string;
};

const SLUGS: Record<ArchetypeCode, string> = {
  "C-P-C": "steward",
  "C-P-L": "shepherd",
  "C-S-C": "conservator",
  "C-S-L": "institution-builder",
  "X-P-C": "artisan-reformer",
  "X-P-L": "catalyst",
  "X-S-C": "designer",
  "X-S-L": "architect",
};

export const XQ_CHARACTER_PAGES: readonly XqCharacterPage[] = CHARACTER_ORDER.map(
  (code) => {
    const archetype = ARCHETYPES[code];
    return {
      code,
      slug: SLUGS[code],
      name: archetype.name,
      tagline: archetype.tagline,
      summary: archetype.tagline.replace(/\.$/, ""),
      essay: archetype.desc,
    };
  },
);

export function characterBySlug(slug: string): XqCharacterPage | undefined {
  return XQ_CHARACTER_PAGES.find((page) => page.slug === slug);
}

const POLE_SHORT: readonly [string, string][] = [
  ["Continuity", "Change"],
  ["Person", "System"],
  ["Craft", "Scale"],
];

export type CharacterPoleMark = {
  left: string;
  right: string;
  leftShort: string;
  rightShort: string;
  activeIsLeft: boolean;
};

/** Which side of each character pole this code sits on. */
export function characterPoleMarks(code: ArchetypeCode): CharacterPoleMark[] {
  const letters = code.split("-");
  const leftLetters = ["C", "P", "C"];
  return CHARACTER_POLES.map((pole, index) => ({
    left: pole.left,
    right: pole.right,
    leftShort: POLE_SHORT[index][0],
    rightShort: POLE_SHORT[index][1],
    activeIsLeft: letters[index] === leftLetters[index],
  }));
}

/** The three characters one pole-flip away, in axis order: person, craft, continuity. */
export function characterNeighbors(code: ArchetypeCode): XqCharacterPage[] {
  const parts = code.split("-");
  const flipped = [
    [parts[0] === "C" ? "X" : "C", parts[1], parts[2]],
    [parts[0], parts[1] === "P" ? "S" : "P", parts[2]],
    [parts[0], parts[1], parts[2] === "C" ? "L" : "C"],
  ];
  return [1, 2, 0].map((index) => {
    const next = flipped[index].join("-") as ArchetypeCode;
    const page = XQ_CHARACTER_PAGES.find((item) => item.code === next);
    if (!page) throw new Error(`Missing neighbor for ${code}`);
    return page;
  });
}

export const XQ_LANDING = {
  headline: "With Whom Do You Belong?",
  subhead: "Partnerships are necessary, but how do you find the right ones?",
  body: "The GHOSTSignal Conviction Quotient (XQ) helps you discover your most meaningful values and partnership style, and compares them to potential partners to discern your alignment and fit (what we call resonance). Resonance empowers partnerships that feel good, because they are good, and because they are good, they work better.",
  quizHref: "/xq-quiz",
  quizLabel: "Take the Quiz",
} as const;

export type Pole = {
  left: string;
  right: string;
};

/** Step 1 poles. `L` in the quiz code is shown here as Scale. */
export const CHARACTER_POLES: readonly Pole[] = [
  {
    left: "Continuity (Roots & Wisdom)",
    right: "Change (Reach & Innovation)",
  },
  {
    left: "Person (Relational Story)",
    right: "System (Institutional Framework)",
  },
  {
    left: "Craft (Artisanal Depth)",
    right: "Scale (Wide Distribution)",
  },
];

export const CHARACTER_STEP = {
  kicker: "Step 1 · Character",
  title: "What are my values?",
  body: "The Character step reveals who you are, mapping your moral framework and internal identity across timeless questions. There are eight characters.",
} as const;

export type ResonancePole = Pole & {
  letters: string;
  body: string;
};

/** Step 2 poles. Letters and meaning follow the RQ axis text. */
export const RESONANCE_POLES: readonly ResonancePole[] = [
  {
    letters: "S or R",
    left: "Structural (Analytical)",
    right: "Relational (Personal)",
    body: "How your voice carries trust. Structural trust comes through clarity, consistency, and ideas that hold together. Relational trust comes through story, personality, and lived experience.",
  },
  {
    letters: "L or C",
    left: "Long-Arc (Culture-Shaping)",
    right: "Catalytic (Direct Action)",
    body: "How you think about growth over time. Long-Arc prioritizes depth and relationships that compound. Catalytic prioritizes momentum, activation, and timely impact.",
  },
  {
    letters: "I or F",
    left: "Implicit (Subtle Integration)",
    right: "Explicit (Direct Endorsement)",
    body: "How convictions show up. Implicit values are lived through tone, choices, and outcomes. Explicit values are named and actively shape the message. The quiz letter for Explicit is F, for Formative.",
  },
];

export const RESONANCE_BANDS = [
  {
    range: "1–3",
    text: "A lighter signal. Present, but flexible. You can move across this spectrum without much friction.",
  },
  {
    range: "4–5",
    text: "A balanced signal. A clear leaning, with room to adapt without losing yourself.",
  },
  {
    range: "6–10",
    text: "A strong signal. A defining part of how you operate. Alignment here matters more.",
  },
] as const;

export const RESONANCE_STEP = {
  kicker: "Step 2 · Resonance",
  title: "How do I collaborate?",
  body: "The Resonance step is still about values, and also about how you choose to show up. It locates your external voice and communication style, so a partnership can feel inevitable.",
  result:
    "You receive one letter per axis, each with a strength from 1 to 10, written like F(7)-S(6)-L(8). Under that sits a three-word call sign: one word per axis, from your direction and your strength. It is a way to recognize how you communicate and build, not a label to live inside.",
  quizHref: "/rq-quiz",
  quizLabel: "Take the Resonance step",
} as const;

export const XQ_ABOUT = {
  kicker: "About the XQ",
  title: "Trust, values, and a faster first read",
  paragraphs: [
    "The XQ connects two groups of people who already belong near each other. It names the values you hold and the way you collaborate, then sets that next to a potential partner.",
    "It does not speed up knowing someone. It gives categories for a first discernment: where your values overlap, and where the hard edges are. Trust grows where that overlap is real, and where you can see who the other person actually is.",
    "Daron Acemoglu’s research on high-trust circles is the business case. Groups bound by shared values outperform low-trust systems, and that advantage shows up as revenue, efficiency, and durability. In advertising, the same idea argues against buying attention from whoever is cheapest. A resonant placement is worth more because the audience already trusts the room.",
    "Applied here: a creator can point listeners toward a brand in good faith, and a brand can show up in a community that already shares its convictions. Resonance is that fit.",
  ],
} as const;

export const XQ_NAV = [
  { href: XQ_SITE_BASE, label: "XQ" },
  { href: xqPath("character"), label: "Character" },
  { href: xqPath("resonance"), label: "Resonance" },
  { href: xqPath("about"), label: "About the XQ" },
] as const;

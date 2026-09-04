/**
 * WIT v2 chapter config — structural map inspired by Santioni
 * Notturno's HydraX sceneConfigs (heights in viewport multiples).
 *
 * Copy is placeholder scaffolding for motion/layout work. Replace with
 * locked GhostSignal voice before any live swap.
 */

export type ChapterBand = "void" | "night" | "dawn" | "signal" | "day";

export type ChapterKind =
  | "loader"
  | "wander"
  | "profile"
  | "approach"
  | "intimate"
  | "portal"
  | "transition"
  | "monument"
  | "select"
  | "transform"
  | "vortex"
  | "scale"
  | "collection"
  | "cta"
  | "footer";

export type ChapterDef = {
  id: string;
  /** Mirrors Notturno scene role for our rebuild notes. */
  notturnoRole: string;
  kind: ChapterKind;
  index: string;
  label: string;
  eyebrow: string;
  title: string[];
  body: string;
  /** Viewport-height multiples for scroll runway (Notturno used 1.25–4). */
  height: number;
  mobileHeight?: number;
  /** Slight overlap into previous chapter (fraction of viewport). */
  overlap?: number;
  band: ChapterBand;
  interactive?: boolean;
  pills?: { code: string; name: string; note: string }[];
  actions?: { href: string; label: string; primary?: boolean }[];
};

export const CHAPTERS: ChapterDef[] = [
  {
    id: "entry",
    notturnoRole: "Loader / AgeGate equivalent",
    kind: "loader",
    index: "00",
    label: "Enter",
    eyebrow: "Draft · local only",
    title: ["Enter the", "signal."],
    body: "A one-scroll story machine. Structure borrowed from Notturno; content and motion rebuilt for GhostSignal.",
    height: 1,
    band: "void",
  },
  {
    id: "wander",
    notturnoRole: "WanderScene",
    kind: "wander",
    index: "01",
    label: "Wander",
    eyebrow: "The world",
    title: ["A network", "of worlds."],
    body: "Every show is a world. Every brand is a set of convictions. GhostSignal is the space where those worlds find each other.",
    height: 2.5,
    band: "night",
  },
  {
    id: "profile",
    notturnoRole: "ProfileScene",
    kind: "profile",
    index: "02",
    label: "Who",
    eyebrow: "For whom",
    title: ["Built for", "makers of culture."],
    body: "Creators who protect their audience. Brands who refuse empty reach. People who still believe advertising can belong.",
    height: 1.25,
    band: "night",
  },
  {
    id: "approach",
    notturnoRole: "ApproachScene + NearScene",
    kind: "approach",
    index: "03",
    label: "Noise",
    eyebrow: "The problem",
    title: ["The feed is", "full of static."],
    body: "Interruptions stack. Trust thins. Partnerships get bought by the CPM instead of earned by shared meaning.",
    height: 2.5,
    mobileHeight: 2,
    band: "void",
  },
  {
    id: "intimate",
    notturnoRole: "HandScene",
    kind: "intimate",
    index: "04",
    label: "Intimate",
    eyebrow: "The medium",
    title: ["Voice is", "closer."],
    body: "Podcasting puts a brand inside a relationship that already exists — if the match is true.",
    height: 1.5,
    band: "dawn",
  },
  {
    id: "portal",
    notturnoRole: "TargetScene / portal",
    kind: "portal",
    index: "05",
    label: "Portal",
    eyebrow: "Interactive · tease",
    title: ["Find the", "right signal."],
    body: "Hold the portal open. This beat will become an interactive match tease — selection without leaving the scroll.",
    height: 2,
    band: "signal",
    interactive: true,
  },
  {
    id: "transition",
    notturnoRole: "TransitionScene + PillarCrumble",
    kind: "transition",
    index: "06",
    label: "Cut",
    eyebrow: "Transition",
    title: ["Then the", "frame breaks."],
    body: "A hard cut in the story. Visual metamorphosis before the long conviction beat.",
    height: 1.75,
    overlap: 0.1,
    band: "void",
  },
  {
    id: "monument",
    notturnoRole: "CathedralScene",
    kind: "monument",
    index: "07",
    label: "XQ",
    eyebrow: "Conviction",
    title: ["What do you", "stand for?"],
    body: "XQ maps values into a readable signal — the blueprint for partnerships that feel inevitable instead of forced.",
    height: 3.5,
    mobileHeight: 3,
    overlap: 0.35,
    band: "night",
  },
  {
    id: "select",
    notturnoRole: "DrinkSelectionScene",
    kind: "select",
    index: "08",
    label: "Select",
    eyebrow: "Interactive · lenses",
    title: ["Two lenses.", "One match."],
    body: "Choose how you enter. Conviction first, or resonance first — both lead into the same engine.",
    height: 2.5,
    band: "signal",
    interactive: true,
    pills: [
      { code: "XQ", name: "Conviction Quotient", note: "Free · open to everyone" },
      { code: "RQ", name: "Resonance Quotient", note: "Members · matching engine" },
    ],
  },
  {
    id: "transform",
    notturnoRole: "DrinkPourScene",
    kind: "transform",
    index: "09",
    label: "RQ",
    eyebrow: "Resonance",
    title: ["From interrupt", "to invitation."],
    body: "When values align, the ad stops barging in and starts belonging to the conversation.",
    height: 3.5,
    mobileHeight: 3,
    band: "dawn",
  },
  {
    id: "vortex",
    notturnoRole: "AntiGravityScene",
    kind: "vortex",
    index: "10",
    label: "Network",
    eyebrow: "Interactive · field",
    title: ["Many signals.", "One field."],
    body: "Membership multiplies world-making effort — contracts, campaigns, and matching without one-off grind.",
    height: 2,
    mobileHeight: 1.8,
    band: "signal",
    interactive: true,
  },
  {
    id: "scale",
    notturnoRole: "ColosseumScene",
    kind: "scale",
    index: "11",
    label: "Scale",
    eyebrow: "Culture",
    title: ["Culture is", "made of voices."],
    body: "The monument beat: podcasting at the scale of culture, not the scale of banners.",
    height: 3,
    band: "night",
  },
  {
    id: "collection",
    notturnoRole: "TasteScene + CollectionScene",
    kind: "collection",
    index: "12",
    label: "What you get",
    eyebrow: "Outcomes",
    title: ["A system,", "not a spot buy."],
    body: "Matching tech, host-read partnership, values-aligned conversion, and a community that stays after the campaign.",
    height: 2,
    band: "day",
  },
  {
    id: "cta",
    notturnoRole: "ProductsScene + RetailScene",
    kind: "cta",
    index: "13",
    label: "Enter",
    eyebrow: "Next",
    title: ["Ready when", "you are."],
    body: "Draft CTAs only. Live What Is This stays as-is until this story earns the slot.",
    height: 1.5,
    band: "day",
    actions: [
      { href: "/xq-quiz", label: "Take the XQ", primary: true },
      { href: "/get-in-touch", label: "Get in touch" },
      { href: "/what-is-this", label: "View live page" },
    ],
  },
];

export function chapterRunwayVh(ch: ChapterDef, isMobile: boolean): number {
  if (isMobile && ch.mobileHeight != null) return ch.mobileHeight;
  return ch.height;
}

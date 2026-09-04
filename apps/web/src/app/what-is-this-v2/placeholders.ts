/** Bright temporary art for WIT v2 interaction demos. Swap later. */

export const PH = {
  magenta: "/images/what-is-this-v2/ph-magenta.svg",
  cyan: "/images/what-is-this-v2/ph-cyan.svg",
  lime: "/images/what-is-this-v2/ph-lime.svg",
  orange: "/images/what-is-this-v2/ph-orange.svg",
  violet: "/images/what-is-this-v2/ph-violet.svg",
  yellow: "/images/what-is-this-v2/ph-yellow.svg",
  red: "/images/what-is-this-v2/ph-red.svg",
  blue: "/images/what-is-this-v2/ph-blue.svg",
} as const;

export type PlaceholderKey = keyof typeof PH;

/** Per-chapter floating collage keys (Notturno: illustrated layers in space). */
export const CHAPTER_VISUALS: Record<string, PlaceholderKey[]> = {
  entry: ["violet"],
  wander: ["magenta", "cyan", "lime"],
  profile: ["orange", "yellow"],
  approach: ["red", "blue", "violet"],
  intimate: ["cyan", "magenta"],
  portal: ["lime", "violet"],
  transition: ["yellow", "red"],
  monument: ["blue", "violet", "cyan"],
  select: ["magenta", "cyan", "lime", "orange"],
  transform: ["yellow", "orange"],
  vortex: ["magenta", "cyan", "lime", "violet", "orange", "yellow"],
  scale: ["red", "blue"],
  collection: ["lime", "magenta", "cyan"],
  cta: ["violet", "orange"],
};

export const SELECT_OPTIONS = [
  { id: "a", key: "magenta" as const, label: "Signal A" },
  { id: "b", key: "cyan" as const, label: "Signal B" },
  { id: "c", key: "lime" as const, label: "Signal C" },
  { id: "d", key: "orange" as const, label: "Signal D" },
];

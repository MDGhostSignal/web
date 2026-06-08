/**
 * XQCharacter — line-art SVG illustration for one of the 8 XQ
 * archetypes. Single entry-point: pass a code, get the right figure.
 *
 * Each character is its own component (in ./characters/) so the
 * illustration work can iterate per-archetype without ballooning a
 * single file. All characters share:
 *   - 240×280 portrait viewBox
 *   - Monoline 1.8px primary stroke (via `currentColor`)
 *   - Round caps + joins
 *   - Brand accent applied through `color` on the parent <svg>
 *
 * The accent color comes from CHARACTERS[code].accent in
 * `@/lib/xq/characters`, so callers don't pass color directly — pass
 * the code and the component does the lookup.
 */

import { CHARACTERS } from "@/lib/xq/characters";
import type { ArchetypeCode } from "@/lib/xq/constants";

import "./xq-character-animations.css";
import { ArchitectCharacter } from "./characters/Architect";
import { ArtisanReformerCharacter } from "./characters/ArtisanReformer";
import { CatalystCharacter } from "./characters/Catalyst";
import { ConservatorCharacter } from "./characters/Conservator";
import { DesignerCharacter } from "./characters/Designer";
import { InstitutionBuilderCharacter } from "./characters/InstitutionBuilder";
import { ShepherdCharacter } from "./characters/Shepherd";
import { StewardCharacter } from "./characters/Steward";

const CHARACTER_MAP: Record<
  ArchetypeCode,
  React.ComponentType<{ title: string }>
> = {
  "C-P-C": StewardCharacter,
  "C-P-L": ShepherdCharacter,
  "C-S-C": ConservatorCharacter,
  "C-S-L": InstitutionBuilderCharacter,
  "X-P-C": ArtisanReformerCharacter,
  "X-P-L": CatalystCharacter,
  "X-S-C": DesignerCharacter,
  "X-S-L": ArchitectCharacter,
};

type Props = {
  code: ArchetypeCode;
  /** Optional title for accessibility. Falls back to the archetype's
   *  prop description. */
  title?: string;
  /** Override the rendered size. Default fills the parent container. */
  className?: string;
};

export function XQCharacter({ code, title, className }: Props) {
  const Inner = CHARACTER_MAP[code];
  const identity = CHARACTERS[code];
  const accessibleTitle =
    title ?? `Character illustration holding ${identity.prop}`;

  return (
    <div
      className={className}
      style={{
        color: identity.accent,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
      }}
    >
      <Inner title={accessibleTitle} />
    </div>
  );
}

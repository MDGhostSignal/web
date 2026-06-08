/**
 * XQCharacter3D — 3D-space line-art variant.
 *
 * Each character is drawn fresh in isometric / 3/4 perspective with
 * depth construction lines + constellation-style star vertices at
 * joints. Inspired by classical zodiac/astronomy figures: the body
 * reads as a wireframe constellation, the signature prop as an
 * isometric wireframe object. A slow horizontal sway adds a
 * subtle stereoscopic depth cue.
 */

import { CHARACTERS } from "@/lib/xq/characters";
import type { ArchetypeCode } from "@/lib/xq/constants";

import "./xq-character-3d.css";
import { Architect3D } from "./characters3d/Architect3D";
import { ArtisanReformer3D } from "./characters3d/ArtisanReformer3D";
import { Catalyst3D } from "./characters3d/Catalyst3D";
import { Conservator3D } from "./characters3d/Conservator3D";
import { Designer3D } from "./characters3d/Designer3D";
import { InstitutionBuilder3D } from "./characters3d/InstitutionBuilder3D";
import { Shepherd3D } from "./characters3d/Shepherd3D";
import { Steward3D } from "./characters3d/Steward3D";

const CHARACTER_MAP: Record<
  ArchetypeCode,
  React.ComponentType<{ title: string }>
> = {
  "C-P-C": Steward3D,
  "C-P-L": Shepherd3D,
  "C-S-C": Conservator3D,
  "C-S-L": InstitutionBuilder3D,
  "X-P-C": ArtisanReformer3D,
  "X-P-L": Catalyst3D,
  "X-S-C": Designer3D,
  "X-S-L": Architect3D,
};

type Props = {
  code: ArchetypeCode;
  title?: string;
  className?: string;
};

export function XQCharacter3D({ code, title, className }: Props) {
  const Inner = CHARACTER_MAP[code];
  const identity = CHARACTERS[code];
  const accessibleTitle =
    title ?? `3D constellation character: ${identity.prop}`;

  return (
    <div
      className={className}
      style={{
        color: identity.accent,
        width: "100%",
        height: "100%",
      }}
    >
      <div className="xq-c3d-sway">
        <Inner title={accessibleTitle} />
      </div>
    </div>
  );
}

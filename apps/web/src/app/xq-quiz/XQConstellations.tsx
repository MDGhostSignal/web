"use client";

import { Architect3D } from "@/components/xq/characters3d/Architect3D";
import { Catalyst3D } from "@/components/xq/characters3d/Catalyst3D";
import { Shepherd3D } from "@/components/xq/characters3d/Shepherd3D";
import "@/components/xq/xq-character-3d.css";

/**
 * Ambient star-sign decoration behind the XQ intro scene.
 *
 * Three character constellations from the existing 3D set — Shepherd,
 * Architect, Catalyst — pinned at viewport-relative positions and
 * dimmed to ~6% opacity with a touch of blur. Reads as "constellation
 * shapes in the starfield" rather than featured illustrations. The
 * `mix-blend-mode: screen` overlay style means the strokes brighten
 * the underlying fog/bg additively, so the constellations glow rather
 * than block.
 *
 * Sits above the fog (z-index 1) at low opacity, because the WebGL
 * fog canvas is fully opaque and would occlude anything truly behind
 * it. At 6% opacity the constellations read as background regardless.
 */
export default function XQConstellations() {
  return (
    <div className="xq-constellations" aria-hidden="true">
      <div
        className="xq-constellation xq-constellation-shepherd"
        style={{ color: "#FF7BAD" }}
      >
        <Shepherd3D title="" />
      </div>
      <div
        className="xq-constellation xq-constellation-architect"
        style={{ color: "#7C58D6" }}
      >
        <Architect3D title="" />
      </div>
      <div
        className="xq-constellation xq-constellation-catalyst"
        style={{ color: "#FA7B3F" }}
      >
        <Catalyst3D title="" />
      </div>
    </div>
  );
}

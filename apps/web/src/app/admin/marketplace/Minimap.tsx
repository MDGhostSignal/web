"use client";

import { useMemo } from "react";

import {
  MOCK_BRANDS,
  MOCK_CREATORS,
  MOCK_ENTITIES,
} from "@/lib/marketplace-mocks";
import type { Match } from "@/lib/marketplace-store";

import { layoutTown } from "./town-layout";
import mapStyles from "./map.module.css";

/**
 * SVG minimap — abstract overhead view of the town. Shows every entity
 * as a dot (brand = orange, creator = cyan), match connections as
 * faint lines, and the currently selected entity as a highlighted ring.
 *
 * Click a dot → selects that entity in the 3D scene. Despite the camera
 * showing all entities, the minimap is useful at a glance for "which
 * brands aren't matched yet" and as an alternate input target.
 */
type Props = {
  matches: Match[];
  selectedId: string | null;
  hoverId: string | null;
  onSelect: (id: string | null) => void;
};

const VIEW_W = 240;
const VIEW_H = 130;
const PADDING = 14;

export function Minimap({ matches, selectedId, hoverId, onSelect }: Props) {
  const town = useMemo(() => layoutTown(MOCK_ENTITIES), []);

  // Compute the bounding box of all lots + plaza so we can normalise
  // world coords into the minimap viewport. Recomputed once per layout.
  const projection = useMemo(() => {
    const xs = town.lots.map((l) => l.position.x);
    const zs = town.lots.map((l) => l.position.z);
    const minX = Math.min(...xs, town.plaza.x) - 1;
    const maxX = Math.max(...xs, town.plaza.x) + 1;
    const minZ = Math.min(...zs, town.plaza.z) - 1;
    const maxZ = Math.max(...zs, town.plaza.z) + 1;

    const w = maxX - minX;
    const h = maxZ - minZ;
    const innerW = VIEW_W - PADDING * 2;
    const innerH = VIEW_H - PADDING * 2;
    // Uniform scale so aspect doesn't get distorted.
    const scale = Math.min(innerW / w, innerH / h);

    const offX = (VIEW_W - w * scale) / 2 - minX * scale;
    const offY = (VIEW_H - h * scale) / 2 - minZ * scale;

    return {
      project: (p: { x: number; z: number }) => ({
        x: p.x * scale + offX,
        y: p.z * scale + offY,
      }),
    };
  }, [town]);

  const lotById = useMemo(
    () => new Map(town.lots.map((l) => [l.entity.id, l])),
    [town.lots],
  );

  const confirmedEdges = useMemo(
    () =>
      matches.filter(
        (m) =>
          m.status === "confirmed" &&
          lotById.has(m.brand_id) &&
          lotById.has(m.creator_id),
      ),
    [matches, lotById],
  );

  // Counts shown in the minimap caption — gives the admin an at-a-glance
  // sense of how full the town is.
  const counts = useMemo(() => {
    const matchedBrands = new Set<string>();
    const matchedCreators = new Set<string>();
    for (const m of matches) {
      if (m.status !== "confirmed") continue;
      matchedBrands.add(m.brand_id);
      matchedCreators.add(m.creator_id);
    }
    return {
      brands: { matched: matchedBrands.size, total: MOCK_BRANDS.length },
      creators: {
        matched: matchedCreators.size,
        total: MOCK_CREATORS.length,
      },
    };
  }, [matches]);

  return (
    <div className={mapStyles.minimap} aria-label="Marketplace minimap">
      <svg
        className={mapStyles.minimapSvg}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
      >
        {/* District tints — same west=brand / east=creator framing
            as the 3D ground for visual continuity. */}
        <rect
          x="0"
          y="0"
          width={VIEW_W / 2}
          height={VIEW_H}
          className={mapStyles.minimapBrandWash}
        />
        <rect
          x={VIEW_W / 2}
          y="0"
          width={VIEW_W / 2}
          height={VIEW_H}
          className={mapStyles.minimapCreatorWash}
        />

        {/* Plaza marker. */}
        {(() => {
          const p = projection.project(town.plaza);
          return (
            <circle
              cx={p.x}
              cy={p.y}
              r={3.5}
              className={mapStyles.minimapPlaza}
            />
          );
        })()}

        {/* Match edges — render before dots so dots sit on top. */}
        {confirmedEdges.map((m) => {
          const a = lotById.get(m.brand_id)!.position;
          const b = lotById.get(m.creator_id)!.position;
          const pa = projection.project(a);
          const pb = projection.project(b);
          const focused =
            selectedId !== null &&
            (m.brand_id === selectedId || m.creator_id === selectedId);
          return (
            <line
              key={m.id}
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              className={
                focused
                  ? mapStyles.minimapEdgeFocused
                  : mapStyles.minimapEdge
              }
            />
          );
        })}

        {/* Entity dots. */}
        {town.lots.map((lot) => {
          const p = projection.project(lot.position);
          const isSelected = lot.entity.id === selectedId;
          const isHovered = lot.entity.id === hoverId;
          return (
            <g
              key={lot.entity.id}
              transform={`translate(${p.x} ${p.y})`}
              className={mapStyles.minimapDotGroup}
              onClick={() => onSelect(lot.entity.id)}
            >
              {/* Hit area — wider than the visible dot so the cursor
                  can land on it precisely at minimap scale. */}
              <circle r={6} className={mapStyles.minimapHit} />
              {(isSelected || isHovered) && (
                <circle
                  r={6}
                  className={
                    isSelected
                      ? mapStyles.minimapRingSelected
                      : mapStyles.minimapRingHover
                  }
                />
              )}
              <circle
                r={2.6}
                className={
                  lot.entity.kind === "brand"
                    ? mapStyles.minimapDotBrand
                    : mapStyles.minimapDotCreator
                }
              />
            </g>
          );
        })}
      </svg>
      <footer className={mapStyles.minimapCaption}>
        <span>
          Brands{" "}
          <strong>
            {counts.brands.matched}/{counts.brands.total}
          </strong>
        </span>
        <span>
          Creators{" "}
          <strong>
            {counts.creators.matched}/{counts.creators.total}
          </strong>
        </span>
      </footer>
    </div>
  );
}

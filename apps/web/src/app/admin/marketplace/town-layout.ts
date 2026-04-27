/**
 * Spatial layout for the marketplace town. Brands cluster in a "brand
 * quarter" on one side, creators in a "creator quarter" on the other,
 * with a central plaza between them. Position is meaningful — district
 * = kind, distance from plaza = roughly load order — which matches the
 * research's "position must encode something" mandate.
 *
 * Coordinates are in world units (one tile ≈ one unit). The R3F scene
 * applies the isometric camera angle on top.
 */

import type { MarketplaceEntity } from "@/lib/marketplace-mocks";

export type Vec2 = { x: number; z: number };

export type LotPlacement = {
  entity: MarketplaceEntity;
  position: Vec2;
};

const DISTRICT_OFFSET = 7; // distance from plaza centre to first lot
const ROW_GAP = 3; // tile gap between adjacent buildings on the same row
const COL_GAP = 3.5; // tile gap between rows of buildings

/**
 * Place a list of entities in a grid radiating outward from the plaza.
 * `direction` is the unit vector pointing from the plaza toward the
 * district — { x: -1, z: 0 } for the left district, etc. The grid
 * grows outward (away from the plaza) and sideways (perpendicular)
 * symmetrically around the centre line.
 */
function placeDistrict(
  entities: readonly MarketplaceEntity[],
  direction: Vec2,
  perTier: number,
): LotPlacement[] {
  const out: LotPlacement[] = [];
  // Normalise direction (already unit, but explicit).
  const dx = direction.x;
  const dz = direction.z;
  // Perpendicular (rotated 90°) for the sideways fan.
  const px = -dz;
  const pz = dx;

  for (let i = 0; i < entities.length; i++) {
    const tier = Math.floor(i / perTier);
    const slot = i % perTier;
    // Centre the row around 0 — slot 0 is left, slot perTier-1 is right.
    const sideways = slot - (perTier - 1) / 2;

    const distance = DISTRICT_OFFSET + tier * COL_GAP;

    out.push({
      entity: entities[i],
      position: {
        x: dx * distance + px * sideways * ROW_GAP,
        z: dz * distance + pz * sideways * ROW_GAP,
      },
    });
  }
  return out;
}

/**
 * Compute placements for every entity. Brands go west of the plaza,
 * creators east. Tier sizes (`perTier`) chosen so 20 brands settle
 * across 4–5 rows and 10 creators across 2–3 — visually balanced.
 */
export function layoutTown(entities: readonly MarketplaceEntity[]): {
  plaza: Vec2;
  lots: LotPlacement[];
} {
  const brands = entities.filter((e) => e.kind === "brand");
  const creators = entities.filter((e) => e.kind === "creator");

  const lots = [
    ...placeDistrict(brands, { x: -1, z: 0 }, 5),
    ...placeDistrict(creators, { x: 1, z: 0 }, 4),
  ];

  return {
    plaza: { x: 0, z: 0 },
    lots,
  };
}

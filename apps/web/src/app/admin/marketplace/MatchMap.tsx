"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrthographicCamera } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { Badge } from "@/components/admin";
import {
  MOCK_ENTITIES,
  type MarketplaceEntity,
} from "@/lib/marketplace-mocks";
import type { Match } from "@/lib/marketplace-store";

import { MatchRibbon } from "./MatchRibbon";
import { Minimap } from "./Minimap";
import {
  SPRITE_BRAND_COTTAGE,
  SPRITE_CREATOR_COTTAGE,
  SPRITE_PLAZA_FOUNTAIN,
  type SpriteDef,
  renderSpriteToCanvas,
} from "./sprites";
import { layoutTown, type LotPlacement } from "./town-layout";
import styles from "./marketplace.module.css";
import mapStyles from "./map.module.css";

type Props = {
  matches: Match[];
};

/**
 * Top-level Map view. Owns the framing chrome (toolbar + legend +
 * selected-entity panel) and delegates the 3D scene to <TownScene/>
 * inside an R3F <Canvas>. Selected-entity state lives here so the HTML
 * panel and the in-scene highlight can share it without prop-drilling
 * through the 3D tree.
 */
export default function MatchMap({ matches }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const town = useMemo(() => layoutTown(MOCK_ENTITIES), []);
  const selected = useMemo(
    () => MOCK_ENTITIES.find((e) => e.id === selectedId) ?? null,
    [selectedId],
  );

  // Ids of entities the selected node is matched with. Used by the
  // scene to highlight partner buildings + by the side panel below.
  const partnerIds = useMemo(() => {
    if (!selected) return new Set<string>();
    const partners = new Set<string>();
    for (const m of matches) {
      if (m.status !== "confirmed") continue;
      if (selected.kind === "brand" && m.brand_id === selected.id) {
        partners.add(m.creator_id);
      } else if (selected.kind === "creator" && m.creator_id === selected.id) {
        partners.add(m.brand_id);
      }
    }
    return partners;
  }, [matches, selected]);

  // Pre-compute confirmed pairings as world-position endpoints for the
  // MatchRibbon layer, so the 3D scene doesn't have to traverse the
  // matches list + lot map every frame.
  const ribbons = useMemo(() => {
    const lotById = new Map(town.lots.map((l) => [l.entity.id, l]));
    return matches
      .filter((m) => m.status === "confirmed")
      .map((m) => {
        const brand = lotById.get(m.brand_id);
        const creator = lotById.get(m.creator_id);
        if (!brand || !creator) return null;
        return {
          id: m.id,
          from: brand.position,
          to: creator.position,
          score: m.resonance,
          // Whether the ribbon is part of the currently-focused subgraph
          highlighted:
            selected != null &&
            (m.brand_id === selected.id || m.creator_id === selected.id),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  }, [matches, town.lots, selected]);

  return (
    <div className={mapStyles.mapWrap}>
      <div className={mapStyles.mapToolbar}>
        <div className={mapStyles.legend}>
          <span className={mapStyles.legendDot} data-kind="brand" />
          <span className={mapStyles.legendLabel}>Brands</span>
          <span className={mapStyles.legendSep}>·</span>
          <span className={mapStyles.legendDot} data-kind="creator" />
          <span className={mapStyles.legendLabel}>Creators</span>
        </div>
        <div className={mapStyles.toolbarHint}>
          Click a building to inspect · Esc to clear
        </div>
      </div>

      <div className={mapStyles.canvasFrame}>
        <Canvas
          dpr={[1, 1.5]}
          shadows={false}
          // The dark slate shows through the procedural ground tile
          // grout so the town reads as sitting on a base, not floating.
          gl={{ antialias: false, powerPreference: "high-performance" }}
          onPointerMissed={() => setSelectedId(null)}
        >
          <TownScene
            town={town}
            selectedId={selectedId}
            hoverId={hoverId}
            partnerIds={partnerIds}
            ribbons={ribbons}
            onSelect={setSelectedId}
            onHover={setHoverId}
          />
        </Canvas>
      </div>

      <Minimap
        matches={matches}
        selectedId={selectedId}
        hoverId={hoverId}
        onSelect={setSelectedId}
      />

      {selected ? (
        <SelectedPanel
          entity={selected}
          partnerIds={partnerIds}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </div>
  );
}

/* =====================================================================
 * SCENE
 * ===================================================================== */

type RibbonSpec = {
  id: string;
  from: { x: number; z: number };
  to: { x: number; z: number };
  score: number;
  highlighted: boolean;
};

type SceneProps = {
  town: ReturnType<typeof layoutTown>;
  selectedId: string | null;
  hoverId: string | null;
  partnerIds: ReadonlySet<string>;
  ribbons: RibbonSpec[];
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
};

function TownScene({
  town,
  selectedId,
  hoverId,
  partnerIds,
  ribbons,
  onSelect,
  onHover,
}: SceneProps) {
  // When *anything* is selected/hovered, ribbons not connected to that
  // focus dim out — keeps the focused subgraph readable.
  const hasFocus = selectedId !== null || hoverId !== null;
  // Orthographic + oblique camera fixed at the JRPG angle. No free
  // rotation per the research — camera state is constant and only
  // zoom is user-controllable (via the framing chrome above the canvas).
  return (
    <>
      <OrthographicCamera
        makeDefault
        position={[16, 18, 16]}
        zoom={28}
        near={0.1}
        far={200}
      />
      <CameraGaze />

      {/* Soft amber key + cool fill — dusk lighting consistent with the
          firefly accent already used elsewhere on the site. */}
      <ambientLight intensity={0.85} color="#dfeaff" />
      <directionalLight
        position={[8, 14, 6]}
        intensity={0.9}
        color="#fbe2a8"
      />

      <Ground />

      {/* Match ribbons — drawn on the ground BENEATH the buildings so
          a building never partially clips through its own connection.
          Ribbons render before sprites (lower in the tree). */}
      {ribbons.map((r) => (
        <MatchRibbon
          key={r.id}
          from={r.from}
          to={r.to}
          score={r.score}
          dimmed={hasFocus && !r.highlighted}
        />
      ))}

      {/* Plaza fountain — the central focal landmark. */}
      <Lot
        position={town.plaza}
        sprite={SPRITE_PLAZA_FOUNTAIN}
        height={2.4}
        idleBobAmplitude={0.04}
        idleBobRate={0.7}
      />

      {/* Plaza glow halo — slow opacity pulse that hints at the town
          centre being "alive". Phase is independent of building bobs. */}
      <PlazaGlow />

      {town.lots.map((lot, i) => (
        <BuildingLot
          key={lot.entity.id}
          lot={lot}
          // Stable per-lot phase offset so adjacent buildings bob out
          // of sync without needing a per-component random.
          bobPhase={(i * 0.7) % (Math.PI * 2)}
          isSelected={lot.entity.id === selectedId}
          isHovered={lot.entity.id === hoverId}
          isPartner={partnerIds.has(lot.entity.id)}
          isDimmed={
            hasFocus &&
            lot.entity.id !== selectedId &&
            lot.entity.id !== hoverId &&
            !partnerIds.has(lot.entity.id)
          }
          onSelect={() => onSelect(lot.entity.id)}
          onHover={(hover) => onHover(hover ? lot.entity.id : null)}
        />
      ))}
    </>
  );
}

/**
 * Tiny camera helper — ensures the orthographic camera looks at the
 * world origin every frame. R3F's <OrthographicCamera> with `makeDefault`
 * doesn't auto-target, so without this the view is flat-on rather than
 * the oblique JRPG angle we want.
 */
function CameraGaze() {
  const { camera } = useThree();
  useEffect(() => {
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

/* =====================================================================
 * GROUND + TILE GRID
 * ===================================================================== */

/**
 * Procedural ground plane. Two big quarters (brand / creator), a
 * lighter plaza disk in the middle, and a light tile grid texture
 * built once via a CanvasTexture so we don't ship a PNG.
 *
 * Tile texture is `nearest`-filtered so the grid lines don't smear
 * when the camera zooms in.
 */
function Ground() {
  const tileTexture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    // Base pavement
    ctx.fillStyle = "#1c1f24";
    ctx.fillRect(0, 0, 32, 32);
    // Subtle tile grout
    ctx.strokeStyle = "#252932";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 31.5);
    ctx.lineTo(32, 31.5);
    ctx.moveTo(31.5, 0);
    ctx.lineTo(31.5, 32);
    ctx.stroke();
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(40, 40);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  return (
    <group>
      {/* Big slate base. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial
          color="#15171c"
          map={tileTexture ?? undefined}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* Brand quarter wash — warm orange tint. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-12, 0, 0]}>
        <planeGeometry args={[24, 28]} />
        <meshBasicMaterial color="#3a2516" transparent opacity={0.5} />
      </mesh>

      {/* Creator quarter wash — cool teal tint. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[12, 0, 0]}>
        <planeGeometry args={[24, 28]} />
        <meshBasicMaterial color="#162a32" transparent opacity={0.55} />
      </mesh>

      {/* Plaza glow ring is rendered separately as <PlazaGlow/> so it
          can pulse on a useFrame; static ring removed from here. */}
    </group>
  );
}

/* =====================================================================
 * SPRITE BUILDING
 * ===================================================================== */

type LotProps = {
  position: { x: number; z: number };
  sprite: SpriteDef;
  height?: number;
  /** Optional tinting for state highlights — undefined = no tint. */
  tint?: string;
  /**
   * Subtle idle bob amplitude in world units. The research caps idle
   * animation at 4fps — we use a smooth low-frequency sin wave instead
   * (it never *frames*, so it can't read as twitchy), but amplitude
   * stays small enough that admins don't notice it after the first few
   * seconds.
   */
  idleBobAmplitude?: number;
  /** Cycles per second. ~0.6–0.9 Hz feels alive without nagging. */
  idleBobRate?: number;
  /** Phase offset (radians). Pass a per-lot offset so neighbouring
   *  buildings don't bob in unison. */
  idleBobPhase?: number;
  onClick?: (e: { stopPropagation?: () => void }) => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
};

/**
 * One sprite-on-a-billboard. The plane always faces the camera and the
 * material uses NearestFilter so pixels stay crisp across zoom levels.
 * Anchor point is the middle of the bottom edge so the sprite "stands"
 * on the ground at its lot position regardless of height.
 *
 * Optionally bobs vertically on a low-frequency sin so the village
 * feels alive without crossing into "fidgety" territory.
 */
function Lot({
  position,
  sprite,
  height = 2,
  tint,
  idleBobAmplitude = 0,
  idleBobRate = 0.7,
  idleBobPhase = 0,
  onClick,
  onPointerOver,
  onPointerOut,
}: LotProps) {
  const texture = useMemo(() => {
    const canvas = renderSpriteToCanvas(sprite, 8);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [sprite]);

  // Aspect-correct width; sprites are square in this set so it's 1:1.
  const aspect = sprite.width / sprite.height;
  const width = height * aspect;

  // Idle bob — drives a vertical offset on the sprite group via useFrame.
  // No-op when amplitude is 0.
  const bobRef = useRef<THREE.Group>(null);
  const baseY = height / 2;
  useFrame((state) => {
    if (!bobRef.current || idleBobAmplitude === 0) return;
    const t = state.clock.elapsedTime;
    bobRef.current.position.y =
      baseY + Math.sin(t * idleBobRate * Math.PI * 2 + idleBobPhase) * idleBobAmplitude;
  });

  return (
    <group position={[position.x, 0, position.z]}>
      {/* Soft contact shadow on the ground — keeps the billboard from
          looking like it's hovering. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[width * 0.55, 24]} />
        <meshBasicMaterial color="#000" transparent opacity={0.35} />
      </mesh>

      <group ref={bobRef} position={[0, baseY, 0]}>
        <sprite
          scale={[width, height, 1]}
          onClick={(e) => {
            e.stopPropagation?.();
            onClick?.(e);
          }}
          onPointerOver={(e) => {
            e.stopPropagation?.();
            onPointerOver?.();
          }}
          onPointerOut={(e) => {
            e.stopPropagation?.();
            onPointerOut?.();
          }}
        >
          <spriteMaterial
            map={texture}
            transparent
            color={tint ?? "#ffffff"}
            // Keep the sprite from blurring at very small zoom — leave
            // mipmap generation off (above) and disable depth-write so
            // overlapping sprites don't punch through their own halo.
            depthWrite={false}
          />
        </sprite>
      </group>
    </group>
  );
}

/**
 * Plaza glow — a slow opacity pulse on the amber ring under the
 * fountain. Cycles every ~4 s, low contrast (0.14 → 0.24) so it never
 * pulls attention away from the buildings.
 */
function PlazaGlow() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.18 + 0.06 * (0.5 + 0.5 * Math.sin(t * 0.5 * Math.PI * 2));
  });
  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.015, 0]}
    >
      <ringGeometry args={[1.6, 5, 48]} />
      <meshBasicMaterial color="#fbad25" transparent opacity={0.18} />
    </mesh>
  );
}

/* =====================================================================
 * BUILDING LOT — entity-aware wrapper
 * ===================================================================== */

type BuildingLotProps = {
  lot: LotPlacement;
  bobPhase: number;
  isSelected: boolean;
  isHovered: boolean;
  isPartner: boolean;
  isDimmed: boolean;
  onSelect: () => void;
  onHover: (hover: boolean) => void;
};

function BuildingLot({
  lot,
  bobPhase,
  isSelected,
  isHovered,
  isPartner,
  isDimmed,
  onSelect,
  onHover,
}: BuildingLotProps) {
  const sprite =
    lot.entity.kind === "brand" ? SPRITE_BRAND_COTTAGE : SPRITE_CREATOR_COTTAGE;
  const tint = isDimmed ? "#404550" : "#ffffff";
  const showLabel = isSelected || isHovered;

  return (
    <group>
      <Lot
        position={lot.position}
        sprite={sprite}
        height={2.2}
        tint={tint}
        idleBobAmplitude={0.04}
        idleBobRate={0.6}
        idleBobPhase={bobPhase}
        onClick={onSelect}
        onPointerOver={() => onHover(true)}
        onPointerOut={() => onHover(false)}
      />

      {/* Selection / partner ring on the ground */}
      {(isSelected || isPartner) && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[lot.position.x, 0.04, lot.position.z]}
        >
          <ringGeometry args={[1.0, 1.25, 32]} />
          <meshBasicMaterial
            color={isSelected ? "#fbad25" : "#64c8ff"}
            transparent
            opacity={isSelected ? 0.85 : 0.6}
          />
        </mesh>
      )}

      {/* Floating label — crisp Inter via drei <Html>, NEVER pixel font.
          This is the research's "#1 amateur tell to avoid". Only shown
          when selected or hovered to keep the canvas clean at rest. */}
      {showLabel && (
        <Html
          position={[lot.position.x, 2.5, lot.position.z]}
          center
          distanceFactor={10}
          zIndexRange={[100, 0]}
          pointerEvents="none"
        >
          <div className={mapStyles.spriteLabel} data-kind={lot.entity.kind}>
            <span className={mapStyles.spriteLabelName}>
              {lot.entity.name}
            </span>
            <span className={mapStyles.spriteLabelRq}>
              {lot.entity.rq_code}
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}

/* =====================================================================
 * SELECTED PANEL (HTML, lives outside the canvas)
 * ===================================================================== */

function SelectedPanel({
  entity,
  partnerIds,
  onClose,
}: {
  entity: MarketplaceEntity;
  partnerIds: ReadonlySet<string>;
  onClose: () => void;
}) {
  const partners = useMemo(
    () => MOCK_ENTITIES.filter((e) => partnerIds.has(e.id)),
    [partnerIds],
  );

  // Esc closes — admin-pattern reflex.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside className={mapStyles.selectedPanel} aria-label="Selected entity">
      <header className={mapStyles.selectedHeader}>
        <div className={mapStyles.selectedHeaderTitle}>
          <h3 className={mapStyles.selectedName}>{entity.name}</h3>
          <span className={styles.mockPill}>MOCK</span>
        </div>
        <button
          type="button"
          className={mapStyles.selectedClose}
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </header>
      <div className={mapStyles.selectedBody}>
        <div className={styles.partnerRq}>
          <span className={styles.rqCode}>{entity.rq_code}</span>
          <span className={styles.rqName}>{entity.rq_name}</span>
        </div>
        <p className={mapStyles.selectedBlurb}>{entity.blurb}</p>
        <div className={mapStyles.selectedSection}>
          <h4 className={mapStyles.selectedSectionTitle}>
            {entity.kind === "brand"
              ? `Matched creators (${partners.length})`
              : `Matched brands (${partners.length})`}
          </h4>
          {partners.length === 0 ? (
            <p className={mapStyles.selectedEmpty}>
              No confirmed partnerships yet. Use the Match view to build some.
            </p>
          ) : (
            <ul className={mapStyles.selectedPartners}>
              {partners.map((p) => (
                <li key={p.id} className={mapStyles.selectedPartner}>
                  <Badge variant={p.kind === "creator" ? "info" : "warn"}>
                    {p.kind === "creator" ? "Creator" : "Brand"}
                  </Badge>
                  <span className={mapStyles.selectedPartnerName}>
                    {p.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}

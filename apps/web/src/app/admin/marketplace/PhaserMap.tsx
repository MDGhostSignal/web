"use client";

import { useEffect, useMemo, useRef } from "react";

import { Badge, Modal, typeVariant } from "@/components/admin";
import {
  MOCK_ENTITIES,
  TRAIT_KEYS,
  TRAIT_LABELS,
} from "@/lib/marketplace-mocks";
import type { Match } from "@/lib/marketplace-store";
import { resonance, tierFor } from "@/lib/marketplace-match";

import { useGameStore } from "./game/store";
import { buildFlavorNpcPlacements } from "./game/worldLayout";
import styles from "./phaser-map.module.css";

// Flavor NPC roster — the same fixed list scenes.ts spawns. Built once
// at module load so the overlay can resolve approached/opened ids back
// to their name + line without reaching into the game.
const FLAVOR_NPCS = buildFlavorNpcPlacements();

/**
 * Phaser-powered top-down RPG view for /admin/marketplace's Map tab.
 * Replaces the prior R3F isometric scene with a Zelda: A Link to the
 * Past-style walkable world. Phase 1 ships the foundation: empty
 * grass world + WASD/arrow movement + camera follow + pixel-perfect
 * rendering. Phase 2+ add houses, NPCs, dialog, environment polish.
 *
 * Phaser is browser-only (references `window` at module load), so
 * this component is loaded via `dynamic({ ssr: false })` from
 * page.tsx and additionally guards the import inside useEffect.
 *
 * The `matches` prop will drive house decoration in Phase 2 (each
 * confirmed entity's house gets a small visible cue); for now it's
 * accepted but unused so the component's interface stays stable
 * across phases.
 */
type Props = {
  /** Confirmed matches — used by Phase 2+ to decorate / mark houses
   *  whose entity already has at least one confirmed pairing. */
  matches: Match[];
};

export default function PhaserMap({ matches }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Game instance held in a ref so non-mount-only effects (pause/
  // resume the scene when a modal opens) can reach into it.
  const gameRef = useRef<import("phaser").Game | null>(null);

  const approachedId = useGameStore((s) => s.approachedEntityId);
  const openedId = useGameStore((s) => s.openedEntityId);
  const setOpenedEntity = useGameStore((s) => s.setOpenedEntity);
  const approachedNpcId = useGameStore((s) => s.approachedNpcId);
  const openedNpcId = useGameStore((s) => s.openedNpcId);
  const setOpenedNpc = useGameStore((s) => s.setOpenedNpc);
  const approachedFlavorId = useGameStore((s) => s.approachedFlavorId);
  const openedFlavorId = useGameStore((s) => s.openedFlavorId);
  const setOpenedFlavor = useGameStore((s) => s.setOpenedFlavor);

  const approachedEntity = useMemo(
    () => MOCK_ENTITIES.find((e) => e.id === approachedId) ?? null,
    [approachedId],
  );
  const openedEntity = useMemo(
    () => MOCK_ENTITIES.find((e) => e.id === openedId) ?? null,
    [openedId],
  );
  const approachedNpcEntity = useMemo(
    () => MOCK_ENTITIES.find((e) => e.id === approachedNpcId) ?? null,
    [approachedNpcId],
  );
  const openedNpcEntity = useMemo(
    () => MOCK_ENTITIES.find((e) => e.id === openedNpcId) ?? null,
    [openedNpcId],
  );
  const approachedFlavor = useMemo(
    () =>
      FLAVOR_NPCS.find((f) => f.flavorId === approachedFlavorId) ?? null,
    [approachedFlavorId],
  );
  const openedFlavor = useMemo(
    () => FLAVOR_NPCS.find((f) => f.flavorId === openedFlavorId) ?? null,
    [openedFlavorId],
  );

  // Whether ANY dialog is open — used to drive scene pause/resume +
  // global Esc-to-close.
  const anyDialogOpen =
    openedId !== null || openedNpcId !== null || openedFlavorId !== null;

  // Confirmed-partner list for the opened entity — surfaced in the
  // visit card so the user can see who's already paired.
  const openedPartners = useMemo(() => {
    if (!openedEntity) return [];
    const partnerIds = new Set<string>();
    for (const m of matches) {
      if (m.status !== "confirmed") continue;
      if (openedEntity.kind === "brand" && m.brand_id === openedEntity.id) {
        partnerIds.add(m.creator_id);
      } else if (
        openedEntity.kind === "creator" &&
        m.creator_id === openedEntity.id
      ) {
        partnerIds.add(m.brand_id);
      }
    }
    return MOCK_ENTITIES.filter((e) => partnerIds.has(e.id))
      .map((e) => ({ entity: e, score: resonance(openedEntity, e) }))
      .sort((a, b) => b.score - a.score);
  }, [openedEntity, matches]);

  // Pause / resume the World scene while EITHER dialog is open so
  // player input + movement freeze and the dialog has full focus.
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    const sceneManager = game.scene;
    if (!sceneManager.getScene("World")) return;
    if (anyDialogOpen) {
      sceneManager.pause("World");
    } else {
      sceneManager.resume("World");
    }
  }, [anyDialogOpen]);

  // Window-level Esc + E close handlers for the NPC dialog. The
  // visit-card uses the shared admin Modal which has its own Esc
  // handling; the NPC dialog is a custom in-canvas overlay so we
  // bind keys ourselves. Also closes the NPC dialog on E so the
  // user can press the same interact key to dismiss.
  useEffect(() => {
    if (!openedNpcId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "e" || e.key === "E") {
        setOpenedNpc(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openedNpcId, setOpenedNpc]);

  // Same Esc/E close handler for the wandering-villager flavor dialog.
  useEffect(() => {
    if (!openedFlavorId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "e" || e.key === "E") {
        setOpenedFlavor(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openedFlavorId, setOpenedFlavor]);

  useEffect(() => {
    const containerEl = containerRef.current;
    if (!containerEl) return;

    let cancelled = false;

    // Phaser + grid-engine + the scene module are all dynamically
    // imported so that webpack only bundles them once this component
    // mounts. They reference `window` and the DOM at module load,
    // which means top-level imports would crash even in the
    // ssr:false flow during initial chunk evaluation in some setups.
    void (async () => {
      // Phaser's ESM bundle has no default export, so the dynamic
      // import resolves directly to the namespace object — no
      // `.default` destructure.
      const [Phaser, { GridEngine }, { BootScene, WorldScene }] =
        await Promise.all([
          import("phaser"),
          import("grid-engine"),
          import("./game/scenes"),
        ]);
      if (cancelled) return;

      // grid-engine's bundle references `Phaser` as a global at
      // runtime (it's a Phaser plugin and assumes the script-tag
      // distribution model). With ESM imports under Turbopack /
      // Webpack, that global isn't set automatically — assigning it
      // here is the canonical workaround. Without this, calling
      // `gridEngine.create(...)` throws "Phaser is not defined" the
      // first time grid-engine touches a Phaser class internally.
      (window as unknown as { Phaser: unknown }).Phaser = Phaser;

      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerEl,
        // RESIZE mode: the canvas takes the parent container's
        // dimensions exactly — no letterboxing. Pixel-art crispness
        // is preserved by zooming the camera (set in WorldScene),
        // not by scaling a fixed virtual resolution. The width /
        // height here are just initial defaults; RESIZE overrides
        // them on first layout pass.
        width: 800,
        height: 600,
        backgroundColor: "#0a0a0b",
        pixelArt: true,
        roundPixels: true,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        plugins: {
          scene: [
            {
              key: "gridEngine",
              plugin: GridEngine,
              mapping: "gridEngine",
            },
          ],
        },
        scene: [BootScene, WorldScene],
        // Disable the right-click context menu so the player can use
        // mouse navigation later without it being interrupted.
        input: { mouse: { preventDefaultDown: false } },
      });
    })();

    return () => {
      cancelled = true;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className={styles.frame}>
      <div ref={containerRef} className={styles.canvas} />
      <div className={styles.hint} aria-hidden="true">
        WASD or arrow keys to walk · Press E at a door
      </div>

      {/* Approach prompt — priority: house > entity NPC > flavor NPC. */}
      {approachedEntity ? (
        <div className={styles.approachPrompt} role="status">
          <span className={styles.approachKey}>E</span>
          <span className={styles.approachLabel}>
            Visit{" "}
            <strong className={styles.approachName}>
              {approachedEntity.name}
            </strong>
          </span>
          <span
            className={styles.approachKind}
            data-kind={approachedEntity.kind}
          >
            {approachedEntity.kind === "creator" ? "Creator" : "Brand"}
          </span>
        </div>
      ) : approachedNpcEntity ? (
        <div className={styles.approachPrompt} role="status">
          <span className={styles.approachKey}>E</span>
          <span className={styles.approachLabel}>
            Talk to{" "}
            <strong className={styles.approachName}>
              {approachedNpcEntity.name}
            </strong>
          </span>
          <span
            className={styles.approachKind}
            data-kind={approachedNpcEntity.kind}
          >
            {approachedNpcEntity.kind === "creator" ? "Creator" : "Brand"}
          </span>
        </div>
      ) : approachedFlavor ? (
        <div className={styles.approachPrompt} role="status">
          <span className={styles.approachKey}>E</span>
          <span className={styles.approachLabel}>
            Talk to{" "}
            <strong className={styles.approachName}>
              {approachedFlavor.name}
            </strong>
          </span>
        </div>
      ) : null}

      {/* NPC dialog bubble — bottom-of-screen JRPG style speech box.
          Custom overlay (not a Modal) so the player keeps the world
          context visible while reading. Closes on Esc / E (handled in
          the keydown effect above) or by clicking the X. */}
      {openedNpcEntity ? (
        <div className={styles.npcDialog} role="dialog">
          <header className={styles.npcDialogHeader}>
            <span
              className={styles.npcDialogAvatar}
              data-kind={openedNpcEntity.kind}
            >
              {openedNpcEntity.name.charAt(0)}
            </span>
            <span className={styles.npcDialogName}>
              {openedNpcEntity.name}
            </span>
            <span
              className={styles.npcDialogKind}
              data-kind={openedNpcEntity.kind}
            >
              {openedNpcEntity.kind === "creator" ? "Creator" : "Brand"}
            </span>
            <button
              type="button"
              className={styles.npcDialogClose}
              onClick={() => setOpenedNpc(null)}
              aria-label="Close"
            >
              ×
            </button>
          </header>
          <p className={styles.npcDialogBody}>{openedNpcEntity.blurb}</p>
          <div className={styles.npcDialogTags}>
            {openedNpcEntity.tags.map((t) => (
              <span key={t} className={styles.npcDialogTag}>
                {t}
              </span>
            ))}
          </div>
          <p className={styles.npcDialogHint}>Press E or Esc to close</p>
        </div>
      ) : null}

      {/* Wandering-villager flavor dialog — slimmer than the entity
          version (no kind chip, no tag list — they're not entities). */}
      {openedFlavor ? (
        <div className={styles.npcDialog} role="dialog">
          <header className={styles.npcDialogHeader}>
            <span
              className={styles.npcDialogAvatar}
              data-variant={openedFlavor.variant}
            >
              {openedFlavor.name.charAt(0)}
            </span>
            <span className={styles.npcDialogName}>
              {openedFlavor.name}
            </span>
            <button
              type="button"
              className={styles.npcDialogClose}
              onClick={() => setOpenedFlavor(null)}
              aria-label="Close"
            >
              ×
            </button>
          </header>
          <p className={styles.npcDialogBody}>{openedFlavor.line}</p>
          <p className={styles.npcDialogHint}>Press E or Esc to close</p>
        </div>
      ) : null}

      {openedEntity ? (
        <Modal
          open
          onClose={() => setOpenedEntity(null)}
          size="lg"
          title={openedEntity.name}
          subtitle={
            openedEntity.kind === "creator" ? "Creator" : "Brand"
          }
        >
          <div className={styles.visitBody}>
            <div className={styles.visitMeta}>
              <Badge variant={typeVariant(openedEntity.kind)}>
                {openedEntity.kind === "creator" ? "Creator" : "Brand"}
              </Badge>
              <span className={styles.visitRqCode}>
                {openedEntity.rq_code}
              </span>
              <span className={styles.visitRqName}>
                {openedEntity.rq_name}
              </span>
            </div>

            <p className={styles.visitBlurb}>{openedEntity.blurb}</p>

            <section className={styles.visitSection}>
              <h3 className={styles.visitSectionTitle}>RQ traits</h3>
              <div className={styles.visitTraits}>
                {TRAIT_KEYS.map((k) => (
                  <div key={k} className={styles.visitTraitRow}>
                    <span className={styles.visitTraitLabel}>
                      {TRAIT_LABELS[k]}
                    </span>
                    <span className={styles.visitTraitTrack}>
                      <span
                        className={styles.visitTraitFill}
                        style={{ width: `${openedEntity.traits[k]}%` }}
                      />
                    </span>
                    <span className={styles.visitTraitValue}>
                      {openedEntity.traits[k]}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.visitSection}>
              <h3 className={styles.visitSectionTitle}>Tags</h3>
              <div className={styles.visitTags}>
                {openedEntity.tags.map((t) => (
                  <span key={t} className={styles.visitTagChip}>
                    {t}
                  </span>
                ))}
              </div>
            </section>

            <section className={styles.visitSection}>
              <h3 className={styles.visitSectionTitle}>
                {openedEntity.kind === "brand"
                  ? `Matched creators (${openedPartners.length})`
                  : `Matched brands (${openedPartners.length})`}
              </h3>
              {openedPartners.length === 0 ? (
                <p className={styles.visitEmpty}>
                  No confirmed partnerships yet. Switch to the Match
                  view to suggest one.
                </p>
              ) : (
                <ul className={styles.visitPartners}>
                  {openedPartners.map(({ entity: p, score }) => (
                    <li key={p.id} className={styles.visitPartner}>
                      <Badge variant={typeVariant(p.kind)}>
                        {p.kind === "creator" ? "Creator" : "Brand"}
                      </Badge>
                      <span className={styles.visitPartnerName}>
                        {p.name}
                      </span>
                      <span
                        className={styles.visitPartnerScore}
                        data-tier={tierFor(score)}
                      >
                        {score}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

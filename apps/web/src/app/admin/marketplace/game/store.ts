import { create } from "zustand";

/**
 * Tiny shared store between the Phaser game and the React overlay.
 * The game writes via getState().setApproachedEntity / setOpenedEntity
 * each frame; the React component reads via the standard Zustand
 * hook so the HUD prompt and entity-card modal can render reactively.
 *
 * Keeping the surface minimal — Phase 1/2 only need the two ids.
 * Later phases can add `dialogText`, `currentScene`, etc. without
 * disrupting consumers since Zustand's partial selectors prevent
 * unrelated re-renders.
 */
type GameStore = {
  /** Entity whose house the player is currently standing on (door
   *  tile). null when the player isn't on any door. */
  approachedEntityId: string | null;
  /** Entity whose visit-card modal is currently open. */
  openedEntityId: string | null;
  /** Entity whose NPC the player is currently cardinal-adjacent to. */
  approachedNpcId: string | null;
  /** Entity whose NPC dialog is currently open. */
  openedNpcId: string | null;
  /** Flavor (non-entity) NPC the player is cardinal-adjacent to. */
  approachedFlavorId: string | null;
  /** Flavor NPC dialog currently open. */
  openedFlavorId: string | null;
  /** Player is standing on the church door tile. */
  approachedChurch: boolean;
  /** Church-interior modal is open. */
  openedChurch: boolean;
  /** Sign the player is cardinal-adjacent to. */
  approachedSignId: string | null;
  /** Sign whose dialog is currently open. */
  openedSignId: string | null;
  /** Player is standing on the town-board statue's interaction tile. */
  approachedBoard: boolean;
  /** Town-board edit modal is open. */
  openedBoard: boolean;
  /** The board's current message — persisted to localStorage in the
   *  React layer; the store just holds the in-memory copy so the
   *  dialog can read/write reactively. */
  boardText: string;
  setApproachedEntity: (id: string | null) => void;
  setOpenedEntity: (id: string | null) => void;
  setApproachedNpc: (id: string | null) => void;
  setOpenedNpc: (id: string | null) => void;
  setApproachedFlavor: (id: string | null) => void;
  setOpenedFlavor: (id: string | null) => void;
  setApproachedChurch: (v: boolean) => void;
  setOpenedChurch: (v: boolean) => void;
  setApproachedSign: (id: string | null) => void;
  setOpenedSign: (id: string | null) => void;
  setApproachedBoard: (v: boolean) => void;
  setOpenedBoard: (v: boolean) => void;
  setBoardText: (text: string) => void;
  reset: () => void;
};

export const useGameStore = create<GameStore>((set) => ({
  approachedEntityId: null,
  openedEntityId: null,
  approachedNpcId: null,
  openedNpcId: null,
  approachedFlavorId: null,
  openedFlavorId: null,
  approachedChurch: false,
  openedChurch: false,
  approachedSignId: null,
  openedSignId: null,
  approachedBoard: false,
  openedBoard: false,
  boardText: "",
  setApproachedEntity: (id) => set({ approachedEntityId: id }),
  setOpenedEntity: (id) => set({ openedEntityId: id }),
  setApproachedNpc: (id) => set({ approachedNpcId: id }),
  setOpenedNpc: (id) => set({ openedNpcId: id }),
  setApproachedFlavor: (id) => set({ approachedFlavorId: id }),
  setOpenedFlavor: (id) => set({ openedFlavorId: id }),
  setApproachedChurch: (v) => set({ approachedChurch: v }),
  setOpenedChurch: (v) => set({ openedChurch: v }),
  setApproachedSign: (id) => set({ approachedSignId: id }),
  setOpenedSign: (id) => set({ openedSignId: id }),
  setApproachedBoard: (v) => set({ approachedBoard: v }),
  setOpenedBoard: (v) => set({ openedBoard: v }),
  setBoardText: (text) => set({ boardText: text }),
  reset: () =>
    set({
      approachedEntityId: null,
      openedEntityId: null,
      approachedNpcId: null,
      openedNpcId: null,
      approachedFlavorId: null,
      openedFlavorId: null,
      approachedChurch: false,
      openedChurch: false,
      approachedSignId: null,
      openedSignId: null,
      approachedBoard: false,
      openedBoard: false,
      // Don't reset boardText on scene reset — it's persisted.
    }),
}));

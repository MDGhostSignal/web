import type { Metadata } from "next";

import WorldClient from "./WorldClient";

/**
 * /world — the GhostSignal marketplace RPG.
 *
 * Multi-user persistent browser world where users walk around as their
 * XQ archetype and meet other members. Replaces the old admin-only
 * marketplace map. See docs/MARKETPLACE_RPG_PLAN.md for the full
 * architecture (Phaser client + Colyseus server + Supabase persistence).
 *
 * Mount strategy: WorldClient is a client component that defers the
 * Phaser import until inside useEffect (`await import("phaser")`), so
 * SSR never touches `window`. No dynamic import with ssr:false needed
 * here — Next 16 disallows that pattern from server components anyway.
 *
 * Phase: 0b-ii — empty canvas scaffold. No netcode wired yet.
 */

export const metadata: Metadata = {
  title: "World · GhostSignal",
  description:
    "The GhostSignal marketplace, lived as a world. Walk around as your XQ archetype and meet the people whose convictions align with yours.",
};

export default function WorldPage() {
  return <WorldClient />;
}

"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useSyncExternalStore } from "react";

import { Button, Loading, Modal, PageHeader } from "@/components/admin";
import {
  MOCK_BRANDS,
  MOCK_CREATORS,
  MOCK_ENTITIES,
} from "@/lib/marketplace-mocks";
import {
  clearAll,
  listMatches,
  subscribe,
  type Match,
} from "@/lib/marketplace-store";

import { MatchBoard } from "./MatchBoard";
import { PoolView } from "./PoolView";
import styles from "./marketplace.module.css";

// Server snapshot is always empty (localStorage doesn't exist during SSR);
// the client snapshot reads through to listMatches(). React handles the
// hydration handoff cleanly via useSyncExternalStore.
const EMPTY_MATCHES: Match[] = [];
const getServerSnapshot = (): Match[] => EMPTY_MATCHES;

// Map view pulls in three.js + R3F + drei + postprocessing — code-split
// behind dynamic + ssr:false so the bundle only lands when an admin
// actually opens the Map tab.
const MatchMap = dynamic(() => import("./MatchMap"), {
  ssr: false,
  loading: () => (
    <div className={styles.mapLoading}>
      <Loading message="Building the town…" />
    </div>
  ),
});

type ViewMode = "pool" | "match" | "map";

const VIEWS: { id: ViewMode; label: string; hint: string }[] = [
  { id: "pool", label: "Pool", hint: "All creators + brands in one table" },
  { id: "match", label: "Match", hint: "Suggested pairs by resonance" },
  { id: "map", label: "Map", hint: "Spatial view of confirmed matches" },
];

export default function MarketplacePage() {
  const [view, setView] = useState<ViewMode>("match");
  const [resetOpen, setResetOpen] = useState(false);

  // useSyncExternalStore is the canonical primitive for binding a
  // localStorage-backed store into React without effect-driven setState
  // (and avoids the eslint react-hooks/set-state-in-effect rule).
  const matches = useSyncExternalStore(
    subscribe,
    listMatches,
    getServerSnapshot,
  );

  const confirmed = useMemo(
    () => matches.filter((m) => m.status === "confirmed"),
    [matches],
  );

  // Counters in the page header
  const counters = useMemo(() => {
    const totalEntities = MOCK_ENTITIES.length;
    const matchedBrands = new Set(confirmed.map((m) => m.brand_id)).size;
    const matchedCreators = new Set(confirmed.map((m) => m.creator_id)).size;
    return {
      totalEntities,
      totalMatches: confirmed.length,
      matchedBrands,
      matchedCreators,
    };
  }, [confirmed]);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Marketplace"
        subtitle={
          <>
            Match creators to brands by resonance across the small RQ
            traits. {MOCK_CREATORS.length} creators · {MOCK_BRANDS.length}{" "}
            brands · all currently mock data.
          </>
        }
        actions={
          <div className={styles.headerActions}>
            <div className={styles.headerStats}>
              <Stat label="Matches" value={counters.totalMatches} />
              <Stat
                label="Brands matched"
                value={`${counters.matchedBrands}/${MOCK_BRANDS.length}`}
              />
              <Stat
                label="Creators matched"
                value={`${counters.matchedCreators}/${MOCK_CREATORS.length}`}
              />
            </div>
            {matches.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setResetOpen(true)}
              >
                Reset…
              </Button>
            ) : null}
          </div>
        }
      />

      <div className={styles.viewTabs} role="tablist" aria-label="Marketplace views">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            role="tab"
            aria-selected={view === v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={`${styles.viewTab} ${view === v.id ? styles.viewTabActive : ""}`}
          >
            <span className={styles.viewTabLabel}>{v.label}</span>
            <span className={styles.viewTabHint}>{v.hint}</span>
          </button>
        ))}
      </div>

      {view === "pool" ? (
        <PoolView matches={confirmed} />
      ) : view === "match" ? (
        <MatchBoard matches={matches} />
      ) : (
        <MatchMap matches={confirmed} />
      )}

      {resetOpen ? (
        <Modal
          open={resetOpen}
          onClose={() => setResetOpen(false)}
          title="Reset all matches?"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setResetOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructiveSolid"
                onClick={() => {
                  clearAll();
                  setResetOpen(false);
                }}
              >
                Reset matches
              </Button>
            </>
          }
        >
          <p className={styles.resetBody}>
            This clears every confirmed and passed pairing in the
            marketplace. The mock entities themselves are unchanged. Matches
            live in browser localStorage only — there&apos;s no server-side
            undo.
          </p>
        </Modal>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

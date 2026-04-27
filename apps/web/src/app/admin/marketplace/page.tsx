"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useSyncExternalStore } from "react";

import { Button, Loading, Modal } from "@/components/admin";
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

// Map view is now a Phaser-powered Zelda-style world. Code-split via
// dynamic + ssr:false because Phaser references `window` at module
// load. The R3F isometric scene (./MatchMap) is preserved on disk for
// reference but no longer mounted.
const MatchMap = dynamic(() => import("./PhaserMap"), {
  ssr: false,
  loading: () => (
    <div className={styles.mapLoading}>
      <Loading message="Loading the world…" />
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
  const [helpOpen, setHelpOpen] = useState(false);

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
      <aside className={styles.sidebar} aria-label="Marketplace navigation">
        <div className={styles.sidebarBrand}>
          <h1 className={styles.sidebarTitle}>Marketplace</h1>
          <p className={styles.sidebarSubtitle}>
            {MOCK_CREATORS.length} creators · {MOCK_BRANDS.length} brands
          </p>
        </div>

        <nav
          className={styles.sidebarNav}
          role="tablist"
          aria-label="Marketplace views"
        >
          {VIEWS.map((v) => (
            <button
              key={v.id}
              role="tab"
              aria-selected={view === v.id}
              type="button"
              onClick={() => setView(v.id)}
              className={`${styles.sidebarNavItem} ${
                view === v.id ? styles.sidebarNavItemActive : ""
              }`}
            >
              <span className={styles.sidebarNavLabel}>{v.label}</span>
              <span className={styles.sidebarNavHint}>{v.hint}</span>
            </button>
          ))}
        </nav>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setHelpOpen(true)}
          className={styles.sidebarHelpBtn}
        >
          How matching works
        </Button>

        <div className={styles.sidebarStats}>
          <SidebarStat label="Matches" value={counters.totalMatches} />
          <SidebarStat
            label="Brands matched"
            value={`${counters.matchedBrands}/${MOCK_BRANDS.length}`}
          />
          <SidebarStat
            label="Creators matched"
            value={`${counters.matchedCreators}/${MOCK_CREATORS.length}`}
          />
        </div>

        {matches.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setResetOpen(true)}
            className={styles.sidebarResetBtn}
          >
            Reset matches…
          </Button>
        ) : null}
      </aside>

      <main className={styles.main}>
        {view === "pool" ? (
          <PoolView matches={confirmed} />
        ) : view === "match" ? (
          <MatchBoard matches={matches} />
        ) : (
          <MatchMap matches={confirmed} />
        )}
      </main>

      {helpOpen ? (
        <Modal
          open={helpOpen}
          onClose={() => setHelpOpen(false)}
          size="xl"
          className={styles.helpModalWide}
          title="How matching works"
          subtitle="Resonance scoring + tag overlap, in one place."
        >
          <div className={styles.helpModalBody}>
            <p className={styles.helpLede}>
              Every creator and every brand carries the same three trait
              scores from the small RQ quiz: <strong>Values</strong>,{" "}
              <strong>Authenticity</strong>, and <strong>Horizon</strong>{" "}
              (each 0–100). For brands those scores describe the audience
              they want to reach; for creators they describe the audience
              they have. The closer a creator&rsquo;s three numbers are to
              a brand&rsquo;s three numbers, the higher the resonance.
            </p>

            {/* ============================================================
             *  Worked example
             * ============================================================ */}
            <section className={styles.helpExample}>
              <h3 className={styles.helpSectionTitle}>Worked example</h3>
              <div className={styles.helpExampleEntities}>
                <div className={styles.helpEntity} data-kind="brand">
                  <span className={styles.helpEntityKind}>Brand</span>
                  <strong className={styles.helpEntityName}>
                    Stoneridge Coffee Co.
                  </strong>
                  <span className={styles.helpEntityTraits}>
                    V 90 · A 92 · H 60
                  </span>
                  <span className={styles.helpEntityTags}>
                    coffee · small-batch · heritage
                  </span>
                </div>
                <div className={styles.helpEntity} data-kind="creator">
                  <span className={styles.helpEntityKind}>Creator</span>
                  <strong className={styles.helpEntityName}>
                    Holly Stallcup
                  </strong>
                  <span className={styles.helpEntityTraits}>
                    V 92 · A 88 · H 70
                  </span>
                  <span className={styles.helpEntityTags}>
                    faith · memoir · long-form
                  </span>
                </div>
              </div>

              {/* Axis alignment visual — three rows showing the brand and
                  creator markers on the same 0–100 axis. The visible
                  gap between markers is the per-axis distance. */}
              <div className={styles.helpAxes} aria-hidden="true">
                {[
                  { label: "Values", brand: 90, creator: 92 },
                  { label: "Authenticity", brand: 92, creator: 88 },
                  { label: "Horizon", brand: 60, creator: 70 },
                ].map((axis) => {
                  const delta = Math.abs(axis.brand - axis.creator);
                  return (
                    <div className={styles.helpAxisRow} key={axis.label}>
                      <span className={styles.helpAxisLabel}>{axis.label}</span>
                      <span className={styles.helpAxisTrack}>
                        <span
                          className={styles.helpAxisMark}
                          data-side="brand"
                          style={{ left: `${axis.brand}%` }}
                        />
                        <span
                          className={styles.helpAxisMark}
                          data-side="creator"
                          style={{ left: `${axis.creator}%` }}
                        />
                      </span>
                      <span className={styles.helpAxisDelta}>Δ {delta}</span>
                    </div>
                  );
                })}
                <div className={styles.helpAxisLegend}>
                  <span className={styles.helpAxisMark} data-side="brand" />
                  <span>Brand</span>
                  <span className={styles.helpAxisMark} data-side="creator" />
                  <span>Creator</span>
                </div>
              </div>

              {/* Math */}
              <div className={styles.helpMath}>
                <p className={styles.helpMathRow}>
                  <span className={styles.helpMathLabel}>1. Per-axis gaps</span>
                  <code>|90 − 92| = 2 · |92 − 88| = 4 · |60 − 70| = 10</code>
                </p>
                <p className={styles.helpMathRow}>
                  <span className={styles.helpMathLabel}>2. RMS distance</span>
                  <code>√((4 + 16 + 100) / 3) ≈ 6.32</code>
                </p>
                <p className={styles.helpMathRow}>
                  <span className={styles.helpMathLabel}>3. Normalise</span>
                  <code>6.32 / 100 = 0.063</code>
                </p>
                <p className={styles.helpMathRow}>
                  <span className={styles.helpMathLabel}>4. Base resonance</span>
                  <code>100 × (1 − 0.063) = 93.7</code>
                </p>
                <p className={styles.helpMathRow}>
                  <span className={styles.helpMathLabel}>5. Tag bonus</span>
                  <code>0 shared tags × 2 = 0</code>
                </p>
                <p
                  className={`${styles.helpMathRow} ${styles.helpMathFinal}`}
                >
                  <span className={styles.helpMathLabel}>Final</span>
                  <code>
                    <strong>94</strong> · Strong resonance
                  </code>
                </p>
              </div>
            </section>

            {/* ============================================================
             *  Tier breakdown
             * ============================================================ */}
            <section className={styles.helpTiers}>
              <h3 className={styles.helpSectionTitle}>What the score means</h3>
              <ul className={styles.algorithmTiers}>
                <li>
                  <span
                    className={styles.algorithmTierDot}
                    data-tier="strong"
                  />
                  <strong>Strong (≥ 80)</strong> — values genuinely aligned;
                  the audience overlap is real, the partnership reads as
                  authentic on both sides.
                </li>
                <li>
                  <span className={styles.algorithmTierDot} data-tier="fair" />
                  <strong>Fair (60–79)</strong> — meaningful overlap with
                  trade-offs on at least one axis. Workable; worth a
                  conversation.
                </li>
                <li>
                  <span className={styles.algorithmTierDot} data-tier="weak" />
                  <strong>Weak (&lt; 60)</strong> — material misalignment.
                  Match anyway only when there&apos;s context the small
                  RQ can&apos;t see.
                </li>
              </ul>
            </section>

            {/* ============================================================
             *  Tags
             * ============================================================ */}
            <section className={styles.helpTags}>
              <h3 className={styles.helpSectionTitle}>How tags refine the score</h3>
              <p className={styles.helpBlockBody}>
                Each entity carries 2–3 descriptive tags (genre, medium,
                topic — e.g. <em>coffee</em>, <em>long-form</em>,{" "}
                <em>craft</em>). Every tag that appears on{" "}
                <strong>both</strong> the brand and the creator adds{" "}
                <strong>+2 resonance</strong>, capped at <strong>+6</strong>{" "}
                so vocabulary overlap can&apos;t override poor trait
                alignment.
              </p>
              <p className={styles.helpBlockBody}>
                Net effect: tags lift fair matches into strong territory
                when both sides share genre fluency, but a brand and
                creator with badly mismatched traits stay weak even with
                shared tags.
              </p>
            </section>

            {/* ============================================================
             *  Future
             * ============================================================ */}
            <section className={styles.helpFuture}>
              <h3 className={styles.helpSectionTitle}>What changes next</h3>
              <p className={styles.helpBlockBody}>
                The algorithm is set up so adding axes from the full RQ
                quiz is a one-line extension — no rewriting of call sites.
                When the bigger RQ ships, resonance gains nuance; the
                0–100 shape and the tier thresholds stay the same.
              </p>
            </section>
          </div>
        </Modal>
      ) : null}

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

function SidebarStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className={styles.sidebarStat}>
      <span className={styles.sidebarStatLabel}>{label}</span>
      <span className={styles.sidebarStatValue}>{value}</span>
    </div>
  );
}

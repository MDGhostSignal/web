"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import { Button, Loading, Modal } from "@/components/admin";
import {
  MOCK_BRANDS,
  MOCK_CREATORS,
  type MarketplaceEntity,
} from "@/lib/marketplace-mocks";
import {
  clearAll,
  listMatches,
  subscribe,
  type Match,
} from "@/lib/marketplace-store";
import {
  memberToMarketplaceEntity,
  type Member,
  type MemberWritable,
} from "@/lib/members";

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

function viewFromParam(raw: string | null): ViewMode {
  if (raw === "match" || raw === "map") return raw;
  return "pool";
}

export default function MarketplacePage() {
  // View is driven by the `?view=` query param so the persistent
  // left sidebar (see AdminSidebar) can deep-link to Pool / Match /
  // Map without us re-mounting the page on switch.
  //
  // Pool is the default — when a founder clicks the Marketplace
  // tab they almost always want to see the roster first (and the
  // "Membership" block on the expanded pool row is where ongoing
  // member-onboarding lives).
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = viewFromParam(searchParams?.get("view") ?? null);
  const setView = useCallback(
    (next: ViewMode) => {
      const url =
        next === "pool" ? "/admin/marketplace" : `/admin/marketplace?view=${next}`;
      router.replace(url, { scroll: false });
    },
    [router],
  );
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

  // Real members upstreamed from /admin/leads. Anyone with
  // `became_member_at` set is treated as a marketplace participant; the
  // page composes them with the seed mocks below so the pool stays a
  // single unified list. Fetched once on mount — re-fetch on view
  // changes isn't needed because the marketplace doesn't currently
  // write members back from this page (writes happen in /admin/leads).
  const [realMembers, setRealMembers] = useState<Member[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/members");
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data.ok && Array.isArray(data.members)) {
          setRealMembers(data.members as Member[]);
        }
      } catch {
        // Best-effort — pool still works with mocks alone if the
        // members endpoint is down.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Pool entities = real graduated members only. The seed mocks were
  // useful for prototyping the pool UI; with the marketplace now
  // wired to /admin/leads via `became_member_at`, the pool reflects
  // the actual roster. (MatchBoard + Map still demo against
  // MOCK_ENTITIES until real members carry RQ scores.)
  const poolEntities = useMemo<readonly MarketplaceEntity[]>(() => {
    return realMembers
      .map(memberToMarketplaceEntity)
      .filter((e): e is NonNullable<typeof e> => e !== null);
  }, [realMembers]);

  // Sidebar counter helpers — split the live roster by kind so the
  // sidebar reflects real members rather than the (now-unused) mocks.
  const poolKindCounts = useMemo(() => {
    let creators = 0;
    let brands = 0;
    for (const e of poolEntities) {
      if (e.kind === "creator") creators += 1;
      else if (e.kind === "brand") brands += 1;
    }
    return { creators, brands };
  }, [poolEntities]);

  // Create-from-pool: graduates a new member directly into the
  // marketplace without going through /admin/leads first. POSTs to
  // /api/members and prepends the created row to local state so the
  // pool shows it immediately. Returns the created Member (or null
  // on failure) so the caller can scroll-to / expand the new row.
  const handleCreateMember = useCallback(
    async (input: MemberWritable): Promise<Member | null> => {
      try {
        const res = await fetch("/api/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok || !data.member) {
          console.error("Marketplace member create failed:", data);
          return null;
        }
        const created = data.member as Member;
        setRealMembers((prev) => [created, ...prev]);
        return created;
      } catch (err) {
        console.error("Marketplace member create threw:", err);
        return null;
      }
    },
    [],
  );

  // Edit-from-pool: the expanded row on the Pool view writes back
  // changes to onboarding lifecycle steps. Same optimistic-update +
  // rollback pattern as /admin/leads's handleMemberPatch — but the
  // marketplace doesn't have a global error banner, so failures fall
  // back to console.error.
  const handleMemberPatch = useCallback(
    async (
      memberId: string,
      partial: MemberWritable,
    ): Promise<boolean> => {
      const current = realMembers.find((m) => m.id === memberId);
      if (!current) return false;

      setRealMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, ...partial } : m)),
      );

      try {
        const res = await fetch(`/api/members/${memberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(partial),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          console.error("Marketplace member patch failed:", data);
          setRealMembers((prev) =>
            prev.map((m) => (m.id === memberId ? current : m)),
          );
          return false;
        }
        const saved = data.member as Member;
        setRealMembers((prev) =>
          prev.map((m) => (m.id === memberId ? saved : m)),
        );
        return true;
      } catch (err) {
        console.error("Marketplace member patch threw:", err);
        setRealMembers((prev) =>
          prev.map((m) => (m.id === memberId ? current : m)),
        );
        return false;
      }
    },
    [realMembers],
  );

  // Counters in the sidebar. The `confirmed` match list still uses
  // mock ids (MatchBoard / Map are mock-driven), so the matched
  // counters reference MOCK_CREATORS / MOCK_BRANDS as their
  // denominators until those views move to real-member data too.
  const counters = useMemo(() => {
    const matchedBrands = new Set(confirmed.map((m) => m.brand_id)).size;
    const matchedCreators = new Set(confirmed.map((m) => m.creator_id)).size;
    return {
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
            {poolKindCounts.creators} creator
            {poolKindCounts.creators === 1 ? "" : "s"} ·{" "}
            {poolKindCounts.brands} brand
            {poolKindCounts.brands === 1 ? "" : "s"}
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
          <PoolView
            matches={confirmed}
            entities={poolEntities}
            members={realMembers}
            onMemberPatch={handleMemberPatch}
            onCreateMember={handleCreateMember}
          />
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

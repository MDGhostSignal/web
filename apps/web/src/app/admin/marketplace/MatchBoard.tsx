"use client";

import { useMemo, useState } from "react";

import { Badge, Button, EmptyState, SearchInput } from "@/components/admin";
import {
  MOCK_BRANDS,
  MOCK_CREATORS,
  MOCK_ENTITIES,
  type MarketplaceEntity,
} from "@/lib/marketplace-mocks";
import {
  RESONANCE_TIERS,
  findTopUnconfirmed,
  resonance,
  suggestMatches,
  tierFor,
  type ResonanceTier,
} from "@/lib/marketplace-match";
import {
  removeMatch,
  upsertMatch,
  type Match,
} from "@/lib/marketplace-store";

import { FilterChipGroup } from "./PoolView";
import styles from "./marketplace.module.css";

type Props = {
  matches: Match[];
};

type AnchorKind = "brand" | "creator";

export function MatchBoard({ matches }: Props) {
  const [anchorKind, setAnchorKind] = useState<AnchorKind>("brand");
  const [anchorId, setAnchorId] = useState<string | null>(MOCK_BRANDS[0]?.id ?? null);
  const [anchorSearch, setAnchorSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<"all" | ResonanceTier>("all");
  const [showRejected, setShowRejected] = useState(false);

  const anchorPool = useMemo(() => {
    const base = anchorKind === "brand" ? MOCK_BRANDS : MOCK_CREATORS;
    const q = anchorSearch.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.rq_code.toLowerCase().includes(q) ||
        e.rq_name.toLowerCase().includes(q),
    );
  }, [anchorKind, anchorSearch]);
  const anchor = useMemo(
    () => MOCK_ENTITIES.find((e) => e.id === anchorId) ?? null,
    [anchorId],
  );

  // "Match of the day" — highest-resonance pair the user hasn't yet
  // confirmed or rejected. Recomputed on every match-list change.
  const topPair = useMemo(() => {
    const decided = new Set<string>();
    for (const m of matches) {
      decided.add(`${m.brand_id}::${m.creator_id}`);
    }
    return findTopUnconfirmed(MOCK_ENTITIES, (b, c) =>
      decided.has(`${b}::${c}`),
    );
  }, [matches]);

  // Resolve "is this suggested entity the partner of the global top
  // unconfirmed pair, given the current anchor?" — used to mark one
  // card with a Match-of-the-day ribbon rather than rendering a
  // separate pinned button at the top of the board.
  function isMatchOfTheDay(entityId: string): boolean {
    if (!topPair || !anchor) return false;
    if (anchor.kind === "brand" && anchor.id === topPair.brand.id) {
      return entityId === topPair.creator.id;
    }
    if (anchor.kind === "creator" && anchor.id === topPair.creator.id) {
      return entityId === topPair.brand.id;
    }
    return false;
  }

  // The set of opposite-kind ids the anchor is already confirmed with —
  // these get pinned to the top of the list as "active partnerships",
  // distinct from the ranked suggestions below.
  const confirmedPartnerIds = useMemo(() => {
    if (!anchor) return new Set<string>();
    return new Set(
      matches
        .filter((m) => m.status === "confirmed")
        .filter((m) =>
          anchor.kind === "brand"
            ? m.brand_id === anchor.id
            : m.creator_id === anchor.id,
        )
        .map((m) =>
          anchor.kind === "brand" ? m.creator_id : m.brand_id,
        ),
    );
  }, [matches, anchor]);

  const rejectedPartnerIds = useMemo(() => {
    if (!anchor) return new Set<string>();
    return new Set(
      matches
        .filter((m) => m.status === "rejected")
        .filter((m) =>
          anchor.kind === "brand"
            ? m.brand_id === anchor.id
            : m.creator_id === anchor.id,
        )
        .map((m) =>
          anchor.kind === "brand" ? m.creator_id : m.brand_id,
        ),
    );
  }, [matches, anchor]);

  const suggestions = useMemo(() => {
    if (!anchor) return [];
    // When "show rejected" is on, the rejected pool is *included* in
    // the suggestion list (so the admin can re-evaluate). Confirmed
    // pairs always stay out of the suggestion list — they live in the
    // separate "Active partnerships" section above.
    const exclude = new Set(confirmedPartnerIds);
    if (!showRejected) {
      for (const id of rejectedPartnerIds) exclude.add(id);
    }
    const ranked = suggestMatches(anchor, MOCK_ENTITIES, {
      limit: 12,
      exclude,
    });
    if (tierFilter === "all") return ranked;
    return ranked.filter(({ score }) => tierFor(score) === tierFilter);
  }, [
    anchor,
    confirmedPartnerIds,
    rejectedPartnerIds,
    showRejected,
    tierFilter,
  ]);

  const confirmedPartners = useMemo(() => {
    if (!anchor) return [];
    return MOCK_ENTITIES.filter((e) => confirmedPartnerIds.has(e.id))
      .map((e) => ({ entity: e, score: resonance(anchor, e) }))
      .sort((a, b) => b.score - a.score);
  }, [anchor, confirmedPartnerIds]);

  function handleConfirm(other: MarketplaceEntity) {
    if (!anchor) return;
    const brand = anchor.kind === "brand" ? anchor : other;
    const creator = anchor.kind === "creator" ? anchor : other;
    upsertMatch({
      brand_id: brand.id,
      creator_id: creator.id,
      status: "confirmed",
      resonance: resonance(brand, creator),
    });
  }

  function handleReject(other: MarketplaceEntity) {
    if (!anchor) return;
    const brand = anchor.kind === "brand" ? anchor : other;
    const creator = anchor.kind === "creator" ? anchor : other;
    upsertMatch({
      brand_id: brand.id,
      creator_id: creator.id,
      status: "rejected",
      resonance: resonance(brand, creator),
    });
  }

  function handleUnmatch(other: MarketplaceEntity) {
    if (!anchor) return;
    const brand = anchor.kind === "brand" ? anchor : other;
    const creator = anchor.kind === "creator" ? anchor : other;
    const found = matches.find(
      (m) => m.brand_id === brand.id && m.creator_id === creator.id,
    );
    if (found) removeMatch(found.id);
  }

  return (
    <div className={styles.matchBoardWrap}>
      <div className={styles.matchBoard}>
      {/* ============================================================
       *  Anchor selector — pick the side of the marketplace you're
       *  matchmaking from. Lists the entities of that kind as a
       *  scrollable column on the left.
       * ============================================================ */}
      <aside className={styles.anchorRail} aria-label="Anchor entities">
        <div className={styles.anchorKindToggle} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={anchorKind === "brand"}
            className={`${styles.anchorKindBtn} ${
              anchorKind === "brand" ? styles.anchorKindBtnActive : ""
            }`}
            onClick={() => {
              setAnchorKind("brand");
              setAnchorId(MOCK_BRANDS[0]?.id ?? null);
              setAnchorSearch("");
            }}
          >
            Brands
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={anchorKind === "creator"}
            className={`${styles.anchorKindBtn} ${
              anchorKind === "creator" ? styles.anchorKindBtnActive : ""
            }`}
            onClick={() => {
              setAnchorKind("creator");
              setAnchorId(MOCK_CREATORS[0]?.id ?? null);
              setAnchorSearch("");
            }}
          >
            Creators
          </button>
        </div>

        <SearchInput
          value={anchorSearch}
          onChange={(e) => setAnchorSearch(e.target.value)}
          placeholder={`Search ${anchorKind === "brand" ? "brands" : "creators"}…`}
          wrapClassName={styles.anchorSearch}
        />

        <ul className={styles.anchorList}>
          {anchorPool.map((e) => {
            const active = e.id === anchorId;
            return (
              <li key={e.id}>
                <button
                  type="button"
                  className={`${styles.anchorItem} ${
                    active ? styles.anchorItemActive : ""
                  }`}
                  onClick={() => setAnchorId(e.id)}
                  aria-current={active ? "true" : undefined}
                >
                  <span className={styles.anchorItemName}>{e.name}</span>
                  <span className={styles.anchorItemRq}>{e.rq_code}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* ============================================================
       *  Detail + suggestions — the matchmaking surface itself.
       * ============================================================ */}
      <section className={styles.matchPanel}>
        {!anchor ? (
          <EmptyState title="Pick an anchor" message="Choose a brand or creator from the list." />
        ) : (
          <>
            <header className={styles.anchorHeader}>
              <h2 className={styles.anchorHeaderName}>{anchor.name}</h2>
              <Badge variant={anchor.kind === "creator" ? "info" : "warn"}>
                {anchor.kind === "creator" ? "Creator" : "Brand"}
              </Badge>
              <span className={styles.rqCode}>{anchor.rq_code}</span>
            </header>

            {/* Active partnerships, if any */}
            {confirmedPartners.length > 0 && (
              <div className={styles.matchSection}>
                <h3 className={styles.matchSectionTitle}>
                  Active partnerships
                  <span className={styles.matchSectionCount}>
                    {confirmedPartners.length}
                  </span>
                </h3>
                <div className={styles.matchGrid}>
                  {confirmedPartners.map(({ entity, score }) => (
                    <PartnerCard
                      key={entity.id}
                      entity={entity}
                      score={score}
                      mode="confirmed"
                      onUnmatch={() => handleUnmatch(entity)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Ranked suggestions */}
            <div className={styles.matchSection}>
              <div className={styles.matchSectionHeader}>
                <h3 className={styles.matchSectionTitle}>
                  Suggested matches
                  <span className={styles.matchSectionCount}>
                    {suggestions.length}
                  </span>
                </h3>
                <div className={styles.matchSectionFilters}>
                  <FilterChipGroup
                    label="Tier"
                    value={tierFilter}
                    options={[
                      { id: "all", label: "All" },
                      { id: "strong", label: "Strong" },
                      { id: "fair", label: "Fair" },
                      { id: "weak", label: "Weak" },
                    ]}
                    onChange={(v) => setTierFilter(v as typeof tierFilter)}
                  />
                  <label className={styles.toggleLabel}>
                    <input
                      type="checkbox"
                      checked={showRejected}
                      onChange={(e) => setShowRejected(e.target.checked)}
                    />
                    Include passed
                  </label>
                </div>
              </div>
              {suggestions.length === 0 ? (
                <EmptyState
                  title="No suggestions left"
                  message="Every opposite-kind entity has been matched or rejected for this anchor."
                />
              ) : (
                <div className={styles.matchGrid}>
                  {suggestions.map(({ entity, score }, i) => (
                    <PartnerCard
                      key={entity.id}
                      entity={entity}
                      score={score}
                      mode="suggested"
                      rank={i + 1}
                      isMatchOfTheDay={isMatchOfTheDay(entity.id)}
                      onConfirm={() => handleConfirm(entity)}
                      onReject={() => handleReject(entity)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>
      </div>
    </div>
  );
}

/* =====================================================================
 * PartnerCard — one suggestion / partner. Shows a resonance ring + a
 * couple of action buttons. The ring is an SVG conic — we draw it as a
 * stroked circle with stroke-dasharray pinned to the score percent so
 * it animates smoothly when the percentage changes.
 * ===================================================================== */

type PartnerCardProps = {
  entity: MarketplaceEntity;
  score: number;
  mode: "suggested" | "confirmed";
  rank?: number;
  isMatchOfTheDay?: boolean;
  onConfirm?: () => void;
  onReject?: () => void;
  onUnmatch?: () => void;
};

function PartnerCard({
  entity,
  score,
  mode,
  rank,
  isMatchOfTheDay,
  onConfirm,
  onReject,
  onUnmatch,
}: PartnerCardProps) {
  const tier = tierFor(score);
  const tierLabel =
    tier === "strong"
      ? "Strong resonance"
      : tier === "fair"
        ? "Fair resonance"
        : "Weak resonance";

  return (
    <article
      className={`${styles.partnerCard} ${styles[`partnerCard_${tier}`]} ${isMatchOfTheDay ? styles.partnerCard_motd : ""}`}
      data-mode={mode}
    >
      {isMatchOfTheDay ? (
        <span className={styles.motdRibbon}>★ Match of the day</span>
      ) : null}
      {rank ? <span className={styles.rankPill}>#{rank}</span> : null}

      <div className={styles.partnerHead}>
        <ResonanceRing score={score} tier={tier} />
        <div className={styles.partnerInfo}>
          <div className={styles.partnerNameRow}>
            <h4 className={styles.partnerName}>{entity.name}</h4>
            <span className={styles.mockPill}>MOCK</span>
          </div>
          <div className={styles.partnerRq}>
            <span className={styles.rqCode}>{entity.rq_code}</span>
            <span className={styles.rqName}>{entity.rq_name}</span>
          </div>
          <p className={styles.partnerBlurb}>{entity.blurb}</p>
        </div>
      </div>

      <div className={styles.partnerTags}>
        {entity.tags.slice(0, 3).map((t) => (
          <span key={t} className={styles.tagChip}>
            {t}
          </span>
        ))}
      </div>

      <div className={styles.partnerActions}>
        <span className={styles.tierLabel}>{tierLabel}</span>
        <div className={styles.partnerActionButtons}>
          {mode === "suggested" ? (
            <>
              <Button variant="ghost" size="sm" onClick={onReject}>
                Pass
              </Button>
              <Button variant="primary" size="sm" onClick={onConfirm}>
                {tier === "weak" ? "Match anyway" : "Match"}
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={onUnmatch}>
              Unmatch
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Resonance ring — a circular gauge whose filled arc is proportional to
 * the score (0–100). Stroke colour ties to the resonance tier so the
 * ring reads as strong/fair/weak even before the score number is read.
 */
function ResonanceRing({
  score,
  tier,
}: {
  score: number;
  tier: ReturnType<typeof tierFor>;
}) {
  const r = 26;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);
  return (
    <div
      className={styles.resonanceRing}
      data-tier={tier}
      role="meter"
      aria-valuenow={score}
      aria-valuemin={RESONANCE_TIERS.fair === 60 ? 0 : 0}
      aria-valuemax={100}
      aria-label={`Resonance ${score}%`}
    >
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle
          cx="32"
          cy="32"
          r={r}
          className={styles.resonanceTrack}
          fill="none"
          strokeWidth="5"
        />
        <circle
          cx="32"
          cy="32"
          r={r}
          className={styles.resonanceFill}
          fill="none"
          strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 32 32)"
        />
      </svg>
      <span className={styles.resonanceValue}>{score}</span>
    </div>
  );
}

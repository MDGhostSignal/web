"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { CHARACTERS } from "@/lib/xq/characters";
import { ARCHETYPES, type ArchetypeCode } from "@/lib/xq/constants";
import type { StudioRqSummary, StudioXqSummary } from "@/lib/studio-data";

import styles from "../studio.module.css";

/** Serializable card data the server page hands the browser. */
export type RosterBrandCard = {
  id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  sinceYear: number | null;
  archetype: string | null;
  matchScore: number | null;
  recommended: boolean;
};

/**
 * Brand roster browser — a grid of welcome-card business cards.
 * Clicking a card opens a pop-up with the brand's full story: the
 * complete description, website, archetype read, values fit, the
 * contact's XQ/RQ summaries (fetched on demand), and a "Request an
 * intro" action that files a GS-brokered contact request.
 */
export function BrandCardBrowser({ brands }: { brands: RosterBrandCard[] }) {
  const [selected, setSelected] = useState<RosterBrandCard | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visible = brands.slice(0, visibleCount);
  const hiddenCount = brands.length - visible.length;

  return (
    <>
      <div className={styles.wcGrid}>
        {visible.map((b) => (
          <RosterCardFace
            key={b.id}
            brand={b}
            active={selected?.id === b.id}
            onSelect={() => setSelected(b)}
          />
        ))}
      </div>
      {hiddenCount > 0 && (
        <button
          type="button"
          className={styles.wcShowMore}
          onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
        >
          Show {Math.min(hiddenCount, PAGE_SIZE)} more of {hiddenCount}
        </button>
      )}
      {selected && (
        // Keyed by brand so switching cards remounts the modal with a
        // fresh loading state instead of resetting it in an effect.
        <BrandModal
          key={selected.id}
          brand={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

/** Cards revealed initially / added per "Show more" click. */
const PAGE_SIZE = 8;

/** The card face itself. With `onSelect` it renders as the roster's
 *  interactive button; without, as a static preview element (used on
 *  /studio/profile so members see their own card as the network
 *  does). */
export function RosterCardFace({
  brand,
  active = false,
  onSelect,
}: {
  brand: RosterBrandCard;
  active?: boolean;
  onSelect?: () => void;
}) {
  const face = (
    <>
      {brand.logoUrl ? (
        <Image
          src={brand.logoUrl}
          alt=""
          width={72}
          height={72}
          className={styles.wcLogo}
          unoptimized
        />
      ) : (
        <span className={styles.wcLogoEmpty} aria-hidden="true">
          {brand.name.trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}

      {brand.recommended && <span className={styles.wcPick}>✦ GS Pick</span>}

      <span className={styles.wcText}>
        <span className={styles.wcName}>{brand.name}</span>
        {brand.sinceYear !== null && (
          <span className={styles.wcSince}>Member Since {brand.sinceYear}</span>
        )}
        {brand.tagline && (
          <span className={styles.wcTagline}>{brand.tagline}</span>
        )}
      </span>
    </>
  );

  const className = `${styles.wcCard} ${styles.rosterCard} ${active ? styles.wcCardActive : ""}`;

  if (!onSelect) {
    return <div className={className}>{face}</div>;
  }
  return (
    <button
      type="button"
      className={className}
      onClick={onSelect}
      aria-haspopup="dialog"
      aria-label={`${brand.name} — show details`}
    >
      {face}
    </button>
  );
}

/* ============================================================
 * Pop-up
 * ============================================================ */

type QuizData =
  | "loading"
  | "error"
  | { xq: StudioXqSummary | null; rq: StudioRqSummary | null };

type RequestState =
  | { state: "idle" | "sending" | "sent" }
  | { state: "failed"; error: string };

function BrandModal({
  brand,
  onClose,
}: {
  brand: RosterBrandCard;
  onClose: () => void;
}) {
  const [quiz, setQuiz] = useState<QuizData>("loading");
  const [request, setRequest] = useState<RequestState>({ state: "idle" });

  // Assessment summaries load on open — the static card data is
  // already here; only the contact's XQ/RQ come from the API.
  useEffect(() => {
    let alive = true;
    fetch(`/api/studio/roster/brands/${brand.id}`)
      .then((r) => r.json())
      .then((j: { ok?: boolean; xq?: StudioXqSummary | null; rq?: StudioRqSummary | null }) => {
        if (!alive) return;
        setQuiz(j?.ok ? { xq: j.xq ?? null, rq: j.rq ?? null } : "error");
      })
      .catch(() => {
        if (alive) setQuiz("error");
      });
    return () => {
      alive = false;
    };
  }, [brand.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function requestIntro() {
    setRequest({ state: "sending" });
    try {
      const res = await fetch("/api/studio/contact-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandId: brand.id }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (res.ok && json?.ok) {
        setRequest({ state: "sent" });
      } else {
        setRequest({
          state: "failed",
          error: json?.error ?? "Couldn't file the request.",
        });
      }
    } catch {
      setRequest({ state: "failed", error: "Couldn't file the request." });
    }
  }

  const code = brand.archetype as ArchetypeCode | null;
  const identity = code ? CHARACTERS[code] : null;
  const archetypeDef = code ? ARCHETYPES[code] : null;

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div
        className={styles.modalDialog}
        role="dialog"
        aria-modal="true"
        aria-label={`${brand.name} details`}
        onClick={(e) => e.stopPropagation()}
        style={
          {
            "--bp-accent": identity?.accent ?? "var(--studio-accent)",
            "--bp-accent-soft":
              identity?.accentSoft ?? "var(--studio-accent-soft)",
          } as React.CSSProperties
        }
      >
        <button
          type="button"
          className={styles.modalClose}
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        <header className={styles.modalHead}>
          {brand.logoUrl ? (
            <Image
              src={brand.logoUrl}
              alt=""
              width={64}
              height={64}
              className={styles.modalLogo}
              unoptimized
            />
          ) : (
            <span className={styles.modalLogoEmpty} aria-hidden="true">
              {brand.name.trim().charAt(0).toUpperCase() || "?"}
            </span>
          )}
          <div>
            <h2 className={styles.wcDetailName}>{brand.name}</h2>
            {brand.tagline && (
              <p className={styles.wcDetailTagline}>{brand.tagline}</p>
            )}
            {brand.sinceYear !== null && (
              <p className={styles.modalSince}>
                Member Since {brand.sinceYear}
              </p>
            )}
          </div>
        </header>

        {brand.recommended && (
          <span className={styles.wcDetailPickNote}>
            ✦ Hand-picked for you by the GhostSignal team
          </span>
        )}

        {brand.description ? (
          <p className={styles.wcDetailAbout}>{brand.description}</p>
        ) : (
          <p className={styles.wcDetailAboutEmpty}>
            This brand hasn&apos;t written their full story yet.
          </p>
        )}

        <div className={styles.wcDetailMeta}>
          {brand.website && (
            <a
              className={styles.wcDetailSite}
              href={brand.website}
              target="_blank"
              rel="noopener noreferrer"
            >
              {brand.website.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗
            </a>
          )}
          <span className={styles.bpArchetype}>
            <i className={styles.bpArchetypeDot} aria-hidden="true" />
            {archetypeDef
              ? `${archetypeDef.name} — ${archetypeDef.tagline}`
              : "Unclassified"}
          </span>
          {brand.matchScore != null && (
            <span
              className={styles.bpFit}
              title={`${brand.matchScore} of 3 XQ axes shared with you`}
            >
              <span className={styles.bpFitLabel}>Values fit</span>
              {[0, 1, 2].map((i) => (
                <i
                  key={i}
                  className={`${styles.bpFitDot} ${i < (brand.matchScore ?? 0) ? styles.bpFitDotOn : ""}`}
                  aria-hidden="true"
                />
              ))}
            </span>
          )}
        </div>

        {/* Conviction profile — the contact's XQ/RQ summaries. */}
        <div className={styles.modalQuizGrid}>
          {quiz === "loading" ? (
            <p className={styles.modalMuted}>Loading conviction profile…</p>
          ) : quiz === "error" ? (
            <p className={styles.modalMuted}>
              Couldn&apos;t load the conviction profile right now.
            </p>
          ) : (
            <>
              {quiz.xq?.code ? (
                <div className={styles.quizTile}>
                  <span className={styles.quizTileEyebrow}>Their XQ</span>
                  <div className={styles.quizTileHead}>
                    <span className={styles.quizChip}>{quiz.xq.code}</span>
                    <span className={styles.quizTileTitle}>
                      {quiz.xq.archetypeName ?? "Classified"}
                    </span>
                  </div>
                  {quiz.xq.tagline && (
                    <p className={styles.quizTileBody}>{quiz.xq.tagline}</p>
                  )}
                  {quiz.xq.values.nonNegotiables.length > 0 && (
                    <div className={styles.quizPills}>
                      {quiz.xq.values.nonNegotiables.slice(0, 3).map((v) => (
                        <span key={v} className={styles.quizPill}>
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className={styles.modalMuted}>XQ not on file yet.</p>
              )}
              {quiz.rq?.code ? (
                <div className={styles.quizTile}>
                  <span className={styles.quizTileEyebrow}>Their RQ</span>
                  <div className={styles.quizTileHead}>
                    <span className={styles.quizChip}>{quiz.rq.code}</span>
                    <span className={styles.quizTileTitle}>
                      {quiz.rq.name ?? "Read"}
                    </span>
                  </div>
                  {quiz.rq.clarityLabel && (
                    <span className={styles.quizClarity}>
                      Signal clarity: {quiz.rq.clarityLabel}
                    </span>
                  )}
                  {quiz.rq.undertone && (
                    <p className={styles.quizTileBody}>
                      Undertone: {quiz.rq.undertone}
                    </p>
                  )}
                </div>
              ) : (
                <p className={styles.modalMuted}>RQ not on file yet.</p>
              )}
            </>
          )}
        </div>

        {/* Interaction — GS-brokered intro request. */}
        <footer className={styles.modalFoot}>
          {request.state === "sent" ? (
            <div className={styles.formSaved}>
              Request sent — the GhostSignal team will broker the intro
              and get back to you.
            </div>
          ) : (
            <>
              <button
                type="button"
                className={styles.quizTileCta}
                onClick={requestIntro}
                disabled={request.state === "sending"}
              >
                {request.state === "sending"
                  ? "Sending…"
                  : "Request an intro"}
              </button>
              <span className={styles.modalMuted}>
                Brokered by the GhostSignal team — no cold outreach.
              </span>
            </>
          )}
          {request.state === "failed" && (
            <div className={styles.error}>{request.error}</div>
          )}
        </footer>
      </div>
    </div>
  );
}

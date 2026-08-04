"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";

import { CHARACTERS } from "@/lib/xq/characters";
import { ARCHETYPES, type ArchetypeCode } from "@/lib/xq/constants";

import { BrandPanel } from "./BrandPanel";
import styles from "./roster-deck.module.css";

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
 * Brand roster deck — a stack of baseball-style trading cards you
 * flick through. Pattern follows Motion.dev's card-stack example
 * (https://motion.dev/tutorials/react-card-stack): every card stays
 * mounted and the "order" is an index; depth in the stack is drawn
 * with transform / opacity / zIndex alone, so cycling never remounts
 * anything. Drag the top card sideways past the distance or velocity
 * threshold and it flies off, then tucks under the bottom of the pile.
 *
 * Tap / "Full story" opens the detail panel docked to the right of
 * the deck (complete description, XQ/RQ read, "Request an intro").
 * The panel tracks the top card, so flicking with it open re-points
 * it at the newly featured brand. ← / → arrow keys navigate too.
 */
export function BrandDeck({ brands }: { brands: RosterBrandCard[] }) {
  const [top, setTop] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const n = brands.length;

  const step = (delta: number) => setTop((t) => (t + delta + n) % n);

  // ← / → flip through the deck from anywhere on the page, as long as
  // focus isn't inside a form control.
  useEffect(() => {
    if (n < 2) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))
      ) {
        return;
      }
      e.preventDefault();
      setTop((prev) => (prev + (e.key === "ArrowLeft" ? -1 : 1) + n) % n);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [n]);

  const featured = brands[top];

  return (
    <div className={styles.rosterRow}>
      <div className={styles.deckBlock}>
      <div
        className={styles.stage}
        role="group"
        aria-roledescription="card deck"
        aria-label={`Brand roster, card ${top + 1} of ${n}`}
      >
        {brands.map((brand, i) => {
          const depth = (i - top + n) % n;
          return (
            <DeckCard
              key={brand.id}
              brand={brand}
              depth={depth}
              deckSize={n}
              onFlick={() => step(1)}
              onOpen={() => setPanelOpen(true)}
            />
          );
        })}
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.arrow}
          onClick={() => step(-1)}
          disabled={n < 2}
          aria-label="Previous card"
        >
          ‹
        </button>
        <span className={styles.counter} aria-hidden="true">
          {top + 1} <em>of</em> {n}
        </span>
        <button
          type="button"
          className={styles.arrow}
          onClick={() => step(1)}
          disabled={n < 2}
          aria-label="Next card"
        >
          ›
        </button>
        <button
          type="button"
          className={styles.openBtn}
          onClick={() => setPanelOpen((open) => !open)}
          aria-expanded={panelOpen}
        >
          {panelOpen ? "Hide story" : "Full story"}
        </button>
      </div>
      {n > 1 && (
        <p className={styles.hint}>
          <kbd className={styles.key}>←</kbd>
          <kbd className={styles.key}>→</kbd>
          <span>Arrow keys browse the deck — or flick the card.</span>
        </p>
      )}
      </div>

      {panelOpen && (
        // Keyed by brand so navigating remounts the panel with a fresh
        // loading state instead of resetting it in an effect.
        <BrandPanel
          key={featured.id}
          brand={featured}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  );
}

/** Depths that render as the visible pile; deeper cards hide beneath. */
const VISIBLE = 3;
/** Flick thresholds — either travelled far enough or thrown hard enough. */
const FLICK_OFFSET = 110;
const FLICK_VELOCITY = 520;

function DeckCard({
  brand,
  depth,
  deckSize,
  onFlick,
  onOpen,
}: {
  brand: RosterBrandCard;
  depth: number;
  deckSize: number;
  onFlick: () => void;
  onOpen: () => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-280, 280], [-11, 11]);
  const isTop = depth === 0;
  const shown = Math.min(depth, VISIBLE);

  return (
    <motion.article
      className={styles.card}
      style={{ x, rotate, zIndex: deckSize - depth }}
      animate={{
        y: shown * -11,
        scale: 1 - shown * 0.05,
        opacity: depth < VISIBLE ? 1 : 0,
      }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      drag={isTop && deckSize > 1 ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={(_, info) => {
        const travel = info.offset.x;
        if (
          Math.abs(travel) < FLICK_OFFSET &&
          Math.abs(info.velocity.x) < FLICK_VELOCITY
        ) {
          return; // not a flick — spring home via dragConstraints
        }
        const dir = (travel || info.velocity.x) < 0 ? -1 : 1;
        // Fly off first, advance the pile, then quietly re-center the
        // motion value while this card is hidden at the bottom.
        void animate(x, dir * 640, {
          duration: 0.28,
          ease: [0.32, 0.72, 0, 1],
        }).then(() => {
          onFlick();
          x.set(0);
        });
      }}
      onTap={isTop ? onOpen : undefined}
      aria-hidden={!isTop}
    >
      <BrandCardFace brand={brand} />
    </motion.article>
  );
}

/**
 * The baseball-card face. Exported standalone (non-draggable) so
 * /studio/profile can preview a member's own card exactly as the
 * roster deck renders it. The contact's XQ archetype supplies the
 * "team colors" — frame line, logo disc, and stat footer accents.
 */
export function BrandCardFace({
  brand,
  standalone = false,
}: {
  brand: RosterBrandCard;
  standalone?: boolean;
}) {
  const code = brand.archetype as ArchetypeCode | null;
  const identity = code ? CHARACTERS[code] : null;
  const archetypeDef = code ? ARCHETYPES[code] : null;
  const initial = brand.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className={`${styles.face} ${standalone ? styles.faceStandalone : ""}`}
      style={
        {
          "--card-accent": identity?.accent ?? "var(--studio-accent)",
          "--card-accent-soft":
            identity?.accentSoft ?? "var(--studio-accent-soft)",
        } as React.CSSProperties
      }
    >
      <header className={styles.faceTop}>
        <span className={styles.faceLeague}>GHOSTSignal Roster</span>
        {brand.recommended && (
          <span className={styles.facePick}>✦ GS Pick</span>
        )}
      </header>

      <div className={styles.faceHero}>
        <span className={styles.faceDisc} aria-hidden="true">
          {brand.logoUrl ? (
            <Image
              src={brand.logoUrl}
              alt=""
              width={88}
              height={88}
              className={styles.faceLogo}
              unoptimized
            />
          ) : (
            <span className={styles.faceInitial}>{initial}</span>
          )}
        </span>
        <h3 className={styles.faceName}>{brand.name}</h3>
        {brand.sinceYear !== null && (
          <span className={styles.faceSince}>
            Member since {brand.sinceYear}
          </span>
        )}
        {brand.tagline && <p className={styles.faceTagline}>{brand.tagline}</p>}
      </div>

      <footer className={styles.faceStats}>
        <span className={styles.faceStat}>
          <span className={styles.faceStatLabel}>Archetype</span>
          <span className={styles.faceStatValue}>
            {archetypeDef?.name ?? "Unclassified"}
          </span>
        </span>
        {brand.matchScore != null && (
          <span className={styles.faceStat}>
            <span className={styles.faceStatLabel}>Values fit</span>
            <span
              className={styles.faceFit}
              title={`${brand.matchScore} of 3 XQ axes shared with you`}
            >
              {[0, 1, 2].map((i) => (
                <i
                  key={i}
                  className={`${styles.faceFitDot} ${
                    i < (brand.matchScore ?? 0) ? styles.faceFitDotOn : ""
                  }`}
                  aria-hidden="true"
                />
              ))}
            </span>
          </span>
        )}
      </footer>
    </div>
  );
}

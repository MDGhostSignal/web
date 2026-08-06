"use client";

import { useCallback, useEffect, useState } from "react";

import { ARCHETYPES, type ArchetypeCode } from "@/lib/xq/constants";

import styles from "./page.module.css";

/**
 * Five-card client carousel for /invitation ("Who we work with").
 *
 * Layout: the center card sits on top; one layer below, a card on each
 * side; another layer below that, one more card on each side — five
 * visible, the rest tucked behind the center. Arrow buttons flank the
 * deck and the ← / → keys rotate it (a visible hint says so).
 *
 * MOCK ROSTER — same fictional clients as the email's card-fan GIF
 * (scratchpad gen-assets script), plus two more so all eight XQ
 * archetypes appear once. Swap for real members when they exist.
 */

type Client = {
  kind: "brand" | "creator";
  name: string;
  blurb: string;
  /** XQ archetype code — display name/tagline come from ARCHETYPES. */
  xqCode: ArchetypeCode;
  /** Longer profile paragraph for the popup. */
  about: string;
  /** Short mock RQ resonance read for the popup. */
  rq: string;
};

const ROSTER: Client[] = [
  { kind: "brand", name: "Meridian Coffee", blurb: "Small-batch roaster building mornings people look forward to.", xqCode: "C-P-C", about: "A roastery that treats coffee as a daily ritual worth protecting — small lots, named farms, and a subscription that reads more like a friendship than a funnel.", rq: "High resonance with craft-first, morning-ritual audiences. Strongest reads on the network: The Field Guide, The Quiet Hours." },
  { kind: "creator", name: "The Field Guide", blurb: "Weekly conversations about the outdoors and the people who live in it.", xqCode: "C-P-L", about: "A weekly show where rangers, farmers, and trail builders talk about the land they keep. Loyal audience, long episodes, zero hot takes.", rq: "Audience leans considered-outdoors; resonates with durable-goods brands that value stewardship over hype." },
  { kind: "brand", name: "Northlight Gear", blurb: "Trail-ready equipment designed to outlast the trend cycle.", xqCode: "C-S-C", about: "Packs and shelters engineered to be repaired, not replaced — with a lifetime service bench and a catalogue that changes slowly on purpose.", rq: "Resonates with slow-adventure listeners; aligned shows index high on trust and repair-not-replace values." },
  { kind: "creator", name: "Static & Stone", blurb: "True stories from small towns, told one road trip at a time.", xqCode: "X-P-C", about: "Two producers, one van, and the kind of small-town stories national desks drive past. Intimate, handmade documentary work.", rq: "Small-town storytelling audience; best fits brands with roots, provenance, and a point of view." },
  { kind: "brand", name: "Harbor & Pine", blurb: "Home goods for people who notice the details.", xqCode: "X-S-C", about: "A home-goods studio that redesigns the overlooked — brooms, hooks, kettles — with the precision usually saved for furniture.", rq: "Design-literate households; resonates with shows where taste and intention drive the conversation." },
  { kind: "creator", name: "The Quiet Hours", blurb: "A late-night show about creativity, doubt, and getting the work done.", xqCode: "X-P-L", about: "Late-night conversations with people mid-project — the doubt, the drafts, the discipline. A companion for anyone working after everyone else went to bed.", rq: "Night-owl creative audience; resonates with tools-of-the-trade brands and slow-productivity thinking." },
  { kind: "brand", name: "Juniper Supply Co.", blurb: "Everyday carry built to be handed down, not thrown out.", xqCode: "C-S-L", about: "Knives, notebooks, and bags built on a buy-it-once philosophy — with a repair program older than most of its competitors.", rq: "Legacy-minded buyers; resonates with generational-story shows and buy-it-once communities." },
  { kind: "creator", name: "Long Way Home", blurb: "Documentary storytelling about the places that shape us.", xqCode: "X-S-L", about: "A documentary series about places and the systems that shape them — one season, one town, every thread pulled.", rq: "Documentary listeners with high place-attachment; fits travel, heritage, and craft-minded brands." },
];

/** First sentence of a multi-sentence description — keeps the popup's
 *  XQ summary short. */
function firstSentence(text: string): string {
  const i = text.indexOf(". ");
  return i === -1 ? text : text.slice(0, i + 1);
}

const KIND_LABEL: Record<Client["kind"], string> = {
  brand: "Brand",
  creator: "Creator",
};

/** Signed shortest rotation distance from front to card i. */
function offsetOf(i: number, front: number, count: number): number {
  let d = (i - front) % count;
  if (d < -count / 2) d += count;
  if (d > count / 2) d -= count;
  return d;
}

const POSITION_CLASS: Record<number, string> = {
  [-2]: "posLeft2",
  [-1]: "posLeft1",
  [0]: "posCenter",
  [1]: "posRight1",
  [2]: "posRight2",
};

export function RosterCarousel() {
  const [front, setFront] = useState(0);
  // Popup state — `selected` keeps the modal mounted through the
  // close animation; `closing` drives the exit keyframes and the
  // overlay's animationend unmounts it.
  const [selected, setSelected] = useState<Client | null>(null);
  const [closing, setClosing] = useState(false);
  const count = ROSTER.length;

  const advance = useCallback(
    (dir: 1 | -1) => setFront((f) => (f + dir + count) % count),
    [count],
  );

  const closeModal = useCallback(() => setClosing(true), []);

  // ← / → rotate the deck from anywhere on the page (except while
  // typing in a form field); Escape closes the profile popup.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selected) {
        closeModal();
        return;
      }
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (selected) return; // don't rotate behind the popup
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      advance(e.key === "ArrowRight" ? 1 : -1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [advance, selected, closeModal]);

  // Lock page scroll while the profile popup is open.
  useEffect(() => {
    if (!selected) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [selected]);

  return (
    <div className={styles.carousel}>
      <div className={styles.carouselRow}>
        <button
          type="button"
          className={styles.carouselArrow}
          onClick={() => advance(-1)}
          aria-label="Rotate roster left"
        >
          &larr;
        </button>

        <div className={styles.deck} role="group" aria-label="Client roster">
          {ROSTER.map((client, i) => {
            const offset = offsetOf(i, front, count);
            const posClass =
              Math.abs(offset) <= 2
                ? styles[POSITION_CLASS[offset]]
                : styles.posHidden;
            const toneClass =
              client.kind === "brand" ? styles.brandTone : styles.creatorTone;
            return (
              <button
                key={client.name}
                type="button"
                className={`${styles.rosterCard} ${toneClass} ${posClass}`}
                aria-hidden={offset !== 0}
                tabIndex={offset === 0 ? 0 : -1}
                aria-label={
                  offset === 0
                    ? `${client.name} — open full profile`
                    : undefined
                }
                onClick={() => {
                  if (offset === 0) {
                    setSelected(client);
                    setClosing(false);
                  } else {
                    advance(offset > 0 ? 1 : -1);
                  }
                }}
              >
                <span className={styles.cardMorse} aria-hidden="true" />
                <span className={styles.cardHead}>
                  <span className={styles.cardDisc} aria-hidden="true">
                    {client.name.charAt(0)}
                  </span>
                  <span className={styles.cardChip}>
                    {KIND_LABEL[client.kind]}
                  </span>
                </span>
                <span className={styles.cardName}>{client.name}</span>
                <span className={styles.cardBlurb}>{client.blurb}</span>
                <span className={styles.cardFootnote}>
                  XQ &middot; {ARCHETYPES[client.xqCode].name}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className={styles.carouselArrow}
          onClick={() => advance(1)}
          aria-label="Rotate roster right"
        >
          &rarr;
        </button>
      </div>

      <div className={styles.carouselRail}>
        <div className={styles.legend}>
          <span className={`${styles.legendChip} ${styles.brandTone}`}>
            <span className={styles.legendDot} aria-hidden="true" />
            Brands
          </span>
          <span className={`${styles.legendChip} ${styles.creatorTone}`}>
            <span className={styles.legendDot} aria-hidden="true" />
            Creators
          </span>
        </div>
        <p className={styles.keyHint} aria-live="polite">
          <span className={styles.counter}>
            {front + 1} / {count}
          </span>
          &nbsp;&mdash; tip: flip through with your <kbd>&larr;</kbd>{" "}
          <kbd>&rarr;</kbd> arrow keys, click the front card for the
          full profile
        </p>
      </div>

      {/* Profile popup — kept mounted while `closing` plays the exit
          animation; the overlay's own animationend unmounts it. */}
      {selected && (
        <div
          className={`${styles.profileOverlay} ${closing ? styles.profileClosing : ""}`}
          onClick={closeModal}
          onAnimationEnd={(e) => {
            if (closing && e.target === e.currentTarget) {
              setSelected(null);
              setClosing(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${selected.name} profile`}
            className={`${styles.profileCard} ${
              selected.kind === "brand"
                ? styles.brandTone
                : styles.creatorTone
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.profileClose}
              onClick={closeModal}
              aria-label="Close profile"
              autoFocus
            >
              &times;
            </button>
            <span className={styles.cardMorse} aria-hidden="true" />
            <div className={styles.profileHead}>
              <span className={styles.cardDisc} aria-hidden="true">
                {selected.name.charAt(0)}
              </span>
              <span className={styles.cardChip}>
                {KIND_LABEL[selected.kind]}
              </span>
            </div>
            <h3 className={styles.profileName}>{selected.name}</h3>
            <p className={styles.profileBlurb}>{selected.blurb}</p>
            <p className={styles.profileAbout}>{selected.about}</p>
            <div className={styles.profileQuotients}>
              <div className={styles.profileQuotient}>
                <p className={`${styles.profileQuotientLabel} ${styles.profileQuotientXq}`}>
                  XQ &middot; {ARCHETYPES[selected.xqCode].name}
                </p>
                <p className={styles.profileQuotientText}>
                  <em>{ARCHETYPES[selected.xqCode].tagline}</em>{" "}
                  {firstSentence(ARCHETYPES[selected.xqCode].desc)}
                </p>
              </div>
              <div className={styles.profileQuotient}>
                <p className={`${styles.profileQuotientLabel} ${styles.profileQuotientRq}`}>
                  RQ &middot; Resonance read
                </p>
                <p className={styles.profileQuotientText}>{selected.rq}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

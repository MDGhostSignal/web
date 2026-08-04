"use client";

import Image from "next/image";
import { useState } from "react";

import styles from "./ClientPortfolio.module.css";

/** Serializable card shape passed down from the server landing. */
export type PortfolioCard = {
  id: string;
  kind: "brand" | "creator";
  name: string;
  blurb: string | null;
  imageUrl: string | null;
};

const KIND_LABEL: Record<PortfolioCard["kind"], string> = {
  brand: "Brand",
  creator: "Creator",
};

/**
 * Client-portfolio deck — the public showcase of every brand and
 * creator on the network. One stacked deck, click-through: the front
 * card cycles to the back. Cards are color-coded by side (brand vs
 * creator) via the tone classes, which set the --pk-* custom props
 * consumed by the card chrome.
 */
export function ClientPortfolio({ cards }: { cards: PortfolioCard[] }) {
  const [front, setFront] = useState(0);
  const count = cards.length;

  if (count === 0) return null;

  const advance = (dir: 1 | -1) =>
    setFront((i) => (i + dir + count) % count);

  return (
    <div className={styles.portfolio}>
      <div className={styles.deck}>
        {cards.map((card, i) => {
          const depth = (i - front + count) % count;
          const depthClass =
            depth === 0
              ? styles.depth0
              : depth === 1
                ? styles.depth1
                : depth === 2
                  ? styles.depth2
                  : styles.buried;
          const toneClass =
            card.kind === "brand" ? styles.brandTone : styles.creatorTone;
          return (
            <button
              key={card.id}
              type="button"
              className={`${styles.card} ${toneClass} ${depthClass}`}
              style={{ zIndex: count - depth }}
              tabIndex={depth === 0 ? 0 : -1}
              aria-hidden={depth !== 0}
              aria-label={`${card.name} — ${KIND_LABEL[card.kind]}. Show next client.`}
              onClick={() => advance(1)}
            >
              <span className={styles.cardMorse} aria-hidden="true" />
              <span className={styles.cardHead}>
                <span className={styles.cardDisc} aria-hidden="true">
                  {card.imageUrl ? (
                    <Image
                      src={card.imageUrl}
                      alt=""
                      width={58}
                      height={58}
                      className={styles.cardLogo}
                      unoptimized
                    />
                  ) : (
                    <span className={styles.cardInitial}>
                      {card.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className={styles.kindChip}>{KIND_LABEL[card.kind]}</span>
              </span>
              <span className={styles.cardName}>{card.name}</span>
              {card.blurb && <span className={styles.cardBlurb}>{card.blurb}</span>}
              <span className={styles.cardFootnote}>GhostSignal client</span>
            </button>
          );
        })}
      </div>

      <div className={styles.rail}>
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
        <p className={styles.railHint}>
          Every client on the network, one card at a time. Each card is
          labeled and color-coded by side &mdash; click the deck to flip
          through the roster.
        </p>
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.controlBtn}
            onClick={() => advance(-1)}
            aria-label="Previous client"
          >
            &larr;
          </button>
          <button
            type="button"
            className={styles.controlBtn}
            onClick={() => advance(1)}
            aria-label="Next client"
          >
            &rarr;
          </button>
          <span className={styles.counter} aria-live="polite">
            {front + 1} / {count}
          </span>
        </div>
      </div>
    </div>
  );
}

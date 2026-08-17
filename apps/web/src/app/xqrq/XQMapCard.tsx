"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

import { XQSpectrumMap } from "@/components/xq/XQSpectrumMap";
import { XQCharacterMark } from "@/components/xq/XQCharacterMark";
import { ARCHETYPES, type ArchetypeCode } from "@/lib/xq/constants";

// Reuse the RQ explorer's tooltip classes verbatim so the two hover
// tiles are visually identical (same card, sizes, colours).
import tip from "./rq-explorer.module.css";
import card from "./xq-map-card.module.css";

/**
 * XQMapCard — the XQ spectrum map on /xqrq with its in-SVG tooltip
 * suppressed (`hideTooltip`) and replaced by a floating, portalled
 * tooltip that shares the RQ explorer's `.tip*` styles. That keeps the
 * XQ and RQ hover tiles the same size and style; the shared component
 * stays untouched everywhere else.
 */

function firstSentence(text: string): string {
  const i = text.indexOf(". ");
  return i === -1 ? text : text.slice(0, i + 1);
}

type Tip = {
  code: ArchetypeCode;
  x: number;
  y: number;
  flipX: boolean;
  flipY: boolean;
};

function flip(x: number, y: number) {
  return { flipX: x > window.innerWidth - 360, flipY: y > window.innerHeight - 300 };
}

export function XQMapCard() {
  const [hover, setHover] = useState<Tip | null>(null);

  return (
    <>
      <XQSpectrumMap
        hideTooltip
        onHover={(code, x, y) =>
          setHover(code ? { code, x, y, ...flip(x, y) } : null)
        }
      />

      {hover &&
        createPortal(
          (() => {
            const arc = ARCHETYPES[hover.code];
            return (
              <div
                className={tip.tip}
                role="tooltip"
                style={{
                  left: hover.x,
                  top: hover.y,
                  transform: `translate(${hover.flipX ? "calc(-100% - 16px)" : "16px"}, ${hover.flipY ? "calc(-100% - 16px)" : "16px"})`,
                }}
              >
                <div className={card.icon} aria-hidden="true">
                  <XQCharacterMark code={hover.code} title={arc.name} />
                </div>
                <p className={tip.tipCode}>{hover.code}</p>
                <h3 className={tip.tipName}>{arc.name}</h3>
                <p className={tip.tipSummary}>
                  <em>{arc.tagline}</em> {firstSentence(arc.desc)}
                </p>
              </div>
            );
          })(),
          document.body,
        )}
    </>
  );
}

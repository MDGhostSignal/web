"use client";

import { useEffect } from "react";

import styles from "./CharacterCard.module.css";

/** Short-form archetype meanings — surfaces inside the character
 *  card so a glance reveals the player's posture without re-running
 *  the full XQ/RQ output. Two lines each: one definitional, one
 *  operational. Placeholder copy at MVP; tighten once the per-
 *  archetype Values Blueprint text lands. */
const ARCHETYPE_SUMMARY: Record<
  string,
  { name: string; xq: string; rq: string; accent: number; shape: string }
> = {
  "C-P-C": {
    name: "Steward",
    shape: "circle",
    accent: 0xfbad25,
    xq: "Continuity, person-first, craft-led. Carries the institution's lived memory and protects it from drift.",
    rq: "Best paired with brands that value heritage, evergreen craft, and slow trust over rapid scale.",
  },
  "C-P-L": {
    name: "Shepherd",
    shape: "oval",
    accent: 0xff7bad,
    xq: "Continuity, person-first, leverage-led. Grows the audience without sacrificing the personal bond.",
    rq: "Aligns with brands building durable community franchises — recurring, relational, never transactional.",
  },
  "C-S-C": {
    name: "Conservator",
    shape: "square",
    accent: 0xd66157,
    xq: "Continuity, system-first, craft-led. Stewards processes, archives, standards — the load-bearing infra.",
    rq: "Matches B2B tooling, archival platforms, and standards-driven brands where rigor is the headline.",
  },
  "C-S-L": {
    name: "Institution Builder",
    shape: "round-rect",
    accent: 0x00b29c,
    xq: "Continuity, system-first, leverage-led. Builds the rails others ride on; thinks in decades.",
    rq: "Pairs with category-defining brands and infrastructure plays where reputation compounds slowly.",
  },
  "X-P-C": {
    name: "Artisan",
    shape: "diamond",
    accent: 0x9f71af,
    xq: "Change, person-first, craft-led. Reinvents through hands-on practice; aesthetic + voice are the asset.",
    rq: "Matches with brands prizing taste, signature voice, and product-as-art collaborations.",
  },
  "X-P-L": {
    name: "Catalyst",
    shape: "triangle",
    accent: 0xfa7b3f,
    xq: "Change, person-first, leverage-led. Mobilizes audiences fast; momentum is the medium.",
    rq: "Pairs with launch-focused brands and challenger campaigns that need cultural velocity.",
  },
  "X-S-C": {
    name: "Designer",
    shape: "hexagon",
    accent: 0x4dc9ae,
    xq: "Change, system-first, craft-led. Redesigns the system itself; rigor + invention coexist.",
    rq: "Aligns with brands rebuilding categories — fintech, climate, healthcare — where craft signals trust.",
  },
  "X-S-L": {
    name: "Architect",
    shape: "pentagon",
    accent: 0x7c58d6,
    xq: "Change, system-first, leverage-led. Designs platforms that change defaults at scale.",
    rq: "Matches platform-tier brands and infrastructure plays where the win condition is structural.",
  },
};

/** Real RQ/XQ summary returned by /api/studio/players/[authUserId]/summary.
 *  Mirrors the PlayerSummary shape from that route. When present on
 *  CharacterCardData the card surfaces the player's actual values
 *  blueprint + match profile instead of the generic per-archetype copy. */
export type PlayerRichSummary = {
  organization: string | null;
  memberType: "brand" | "creator" | "other";
  xq: {
    code: string | null;
    archetypeName: string | null;
    tagline: string | null;
    values: {
      nonNegotiables: string[];
      core: string[];
      aspirational: string[];
    };
  } | null;
  rq: {
    code: string | null;
    name: string | null;
    clarityLabel: string | null;
    clarityNote: string | null;
    undertone: string | null;
  } | null;
};

export type CharacterCardData = {
  displayName: string;
  archetype: string;
  /** When true, the player is viewing their own card via the inventory
   *  toggle. When false, they're viewing another player they walked up
   *  to and the card surfaces a "send DM" action + match read. */
  isSelf: boolean;
  /** Local player's own archetype. Used to render the "how we match"
   *  section when viewing someone else's card. Optional; the section
   *  is hidden if absent. */
  selfArchetype?: string;
  /** Real RQ/XQ data fetched for authenticated players. When null the
   *  card falls back to the generic per-archetype copy below. Set to
   *  "loading" while the fetch is in flight so we can show a spinner
   *  instead of a flash of generic copy. */
  rich?: PlayerRichSummary | "loading" | null;
};

/** A short compatibility paragraph derived from the three XQ axes
 *  shared by the two players. Each archetype code is C/X · P/S · C/L,
 *  e.g. "X-S-L". Axis matches build trust ("shared X — same posture
 *  toward change") and axis differences highlight the gap each player
 *  fills for the other. Stitched into 2-3 plain sentences. */
function matchRead(a: string, b: string): string {
  if (!a || !b) return "";
  const [a1, a2, a3] = a.split("-");
  const [b1, b2, b3] = b.split("-");
  const sharedAxes = (a1 === b1 ? 1 : 0) + (a2 === b2 ? 1 : 0) + (a3 === b3 ? 1 : 0);

  const lines: string[] = [];

  // Strength of alignment headline.
  if (sharedAxes === 3) {
    lines.push("Mirror match — identical posture across all three axes. Easy default trust; watch for blind spots you both share.");
  } else if (sharedAxes === 2) {
    lines.push("Strong alignment — two of three axes match. Quick rapport with one productive friction point.");
  } else if (sharedAxes === 1) {
    lines.push("Complementary pair — different on two axes, aligned on one. The shared dimension is the bridge.");
  } else {
    lines.push("Wide pairing — different across all three axes. Trust takes longer but the combination can produce things neither builds alone.");
  }

  // Per-axis call-outs.
  const axisCallout: string[] = [];
  if (a1 !== b1) {
    axisCallout.push(
      a1 === "C"
        ? "you steward continuity, they push change"
        : "you push change, they steward continuity",
    );
  }
  if (a2 !== b2) {
    axisCallout.push(
      a2 === "P"
        ? "you lead with people, they lead with systems"
        : "you lead with systems, they lead with people",
    );
  }
  if (a3 !== b3) {
    axisCallout.push(
      a3 === "C"
        ? "you favor craft, they favor leverage"
        : "you favor leverage, they favor craft",
    );
  }
  if (axisCallout.length > 0) {
    const cap = axisCallout[0].charAt(0).toUpperCase() + axisCallout[0].slice(1);
    lines.push(cap + axisCallout.slice(1).map((s) => `; ${s}`).join("") + ".");
  }

  return lines.join(" ");
}

/** Full-screen overlay panel — RPG inventory + character info.
 *  Triggered by `I` (own card) or by walking up to another player +
 *  pressing E (other-player card; not yet wired). */
export function CharacterCard({
  data,
  onClose,
  onSendMessage,
}: {
  data: CharacterCardData;
  onClose: () => void;
  /** Called when the "Send message" CTA is clicked from another
   *  player's card. Parent wires this to focus the chat input
   *  with an "@name " prefix and dismiss the card. */
  onSendMessage?: (toDisplayName: string) => void;
}) {
  // ESC to dismiss.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const meta = ARCHETYPE_SUMMARY[data.archetype] ?? ARCHETYPE_SUMMARY["X-S-L"];
  const accentCss = `#${meta.accent.toString(16).padStart(6, "0")}`;
  // Did we get real RQ/XQ data back from the summary endpoint?
  const richReady =
    data.rich && data.rich !== "loading" ? data.rich : null;
  const richLoading = data.rich === "loading";
  // Pick the headline name shown on the hero. Real archetype name from
  // the XQ submission beats the generic ARCHETYPE_SUMMARY label.
  const archetypeName =
    richReady?.xq?.archetypeName?.trim() || meta.name;

  return (
    <div
      className={styles.backdrop}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Character card"
    >
      <div
        className={styles.card}
        onClick={(e) => e.stopPropagation()}
        style={{ "--card-accent": accentCss } as React.CSSProperties}
      >
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        {/* === Hero: archetype mark + name === */}
        <div className={styles.hero}>
          <div className={styles.mark}>
            <ShapeMark shape={meta.shape} accent={accentCss} />
          </div>
          <div className={styles.heroBody}>
            <div className={styles.eyebrow}>
              {data.isSelf
                ? "You"
                : richReady?.memberType === "brand"
                  ? "Brand"
                  : richReady?.memberType === "creator"
                    ? "Creator"
                    : "Citizen"}
            </div>
            <h2 className={styles.name}>{data.displayName}</h2>
            <div className={styles.archetypeRow}>
              <span className={styles.archetypeCode}>{data.archetype}</span>
              <span className={styles.archetypeName}>{archetypeName}</span>
            </div>
            {richReady?.organization && (
              <div className={styles.eyebrow} style={{ marginTop: 4 }}>
                {richReady.organization}
              </div>
            )}
          </div>
        </div>

        {/* === XQ summary ===
                Real data when we got it from the API; otherwise the
                generic per-archetype paragraph below. */}
        <section className={styles.section}>
          <div className={styles.sectionLabel}>
            <span className={styles.sectionTag}>XQ</span>
            <span>Values blueprint</span>
          </div>
          {richReady?.xq?.tagline && (
            <p className={styles.sectionBody}>
              &ldquo;{richReady.xq.tagline}&rdquo;
            </p>
          )}
          {richReady?.xq && (
            richReady.xq.values.nonNegotiables.length > 0 ||
              richReady.xq.values.core.length > 0 ||
              richReady.xq.values.aspirational.length > 0
          ) ? (
            <ValuesBlock values={richReady.xq.values} accent={accentCss} />
          ) : (
            !richLoading && <p className={styles.sectionBody}>{meta.xq}</p>
          )}
          {richLoading && (
            <p className={styles.sectionBody}>Loading dossier…</p>
          )}
        </section>

        {/* === RQ summary === */}
        <section className={styles.section}>
          <div className={styles.sectionLabel}>
            <span className={styles.sectionTag}>RQ</span>
            <span>Match profile</span>
          </div>
          {richReady?.rq ? (
            <div>
              {richReady.rq.name && (
                <p className={styles.sectionBody}>
                  <strong>{richReady.rq.name}</strong>
                  {richReady.rq.code ? ` · ${richReady.rq.code}` : ""}
                </p>
              )}
              {richReady.rq.clarityLabel && (
                <p className={styles.sectionBody}>
                  Signal clarity: <strong>{richReady.rq.clarityLabel}</strong>
                  {richReady.rq.clarityNote ? ` — ${richReady.rq.clarityNote}` : ""}
                </p>
              )}
              {richReady.rq.undertone && (
                <p className={styles.sectionBody}>
                  Undertone: {richReady.rq.undertone}
                </p>
              )}
              {!richReady.rq.name &&
                !richReady.rq.clarityLabel &&
                !richReady.rq.undertone && (
                  <p className={styles.sectionBody}>{meta.rq}</p>
                )}
            </div>
          ) : (
            !richLoading && <p className={styles.sectionBody}>{meta.rq}</p>
          )}
          {richLoading && (
            <p className={styles.sectionBody}>Loading dossier…</p>
          )}
        </section>

        {/* === Match read (visible only when looking at someone else
                AND we know our own archetype) === */}
        {!data.isSelf && data.selfArchetype && (
          <section className={styles.section}>
            <div className={styles.sectionLabel}>
              <span className={styles.sectionTag}>Mx</span>
              <span>How you match</span>
            </div>
            <p className={styles.sectionBody}>
              {matchRead(data.selfArchetype, data.archetype)}
            </p>
          </section>
        )}

        {/* === Items (placeholder for the inventory slot grid) ===
                Only shown on the OWN card — other players' inventory
                isn't yours to see. */}
        {data.isSelf && (
          <section className={styles.section}>
            <div className={styles.sectionLabel}>
              <span className={styles.sectionTag}>Inv</span>
              <span>Inventory</span>
            </div>
            <div className={styles.itemGrid}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={styles.itemSlot} />
              ))}
            </div>
            <p className={styles.placeholderNote}>
              No items yet — the inventory system arrives once items exist
              in the world.
            </p>
          </section>
        )}

        <div className={styles.footer}>
          {data.isSelf ? (
            <span className={styles.footerHint}>Press ESC or click outside to close</span>
          ) : (
            <>
              <button
                type="button"
                className={styles.cta}
                onClick={() => onSendMessage?.(data.displayName)}
              >
                Send message
              </button>
              <button
                type="button"
                className={styles.ctaSecondary}
                title="Coming soon — formal match initiation"
              >
                Initiate match
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Three rows of value pills — non-negotiables, core, aspirational —
 *  rendered as a stack of horizontal chip lists. Same mental model as
 *  the admin XQSummaryCard. Skip any row that's empty. */
function ValuesBlock({
  values,
  accent,
}: {
  values: { nonNegotiables: string[]; core: string[]; aspirational: string[] };
  accent: string;
}) {
  const rows: Array<{ label: string; items: string[] }> = [
    { label: "Non-negotiables", items: values.nonNegotiables },
    { label: "Core", items: values.core },
    { label: "Aspirational", items: values.aspirational },
  ];
  return (
    <div className={styles.valuesBlock}>
      {rows
        .filter((r) => r.items.length > 0)
        .map((r) => (
          <div key={r.label} className={styles.valuesRow}>
            <span className={styles.valuesLabel}>{r.label}</span>
            <div className={styles.valuesPills}>
              {r.items.map((v) => (
                <span
                  key={v}
                  className={styles.valuesPill}
                  style={{ borderColor: accent, color: accent }}
                >
                  {v}
                </span>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

/** Render the archetype mark as a large filled shape. Same vocab
 *  as the avatar badge (circle / oval / square / etc.) but at hero
 *  size and with a softer fill so it reads as a character portrait
 *  placeholder. Will be replaced by an actual character rendering
 *  once costume layers exist. */
function ShapeMark({ shape, accent }: { shape: string; accent: string }) {
  const size = 140;
  const r = 56;
  const cx = size / 2;
  const cy = size / 2;
  let path: React.ReactNode;
  switch (shape) {
    case "oval":
      path = <ellipse cx={cx} cy={cy} rx={r * 1.1} ry={r * 0.8} />;
      break;
    case "square":
      path = <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} />;
      break;
    case "round-rect":
      path = <rect x={cx - r * 1.1} y={cy - r * 0.85} width={r * 2.2} height={r * 1.7} rx={10} />;
      break;
    case "diamond":
      path = <polygon points={`${cx},${cy - r * 1.15} ${cx + r * 1.15},${cy} ${cx},${cy + r * 1.15} ${cx - r * 1.15},${cy}`} />;
      break;
    case "triangle":
      path = <polygon points={`${cx},${cy - r * 1.15} ${cx + r * 1.15},${cy + r} ${cx - r * 1.15},${cy + r}`} />;
      break;
    case "hexagon": {
      const pts: string[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        pts.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`);
      }
      path = <polygon points={pts.join(" ")} />;
      break;
    }
    case "pentagon": {
      const pts: string[] = [];
      for (let i = 0; i < 5; i++) {
        const a = ((Math.PI * 2) / 5) * i - Math.PI / 2;
        pts.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`);
      }
      path = <polygon points={pts.join(" ")} />;
      break;
    }
    case "circle":
    default:
      path = <circle cx={cx} cy={cy} r={r} />;
      break;
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <g fill={accent} fillOpacity={0.18} stroke={accent} strokeWidth={3}>
        {path}
      </g>
      <circle cx={cx} cy={cy} r={4} fill={accent} />
    </svg>
  );
}

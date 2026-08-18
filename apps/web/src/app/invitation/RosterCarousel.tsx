"use client";

import { useCallback, useEffect, useState } from "react";

import { ARCHETYPES, type ArchetypeCode } from "@/lib/xq/constants";

import styles from "./page.module.css";

/**
 * Client carousel for /invitation ("Who we work with").
 *
 * Layout: the center card sits on top; one layer below, a card on each
 * side; another layer below that, one more card on each side — five
 * visible, the rest tucked behind the center. Arrow buttons flank the
 * deck and the ← / → keys rotate it (a visible hint says so).
 *
 * REAL ROSTER — the brands + creators Mike curated for the invitation
 * page. Every entry is a member in the CRM. Logos/banners are real.
 *
 * NOTE: the XQ archetype, blurb, `about`, and RQ resonance read below
 * are MOCK placeholders so the cards render fully for review — they are
 * NOT real product outputs. Replace each with the member's actual XQ/RQ
 * results once they complete the quiz. The card + popup render only the
 * fields that are set, so clearing one back to empty is safe.
 *
 * ASSETS: drop each client's images in
 *   apps/web/public/images/invitation/roster/
 * then fill `logo` (card disc) and `banner` (top background) below.
 * Suggested filenames: `{slug}-logo.png` and `{slug}-bg.jpg`. Until a
 * path is set, the card falls back to a monogram + tinted tone.
 */

type Client = {
  kind: "brand" | "creator";
  name: string;
  /** Stable id — matches the CRM member + the asset filenames. */
  slug: string;
  /** One-line description. Empty until we have real copy. */
  blurb?: string;
  /** XQ archetype code — display name/tagline come from ARCHETYPES.
   *  Empty until the member completes the XQ quiz. */
  xqCode?: ArchetypeCode;
  /** Longer profile paragraph for the popup. */
  about?: string;
  /** Short RQ resonance read for the popup. */
  rq?: string;
  /** Client logo shown in the card's disc — falls back to a monogram. */
  logo?: string;
  /** Set when the logo is white/light — gives the disc a dark backing so
   *  it stays visible against the otherwise light card surface. */
  logoDark?: boolean;
  /** Client banner image for the card's top section — falls back to a
   *  tinted tone wash. */
  banner?: string;
  /** CSS gradient for the banner instead of an image (e.g. a brand
   *  gradient). Takes precedence over `banner` when set. */
  bannerGradient?: string;
  /** Override the banner image's focal point (default is `center`) —
   *  e.g. `top` for a portrait whose subject sits high in the frame. */
  bannerPosition?: string;
};

/** Fade the banner's lower edge into the card surface so the content
 *  below stays readable. Shared by card + popup. A `gradient` wins over
 *  an image; with neither, returns a soft tone wash so the top section
 *  still reads. */
function bannerBackground(
  banner?: string,
  gradient?: string,
  position?: string,
): React.CSSProperties {
  const fade = "linear-gradient(180deg, rgb(255 255 255 / 0%) 45%, var(--gs-background) 97%)";
  if (gradient) {
    return { backgroundImage: `${fade}, ${gradient}` };
  }
  if (!banner) {
    return {
      backgroundImage:
        "linear-gradient(180deg, var(--pk-soft) 0%, var(--gs-background) 97%)",
    };
  }
  return {
    backgroundImage: `${fade}, url(${banner})`,
    ...(position ? { backgroundPosition: position } : null),
  };
}

/** Logo fill for the card/popup disc. Empty logo → undefined so the CSS
 *  `--pk-soft` background + monogram letter show instead. `dark` gives a
 *  dark backing so white/light logos stay visible. */
function logoBackground(
  logo?: string,
  dark?: boolean,
): React.CSSProperties | undefined {
  if (!logo) return undefined;
  return {
    backgroundImage: `url(${logo})`,
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    ...(dark ? { backgroundColor: "var(--gs-tw-neutral-900)" } : null),
  };
}

const ASSETS = "/images/invitation/roster";

const ROSTER: Client[] = [
  {
    kind: "creator",
    name: "The Biblical Mind",
    slug: "biblical-mind",
    logo: `${ASSETS}/biblical-mind-logo.jpg`,
    banner: `${ASSETS}/biblical-mind-bg.png`,
    xqCode: "C-P-C",
    blurb: "Serious, accessible conversations about Scripture and the life of the mind.",
    about:
      "A podcast for people who want to think deeply and faithfully — biblical scholarship carried with the patience of a seminar and the warmth of a good teacher.",
    rq: "High resonance with thoughtful faith-and-ideas audiences; fits brands that value depth and integrity over the hot take.",
  },
  {
    kind: "brand",
    name: "Tonja's Toffee",
    slug: "tonjas-toffee",
    logo: `${ASSETS}/tonjas-toffee-logo.webp`,
    banner: `${ASSETS}/tonjas-toffee-bg.webp`,
    xqCode: "X-P-C",
    blurb: "Small-batch toffee made the slow, stubborn, delicious way.",
    about:
      "A family toffee-maker proving a confection can still be handmade in real copper kettles — no shortcuts, no fillers, just butter, sugar, and time.",
    rq: "Resonates with craft-first, gift-and-gather audiences; strongest fit with shows about home, hospitality, and things worth savoring.",
  },
  {
    kind: "creator",
    name: "Unseriously with Holly Mackle",
    slug: "unseriously",
    logo: `${ASSETS}/unseriously-logo.jpg`,
    banner: `${ASSETS}/unseriously-bg.jpg`,
    // Portrait — anchor the top so her face isn't cropped off.
    bannerPosition: "center top",
    xqCode: "X-P-L",
    blurb: "Faith, motherhood, and the holy permission to laugh at all of it.",
    about:
      "Holly Mackle hosts a show that takes God seriously and everything else a lot less so — humor as a doorway back to joy for tired, faithful people.",
    rq: "Resonates with women-of-faith audiences who love levity; fits warm, family-friendly brands that don't take themselves too seriously.",
  },
  {
    kind: "brand",
    name: "Etkin Designs",
    slug: "etkin-designs",
    logo: `${ASSETS}/etkin-designs-logo.webp`,
    logoDark: true,
    banner: `${ASSETS}/etkin-designs-bg.webp`,
    xqCode: "X-S-C",
    blurb: "Design-led goods where form, function, and intention meet.",
    about:
      "A design house that treats everyday objects as problems worth solving — clean lines, considered materials, and a point of view in every piece.",
    rq: "Resonates with design-literate, detail-noticing buyers; aligns with creators whose taste drives the conversation.",
  },
  {
    kind: "creator",
    name: "Sunshine In My Nest",
    slug: "sunshine-in-my-nest",
    logo: `${ASSETS}/sunshine-in-my-nest-logo.png`,
    banner: `${ASSETS}/sunshine-in-my-nest-bg.png`,
    xqCode: "C-P-L",
    blurb: "Homemaking, motherhood, and beauty in the ordinary day.",
    about:
      "A warm corner of the internet built around the rhythms of home — encouragement for mothers making a nest worth coming home to.",
    rq: "High resonance with homemaking and motherhood audiences; fits family, home, and hearth brands built on care.",
  },
  {
    kind: "brand",
    name: "MatchGrant",
    slug: "matchgrant",
    logo: `${ASSETS}/matchgrant-logo.webp`,
    // Pulled from the "mg" mark's own palette — blue → magenta → red →
    // gold → sky, echoing its playful multicolor identity.
    bannerGradient:
      "linear-gradient(120deg, #123fc9 0%, #d81f9a 26%, #f5333a 46%, #ffc23c 68%, #17a9e8 100%)",
    xqCode: "C-S-L",
    blurb: "Turning generosity into infrastructure — matching gifts that multiply impact.",
    about:
      "A platform that helps mission-driven organizations run matching campaigns at scale, so every dollar of generosity does more structural good.",
    rq: "Resonates with donor and nonprofit audiences; fits shows about faith, giving, and building things that last.",
  },
  {
    kind: "creator",
    name: "The Pivot",
    slug: "the-pivot",
    // Logo = the official "The Pivot with Andrew Osenga" cover art
    // (Apple Podcasts). Banner = a stage/performance shot from
    // andrewosenga.com, fitting the show's creativity-and-change theme.
    logo: `${ASSETS}/the-pivot-logo.jpg`,
    banner: `${ASSETS}/the-pivot-bg.webp`,
    xqCode: "X-P-L",
    blurb: "Honest conversations about creativity, change, and starting over.",
    about:
      "Conversations with makers and mid-career changers about the moments that redirect a life — the fear, the freedom, and the next thing.",
    rq: "Resonates with creative, in-transition audiences; fits tools-and-craft brands and anyone selling to people building something new.",
  },
  {
    kind: "brand",
    name: "Tektones",
    slug: "tektones",
    logo: `${ASSETS}/tektones-logo.avif`,
    banner: `${ASSETS}/tektones-bg.webp`,
    xqCode: "X-S-L",
    blurb: "Building at the intersection of faith, work, and what comes next.",
    about:
      "A venture that thinks in systems — connecting people, capital, and conviction to build enterprises with purpose baked into the foundation.",
    rq: "Resonates with faith-driven builders and investors; fits shows about work, calling, and the long game.",
  },
  {
    kind: "creator",
    name: "The Rabbit Room",
    slug: "rabbit-room",
    logo: `${ASSETS}/rabbit-room-logo.png`,
    banner: `${ASSETS}/rabbit-room-bg.png`,
    xqCode: "C-S-C",
    blurb: "Art, story, and community in the tradition of the Inklings.",
    about:
      "A fellowship of writers, musicians, and makers cultivating beauty and truth through story — books, music, gatherings, and a very particular hospitality.",
    rq: "Resonates with literary, faith-and-art audiences; fits brands that value craft, story, and slow-built community.",
  },
  {
    kind: "brand",
    name: "Readmio",
    slug: "readmio",
    logo: `${ASSETS}/readmio-logo.webp`,
    banner: `${ASSETS}/readmio-bg.avif`,
    xqCode: "C-P-L",
    blurb: "Interactive bedtime stories that turn screen time into story time.",
    about:
      "A kids' app full of narrated, sound-rich fairy tales — read aloud together, with a little magic that keeps children listening.",
    rq: "Resonates with parents and family audiences; fits gentle, screen-conscious brands for households with young kids.",
  },
  {
    kind: "creator",
    name: "The Habit",
    slug: "the-habit",
    // Logo = the official "The Habit Podcast" cover art (Apple
    // Podcasts / Rabbit Room). Banner = a sage wash sampled from it.
    logo: `${ASSETS}/the-habit-logo.jpg`,
    bannerGradient:
      "linear-gradient(135deg, #a7b79c 0%, #6f8468 100%)",
    xqCode: "C-P-C",
    blurb: "A podcast about writing, craft, and the discipline of making things.",
    about:
      "Conversations with writers about the daily practice of the craft — encouragement and hard-won wisdom for anyone who works with words.",
    rq: "Resonates with writers and creatives who love the craft; fits tools-of-the-trade brands and patient, make-something audiences.",
  },
  {
    kind: "creator",
    name: "The Hutchmoot Podcast",
    slug: "hutchmoot",
    logo: `${ASSETS}/hutchmoot-logo.png`,
    banner: `${ASSETS}/hutchmoot-bg.avif`,
    xqCode: "C-P-L",
    blurb: "Conversations from the Rabbit Room's gathering of art, faith, and friendship.",
    about:
      "Talks and table conversations from Hutchmoot — the annual gathering where storytellers, musicians, and makers meet to feast on beauty together.",
    rq: "Resonates with the literary, faith-and-art community; fits brands built on gathering, hospitality, and craft.",
  },
  {
    kind: "creator",
    name: "Triptych Conversations",
    slug: "triptych",
    logo: `${ASSETS}/triptych-logo.webp`,
    banner: `${ASSETS}/triptych-bg.png`,
    xqCode: "X-P-C",
    blurb: "Three-part conversations at the crossroads of art, faith, and culture.",
    about:
      "A show that sits with artists and thinkers to explore how beauty, belief, and everyday life inform one another — unhurried, human, and curious.",
    rq: "Resonates with reflective, arts-and-ideas audiences; fits brands with a point of view and a love of the made thing.",
  },
];

/** Mike's priority hierarchy (2026-08-17) mapped to the carousel's
 *  VISIBLE slots on load (front = 0), not linear order — the deck wraps,
 *  so the last array entries render to the LEFT of centre. Ranked slots:
 *    centre  = index 0        → Mike #1
 *    right   = index 1        → Mike #2
 *    right-2 = index 2        → Mike #4
 *    left    = last index     → Mike #3
 *    left-2  = 2nd-last index → Mike #5
 *    behind  = middle indices → Mike #6…#13 (Readmio + Hutchmoot last).
 */
const DISPLAY_ORDER = [
  "rabbit-room", // #1 · centre
  "matchgrant", // #2 · right of centre
  "biblical-mind", // #4 · furthest right
  "sunshine-in-my-nest", // #6 · behind
  "tektones", // #7 · behind
  "the-habit", // #8 · behind
  "unseriously", // #9 · behind
  "tonjas-toffee", // #10 · behind
  "triptych", // #11 · behind
  "readmio", // (not on Mike's list) · behind
  "hutchmoot", // (not on Mike's list) · behind
  "the-pivot", // #5 · furthest left
  "etkin-designs", // #3 · left of centre
];

const ORDERED_ROSTER: Client[] = [...ROSTER].sort(
  (a, b) => DISPLAY_ORDER.indexOf(a.slug) - DISPLAY_ORDER.indexOf(b.slug),
);

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
  const count = ORDERED_ROSTER.length;

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
          {ORDERED_ROSTER.map((client, i) => {
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
                <span
                  className={styles.cardBanner}
                  style={bannerBackground(
                    client.banner,
                    client.bannerGradient,
                    client.bannerPosition,
                  )}
                  aria-hidden="true"
                />
                <span className={styles.cardHead}>
                  <span
                    className={styles.cardDisc}
                    style={logoBackground(client.logo, client.logoDark)}
                    aria-hidden="true"
                  >
                    {client.logo ? "" : client.name.charAt(0)}
                  </span>
                  <span className={styles.cardChip}>
                    {KIND_LABEL[client.kind]}
                  </span>
                </span>
                <span className={styles.cardMorse} aria-hidden="true" />
                <span className={styles.cardName}>{client.name}</span>
                {client.blurb && (
                  <span className={styles.cardBlurb}>{client.blurb}</span>
                )}
                {client.xqCode && (
                  <span className={styles.cardFootnote}>
                    XQ &middot; {ARCHETYPES[client.xqCode].name}
                  </span>
                )}
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
            <span
              className={styles.profileBanner}
              style={bannerBackground(
                selected.banner,
                selected.bannerGradient,
                selected.bannerPosition,
              )}
              aria-hidden="true"
            />
            <div className={styles.profileHead}>
              <span
                className={styles.cardDisc}
                style={logoBackground(selected.logo, selected.logoDark)}
                aria-hidden="true"
              >
                {selected.logo ? "" : selected.name.charAt(0)}
              </span>
              <span className={styles.cardChip}>
                {KIND_LABEL[selected.kind]}
              </span>
            </div>
            <span className={styles.cardMorse} aria-hidden="true" />
            <h3 className={styles.profileName}>{selected.name}</h3>
            {selected.blurb && (
              <p className={styles.profileBlurb}>{selected.blurb}</p>
            )}
            {selected.about && (
              <p className={styles.profileAbout}>{selected.about}</p>
            )}
            {(selected.xqCode || selected.rq) && (
              <div className={styles.profileQuotients}>
                {selected.xqCode && (
                  <div className={styles.profileQuotient}>
                    <p className={`${styles.profileQuotientLabel} ${styles.profileQuotientXq}`}>
                      XQ &middot; {ARCHETYPES[selected.xqCode].name}
                    </p>
                    <p className={styles.profileQuotientText}>
                      <em>{ARCHETYPES[selected.xqCode].tagline}</em>{" "}
                      {firstSentence(ARCHETYPES[selected.xqCode].desc)}
                    </p>
                  </div>
                )}
                {selected.rq && (
                  <div className={styles.profileQuotient}>
                    <p className={`${styles.profileQuotientLabel} ${styles.profileQuotientRq}`}>
                      RQ &middot; Resonance read
                    </p>
                    <p className={styles.profileQuotientText}>{selected.rq}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

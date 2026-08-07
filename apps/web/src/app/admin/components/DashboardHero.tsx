import styles from "./DashboardHero.module.css";

/**
 * A small motivational banner at the top of the admin dashboard — the
 * GHOSTSignal cloud brandmark, a co-founder rallying line, and a morse
 * strip that quietly "transmits" the same message. Purely decorative;
 * the KPI grid does the real work below it.
 */

const MORSE: Record<string, string> = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.",
  H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.",
  O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-",
  V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
};

// The line the morse encodes — the same sentiment as the quote.
const PHRASE = "YOU ARE MAKING THE WORLD";

type Sym = { kind: "dot" | "dash" } | { kind: "letter-gap" } | { kind: "word-gap" };

function buildSequence(phrase: string): Sym[] {
  const out: Sym[] = [];
  const words = phrase.toUpperCase().split(" ");
  words.forEach((word, wi) => {
    [...word].forEach((ch, ci) => {
      const code = MORSE[ch];
      if (!code) return;
      for (const s of code) out.push({ kind: s === "." ? "dot" : "dash" });
      if (ci < word.length - 1) out.push({ kind: "letter-gap" });
    });
    if (wi < words.length - 1) out.push({ kind: "word-gap" });
  });
  return out;
}

const SEQUENCE = buildSequence(PHRASE);

export function DashboardHero() {
  return (
    <section className={styles.hero} aria-label="You are making the World">
      {/* Theme-aware brandmark: white for dark theme, dark for light —
          same swap idiom as the topbar logo. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/brand/brandmark-vert-white.svg"
        alt="GHOSTSignal"
        className={`${styles.logo} ${styles.logoDark}`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/brand/gs-brandmark-vert-dark.png"
        alt=""
        aria-hidden="true"
        className={`${styles.logo} ${styles.logoLight}`}
      />

      <p className={styles.quote}>You are making the World.</p>

      <div className={styles.morse} aria-hidden="true">
        {SEQUENCE.map((s, i) => {
          if (s.kind === "word-gap")
            return <span key={i} className={styles.wordGap} />;
          if (s.kind === "letter-gap")
            return <span key={i} className={styles.letterGap} />;
          return (
            <span
              key={i}
              className={s.kind === "dot" ? styles.dot : styles.dash}
            />
          );
        })}
      </div>
    </section>
  );
}

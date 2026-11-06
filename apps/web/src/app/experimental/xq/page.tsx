import Link from "next/link";

import { Section, Container } from "@/components/layout";
import {
  CHARACTER_STEP,
  RESONANCE_STEP,
  XQ_ABOUT,
  XQ_CHARACTER_PAGES,
  XQ_LANDING,
  xqPath,
} from "@/lib/xq/site";

import { XqFrame } from "./XqFrame";
import styles from "./xq.module.css";

/** Locked shorts from docs/XQ_ARCHETYPE_COPY.md. Page copy is not locked yet. */
const LOCKED_SHORT: Record<string, string> = {
  steward: "You belong with people who protect what is good and take their time making it.",
  shepherd:
    "You belong with people who want more people included, without weakening what they already have.",
  conservator:
    "You belong with people who care that the work is done right, and that it stays that way.",
  "institution-builder":
    "You belong with people who want to build something that lasts longer than one project.",
  "artisan-reformer":
    "You belong with people who change things by making them better and more personal.",
  catalyst: "You belong with people who can get others to care, and to move with them.",
  designer: "You belong with people who fix a broken way of working by redesigning it.",
  architect: "You belong with the people building a world that has room for you in it.",
};

const FACTS = [
  { value: "8", label: "Characters" },
  { value: "3", label: "Value poles" },
  { value: "3", label: "Resonance axes" },
  { value: "1", label: "Call sign" },
] as const;

const BANDS = [
  {
    kicker: CHARACTER_STEP.kicker,
    title: CHARACTER_STEP.title,
    paragraphs: [CHARACTER_STEP.body],
    note: "Placeholder. One more line on the three poles: Continuity or Change, Person or System, Craft or Scale.",
    href: xqPath("character"),
    link: "Meet the characters",
    plate: "Placeholder. Eight figures, one scene, arranged so you can see who sits near whom.",
  },
  {
    kicker: RESONANCE_STEP.kicker,
    title: RESONANCE_STEP.title,
    paragraphs: [RESONANCE_STEP.body, RESONANCE_STEP.result],
    href: xqPath("resonance"),
    link: "How resonance works",
    plate: "Placeholder. Two people in the same room, the signal between them visible.",
  },
  {
    kicker: XQ_ABOUT.kicker,
    title: XQ_ABOUT.title,
    paragraphs: XQ_ABOUT.paragraphs.slice(0, 2),
    href: xqPath("about"),
    link: "Read the research",
    plate: "Placeholder. A trusted circle, then the wider room it opens into.",
  },
] as const;

export default function XqLandingPage() {
  return (
    <XqFrame>
      <Section className={styles.landHero}>
        <Container className={styles.heroSplit}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>GHOSTSignal · XQ</p>
            <h1 className={styles.h1}>{XQ_LANDING.headline}</h1>
            <p className={styles.lede}>{XQ_LANDING.subhead}</p>
            <p className={styles.body}>{XQ_LANDING.body}</p>
            <div className={styles.actions}>
              <Link className={`${styles.cta} ${styles.ctaDark}`} href={XQ_LANDING.quizHref}>
                {XQ_LANDING.quizLabel}
              </Link>
              <Link className={styles.ghostDark} href={xqPath("character")}>
                Meet the characters
              </Link>
            </div>
          </div>
          <figure className={styles.plate}>
            <p className={styles.plateLabel}>Placeholder</p>
            <p className={styles.plateText}>
              Hero illustration. Harmony and belonging: a shared fire, a lighthouse, people already in the same key.
            </p>
          </figure>
        </Container>
      </Section>

      <Section className={styles.factBand}>
        <Container>
          <ul className={styles.facts}>
            {FACTS.map((fact) => (
              <li key={fact.label} className={styles.fact}>
                <p className={styles.factValue}>{fact.value}</p>
                <p className={styles.factLabel}>{fact.label}</p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {BANDS.map((band, index) => (
        <Section key={band.href} className={styles.landBand}>
          <Container className={index % 2 === 1 ? styles.splitFlip : styles.splitBand}>
            <figure className={styles.plate}>
              <p className={styles.plateLabel}>Placeholder</p>
              <p className={styles.plateText}>{band.plate}</p>
            </figure>
            <div className={styles.bandCopy}>
              <p className={styles.kicker}>{band.kicker}</p>
              <h2 className={styles.h2}>{band.title}</h2>
              {band.paragraphs.map((paragraph) => (
                <p key={paragraph} className={styles.body}>
                  {paragraph}
                </p>
              ))}
              {"note" in band ? <p className={styles.placeholder}>{band.note}</p> : null}
              <Link className={styles.textLink} href={band.href}>
                {band.link}
              </Link>
            </div>
          </Container>
        </Section>
      ))}

      <Section className={styles.landBand}>
        <Container className={styles.typeBlock}>
          <div className={styles.bandCopy}>
            <p className={styles.kicker}>The eight characters</p>
            <h2 className={styles.h2}>Who you belong with</h2>
            <p className={styles.placeholder}>
              Placeholder. A line introducing the eight, until the content pass writes one.
            </p>
          </div>
          <ul className={styles.typeGrid}>
            {XQ_CHARACTER_PAGES.map((character) => (
              <li key={character.slug}>
                <Link className={styles.typeCard} href={xqPath(`character/${character.slug}`)}>
                  <p className={styles.plateLabel}>Placeholder</p>
                  <h3 className={styles.cardTitle}>{character.name}</h3>
                  <p className={styles.cardText}>{LOCKED_SHORT[character.slug]}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section className={styles.landClose}>
        <Container className={styles.heroSplit}>
          <div className={styles.heroCopy}>
            <p className={styles.plateLabel}>Placeholder</p>
            <h2 className={styles.h2}>Find who you belong with</h2>
            <p className={styles.body}>{XQ_LANDING.subhead}</p>
            <div className={styles.actions}>
              <Link className={`${styles.cta} ${styles.ctaDark}`} href={XQ_LANDING.quizHref}>
                {XQ_LANDING.quizLabel}
              </Link>
            </div>
          </div>
          <figure className={styles.plate}>
            <p className={styles.plateLabel}>Placeholder</p>
            <p className={styles.plateText}>
              Closing illustration. The same people, now clearly in one circle.
            </p>
          </figure>
        </Container>
      </Section>
    </XqFrame>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { Section, Container } from "@/components/layout";
import type { ArchetypeCode } from "@/lib/xq/constants";
import {
  CHARACTER_POLES,
  CHARACTER_STEP,
  RESONANCE_BANDS,
  RESONANCE_POLES,
  RESONANCE_STEP,
  XQ_ABOUT,
  XQ_CHARACTER_PAGES,
  XQ_LANDING,
  xqPath,
} from "@/lib/xq/site";

import { XqFrame } from "../XqFrame";
import styles from "../xq.module.css";

/**
 * Locked hierarchy for /experimental/xq/about. Do not reorder these sections:
 * 1. What the XQ is
 * 2. Character poles, one pair at a time
 * 3. Resonance poles, then how a result reads
 * 4. Map of the eight characters
 * 5. Why it matters, then the quiz
 */

export const metadata: Metadata = {
  title: "About the XQ",
  description: XQ_ABOUT.paragraphs[0],
};

const MAP_GROUPS = [
  { label: "Continuity", letter: "C" },
  { label: "Change", letter: "X" },
] as const;

const MAP_ROWS = [
  { label: "Person", letter: "P" },
  { label: "System", letter: "S" },
] as const;

const MAP_COLS = [
  { label: "Craft", letter: "C" },
  { label: "Scale", letter: "L" },
] as const;

function characterAt(code: string) {
  return XQ_CHARACTER_PAGES.find((page) => page.code === (code as ArchetypeCode));
}

export default function XqAboutPage() {
  return (
    <XqFrame>
      <Section className={styles.landHero}>
        <Container className={styles.bandCopy}>
          <p className={styles.sectionLabel}>Section · What it is</p>
          <p className={styles.kicker}>{XQ_ABOUT.kicker}</p>
          <h1 className={styles.h1}>{XQ_ABOUT.title}</h1>
          <p className={styles.lede}>{XQ_ABOUT.paragraphs[0]}</p>
          <p className={styles.body}>{XQ_ABOUT.paragraphs[1]}</p>
          <p className={styles.placeholder}>
            Placeholder. One line that says the XQ is two steps: Character, then Resonance.
          </p>
        </Container>
      </Section>

      <Section className={styles.landBand}>
        <Container className={styles.typeBlock}>
          <div className={styles.bandCopy}>
            <p className={styles.sectionLabel}>Section · Character poles</p>
            <p className={styles.kicker}>{CHARACTER_STEP.kicker}</p>
            <h2 className={styles.h2}>{CHARACTER_STEP.title}</h2>
            <p className={styles.body}>{CHARACTER_STEP.body}</p>
          </div>
          <ul className={styles.axisList}>
            {CHARACTER_POLES.map((pole) => (
              <li key={pole.left} className={styles.axisCard}>
                <div className={styles.split}>
                  <article className={styles.bandCopy}>
                    <h3 className={styles.cardTitle}>{pole.left}</h3>
                    <p className={styles.placeholder}>
                      Placeholder. What this side of the pole feels like.
                    </p>
                  </article>
                  <article className={styles.bandCopy}>
                    <h3 className={styles.cardTitle}>{pole.right}</h3>
                    <p className={styles.placeholder}>
                      Placeholder. What this side of the pole feels like.
                    </p>
                  </article>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <Section className={styles.landBand}>
        <Container className={styles.typeBlock}>
          <div className={styles.bandCopy}>
            <p className={styles.sectionLabel}>Section · Resonance poles</p>
            <p className={styles.kicker}>{RESONANCE_STEP.kicker}</p>
            <h2 className={styles.h2}>{RESONANCE_STEP.title}</h2>
            <p className={styles.body}>{RESONANCE_STEP.body}</p>
            <p className={styles.body}>{RESONANCE_STEP.result}</p>
          </div>
          <ul className={styles.axisList}>
            {RESONANCE_POLES.map((pole) => (
              <li key={pole.letters} className={styles.axisCard}>
                <p className={styles.kicker}>{pole.letters}</p>
                <div className={styles.split}>
                  <h3 className={styles.cardTitle}>{pole.left}</h3>
                  <h3 className={styles.cardTitle}>{pole.right}</h3>
                </div>
                <p className={styles.body}>{pole.body}</p>
              </li>
            ))}
          </ul>
          <div className={styles.bandCopy}>
            <h3 className={styles.cardTitle}>How strong the signal is</h3>
            <ul className={styles.steps}>
              {RESONANCE_BANDS.map((band) => (
                <li key={band.range} className={styles.step}>
                  <p className={styles.cardTitle}>{band.range}</p>
                  <p className={styles.cardText}>{band.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>

      <Section className={styles.landBand}>
        <Container className={styles.typeBlock}>
          <div className={styles.bandCopy}>
            <p className={styles.sectionLabel}>Section · Map</p>
            <p className={styles.kicker}>The eight characters</p>
            <h2 className={styles.h2}>Where they sit</h2>
            <p className={styles.placeholder}>
              Placeholder. One line on how three poles make eight characters, and how a neighbor is one pole away.
            </p>
          </div>
          <figure className={styles.plate}>
            <p className={styles.plateLabel}>Placeholder</p>
            <p className={styles.plateText}>
              Overview map. The eight characters placed against each other on Continuity and Change, Person and System, Craft and Scale.
            </p>
          </figure>
          <div className={styles.mapGroups}>
            {MAP_GROUPS.map((group) => (
              <div key={group.letter} className={styles.axisCard}>
                <p className={styles.kicker}>{group.label}</p>
                {MAP_ROWS.map((row) => (
                  <div key={row.letter} className={styles.mapRow}>
                    <p className={styles.factLabel}>{row.label}</p>
                    <ul className={styles.mapList}>
                      {MAP_COLS.map((col) => {
                        const character = characterAt(`${group.letter}-${row.letter}-${col.letter}`);
                        if (!character) return null;
                        return (
                          <li key={character.slug}>
                            <Link className={styles.card} href={xqPath(`character/${character.slug}`)}>
                              <p className={styles.kicker}>{col.label}</p>
                              <h3 className={styles.cardTitle}>{character.name}</h3>
                              <p className={styles.cardText}>{character.code}</p>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section className={styles.landBand}>
        <Container className={styles.bandCopy}>
          <p className={styles.sectionLabel}>Section · Why it matters</p>
          <p className={styles.kicker}>Why it matters</p>
          <h2 className={styles.h2}>Trust and a faster first read</h2>
          {XQ_ABOUT.paragraphs.slice(2).map((paragraph) => (
            <p key={paragraph} className={styles.body}>
              {paragraph}
            </p>
          ))}
          <p className={styles.placeholder}>
            Placeholder. One line a visitor could repeat after reading this page.
          </p>
          <Link className={`${styles.cta} ${styles.ctaDark}`} href={XQ_LANDING.quizHref}>
            {XQ_LANDING.quizLabel}
          </Link>
        </Container>
      </Section>
    </XqFrame>
  );
}

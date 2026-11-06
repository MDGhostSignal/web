import type { Metadata } from "next";
import Link from "next/link";

import {
  RESONANCE_BANDS,
  RESONANCE_POLES,
  RESONANCE_STEP,
} from "@/lib/xq/site";

import { XqFrame } from "../XqFrame";
import styles from "../xq.module.css";

export const metadata: Metadata = {
  title: "Resonance",
  description: RESONANCE_STEP.body,
};

export default function XqResonancePage() {
  return (
    <XqFrame>
      <section className={styles.section}>
        <p className={styles.kicker}>{RESONANCE_STEP.kicker}</p>
        <h1 className={styles.h2}>{RESONANCE_STEP.title}</h1>
        <div className={styles.stack}>
          <p>{RESONANCE_STEP.body}</p>
          <p>{RESONANCE_STEP.result}</p>
        </div>
        <ul className={styles.poles}>
          {RESONANCE_POLES.map((pole) => (
            <li key={pole.letters} className={styles.pole}>
              <p className={styles.kicker}>{pole.letters}</p>
              <p className={styles.poleLine}>
                {pole.left}
                <span aria-hidden="true"> ↔ </span>
                {pole.right}
              </p>
              <p className={styles.poleNote}>{pole.body}</p>
            </li>
          ))}
        </ul>
        <h2 className={styles.cardTitle}>What the numbers mean</h2>
        <ul className={styles.bands}>
          {RESONANCE_BANDS.map((band) => (
            <li key={band.range} className={styles.band}>
              <p className={styles.bandRange}>{band.range}</p>
              <p className={styles.bandText}>{band.text}</p>
            </li>
          ))}
        </ul>
        <div className={styles.actions}>
          <Link className={`${styles.cta} ${styles.ctaDark}`} href={RESONANCE_STEP.quizHref}>
            {RESONANCE_STEP.quizLabel}
          </Link>
        </div>
      </section>
    </XqFrame>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { CHARACTER_POLES, CHARACTER_STEP, XQ_CHARACTER_PAGES, xqPath } from "@/lib/xq/site";

import { XqFrame } from "../XqFrame";
import styles from "../xq.module.css";

export const metadata: Metadata = {
  title: "Character",
  description: CHARACTER_STEP.body,
};

export default function XqCharacterIndexPage() {
  return (
    <XqFrame>
      <section className={styles.section}>
        <p className={styles.kicker}>{CHARACTER_STEP.kicker}</p>
        <h1 className={styles.h2}>{CHARACTER_STEP.title}</h1>
        <p className={styles.body}>{CHARACTER_STEP.body}</p>
        <ul className={styles.poles}>
          {CHARACTER_POLES.map((pole) => (
            <li key={pole.left} className={styles.pole}>
              <p className={styles.poleLine}>
                {pole.left}
                <span aria-hidden="true"> ↔ </span>
                {pole.right}
              </p>
            </li>
          ))}
        </ul>
        <ul className={styles.grid}>
          {XQ_CHARACTER_PAGES.map((character) => (
            <li key={character.slug}>
              <Link className={styles.card} href={xqPath(`character/${character.slug}`)}>
                <p className={styles.plateLabel}>Placeholder</p>
                <h2 className={styles.cardTitle}>{character.name}</h2>
                <p className={styles.cardText}>{character.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </XqFrame>
  );
}

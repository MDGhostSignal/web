import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ARCHETYPE_PAGE_COPY } from "@/lib/xq/archetype-copy";
import {
  characterBySlug,
  characterNeighbors,
  characterPoleMarks,
  XQ_CHARACTER_PAGES,
  XQ_LANDING,
  xqPath,
} from "@/lib/xq/site";

import { XqFrame } from "../../XqFrame";
import styles from "../../xq.module.css";

type Params = { slug: string };

const PLATE: Record<string, string> = {
  steward: "/images/xq/steward.jpg",
  shepherd: "/images/xq/shepherd.jpg",
  conservator: "/images/xq/conservator.jpg",
  "institution-builder": "/images/xq/builder.jpg",
  "artisan-reformer": "/images/xq/artisan.jpg",
  catalyst: "/images/xq/catalyst.jpg",
  designer: "/images/xq/designer.jpg",
  architect: "/images/xq/architect.jpg",
};

const WORK = [
  { title: "What they protect", slot: "Placeholder. One line on what this character guards." },
  { title: "Who they build for", slot: "Placeholder. One line on who the work is for." },
  { title: "How they make the work", slot: "Placeholder. One line on craft or scale." },
] as const;

export function generateStaticParams() {
  return XQ_CHARACTER_PAGES.map((character) => ({ slug: character.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const character = characterBySlug(slug);
  const copy = character ? ARCHETYPE_PAGE_COPY[character.slug] : undefined;
  if (!character || !copy) return { title: "Character" };
  return {
    title: character.name,
    description: copy.description,
  };
}

export default async function XqCharacterPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const character = characterBySlug(slug);
  const copy = character ? ARCHETYPE_PAGE_COPY[character.slug] : undefined;
  if (!character || !copy) notFound();

  const poles = characterPoleMarks(character.code);
  const neighbors = characterNeighbors(character.code);

  return (
    <XqFrame>
      <header className={`${styles.hero} ${styles.typeHero}`}>
        <figure className={`${styles.plate} ${styles.typeFigure}`}>
          <img
            className={styles.plateImage}
            src={PLATE[character.slug]}
            alt={`Illustration of the ${character.name}`}
          />
        </figure>
        <div className={styles.typeCopy}>
          <p className={styles.kicker}>{character.name}</p>
          <h1 className={styles.h1}>{copy.h1}</h1>
          <p className={styles.lede}>{copy.subheadline}</p>
          <ul className={styles.chips}>
            {poles.map((pole) => (
              <li key={pole.leftShort} className={styles.chip}>
                {pole.activeIsLeft ? pole.leftShort : pole.rightShort}
              </li>
            ))}
          </ul>
        </div>
      </header>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Section · Description</p>
        <p className={styles.body}>{copy.description}</p>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Section · Poles</p>
        <h2 className={styles.h2}>Where they sit</h2>
        <ul className={styles.poles}>
          {poles.map((pole) => (
            <li key={pole.leftShort} className={styles.pole}>
              <div className={styles.poleBar}>
                <p className={pole.activeIsLeft ? styles.poleEndOn : styles.poleEnd}>
                  {pole.leftShort}
                </p>
                <div className={styles.poleTrack} aria-hidden="true">
                  <span
                    className={
                      pole.activeIsLeft ? styles.poleFillLeft : styles.poleFillRight
                    }
                  />
                </div>
                <p className={pole.activeIsLeft ? styles.poleEnd : styles.poleEndOn}>
                  {pole.rightShort}
                </p>
              </div>
              <p className={styles.poleNote}>
                {pole.left} ↔ {pole.right}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Section · How they work</p>
        <h2 className={styles.h2}>How they work</h2>
        <ul className={styles.steps}>
          {WORK.map((block) => (
            <li key={block.title} className={styles.step}>
              <h3 className={styles.cardTitle}>{block.title}</h3>
              <p className={styles.placeholder}>{block.slot}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Section · Strengths and hard edge</p>
        <h2 className={styles.h2}>What they bring</h2>
        <div className={styles.split}>
          <article className={styles.card}>
            <h3 className={styles.cardTitle}>Strengths</h3>
            <p className={styles.placeholder}>
              Placeholder. What {character.name} brings to a partnership.
            </p>
          </article>
          <article className={styles.card}>
            <h3 className={styles.cardTitle}>The hard edge</h3>
            <p className={styles.placeholder}>
              Placeholder. Where a partnership with {character.name} feels the friction.
            </p>
          </article>
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Section · Neighbors</p>
        <h2 className={styles.h2}>One pole away</h2>
        <ul className={styles.steps}>
          {neighbors.map((neighbor) => (
            <li key={neighbor.slug}>
              <Link className={styles.card} href={xqPath(`character/${neighbor.slug}`)}>
                <p className={styles.plateLabel}>Placeholder</p>
                <h3 className={styles.cardTitle}>{neighbor.name}</h3>
                <p className={styles.cardText}>{neighbor.code}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Section · Close</p>
        <div className={styles.close}>
          <Link className={`${styles.cta} ${styles.ctaDark}`} href={XQ_LANDING.quizHref}>
            {XQ_LANDING.quizLabel}
          </Link>
          <Link className={styles.back} href={xqPath("character")}>
            All characters
          </Link>
        </div>
      </section>
    </XqFrame>
  );
}

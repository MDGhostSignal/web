import Link from "next/link";

import { XQCharacter3D } from "@/components/xq/XQCharacter3D";
import { XQSpectrumMap } from "@/components/xq/XQSpectrumMap";
import {
  AXIS_CHIP,
  CHARACTER_ORDER,
  CHARACTERS,
} from "@/lib/xq/characters";
import { ARCHETYPES, type ArchetypeCode } from "@/lib/xq/constants";

import styles from "./xq-characters2.module.css";

/**
 * /xq-characters2 — gallery of the 8 XQ archetypes rendered as
 * dimensional 3D-style SVG illustrations. Mirrors the structure of
 * /xq-characters but every illustration slot uses XQCharacter3D
 * instead of the line-art XQCharacter.
 */
export default function XQCharacters2Page() {
  const continuityCodes = CHARACTER_ORDER.filter((c) => c.startsWith("C"));
  const changeCodes = CHARACTER_ORDER.filter((c) => c.startsWith("X"));

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.eyebrow}>The XQ Conviction Index · 3D</div>
        <h1 className={styles.title}>The Eight Archetypes</h1>
        <p className={styles.lede}>
          The same eight archetypes from the line-art gallery, rendered
          here as dimensional SVG illustrations with layered shading and
          isometric perspective. Use this surface to compare the two
          visual languages side-by-side.
        </p>
        <div className={styles.headerLinks}>
          <Link href="/xq-quiz" className={styles.primaryCta}>
            Take the Conviction Quotient →
          </Link>
          <Link href="/xq-characters" className={styles.secondaryLink}>
            ← View the line-art gallery
          </Link>
        </div>
      </header>

      <section className={styles.group}>
        <div className={styles.groupHeader}>
          <span className={styles.groupTag}>Quartet I</span>
          <h2 className={styles.groupTitle}>Continuity</h2>
          <p className={styles.groupLede}>
            Rooted, durable, protective of what is good. These four
            archetypes anchor to lineage and build slowly.
          </p>
        </div>
        <div className={styles.grid}>
          {continuityCodes.map((code) => (
            <ArchetypeCard key={code} code={code} />
          ))}
        </div>
      </section>

      <section className={styles.group}>
        <div className={styles.groupHeader}>
          <span className={styles.groupTag}>Quartet II</span>
          <h2 className={styles.groupTitle}>Change</h2>
          <p className={styles.groupLede}>
            Disruptive, future-facing, willing to rebuild. These four
            archetypes seek transformation in distinct registers.
          </p>
        </div>
        <div className={styles.grid}>
          {changeCodes.map((code) => (
            <ArchetypeCard key={code} code={code} />
          ))}
        </div>
      </section>

      <section className={styles.mapSection}>
        <div className={styles.mapHeader}>
          <span className={styles.groupTag}>Overview</span>
          <h2 className={styles.groupTitle}>The Spectrum</h2>
          <p className={styles.groupLede}>
            Every archetype is a point on a shared plane. The
            horizontal axis runs from <strong>Continuity</strong> to{" "}
            <strong>Change</strong>; the vertical from{" "}
            <strong>Person</strong> to <strong>System</strong>. Within
            each quadrant, <strong>Craft</strong> archetypes sit
            nearer the centre and <strong>Leverage</strong> archetypes
            push toward the outer corners.
          </p>
        </div>
        <div className={styles.mapWrap}>
          <XQSpectrumMap variant="3d" />
        </div>
      </section>

      <footer className={styles.footer}>
        <p className={styles.footerNote}>
          3D variant — gradient-shaded SVG with layered shapes and soft
          drop shadows. Iterate per character independently.
        </p>
      </footer>
    </main>
  );
}

/* ---------------------------------------------------------------- */

function ArchetypeCard({ code }: { code: ArchetypeCode }) {
  const character = CHARACTERS[code];
  const archetype = ARCHETYPES[code];
  const [a1, a2, a3] = code.split("-") as ["C" | "X", "P" | "S", "C" | "L"];

  return (
    <article
      className={styles.card}
      style={{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ["--card-accent" as any]: character.accent,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ["--card-accent-soft" as any]: character.accentSoft,
      }}
    >
      <Link
        href={`/xq-characters2/${code}`}
        className={styles.cardIllustration}
        aria-label={`Preview the ${archetype.name} 3D illustration`}
      >
        <XQCharacter3D code={code} />
        <span className={styles.previewHint}>Preview reveal →</span>
      </Link>
      <div className={styles.cardBody}>
        <div className={styles.cardHeader}>
          <span className={styles.codeChip}>{code}</span>
          <span className={styles.accentDot} aria-hidden="true" />
        </div>
        <h3 className={styles.cardName}>{archetype.name}</h3>
        <p className={styles.cardTagline}>&ldquo;{archetype.tagline}&rdquo;</p>

        <div className={styles.axisChips}>
          <span className={styles.axisChip}>{AXIS_CHIP.axis1[a1]}</span>
          <span className={styles.axisDivider} aria-hidden="true">
            ·
          </span>
          <span className={styles.axisChip}>{AXIS_CHIP.axis2[a2]}</span>
          <span className={styles.axisDivider} aria-hidden="true">
            ·
          </span>
          <span className={styles.axisChip}>{AXIS_CHIP.axis3[a3]}</span>
        </div>

        <p className={styles.cardDesc}>{archetype.desc}</p>

        <div className={styles.propRow}>
          <span className={styles.propLabel}>Signature prop</span>
          <span className={styles.propValue}>{character.prop}</span>
        </div>

        <p className={styles.brief}>
          <span className={styles.briefLabel}>Visual brief —</span>{" "}
          {character.visualBrief}
        </p>
      </div>
    </article>
  );
}

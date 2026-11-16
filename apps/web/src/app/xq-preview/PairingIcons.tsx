"use client";

import type { ArchetypeCode } from "@/lib/xq/constants";

import { ItemIcon } from "./PreviewMap";
import styles from "./page.module.css";

/** Steward and Architect: one keeps the fire, one opens the room. */
const PAIR: ArchetypeCode[] = ["C-P-C", "X-S-L"];

export function PairingIcons() {
  return (
    <div className={styles.pairingStage} aria-hidden="true">
      {PAIR.map((code) => (
        <div key={code} className={styles.orbitArm}>
          <div className={styles.pairingIcon}>
            <svg className={styles.pairingGlyph} viewBox="0 0 24 24" aria-hidden="true">
              <ItemIcon code={code} />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}

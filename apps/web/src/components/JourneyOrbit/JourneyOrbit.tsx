"use client";

import type { CSSProperties } from "react";

import styles from "./JourneyOrbit.module.css";

export type JourneyOrbitStep = {
  number: string;
  title: string;
  description: string;
};

type Props = {
  steps: readonly JourneyOrbitStep[];
  numberClassName: string;
  titleClassName: string;
  descriptionClassName: string;
  label?: string;
  /** Light sections need a dark ring. Photo sections keep the white one. */
  tone?: "photo" | "light";
};

/**
 * Three step circles on a ring. The ring turns, and each circle
 * counter-turns so the words stay horizontal. Font sizes come from
 * the page that renders it.
 */
export function JourneyOrbit({
  steps,
  numberClassName,
  titleClassName,
  descriptionClassName,
  label = "Membership journey",
  tone = "photo",
}: Props) {
  return (
    <ol
      className={tone === "light" ? `${styles.orbit} ${styles.orbitLight}` : styles.orbit}
      aria-label={label}
    >
      {steps.map((step, index) => (
        <li
          key={step.number}
          className={styles.arm}
          style={{ "--step": index } as CSSProperties}
        >
          <div className={styles.disc}>
            <div className={styles.step}>
              <span className={numberClassName} aria-hidden="true">
                {step.number}
              </span>
              <div className={styles.copy}>
                <h3 className={titleClassName}>{step.title}</h3>
                <p className={descriptionClassName}>{step.description}</p>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

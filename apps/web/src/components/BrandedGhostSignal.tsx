import styles from "./BrandedGhostSignal.module.css";

type Props = {
  /** Optional className for the wrapper span */
  className?: string;
  /** Color variant - defaults to inherit */
  variant?: "light" | "dark" | "inherit";
};

/**
 * BrandedGhostSignal
 *
 * Renders the GhostSignal brand name with proper typography treatment:
 * - "GHOST" in bold, uppercase
 * - "Signal" in thin weight, mixed case
 *
 * Usage:
 *   <BrandedGhostSignal />
 *   <BrandedGhostSignal variant="dark" />
 */
export function BrandedGhostSignal({ className, variant = "inherit" }: Props) {
  return (
    <span className={`${styles.brand} ${styles[variant]} ${className ?? ""}`}>
      <span className={styles.ghost}>GHOST</span>
      <span className={styles.signal}>Signal</span>
    </span>
  );
}

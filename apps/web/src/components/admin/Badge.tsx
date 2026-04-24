import type { ReactNode } from "react";

import styles from "./Badge.module.css";

export type BadgeVariant =
  | "neutral"
  | "accent"
  | "success"
  | "warn"
  | "danger"
  | "info"
  | "creator"
  | "brand";

type Props = {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
};

const variantClass: Record<BadgeVariant, string> = {
  neutral: styles.variantNeutral,
  accent: styles.variantAccent,
  success: styles.variantSuccess,
  warn: styles.variantWarn,
  danger: styles.variantDanger,
  info: styles.variantInfo,
  creator: styles.variantCreator,
  brand: styles.variantBrand,
};

/**
 * Compact uppercase pill badge — the shared language for statuses,
 * clarity scores, type labels, and counts across admin tables. Pairs
 * with helpers below that map common string enums (clarity level,
 * participant type, etc.) onto the right variant.
 */
export function Badge({ variant = "neutral", className, children }: Props) {
  const cls = [styles.badge, variantClass[variant], className]
    .filter(Boolean)
    .join(" ");
  return <span className={cls}>{children}</span>;
}

/**
 * Convenience mapper for the RQ-dashboard clarity field
 * (High / Medium / Low). Keeps the switch out of the page components.
 */
export function clarityVariant(
  value: string | null | undefined,
): BadgeVariant {
  const v = (value ?? "").toLowerCase();
  if (v === "high") return "success";
  if (v === "medium") return "warn";
  if (v === "low") return "danger";
  return "neutral";
}

/**
 * Convenience mapper for participant type (Creator / Brand).
 */
export function typeVariant(value: string | null | undefined): BadgeVariant {
  const v = (value ?? "").toLowerCase();
  if (v === "creator") return "creator";
  if (v === "brand") return "brand";
  return "neutral";
}

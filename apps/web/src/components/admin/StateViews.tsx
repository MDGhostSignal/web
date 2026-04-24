import type { ReactNode } from "react";

import styles from "./StateViews.module.css";

/* ===================================================================== */
/*  Spinner                                                              */
/* ===================================================================== */

type SpinnerProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Accessible label. Defaults to "Loading…". */
  label?: string;
};

export function Spinner({
  size = "md",
  className,
  label = "Loading…",
}: SpinnerProps) {
  const sizeCls =
    size === "sm" ? styles.spinnerSm : size === "lg" ? styles.spinnerLg : "";
  const cls = [styles.spinner, sizeCls, className].filter(Boolean).join(" ");
  return <span className={cls} role="status" aria-label={label} />;
}

/* ===================================================================== */
/*  Loading — full page state (spinner + message)                        */
/* ===================================================================== */

type LoadingProps = {
  message?: string;
};

export function Loading({ message = "Loading…" }: LoadingProps) {
  return (
    <div className={styles.centered}>
      <Spinner size="lg" />
      <p className={styles.centeredBody}>{message}</p>
    </div>
  );
}

/* ===================================================================== */
/*  EmptyState — full-section fallback when there's nothing to show      */
/* ===================================================================== */

type EmptyStateProps = {
  title?: ReactNode;
  message?: ReactNode;
  /** Optional action cluster (usually a primary CTA). */
  action?: ReactNode;
  /** Optional decorative icon above the title. */
  icon?: ReactNode;
};

export function EmptyState({ title, message, action, icon }: EmptyStateProps) {
  return (
    <div className={styles.centered}>
      {icon}
      {title && <h2 className={styles.centeredTitle}>{title}</h2>}
      {message && <p className={styles.centeredBody}>{message}</p>}
      {action}
    </div>
  );
}

/* ===================================================================== */
/*  ErrorCard — inline error banner (can embed in list/modal)            */
/* ===================================================================== */

type ErrorCardProps = {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function ErrorCard({ title, children, className }: ErrorCardProps) {
  const cls = [styles.errorCard, className].filter(Boolean).join(" ");
  return (
    <div className={cls} role="alert">
      <div>
        {title && <div className={styles.errorCardTitle}>{title}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
}

/* ===================================================================== */
/*  ErrorPage — full page fallback when a fetch fails entirely           */
/* ===================================================================== */

type ErrorPageProps = {
  title?: ReactNode;
  message: ReactNode;
  action?: ReactNode;
};

export function ErrorPage({
  title = "Something went wrong",
  message,
  action,
}: ErrorPageProps) {
  return (
    <div className={styles.centered}>
      <h2 className={styles.centeredTitle}>{title}</h2>
      <p className={styles.centeredBody}>{message}</p>
      {action}
    </div>
  );
}

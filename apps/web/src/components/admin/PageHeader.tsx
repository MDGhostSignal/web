import type { ReactNode } from "react";

import styles from "./PageHeader.module.css";

type Props = {
  title: ReactNode;
  /** Optional count pill next to the title, e.g. "42 members". */
  count?: ReactNode;
  /** Optional small line under the title. */
  subtitle?: ReactNode;
  /** Right-aligned action cluster (primary CTA + filters). */
  actions?: ReactNode;
  /** Secondary row under the title row — typically the search input +
      tab switchers. */
  toolbar?: ReactNode;
  className?: string;
};

/**
 * Common page header used across admin surfaces. Left side: title +
 * optional count badge + optional subtitle. Right side: action cluster.
 * Optional toolbar row beneath for search / tabs / filters.
 */
export function PageHeader({
  title,
  count,
  subtitle,
  actions,
  toolbar,
  className,
}: Props) {
  const cls = [styles.header, className].filter(Boolean).join(" ");
  return (
    <header className={cls}>
      <div className={styles.topRow}>
        <div>
          <div className={styles.titleCluster}>
            <h1 className={styles.title}>{title}</h1>
            {count}
          </div>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {toolbar && <div className={styles.toolbar}>{toolbar}</div>}
    </header>
  );
}

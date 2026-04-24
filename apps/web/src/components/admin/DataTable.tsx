"use client";

import { Fragment, type ReactNode } from "react";

import styles from "./DataTable.module.css";

export type ColumnVariant =
  | "default"
  | "mono"
  | "muted"
  | "truncate"
  | "nowrap"
  | "numeric";

export type Column<Row> = {
  /** Unique key — also used as stable React key when mapping cells. */
  key: string;
  /** Header cell content. Pass empty string for no header label. */
  header: ReactNode;
  /** Renderer for a row's cell content. */
  cell: (row: Row, rowIndex: number) => ReactNode;
  /** Visual variant applied to the <td>. */
  variant?: ColumnVariant;
  /** Optional width hint (CSS value). Applied via inline style. */
  width?: string;
  /** Optional explicit className applied to both <th> and <td>. */
  className?: string;
};

type Props<Row> = {
  /** Row data. `getRowId` extracts the stable key; defaults to `row.id`. */
  rows: Row[];
  columns: Column<Row>[];
  /** Returns a stable id for a row. */
  getRowId?: (row: Row) => string;
  /** If present, rows are clickable and expand. The component manages
      expansion state via `expandedRowId` + `onToggleRow` — consumer
      holds state so they can coordinate with external triggers. */
  expandedRowId?: string | null;
  onToggleRow?: (id: string) => void;
  /** Renders additional content underneath the expanded row (colSpan
      spans the whole table). Omit to get a simple non-expanding table. */
  renderExpanded?: (row: Row) => ReactNode;
  /** Accessible caption (visually hidden). */
  caption?: string;
  className?: string;
};

const variantClass: Record<ColumnVariant, string> = {
  default: "",
  mono: styles.colMono,
  muted: styles.colMuted,
  truncate: styles.colTruncate,
  nowrap: styles.colNowrap,
  numeric: styles.colNumeric,
};

/**
 * Data-table primitive for admin lists. Takes a flat `rows` array and
 * a column config; optionally renders an expanded panel under each row
 * when `renderExpanded` is provided.
 *
 * Consumer controls expansion state so it can be coordinated with
 * external UI (detail sidebars, routing, etc.).
 */
export function DataTable<Row>({
  rows,
  columns,
  getRowId = (row: Row) => (row as { id?: string }).id ?? "",
  expandedRowId,
  onToggleRow,
  renderExpanded,
  caption,
  className,
}: Props<Row>) {
  const isExpandable = Boolean(renderExpanded && onToggleRow);
  const tableCls = [
    styles.table,
    isExpandable ? "" : styles.tableStatic,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const colCount = columns.length;

  return (
    <div className={styles.wrap}>
      <table className={tableCls}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className={styles.thead}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={[styles.th, col.className].filter(Boolean).join(" ")}
                style={col.width ? { width: col.width } : undefined}
                scope="col"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const id = getRowId(row);
            const isExpanded = expandedRowId === id;
            return (
              <Fragment key={id || rowIndex}>
                <tr
                  className={[
                    styles.tbodyTr,
                    isExpanded ? styles.expanded : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={
                    isExpandable && onToggleRow
                      ? () => onToggleRow(id)
                      : undefined
                  }
                >
                  {columns.map((col) => {
                    const vCls = variantClass[col.variant ?? "default"];
                    return (
                      <td
                        key={col.key}
                        className={[styles.td, vCls, col.className]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {col.cell(row, rowIndex)}
                      </td>
                    );
                  })}
                </tr>
                {isExpandable && isExpanded && renderExpanded && (
                  <tr className={styles.detailsRow}>
                    <td colSpan={colCount}>
                      <div className={styles.detailsPanel}>
                        {renderExpanded(row)}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------- */
/*  Helpers for the expanded details panel — consumers use these to get */
/*  the same section layout the RQ dashboard currently uses.            */
/* -------------------------------------------------------------------- */

type DetailsGridProps = { children: ReactNode; className?: string };
export function DetailsGrid({ children, className }: DetailsGridProps) {
  const cls = [styles.detailsGrid, className].filter(Boolean).join(" ");
  return <div className={cls}>{children}</div>;
}

type DetailsSectionProps = { title?: ReactNode; children: ReactNode };
export function DetailsSection({ title, children }: DetailsSectionProps) {
  return (
    <div className={styles.detailsSection}>
      {title && <h4>{title}</h4>}
      {children}
    </div>
  );
}

type DetailsActionsProps = { children: ReactNode };
export function DetailsActions({ children }: DetailsActionsProps) {
  return <div className={styles.detailsActions}>{children}</div>;
}

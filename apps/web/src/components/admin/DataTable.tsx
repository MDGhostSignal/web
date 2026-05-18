"use client";

import { Fragment, type ReactNode, useMemo, useState } from "react";

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
  /** Ascending-direction comparator. Presence makes the column header
   *  a clickable sort toggle: 1st click → asc, 2nd click → desc, 3rd
   *  click → asc again. DataTable flips the result for desc internally
   *  so callers only have to write the asc comparator. */
  sort?: (a: Row, b: Row) => number;
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
  /** Optional per-row className. Useful for marking rows visually
      distinct without subclassing the table (e.g. grayed-out graduated
      leads on /admin/leads). Applied alongside the default `.tbodyTr`. */
  rowClassName?: (row: Row, index: number) => string | undefined;
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
  rowClassName,
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

  // Sort state lives inside the table so consumers don't have to plumb
  // it through their own state. Clicking a sortable header cycles
  // direction (asc → desc → asc). Clicking a different sortable header
  // resets direction to asc on the new column.
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const displayRows = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sort) return rows;
    const cmp = col.sort;
    const sorted = [...rows].sort(cmp);
    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [rows, columns, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className={styles.wrap}>
      <table className={tableCls}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className={styles.thead}>
          <tr>
            {columns.map((col) => {
              const isActive = sortKey === col.key;
              const ariaSort = !col.sort
                ? undefined
                : isActive
                  ? sortDir === "asc"
                    ? "ascending"
                    : "descending"
                  : "none";
              return (
                <th
                  key={col.key}
                  className={[styles.th, col.className].filter(Boolean).join(" ")}
                  style={col.width ? { width: col.width } : undefined}
                  scope="col"
                  aria-sort={ariaSort}
                >
                  {col.sort ? (
                    <button
                      type="button"
                      className={[
                        styles.thSort,
                        isActive ? styles.thSortActive : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => toggleSort(col.key)}
                    >
                      <span>{col.header}</span>
                      <span className={styles.thSortGlyph} aria-hidden="true">
                        {isActive ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, rowIndex) => {
            const id = getRowId(row);
            const isExpanded = expandedRowId === id;
            return (
              <Fragment key={id || rowIndex}>
                <tr
                  data-row-id={id}
                  className={[
                    styles.tbodyTr,
                    isExpanded ? styles.expanded : "",
                    rowClassName?.(row, rowIndex) ?? "",
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

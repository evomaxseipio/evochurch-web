"use client";

import type { ReactNode } from "react";

export type DataTableColumn<T> = {
  key: string;
  label: string;
  width?: string | number;
  align?: "left" | "right" | "center";
  className?: string;
  render: (row: T) => ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowStyle,
  actions,
  actionsLabel = "Acciones",
  actionsPosition = "start",
  onRowClick,
  empty,
  footer,
  style,
  wrapClassName,
  tableClassName,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowStyle?: (row: T) => React.CSSProperties | undefined;
  actions?: (row: T) => ReactNode;
  actionsLabel?: string;
  actionsPosition?: "start" | "end";
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  footer?: ReactNode;
  style?: React.CSSProperties;
  wrapClassName?: string;
  tableClassName?: string;
}) {
  const actionHeader = actions ? (
    <th className="col-actions" style={{ width: 1 }}>
      {actionsLabel}
    </th>
  ) : null;

  return (
    <div
      className={`table-wrap${wrapClassName ? ` ${wrapClassName}` : ""}`}
      style={style}
    >
      <table className={`table${tableClassName ? ` ${tableClassName}` : ""}`}>
        <thead>
          <tr>
            {actionsPosition === "start" ? actionHeader : null}
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  width: col.width,
                  textAlign: col.align ?? "left",
                }}
              >
                {col.label}
              </th>
            ))}
            {actionsPosition === "end" ? actionHeader : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const customStyle = rowStyle?.(row);
            return (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={{
                ...(onRowClick ? { cursor: "pointer" } : undefined),
                ...customStyle,
              }}
            >
              {actionsPosition === "start" && actions ? (
                <td
                  className="col-actions"
                  onClick={onRowClick ? (e) => e.stopPropagation() : undefined}
                >
                  {actions(row)}
                </td>
              ) : null}
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={col.className}
                  style={{ textAlign: col.align ?? "left" }}
                >
                  {col.render(row)}
                </td>
              ))}
              {actionsPosition === "end" && actions ? (
                <td
                  className="col-actions"
                  onClick={onRowClick ? (e) => e.stopPropagation() : undefined}
                >
                  {actions(row)}
                </td>
              ) : null}
            </tr>
            );
          })}
        </tbody>
      </table>

      {rows.length === 0 && empty ? (
        <div style={{ padding: 48, textAlign: "center" }}>{empty}</div>
      ) : null}

      {rows.length > 0 && footer ? footer : null}
    </div>
  );
}

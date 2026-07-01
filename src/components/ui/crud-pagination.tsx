"use client";

import { Icons } from "@/components/icons";
import { useMemo } from "react";

const SIZE_OPTIONS = [10, 15, 25, 50] as const;

export function CrudPagination({
  page,
  totalPages,
  total,
  pageStart,
  pageEnd,
  pageSize,
  onPage,
  onPageSize,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageStart: number;
  pageEnd: number;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  const pageButtons = useMemo(() => {
    const set = new Set([1, totalPages, page, page - 1, page + 1]);
    const list = [...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
    const out: (number | "…")[] = [];
    for (let i = 0; i < list.length; i++) {
      if (i > 0 && list[i] - list[i - 1] > 1) out.push("…");
      out.push(list[i]);
    }
    return out;
  }, [page, totalPages]);

  return (
    <div
      className="card flat"
      style={{
        marginTop: 14,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div className="row" style={{ gap: 12, alignItems: "center" }}>
        <span className="tiny muted">
          Mostrando{" "}
          <b style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>
            {total === 0 ? 0 : pageStart + 1}
          </b>
          {" – "}
          <b style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>
            {pageEnd}
          </b>
          {" de "}
          <b style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>
            {total.toLocaleString("es-DO")}
          </b>{" "}
          registros
        </span>
        <span style={{ width: 1, height: 18, background: "var(--line)" }} />
        <label className="row" style={{ gap: 6, fontSize: 12, color: "var(--muted)" }}>
          Filas
          <select
            className="select"
            style={{ padding: "4px 8px", width: "auto", fontSize: 12 }}
            value={pageSize}
            onChange={(e) => onPageSize(Number.parseInt(e.target.value, 10))}
          >
            {SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="row" style={{ gap: 4 }}>
        <button
          type="button"
          className="btn outline sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <span style={{ display: "inline-block", transform: "rotate(90deg)" }}>
            <Icons.arrowDn width={12} />
          </span>
          Anterior
        </button>
        {pageButtons.map((b, i) =>
          b === "…" ? (
            <span
              key={`e${i}`}
              style={{
                padding: "0 6px",
                color: "var(--dim)",
                fontFamily: "var(--font-mono)",
              }}
            >
              …
            </span>
          ) : (
            <button
              key={b}
              type="button"
              onClick={() => onPage(b)}
              className={`btn sm ${b === page ? "primary" : "outline"}`}
              style={{
                minWidth: 32,
                padding: "5px 0",
                fontFamily: "var(--font-mono)",
              }}
            >
              {b}
            </button>
          ),
        )}
        <button
          type="button"
          className="btn outline sm"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Siguiente
          <span style={{ display: "inline-block", transform: "rotate(-90deg)" }}>
            <Icons.arrowDn width={12} />
          </span>
        </button>
      </div>
    </div>
  );
}

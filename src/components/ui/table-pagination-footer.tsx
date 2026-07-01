"use client";

/** Paginación integrada en `table-wrap`, como mockup/screens-3.jsx transacciones */
export function TablePaginationFooter({
  page,
  totalPages,
  total,
  pageStart,
  pageEnd,
  noun = "registros",
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageStart: number;
  pageEnd: number;
  noun?: string;
  onPage: (page: number) => void;
}) {
  return (
    <div
      style={{
        padding: "14px 18px",
        borderTop: "1px solid var(--hairline, var(--line))",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div className="tiny muted">
        Mostrando {pageEnd === 0 ? 0 : pageStart + 1} – {pageEnd} de {total}{" "}
        {noun}
      </div>
      <div className="row" style={{ gap: 6 }}>
        <button
          type="button"
          className="btn outline sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          ← Anterior
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            className={`btn sm ${p === page ? "primary" : "outline"}`}
            style={{
              minWidth: 32,
              padding: "5px 0",
              fontFamily: "var(--font-mono)",
            }}
            onClick={() => onPage(p)}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          className="btn outline sm"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}

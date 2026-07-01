"use client";

import { Icons } from "@/components/icons";

/** Encabezado reutilizable — periodo vive en el filtro de mes, no en el título. */
export function FinPageHeader({
  eyebrow,
  title,
  subtitle,
  onExportPdf,
  onExportExcel,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  onExportPdf: () => void;
  onExportExcel: () => void;
}) {
  return (
    <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1
          className="display"
          style={{
            fontSize: 40,
            margin: "4px 0 6px",
            letterSpacing: "-0.025em",
          }}
        >
          {title}
        </h1>
        <p className="muted" style={{ margin: 0 }}>
          {subtitle}
        </p>
      </div>
      <div className="row">
        <button type="button" className="btn outline" onClick={onExportPdf}>
          <Icons.download size={16} /> PDF
        </button>
        <button type="button" className="btn outline" onClick={onExportExcel}>
          <Icons.download size={16} /> Excel
        </button>
      </div>
    </div>
  );
}

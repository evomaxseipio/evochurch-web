"use client";

export function CatalogStatusChip({ active }: { active: boolean }) {
  return (
    <span className={`chip ${active ? "green" : ""}`}>
      <span className="pip" /> {active ? "Activo" : "Inactivo"}
    </span>
  );
}

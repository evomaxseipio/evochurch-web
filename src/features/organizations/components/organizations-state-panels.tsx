"use client";

import { AlertCircle, Building2 } from "lucide-react";

export function OrganizationsEmptyState({
  onCreate,
  hasFilters,
}: {
  onCreate: () => void;
  hasFilters: boolean;
}) {
  return (
    <div className="card flat">
      <div className="bo-state-panel">
        <div className="bo-state-icon">
          <Building2 size={28} />
        </div>
        <div className="bo-state-title">
          {hasFilters
            ? "No hay organizaciones que coincidan"
            : "Empieza captando tu primera organización"}
        </div>
        <p className="bo-state-desc">
          {hasFilters
            ? "Prueba con otros filtros o términos de búsqueda."
            : "Registra iglesias y otras organizaciones para dar seguimiento comercial y convertirlas en clientes."}
        </p>
        {!hasFilters ? (
          <button type="button" className="btn primary" onClick={onCreate}>
            Nueva organización
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function OrganizationsErrorState({
  message,
  onRetry,
  title = "No se pudieron cargar las organizaciones",
}: {
  message: string;
  onRetry: () => void;
  title?: string;
}) {
  return (
    <div className="card flat">
      <div className="bo-state-panel">
        <div className="bo-state-icon error">
          <AlertCircle size={28} />
        </div>
        <div className="bo-state-title">{title}</div>
        <p className="bo-state-desc">{message}</p>
        <button type="button" className="btn primary" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    </div>
  );
}

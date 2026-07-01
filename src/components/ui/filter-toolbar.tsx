"use client";

import { Icons } from "@/components/icons";
import type { ReactNode } from "react";

export type FilterChip<T extends string = string> = {
  key: T;
  label: string;
};

function FilterChips<T extends string>({
  filters,
  activeFilter,
  onFilterChange,
}: {
  filters: FilterChip<T>[];
  activeFilter: T;
  onFilterChange: (key: T) => void;
}) {
  return (
    <div
      className="row"
      style={{
        gap: 4,
        padding: 4,
        background: "var(--surface-2)",
        borderRadius: 10,
        flexWrap: "wrap",
      }}
    >
      {filters.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onFilterChange(key)}
          className="btn sm"
          style={{
            background:
              activeFilter === key ? "var(--surface)" : "transparent",
            color: activeFilter === key ? "var(--ink)" : "var(--ink-3)",
            boxShadow: activeFilter === key ? "var(--shadow-1)" : "none",
            fontWeight: 500,
            padding: "6px 12px",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function FilterToolbar<T extends string = string>({
  query,
  onQueryChange,
  queryPlaceholder = "Buscar…",
  filters,
  activeFilter,
  onFilterChange,
  middle,
  trailing,
  maxSearchWidth = 320,
  compactSearch = false,
  style,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  queryPlaceholder?: string;
  filters?: FilterChip<T>[];
  activeFilter?: T;
  onFilterChange?: (key: T) => void;
  /** Controles entre búsqueda y filtros (p. ej. fondo, fecha). */
  middle?: ReactNode;
  trailing?: ReactNode;
  maxSearchWidth?: number;
  /** Búsqueda de ancho fijo; deja espacio para controles intermedios. */
  compactSearch?: boolean;
  style?: React.CSSProperties;
}) {
  const filterChips =
    filters && filters.length > 0 && onFilterChange && activeFilter != null ? (
      <FilterChips
        filters={filters}
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
      />
    ) : null;

  const useExtendedLayout = compactSearch || middle != null;

  return (
    <div
      className="card flat filter-toolbar"
      style={{
        padding: 14,
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        alignItems: "center",
        marginBottom: 14,
        ...style,
      }}
    >
      <div
        className="search"
        style={
          useExtendedLayout
            ? { width: maxSearchWidth, minWidth: 280, flexShrink: 0 }
            : { flex: 1, minWidth: 220, maxWidth: maxSearchWidth }
        }
      >
        <Icons.search size={16} stroke="var(--ink-3)" />
        <input
          placeholder={queryPlaceholder}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>

      {middle}

      {useExtendedLayout ? (
        <>
          <div style={{ flex: 1, minWidth: 16 }} aria-hidden />
          {filterChips}
          {trailing}
        </>
      ) : (
        <>
          {filterChips}
          {trailing}
        </>
      )}
    </div>
  );
}

"use client";

import { Icons } from "@/components/icons";

export function TableRowActions({
  onEdit,
  onDelete,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="row" style={{ gap: 4 }}>
      {onEdit ? (
        <button
          type="button"
          className="btn ghost icon-only sm"
          onClick={onEdit}
          title="Editar"
          aria-label="Editar"
        >
          <Icons.edit size={14} />
        </button>
      ) : null}
      {onDelete ? (
        <button
          type="button"
          className="btn ghost icon-only sm"
          onClick={onDelete}
          title="Eliminar"
          aria-label="Eliminar"
        >
          <Icons.trash size={14} />
        </button>
      ) : null}
    </div>
  );
}

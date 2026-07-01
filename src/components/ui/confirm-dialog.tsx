"use client";

import { Icons } from "@/components/icons";

export function ConfirmDialog({
  title,
  message,
  itemName,
  onConfirm,
  onClose,
  pending,
}: {
  title: string;
  message: string;
  itemName?: string;
  onConfirm: () => void;
  onClose: () => void;
  pending?: boolean;
}) {
  return (
    <>
      <div
        className="drawer-backdrop"
        style={{ zIndex: 60 }}
        onClick={pending ? undefined : onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-labelledby="confirm-dialog-title"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 61,
          background: "var(--bg-1)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
          padding: 24,
          width: 420,
          maxWidth: "92vw",
          boxShadow: "var(--shadow-3)",
        }}
      >
        <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              flexShrink: 0,
              background: "color-mix(in oklab, var(--danger) 16%, transparent)",
              color: "var(--danger)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icons.trash size={18} />
          </span>
          <div>
            <h3 id="confirm-dialog-title" style={{ margin: 0, fontSize: 16 }}>
              {title}
            </h3>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
              {message}
            </p>
            {itemName && (
              <div className="chip" style={{ marginTop: 10 }}>{itemName}</div>
            )}
          </div>
        </div>
        <div
          className="row"
          style={{ marginTop: 20, justifyContent: "flex-end", gap: 8 }}
        >
          <button
            type="button"
            className="btn outline"
            onClick={onClose}
            disabled={pending}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn danger"
            onClick={onConfirm}
            disabled={pending}
          >
            <Icons.trash size={14} /> Eliminar
          </button>
        </div>
      </div>
    </>
  );
}

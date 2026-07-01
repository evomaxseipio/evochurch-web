"use client";

import {
  saveFundAction,
  type FundActionResult,
} from "@/app/(app)/finances/funds/actions";
import { Icons } from "@/components/icons";
import { CrudSwitch } from "@/components/ui/crud-switch";
import { useActionToast } from "@/hooks/use-action-toast";
import type { Fund } from "@/lib/funds/types";
import { useActionState, useEffect, useState, startTransition } from "react";

const initial: FundActionResult | null = null;

type FundFormValues = {
  name: string;
  description: string;
  goal: string;
  balance: string;
  startDate: string;
  endDate: string;
  active: boolean;
  primary: boolean;
};

function MoneyInput({
  value,
  onChange,
  placeholder,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hasError?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  const fmt = (n: string) =>
    n === "" || n === undefined || n === null
      ? ""
      : Number(n).toLocaleString("es-DO", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

  return (
    <div className={`input-wrap${hasError ? " error" : ""}`}>
      <span
        className="tnum"
        style={{
          color: "var(--ink-3)",
          fontWeight: 600,
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        RD$
      </span>
      <input
        type={focused ? "number" : "text"}
        inputMode="decimal"
        min="0"
        value={focused ? (value === "" ? "" : value) : fmt(value)}
        placeholder={placeholder || "0.00"}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value)}
        style={{ minWidth: 0 }}
      />
    </div>
  );
}

function fundToFormValues(fund: Fund | null): FundFormValues {
  return {
    name: fund?.name ?? "",
    description: fund?.description ?? "",
    goal: fund?.targetAmount ? String(fund.targetAmount) : "",
    balance: fund?.totalContributions ? String(fund.totalContributions) : "",
    startDate: fund?.startDate ?? "",
    endDate: fund?.endDate ?? "",
    active: fund?.isActive ?? true,
    primary: fund?.isPrimary ?? false,
  };
}

export function FundFormDrawer({
  mode,
  fund,
  open,
  onClose,
}: {
  mode: "new" | "edit";
  fund: Fund | null;
  open: boolean;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveFundAction, initial);
  const [v, setV] = useState<FundFormValues>(() => fundToFormValues(fund));
  const [errs, setErrs] = useState<Record<string, string>>({});

  const upd = <K extends keyof FundFormValues>(k: K, val: FundFormValues[K]) =>
    setV((s) => ({ ...s, [k]: val }));

  useEffect(() => {
    if (!open) return;
    setV(fundToFormValues(fund));
    setErrs({});
  }, [open, fund]);

  useActionToast(state, {
    successMessage:
      mode === "new"
        ? "Fondo creado correctamente."
        : "Fondo actualizado correctamente.",
    onSuccess: onClose,
  });

  if (!open) return null;

  const pct =
    v.goal && +v.goal > 0
      ? Math.min(100, (+(v.balance || 0) / +v.goal) * 100)
      : 0;

  function submit() {
    const e: Record<string, string> = {};
    if (!v.name.trim()) e.name = "Obligatorio";
    if (v.goal === "" || +v.goal <= 0) e.goal = "Meta inválida";
    if (!v.startDate) e.startDate = "Obligatorio";
    setErrs(e);
    if (Object.keys(e).length) return;

    const fd = new FormData();
    if (fund?.fundId) fd.set("fundId", fund.fundId);
    fd.set("name", v.name.trim());
    fd.set("description", v.description.trim());
    fd.set("targetAmount", v.goal);
    fd.set("totalContributions", v.balance || "0");
    fd.set("startDate", v.startDate);
    fd.set("endDate", v.endDate);
    fd.set("isActive", v.active ? "true" : "false");
    fd.set("isPrimary", v.primary ? "true" : "false");
    startTransition(() => {
      formAction(fd);
    });
  }

  return (
    <>
      <div className="drawer-backdrop" onClick={pending ? undefined : onClose} />
      <div className="drawer" role="dialog" aria-labelledby="fund-form-title">
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <div className="eyebrow">
              {mode === "new" ? "Nuevo registro" : "Edición"}
            </div>
            <h2 id="fund-form-title" style={{ margin: "4px 0 0", fontSize: 18 }}>
              {mode === "new" ? "Nuevo fondo" : "Editar fondo"}
            </h2>
          </div>
          <button
            type="button"
            className="btn ghost icon-only"
            onClick={onClose}
            disabled={pending}
            aria-label="Cerrar"
          >
            <Icons.x size={18} />
          </button>
        </div>

        <div className="drawer-body col gap-md">
          <div className="field">
            <label>
              Nombre del fondo{" "}
              <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <div className={`input-wrap ${errs.name ? "error" : ""}`}>
              <input
                value={v.name}
                placeholder="Ej. Construcción del Templo"
                onChange={(e) => upd("name", e.target.value)}
              />
            </div>
            {errs.name && <div className="help error">{errs.name}</div>}
          </div>

          <div className="field">
            <label>Descripción</label>
            <div
              className="input-wrap"
              style={{ alignItems: "flex-start", padding: "10px 12px" }}
            >
              <textarea
                rows={3}
                value={v.description}
                placeholder="¿Para qué es este fondo?"
                onChange={(e) => upd("description", e.target.value)}
              />
            </div>
          </div>

          <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
            <div className="field" style={{ flex: "1 1 140px", minWidth: 0 }}>
              <label>
                Meta <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <MoneyInput
                value={v.goal}
                onChange={(val) => upd("goal", val)}
                hasError={!!errs.goal}
              />
              {errs.goal && <div className="help error">{errs.goal}</div>}
            </div>
            <div className="field" style={{ flex: "1 1 140px", minWidth: 0 }}>
              <label>Recaudado</label>
              <MoneyInput
                value={v.balance}
                onChange={(val) => upd("balance", val)}
              />
            </div>
          </div>

          {v.goal && +v.goal > 0 && (
            <div>
              <div className="row between" style={{ marginBottom: 6 }}>
                <span className="tiny muted">Avance hacia la meta</span>
                <span
                  className="tnum mono"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: pct >= 100 ? "var(--success)" : "var(--accent)",
                  }}
                >
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div
                style={{
                  height: 7,
                  background: "var(--surface-2)",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    borderRadius: 999,
                    background:
                      pct >= 100 ? "var(--success)" : "var(--accent)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          )}

          <div className="row" style={{ gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>
                Fecha inicio <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <div className={`input-wrap ${errs.startDate ? "error" : ""}`}>
                <input
                  type="date"
                  value={v.startDate}
                  onChange={(e) => upd("startDate", e.target.value)}
                />
              </div>
              {errs.startDate && (
                <div className="help error">{errs.startDate}</div>
              )}
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Fecha fin</label>
              <div className="input-wrap">
                <input
                  type="date"
                  value={v.endDate}
                  onChange={(e) => upd("endDate", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div
            className="row between"
            style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}
          >
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>Fondo activo</div>
              <div className="tiny muted">
                Si está inactivo, no aparece al registrar movimientos.
              </div>
            </div>
            <CrudSwitch on={v.active} onChange={(val) => upd("active", val)} />
          </div>

          <div
            className="row between"
            style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}
          >
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>
                Marcar como primario
              </div>
              <div className="tiny muted">
                El fondo primario recibe los ingresos por defecto.
              </div>
            </div>
            <CrudSwitch on={v.primary} onChange={(val) => upd("primary", val)} />
          </div>
        </div>

        <div className="drawer-foot">
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
            className="btn primary"
            onClick={submit}
            disabled={pending}
          >
            <Icons.check size={14} />
            {pending
              ? "Guardando…"
              : mode === "new"
                ? "Crear fondo"
                : "Guardar cambios"}
          </button>
        </div>
      </div>
    </>
  );
}

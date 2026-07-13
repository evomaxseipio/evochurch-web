"use client";

import {
  saveLedgerEntryAction,
  type TransactionActionResult,
} from "@/app/apps/church/(console)/finances/transactions/actions";
import { Icons } from "@/components/icons";
import { useActionToast } from "@/hooks/use-action-toast";
import type { Fund } from "@/lib/funds/types";
import {
  formatFundTransferDescription,
  parseFundTransferUserComment,
} from "@/lib/ledger/transfer-description";
import type {
  ExpenseType,
  LedgerEntry,
  LedgerMovementType,
  OperationalIncomeType,
} from "@/lib/ledger/types";
import { useTranslations } from "next-intl";
import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  startTransition,
} from "react";

const initial: TransactionActionResult | null = null;
const DESCRIPTION_MAX = 250;
const TRANSFER_COMMENT_MAX = 200;

const PAYMENT_METHODS = [
  { value: "Cash", label: "Efectivo" },
  { value: "Transfer", label: "Transferencia" },
  { value: "Cheque", label: "Cheque" },
  { value: "Card", label: "Tarjeta" },
] as const;

type FormValues = {
  movementType: LedgerMovementType;
  fundId: string;
  destinationFundId: string;
  typeId: string;
  amount: string;
  description: string;
  userComment: string;
  paymentMethod: string;
  movementDate: string;
  contributorName: string;
};

function defaultFormValues(
  presetFundId?: string | null,
  defaultMovement: LedgerMovementType = "expense",
): FormValues {
  const today = new Date().toISOString().slice(0, 10);

  return {
    movementType: defaultMovement,
    fundId: presetFundId || "",
    destinationFundId: "",
    typeId: "",
    amount: "",
    description: "",
    userComment: "",
    paymentMethod: defaultMovement === "transfer" ? "Transfer" : "",
    movementDate: today,
    contributorName: "",
  };
}

function entryToFormValues(entry: LedgerEntry): FormValues {
  if (entry.isFundTransfer) {
    return {
      movementType: "transfer",
      fundId: entry.transferSourceFundId ?? entry.fundId,
      destinationFundId: entry.transferDestinationFundId ?? "",
      typeId: "",
      amount: String(entry.amount),
      description: "",
      userComment:
        entry.transferUserComment ??
        parseFundTransferUserComment(entry.description),
      paymentMethod: entry.paymentMethod,
      movementDate: entry.movementDate.slice(0, 10),
      contributorName: "",
    };
  }

  return {
    movementType: entry.direction,
    fundId: entry.fundId,
    destinationFundId: "",
    typeId: String(entry.typeId),
    amount: String(entry.amount),
    description: entry.description,
    userComment: "",
    paymentMethod: entry.paymentMethod,
    movementDate: entry.movementDate.slice(0, 10),
    contributorName: entry.contributorName ?? "",
  };
}

/** Drawer de registro/edición — alineado a `project/transacciones.jsx` MovimientoForm. */
export function TransactionFormDrawer({
  mode,
  entry,
  open,
  onClose,
  funds,
  expenseTypes,
  incomeTypes,
  presetFundId,
  defaultMovement = "expense",
}: {
  mode: "new" | "edit";
  entry: LedgerEntry | null;
  open: boolean;
  onClose: () => void;
  funds: Fund[];
  expenseTypes: ExpenseType[];
  incomeTypes: OperationalIncomeType[];
  presetFundId?: string | null;
  defaultMovement?: LedgerMovementType;
}) {
  const tCommon = useTranslations("common");
  const tTransactions = useTranslations("transactions");
  const tValidation = useTranslations("validation");
  const [state, formAction, pending] = useActionState(
    saveLedgerEntryAction,
    initial,
  );
  const [v, setV] = useState<FormValues>(() =>
    entry
      ? entryToFormValues(entry)
      : defaultFormValues(presetFundId, defaultMovement),
  );
  const [errs, setErrs] = useState<Record<string, string>>({});

  const isIncome = v.movementType === "income";
  const isTransfer = v.movementType === "transfer";
  const canSwitchType = mode === "new";

  const upd = <K extends keyof FormValues>(k: K, val: FormValues[K]) =>
    setV((s) => ({ ...s, [k]: val }));

  useEffect(() => {
    if (!open) return;
    setV(
      entry
        ? entryToFormValues(entry)
        : defaultFormValues(presetFundId, defaultMovement),
    );
    setErrs({});
  }, [open, entry, presetFundId, defaultMovement]);

  useActionToast(state, {
    successMessage:
      mode === "new"
        ? isTransfer
          ? "Transferencia registrada correctamente."
          : "Movimiento registrado correctamente."
        : isTransfer
          ? "Transferencia actualizada correctamente."
          : "Movimiento actualizado correctamente.",
    onSuccess: onClose,
  });

  const activeFunds = useMemo(() => funds.filter((f) => f.isActive), [funds]);

  const sourceFundName = useMemo(
    () => activeFunds.find((f) => f.fundId === v.fundId)?.name ?? "…",
    [activeFunds, v.fundId],
  );

  const destinationFundName = useMemo(
    () => activeFunds.find((f) => f.fundId === v.destinationFundId)?.name ?? "…",
    [activeFunds, v.fundId, v.destinationFundId],
  );

  const transferPreview = useMemo(
    () =>
      formatFundTransferDescription(
        sourceFundName,
        destinationFundName,
        v.userComment,
      ),
    [sourceFundName, destinationFundName, v.userComment],
  );

  if (!open) return null;

  const typeOptions = isIncome ? incomeTypes : expenseTypes;

  function setMovementType(next: LedgerMovementType) {
    if (!canSwitchType) return;
    setV((s) => ({
      ...s,
      movementType: next,
      typeId: "",
      destinationFundId: next === "transfer" ? s.destinationFundId : "",
      contributorName: next === "income" ? s.contributorName : "",
      paymentMethod:
        next === "transfer" && !s.paymentMethod ? "Transfer" : s.paymentMethod,
    }));
  }

  function submit() {
    const e: Record<string, string> = {};

    if (isTransfer) {
      if (!v.fundId) e.fundId = "Obligatorio";
      if (!v.destinationFundId) e.destinationFundId = "Obligatorio";
      if (
        v.fundId &&
        v.destinationFundId &&
        v.fundId === v.destinationFundId
      ) {
        e.destinationFundId = "Debe ser distinto al fondo origen";
      }
      if (v.userComment.trim().length > TRANSFER_COMMENT_MAX) {
        e.userComment = tValidation("maxLength", { max: TRANSFER_COMMENT_MAX });
      }
    } else {
      if (!v.fundId) e.fundId = "Obligatorio";
      if (!v.typeId) e.typeId = "Obligatorio";
      if (!v.description.trim()) e.description = "Obligatorio";
      if (v.description.trim().length > DESCRIPTION_MAX) {
        e.description = tValidation("maxLength", { max: DESCRIPTION_MAX });
      }
    }

    if (v.amount === "" || +v.amount <= 0) e.amount = "Monto inválido";
    if (!v.paymentMethod) e.paymentMethod = "Obligatorio";
    setErrs(e);
    if (Object.keys(e).length) return;

    const fd = new FormData();
    fd.set("movementType", v.movementType);

    if (isTransfer) {
      if (entry?.fundTransferId) {
        fd.set("transferId", entry.fundTransferId);
      }
      fd.set("sourceFundId", v.fundId);
      fd.set("destinationFundId", v.destinationFundId);
      fd.set("userComment", v.userComment.trim());
      fd.set("movementDate", v.movementDate);
    } else if (entry?.entryKind === "operational_income") {
      fd.set("incomeId", entry.entryId);
      fd.set("fundId", v.fundId);
      fd.set("incomeTypeId", v.typeId);
      fd.set("paymentDate", v.movementDate);
      fd.set("contributorName", v.contributorName.trim());
    } else if (entry?.entryKind === "expense") {
      fd.set("transactionId", entry.entryId);
      fd.set("fundId", v.fundId);
      fd.set("expensesTypeId", v.typeId);
      fd.set("transactionDate", v.movementDate);
    } else {
      fd.set("fundId", v.fundId);
      if (isIncome) {
        fd.set("incomeTypeId", v.typeId);
        fd.set("paymentDate", v.movementDate);
        fd.set("contributorName", v.contributorName.trim());
      } else {
        fd.set("expensesTypeId", v.typeId);
        fd.set("transactionDate", v.movementDate);
      }
    }

    fd.set("amount", v.amount);
    if (!isTransfer) {
      fd.set("description", v.description.trim());
    }
    fd.set("paymentMethod", v.paymentMethod);

    startTransition(() => formAction(fd));
  }

  return (
    <>
      <div className="drawer-backdrop" onClick={pending ? undefined : onClose} />
      <div className="drawer" role="dialog" aria-labelledby="tx-form-title">
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <div className="eyebrow">
              {mode === "new" ? "Nuevo registro" : "Edición"}
            </div>
            <h2 id="tx-form-title" style={{ margin: "4px 0 0", fontSize: 18 }}>
              {mode === "new"
                ? isTransfer
                  ? "Registrar transferencia"
                  : "Registrar movimiento"
                : isTransfer
                  ? "Editar transferencia"
                  : "Editar movimiento"}
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
            <label>Tipo de movimiento</label>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              {(
                [
                  ["income", "Ingreso", "var(--success)"],
                  ["expense", "Egreso", "var(--danger)"],
                  ["transfer", "Transferencia", "var(--accent)"],
                ] as const
              ).map(([type, label, color]) => {
                const active = v.movementType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    className="btn"
                    disabled={!canSwitchType}
                    onClick={() => setMovementType(type)}
                    style={{
                      flex: "1 1 30%",
                      justifyContent: "center",
                      background: active
                        ? `color-mix(in oklab, ${color} 14%, transparent)`
                        : "transparent",
                      color: active ? color : "var(--fg-dim)",
                      borderColor: active
                        ? `color-mix(in oklab, ${color} 40%, transparent)`
                        : "var(--line-2)",
                      fontWeight: 600,
                      opacity: canSwitchType ? 1 : active ? 1 : 0.55,
                      cursor: canSwitchType ? "pointer" : "default",
                    }}
                  >
                    {type === "income" ? (
                      <Icons.arrowUp width={14} />
                    ) : type === "expense" ? (
                      <Icons.arrowDn width={14} />
                    ) : (
                      <Icons.arrowRight width={14} />
                    )}{" "}
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="help">
              {isTransfer
                ? "Traslada saldo entre fondos. Queda pendiente hasta que un administrador o pastor la autorice."
                : isIncome
                  ? "En ingresos, quien registra autoriza automáticamente."
                  : "Los egresos quedan Pendientes hasta que un usuario con permisos los autorice."}
            </div>
          </div>

          {!isTransfer ? (
            <div className="field">
              <label>
                {isIncome ? "Categoría" : "Tipo de gasto"}{" "}
                <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <div className={`input-wrap ${errs.typeId ? "error" : ""}`}>
                <select
                  value={v.typeId}
                  onChange={(e) => upd("typeId", e.target.value)}
                >
                  <option value="" disabled>
                    Seleccionar…
                  </option>
                  {typeOptions.map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      {"typeName" in t ? t.typeName : t.name}
                    </option>
                  ))}
                </select>
              </div>
              {errs.typeId && <div className="help error">{errs.typeId}</div>}
            </div>
          ) : null}

          {!isTransfer ? (
            <div className="field">
              <label>
                Descripción <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <div
                className={`input-wrap ${errs.description ? "error" : ""}`}
                style={{ alignItems: "flex-start", padding: "10px 12px" }}
              >
                <textarea
                  rows={3}
                  maxLength={DESCRIPTION_MAX}
                  value={v.description}
                  placeholder="Ej. Diezmo dominical, Pago electricidad…"
                  onChange={(e) => upd("description", e.target.value)}
                  style={{ minHeight: 72, resize: "vertical" }}
                />
              </div>
              <div
                className={`help${errs.description ? " error" : ""}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span>{tValidation("maxLength", { max: DESCRIPTION_MAX })}.</span>
                <span className="tnum">
                  {v.description.length}/{DESCRIPTION_MAX}
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="row" style={{ gap: 12 }}>
                <div className="field" style={{ flex: 1 }}>
                  <label>
                    Fondo origen <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <div className={`input-wrap ${errs.fundId ? "error" : ""}`}>
                    <select
                      value={v.fundId}
                      onChange={(e) => upd("fundId", e.target.value)}
                    >
                      <option value="" disabled>
                        Seleccionar…
                      </option>
                      {activeFunds.map((f) => (
                        <option key={f.fundId} value={f.fundId}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errs.fundId && (
                    <div className="help error">{errs.fundId}</div>
                  )}
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>
                    Fondo destino{" "}
                    <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <div
                    className={`input-wrap ${errs.destinationFundId ? "error" : ""}`}
                  >
                    <select
                      value={v.destinationFundId}
                      onChange={(e) =>
                        upd("destinationFundId", e.target.value)
                      }
                    >
                      <option value="" disabled>
                        Seleccionar…
                      </option>
                      {activeFunds.map((f) => (
                        <option key={f.fundId} value={f.fundId}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errs.destinationFundId && (
                    <div className="help error">{errs.destinationFundId}</div>
                  )}
                </div>
              </div>

              <div className="field">
                <label>
                  Comentario{" "}
                  <span className="muted" style={{ fontWeight: 400 }}>
                    (opcional)
                  </span>
                </label>
                <div
                  className={`input-wrap ${errs.userComment ? "error" : ""}`}
                  style={{ alignItems: "flex-start", padding: "10px 12px" }}
                >
                  <textarea
                    rows={2}
                    maxLength={TRANSFER_COMMENT_MAX}
                    value={v.userComment}
                    placeholder="Motivo del traslado…"
                    onChange={(e) => upd("userComment", e.target.value)}
                    style={{ minHeight: 56, resize: "vertical" }}
                  />
                </div>
                <div
                  className={`help${errs.userComment ? " error" : ""}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span>{tValidation("maxLength", { max: TRANSFER_COMMENT_MAX })}.</span>
                  <span className="tnum">
                    {v.userComment.length}/{TRANSFER_COMMENT_MAX}
                  </span>
                </div>
              </div>

              <div
                className="card flat"
                style={{
                  padding: 12,
                  background: "color-mix(in oklab, var(--accent) 8%, transparent)",
                  borderColor:
                    "color-mix(in oklab, var(--accent) 24%, transparent)",
                }}
              >
                <div className="tiny muted" style={{ marginBottom: 4 }}>
                  Descripción en el libro
                </div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{transferPreview}</div>
              </div>
            </>
          )}

          {!isTransfer ? (
            <div className="row" style={{ gap: 12 }}>
              <div className="field" style={{ flex: 1 }}>
                <label>
                  Fondo <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <div className={`input-wrap ${errs.fundId ? "error" : ""}`}>
                  <select
                    value={v.fundId}
                    onChange={(e) => upd("fundId", e.target.value)}
                  >
                    <option value="" disabled>
                      Seleccionar…
                    </option>
                    {activeFunds.map((f) => (
                      <option key={f.fundId} value={f.fundId}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                {errs.fundId && <div className="help error">{errs.fundId}</div>}
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>
                  Monto (RD$) <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <div className={`input-wrap ${errs.amount ? "error" : ""}`}>
                  <input
                    type="number"
                    min="0"
                    value={v.amount}
                    placeholder="0.00"
                    onChange={(e) => upd("amount", e.target.value)}
                  />
                </div>
                {errs.amount && <div className="help error">{errs.amount}</div>}
              </div>
            </div>
          ) : (
            <div className="field">
              <label>
                Monto (RD$) <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <div className={`input-wrap ${errs.amount ? "error" : ""}`}>
                <input
                  type="number"
                  min="0"
                  value={v.amount}
                  placeholder="0.00"
                  onChange={(e) => upd("amount", e.target.value)}
                />
              </div>
              {errs.amount && <div className="help error">{errs.amount}</div>}
            </div>
          )}

          <div className="row" style={{ gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>
                Método de pago <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <div className={`input-wrap ${errs.paymentMethod ? "error" : ""}`}>
                <select
                  value={v.paymentMethod}
                  onChange={(e) => upd("paymentMethod", e.target.value)}
                >
                  <option value="" disabled>
                    Seleccionar…
                  </option>
                  {PAYMENT_METHODS.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              {errs.paymentMethod && (
                <div className="help error">{errs.paymentMethod}</div>
              )}
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Fecha</label>
              <div className="input-wrap">
                <input
                  type="date"
                  value={v.movementDate}
                  onChange={(e) => upd("movementDate", e.target.value)}
                />
              </div>
            </div>
          </div>

          {isIncome ? (
            <div className="field">
              <label>
                Contribuyente{" "}
                <span className="muted" style={{ fontWeight: 400 }}>
                  (opcional)
                </span>
              </label>
              <div className="input-wrap">
                <input
                  value={v.contributorName}
                  placeholder="Nombre del miembro o dejar en blanco"
                  onChange={(e) => upd("contributorName", e.target.value)}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="drawer-foot">
          <button
            type="button"
            className="btn outline"
            onClick={onClose}
            disabled={pending}
          >
            {tCommon("cancel")}
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={submit}
            disabled={pending}
          >
            <Icons.check width={14} />{" "}
            {pending
              ? tCommon("saving")
              : mode === "new"
                ? isTransfer
                  ? tTransactions("registerTransfer")
                  : tTransactions("registerMovement")
                : tCommon("saveChanges")}
          </button>
        </div>
      </div>
    </>
  );
}

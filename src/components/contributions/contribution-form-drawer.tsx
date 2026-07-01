"use client";

import {
  saveContributionAction,
  searchMembersForContributionAction,
  type ContributionActionResult,
} from "@/app/(app)/finances/contributions/actions";
import { Icons } from "@/components/icons";
import { useActionToast } from "@/hooks/use-action-toast";
import { categoryChipClass } from "@/lib/contributions/parse";
import type {
  Contribution,
  ContributionCategory,
  DonorKind,
  IncomeType,
} from "@/lib/contributions/types";
import type { Fund } from "@/lib/funds/types";
import { fmtRD } from "@/lib/format-currency";
import {
  useActionState,
  useEffect,
  useState,
  startTransition,
} from "react";

const initial: ContributionActionResult | null = null;

const PAYMENT_METHODS = [
  { value: "Cash", label: "Efectivo" },
  { value: "Transfer", label: "Transferencia" },
  { value: "Cheque", label: "Cheque" },
  { value: "Card", label: "Tarjeta" },
] as const;

const CATEGORY_OPTIONS: {
  category: ContributionCategory;
  label: string;
  sub: string;
}[] = [
  {
    category: "tithe",
    label: "Diezmo",
    sub: "Aporte del 10% del miembro",
  },
  {
    category: "offering",
    label: "Ofrenda",
    sub: "Aporte voluntario al culto",
  },
  {
    category: "donation",
    label: "Donación",
    sub: "Aporte para una causa específica",
  },
];

type FormValues = {
  incomeTypeId: string;
  fundId: string;
  collectionMode: "individual" | "collective";
  donorKind: DonorKind;
  profileId: string;
  profileName: string;
  companyName: string;
  amount: string;
  paymentDate: string;
  paymentMethod: string;
  notes: string;
};

function defaultFormValues(
  funds: Fund[],
  incomeTypes: IncomeType[],
  presetFundId?: string | null,
): FormValues {
  const today = new Date().toISOString().slice(0, 10);
  const primaryFund = funds.find((f) => f.isPrimary) ?? funds[0];
  const titheType = incomeTypes.find((t) => t.category === "tithe");

  return {
    incomeTypeId: titheType ? String(titheType.id) : "",
    fundId: presetFundId || primaryFund?.fundId || "",
    collectionMode: "individual",
    donorKind: "member",
    profileId: "",
    profileName: "",
    companyName: "",
    amount: "",
    paymentDate: today,
    paymentMethod: "",
    notes: "",
  };
}

function contributionToFormValues(entry: Contribution): FormValues {
  return {
    incomeTypeId: entry.incomeTypeId ? String(entry.incomeTypeId) : "",
    fundId: entry.fundId,
    collectionMode: entry.collectionMode,
    donorKind: entry.donorKind ?? "member",
    profileId: entry.profileId ?? "",
    profileName: entry.contributorLabel,
    companyName: entry.companyName ?? "",
    amount: String(entry.amount),
    paymentDate: entry.paymentDate.slice(0, 10),
    paymentMethod: entry.paymentMethod || "Cash",
    notes: entry.notes ?? "",
  };
}

function fmtInput(n: string) {
  if (!n || Number.isNaN(+n)) return "";
  return (+n).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function stripFmt(s: string) {
  return s.replace(/[^0-9.]/g, "");
}

function OptionCard({
  active,
  onClick,
  title,
  sub,
  chip,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  sub?: string;
  chip?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        textAlign: "left",
        padding: "14px 16px",
        borderRadius: 12,
        cursor: "pointer",
        font: "inherit",
        background: active ? "var(--accent-soft)" : "var(--bg-2)",
        border: `1px solid ${active ? "color-mix(in oklab, var(--accent) 45%, transparent)" : "var(--line)"}`,
        transition: "background 0.12s, border-color 0.12s",
      }}
    >
      {chip ? (
        <span className={`chip ${chip}`} style={{ flexShrink: 0 }}>
          <span className="pip" />
        </span>
      ) : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
        {sub ? <div className="tiny muted">{sub}</div> : null}
      </div>
      {active ? <Icons.check size={16} stroke="var(--accent)" /> : null}
    </button>
  );
}

function incomeTypeForCategory(
  incomeTypes: IncomeType[],
  category: ContributionCategory,
): string {
  const match = incomeTypes.find((t) => t.category === category);
  return match ? String(match.id) : "";
}

function categoryForIncomeType(
  incomeTypes: IncomeType[],
  incomeTypeId: string,
): ContributionCategory | null {
  const match = incomeTypes.find((t) => String(t.id) === incomeTypeId);
  return match?.category ?? null;
}

export function ContributionFormDrawer({
  mode,
  entry,
  open,
  onClose,
  funds,
  incomeTypes,
  presetFundId,
}: {
  mode: "new" | "edit";
  entry: Contribution | null;
  open: boolean;
  onClose: () => void;
  funds: Fund[];
  incomeTypes: IncomeType[];
  presetFundId?: string | null;
}) {
  const [v, setV] = useState<FormValues>(() =>
    mode === "edit" && entry
      ? contributionToFormValues(entry)
      : defaultFormValues(funds, incomeTypes, presetFundId),
  );
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [amountFocused, setAmountFocused] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberResults, setMemberResults] = useState<
    { id: string; name: string }[]
  >([]);

  const [state, formAction, pending] = useActionState(
    saveContributionAction,
    initial,
  );

  const upd = <K extends keyof FormValues>(k: K, val: FormValues[K]) =>
    setV((s) => ({ ...s, [k]: val }));

  useEffect(() => {
    if (!open) return;
    setV(
      mode === "edit" && entry
        ? contributionToFormValues(entry)
        : defaultFormValues(funds, incomeTypes, presetFundId),
    );
    setErrs({});
    setMemberQuery(mode === "edit" && entry ? entry.contributorLabel : "");
    setMemberResults([]);
  }, [open, mode, entry, funds, incomeTypes, presetFundId]);

  useActionToast(state, {
    successMessage:
      mode === "new" ? "Ingreso registrado." : "Cambios guardados.",
    onSuccess: onClose,
  });

  useEffect(() => {
    if (!open || v.collectionMode !== "individual") return;
    if (v.donorKind !== "member" && v.donorKind !== "visitor") return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const rows = await searchMembersForContributionAction(memberQuery);
      if (!cancelled) setMemberResults(rows);
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, memberQuery, v.collectionMode, v.donorKind]);

  if (!open) return null;

  const activeFunds = funds.filter((f) => f.isActive);
  const isCollective = v.collectionMode === "collective";
  const isAnonymous = v.donorKind === "anonymous";
  const selectedCategory = categoryForIncomeType(incomeTypes, v.incomeTypeId);

  const contributorLabel = isCollective
    ? "Ofrenda colectiva"
    : isAnonymous
      ? "Anónimo"
      : v.donorKind === "company"
        ? v.companyName || "—"
        : v.profileName || "—";

  function submit() {
    const e: Record<string, string> = {};
    if (!v.incomeTypeId) e.incomeTypeId = "Obligatorio";
    if (!v.fundId) e.fundId = "Obligatorio";
    if (!v.amount || Number.parseFloat(v.amount) <= 0) e.amount = "Monto inválido";
    if (!v.paymentDate) e.paymentDate = "Obligatorio";
    if (!v.paymentMethod) e.paymentMethod = "Obligatorio";

    if (!isCollective) {
      if (v.donorKind === "company" && !v.companyName.trim()) {
        e.companyName = "Obligatorio";
      }
      if (
        (v.donorKind === "member" || v.donorKind === "visitor") &&
        !v.profileId
      ) {
        e.profileId = "Selecciona un contribuyente";
      }
    }

    setErrs(e);
    if (Object.keys(e).length) return;

    const fd = new FormData();
    if (mode === "edit" && entry) fd.set("incomeId", entry.incomeId);
    fd.set("incomeTypeId", v.incomeTypeId);
    fd.set("fundId", v.fundId);
    fd.set("collectionMode", v.collectionMode);
    fd.set("donorKind", isCollective ? "member" : v.donorKind);
    fd.set("profileId", v.profileId);
    fd.set("companyName", v.companyName);
    fd.set("amount", v.amount);
    fd.set("paymentDate", v.paymentDate);
    fd.set("paymentMethod", v.paymentMethod);
    fd.set("notes", v.notes);
    startTransition(() => formAction(fd));
  }

  return (
    <>
      <div className="drawer-backdrop" onClick={pending ? undefined : onClose} />
      <div className="drawer" role="dialog" aria-labelledby="contrib-form-title">
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <div className="eyebrow">
              {mode === "new" ? "Nuevo ingreso" : "Edición"}
            </div>
            <h2 id="contrib-form-title" style={{ margin: "4px 0 0", fontSize: 18 }}>
              {mode === "new" ? "Agregar ingreso" : "Editar ingreso"}
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
            <label>Tipo de ingreso</label>
            <div className="col" style={{ gap: 8 }}>
              {CATEGORY_OPTIONS.map((opt) => (
                <OptionCard
                  key={opt.category}
                  active={selectedCategory === opt.category}
                  chip={categoryChipClass(opt.category)}
                  title={opt.label}
                  sub={opt.sub}
                  onClick={() =>
                    upd("incomeTypeId", incomeTypeForCategory(incomeTypes, opt.category))
                  }
                />
              ))}
            </div>
            {errs.incomeTypeId && (
              <div className="help error">{errs.incomeTypeId}</div>
            )}
          </div>

          <div className="field">
            <label>Fondo destino</label>
            <div className={`input-wrap ${errs.fundId ? "error" : ""}`}>
              <select
                value={v.fundId}
                onChange={(e) => upd("fundId", e.target.value)}
              >
                <option value="" disabled>
                  Seleccionar fondo…
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

          <div className="field">
            <label>Modo de colecta</label>
            <div className="row" style={{ gap: 10 }}>
              {(["individual", "collective"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => upd("collectionMode", m)}
                  className="btn"
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    fontWeight: 600,
                    background:
                      v.collectionMode === m ? "var(--accent-soft)" : "transparent",
                    color:
                      v.collectionMode === m ? "var(--accent)" : "var(--fg-dim)",
                    borderColor:
                      v.collectionMode === m
                        ? "color-mix(in oklab, var(--accent) 40%, transparent)"
                        : "var(--line-2)",
                  }}
                >
                  {m === "individual" ? "Individual" : "Colectivo"}
                </button>
              ))}
            </div>
            <div className="help">
              {isCollective
                ? "Se registrará como “Ofrenda colectiva” sin contribuyente individual."
                : "Se asocia a un miembro o es anónimo."}
            </div>
          </div>

          <div className="field">
            <label>Contribuyente</label>
            {isCollective ? (
              <div className="card flat" style={{ padding: 14 }}>
                <div className="row" style={{ gap: 10 }}>
                  <span className="chip">
                    <span className="pip" /> Colectivo
                  </span>
                  <span style={{ fontWeight: 600 }}>Ofrenda colectiva</span>
                </div>
                <div className="help" style={{ marginTop: 6 }}>
                  No requiere identificar a un contribuyente.
                </div>
              </div>
            ) : (
              <>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 0",
                    cursor: "pointer",
                    width: "fit-content",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => {
                      upd("donorKind", e.target.checked ? "anonymous" : "member");
                      if (e.target.checked) {
                        upd("profileId", "");
                        upd("profileName", "");
                      }
                    }}
                    style={{
                      accentColor: "var(--accent)",
                      width: 15,
                      height: 15,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 13 }}>
                    Registrar como <b>Anónimo</b>
                  </span>
                </label>
                {!isAnonymous ? (
                  v.donorKind === "company" ? (
                    <div className={`input-wrap ${errs.companyName ? "error" : ""}`} style={{ marginTop: 4 }}>
                      <input
                        value={v.companyName}
                        placeholder="Nombre de empresa…"
                        onChange={(e) => upd("companyName", e.target.value)}
                      />
                    </div>
                  ) : (
                    <div style={{ marginTop: 4 }}>
                      <div className={`input-wrap ${errs.profileId ? "error" : ""}`}>
                        <Icons.search size={16} stroke="var(--ink-3)" />
                        <input
                          value={memberQuery}
                          placeholder="Buscar miembro…"
                          onChange={(e) => {
                            setMemberQuery(e.target.value);
                            upd("profileId", "");
                            upd("profileName", "");
                          }}
                        />
                      </div>
                      {v.profileName ? (
                        <div className="chip" style={{ marginTop: 8 }}>
                          {v.profileName}
                        </div>
                      ) : null}
                      {memberResults.length > 0 && !v.profileId ? (
                        <div
                          className="card flat"
                          style={{ marginTop: 8, padding: 0, overflow: "hidden" }}
                        >
                          {memberResults.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              style={{
                                display: "block",
                                width: "100%",
                                textAlign: "left",
                                padding: "10px 14px",
                                border: "none",
                                background: "transparent",
                                borderBottom: "1px solid var(--line)",
                                cursor: "pointer",
                              }}
                              onClick={() => {
                                upd("profileId", m.id);
                                upd("profileName", m.name);
                                setMemberQuery(m.name);
                                setMemberResults([]);
                              }}
                            >
                              {m.name}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      {errs.profileId && (
                        <div className="help error">{errs.profileId}</div>
                      )}
                    </div>
                  )
                ) : null}
              </>
            )}
          </div>

          <div className="field">
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
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            {errs.paymentMethod && (
              <div className="help error">{errs.paymentMethod}</div>
            )}
          </div>

          <div className="row" style={{ gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>
                Monto <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <div
                className={`input-wrap ${errs.amount ? "error" : ""}`}
                style={{ position: "relative" }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--ink-3)",
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  RD$
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountFocused ? v.amount : fmtInput(v.amount)}
                  placeholder="0.00"
                  style={{ paddingLeft: 44 }}
                  onFocus={() => setAmountFocused(true)}
                  onBlur={() => setAmountFocused(false)}
                  onChange={(e) => upd("amount", stripFmt(e.target.value))}
                />
              </div>
              {errs.amount && <div className="help error">{errs.amount}</div>}
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Fecha</label>
              <div className={`input-wrap ${errs.paymentDate ? "error" : ""}`}>
                <input
                  type="date"
                  value={v.paymentDate}
                  onChange={(e) => upd("paymentDate", e.target.value)}
                />
              </div>
            </div>
          </div>

          {selectedCategory && v.fundId ? (
            <div className="card flat" style={{ padding: 14 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                Resumen
              </div>
              <div
                className="row"
                style={{
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 13,
                  marginBottom: 10,
                }}
              >
                <span style={{ fontWeight: 500 }}>{contributorLabel}</span>
                {v.amount && +v.amount > 0 ? (
                  <span
                    style={{
                      fontWeight: 700,
                      color: "var(--success)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {fmtRD(+v.amount)}
                  </span>
                ) : null}
              </div>
              <div
                className="row"
                style={{
                  gap: 8,
                  flexWrap: "wrap",
                  fontSize: 13,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span className={`chip ${categoryChipClass(selectedCategory)}`}>
                  <span className="pip" />{" "}
                  {
                    CATEGORY_OPTIONS.find((o) => o.category === selectedCategory)
                      ?.label
                  }
                </span>
                <span className="chip">
                  {activeFunds.find((f) => f.fundId === v.fundId)?.name ?? "—"}
                </span>
                <span className="chip">
                  {isCollective ? "Colectivo" : "Individual"}
                </span>
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
                ? "Registrar ingreso"
                : "Guardar cambios"}
          </button>
        </div>
      </div>
    </>
  );
}

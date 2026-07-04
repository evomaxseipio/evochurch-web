"use client";

import {
  saveFundAction,
  type FundActionResult,
} from "@/app/(app)/finances/funds/actions";
import { Icons } from "@/components/icons";
import { CrudSwitch } from "@/components/ui/crud-switch";
import { useActionToast } from "@/hooks/use-action-toast";
import type { Fund, FundKind } from "@/lib/funds/types";
import type { Ministry } from "@/lib/ministries/types";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useState, startTransition } from "react";

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
  fundKind: FundKind;
  ministryId: string;
};

export type FundFormMinistryContext = {
  ministryId: string;
  ministryName: string;
  defaultFundKind?: FundKind;
};

function MoneyInput({
  value,
  onChange,
  placeholder,
  hasError,
  locale,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hasError?: boolean;
  locale: "es" | "en" | "fr";
}) {
  const [focused, setFocused] = useState(false);

  const fmt = (n: string) =>
    n === "" || n === undefined || n === null
      ? ""
      : Number(n).toLocaleString(locale, {
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

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function fundToFormValues(
  fund: Fund | null,
  ministryContext?: FundFormMinistryContext,
): FundFormValues {
  return {
    name: fund?.name ?? "",
    description: fund?.description ?? "",
    goal: fund?.targetAmount ? String(fund.targetAmount) : "",
    balance: fund?.totalContributions ? String(fund.totalContributions) : "",
    startDate: fund?.startDate ?? todayIsoDate(),
    endDate: fund?.endDate ?? "",
    active: fund?.isActive ?? true,
    primary: fund?.isPrimary ?? false,
    fundKind:
      fund?.fundKind ?? ministryContext?.defaultFundKind ?? ("operating" as FundKind),
    ministryId: fund?.ministryId ?? ministryContext?.ministryId ?? "",
  };
}

export function FundFormDrawer({
  mode,
  fund,
  open,
  onClose,
  ministryContext,
  ministries,
}: {
  mode: "new" | "edit";
  fund: Fund | null;
  open: boolean;
  onClose: () => void;
  ministryContext?: FundFormMinistryContext;
  ministries?: Ministry[];
}) {
  const tCommon = useTranslations("common");
  const tFunds = useTranslations("funds");
  const tMinFunds = useTranslations("ministerios.funds");
  const locale = useLocale() as "es" | "en" | "fr";
  const [state, formAction, pending] = useActionState(saveFundAction, initial);
  const [v, setV] = useState<FundFormValues>(() =>
    fundToFormValues(fund, ministryContext),
  );
  const [errs, setErrs] = useState<Record<string, string>>({});

  const lockedMinistry = ministryContext != null;
  const goalRequired = v.fundKind !== "operating";

  const upd = <K extends keyof FundFormValues>(k: K, val: FundFormValues[K]) =>
    setV((s) => ({ ...s, [k]: val }));

  useActionToast(state, {
    successMessage:
      mode === "new"
        ? tFunds("messages.created")
        : tFunds("messages.updated"),
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
    if (goalRequired && (v.goal === "" || +v.goal <= 0)) e.goal = "Meta inválida";
    if (!v.startDate) e.startDate = "Obligatorio";
    setErrs(e);
    if (Object.keys(e).length) return;

    const fd = new FormData();
    if (fund?.fundId) fd.set("fundId", fund.fundId);
    fd.set("name", v.name.trim());
    fd.set("description", v.description.trim());
    fd.set("targetAmount", v.goal || "0");
    fd.set("totalContributions", v.balance || "0");
    fd.set("startDate", v.startDate);
    fd.set("endDate", v.endDate);
    fd.set("isActive", v.active ? "true" : "false");
    fd.set("isPrimary", lockedMinistry ? "false" : v.primary ? "true" : "false");
    fd.set("fundKind", v.fundKind);
    if (v.ministryId) fd.set("ministryId", v.ministryId);
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
              {mode === "new" ? tCommon("newRecord") : tCommon("editRecord")}
            </div>
            <h2 id="fund-form-title" style={{ margin: "4px 0 0", fontSize: 18 }}>
              {lockedMinistry
                ? mode === "new"
                  ? tMinFunds("createForMinistry", {
                      name: ministryContext.ministryName,
                    })
                  : tMinFunds("editForMinistry", {
                      name: ministryContext.ministryName,
                    })
                : mode === "new"
                  ? tFunds("newFund")
                  : tFunds("editFund")}
            </h2>
          </div>
          <button
            type="button"
            className="btn ghost icon-only"
            onClick={onClose}
            disabled={pending}
            aria-label={tCommon("close")}
          >
            <Icons.x size={18} />
          </button>
        </div>

        <div className="drawer-body col gap-md">
          <div className="field">
            <label>
              {tFunds("fundName")}{" "}
              <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <div className={`input-wrap ${errs.name ? "error" : ""}`}>
              <input
                value={v.name}
                placeholder={tFunds("namePlaceholder")}
                onChange={(e) => upd("name", e.target.value)}
              />
            </div>
            {errs.name && <div className="help error">{errs.name}</div>}
          </div>

          <div className="field">
            <label>{tCommon("description")}</label>
            <div
              className="input-wrap"
              style={{ alignItems: "flex-start", padding: "10px 12px" }}
            >
              <textarea
                rows={3}
                value={v.description}
                placeholder={tFunds("descriptionPlaceholder")}
                onChange={(e) => upd("description", e.target.value)}
              />
            </div>
          </div>

          {lockedMinistry || mode === "new" ? (
            <div className="field">
              <label>{tMinFunds("fundKind")}</label>
              <div className="input-wrap">
                <select
                  value={v.fundKind}
                  disabled={mode === "edit"}
                  onChange={(e) => upd("fundKind", e.target.value as FundKind)}
                >
                  <option value="operating">{tMinFunds("kindOperating")}</option>
                  <option value="project">{tMinFunds("kindProject")}</option>
                  <option value="event">{tMinFunds("kindEvent")}</option>
                </select>
              </div>
            </div>
          ) : null}

          {!lockedMinistry && ministries && ministries.length > 0 ? (
            <div className="field">
              <label>{tMinFunds("ministryOptional")}</label>
              <div className="input-wrap">
                <select
                  value={v.ministryId}
                  onChange={(e) => upd("ministryId", e.target.value)}
                >
                  <option value="">{tMinFunds("churchFund")}</option>
                  {ministries.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
            <div className="field" style={{ flex: "1 1 140px", minWidth: 0 }}>
              <label>
                {tFunds("goal")}
                {goalRequired ? (
                  <span style={{ color: "var(--danger)" }}> *</span>
                ) : (
                  <span className="muted tiny"> ({tCommon("optional")})</span>
                )}
              </label>
              <MoneyInput
                value={v.goal}
                onChange={(val) => upd("goal", val)}
                hasError={!!errs.goal}
                locale={locale}
              />
              {errs.goal && <div className="help error">{errs.goal}</div>}
            </div>
            <div className="field" style={{ flex: "1 1 140px", minWidth: 0 }}>
              <label>{tFunds("totalRaised")}</label>
              <MoneyInput
                value={v.balance}
                onChange={(val) => upd("balance", val)}
                locale={locale}
              />
            </div>
          </div>

          {v.goal && +v.goal > 0 && (
            <div>
              <div className="row between" style={{ marginBottom: 6 }}>
                <span className="tiny muted">{tFunds("progressToGoal")}</span>
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
                {tFunds("startDate")} <span style={{ color: "var(--danger)" }}>*</span>
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
              <label>{tFunds("endDate")}</label>
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
              <div style={{ fontWeight: 500, fontSize: 13 }}>{tFunds("activeFund")}</div>
              <div className="tiny muted">{tFunds("activeHelp")}</div>
            </div>
            <CrudSwitch on={v.active} onChange={(val) => upd("active", val)} />
          </div>

          {!lockedMinistry ? (
            <div
              className="row between"
              style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}
            >
              <div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>
                  {tFunds("markPrimary")}
                </div>
                <div className="tiny muted">{tFunds("primaryHelp")}</div>
              </div>
              <CrudSwitch on={v.primary} onChange={(val) => upd("primary", val)} />
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
            <Icons.check size={14} />
            {pending
              ? tCommon("saving")
              : mode === "new"
                ? tFunds("createFund")
                : tCommon("saveChanges")}
          </button>
        </div>
      </div>
    </>
  );
}

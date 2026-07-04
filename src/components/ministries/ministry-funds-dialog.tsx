"use client";

import { setMinistryDefaultFundAction } from "@/app/(app)/ministerios/actions";
import { FundFormDrawer } from "@/components/funds/fund-form-drawer";
import { MinistryIcon } from "@/components/ministries/ministry-ui";
import { Icons } from "@/components/icons";
import { useActionToast } from "@/hooks/use-action-toast";
import { fundProgressPct } from "@/lib/funds/parse";
import type { Fund, FundKind } from "@/lib/funds/types";
import { fmtRD } from "@/lib/format-currency";
import {
  fundsForMinistry,
  getMinistryDefaultFund,
  isMinistryDefaultFund,
} from "@/lib/ministries/funds";
import type { Ministry } from "@/lib/ministries/types";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, startTransition, useMemo, useState } from "react";

const defaultInitial = null;

function FundKindChip({ kind }: { kind: FundKind }) {
  const t = useTranslations("ministerios.funds");
  const label =
    kind === "operating"
      ? t("kindOperating")
      : kind === "project"
        ? t("kindProject")
        : t("kindEvent");

  return (
    <span className="chip" style={{ fontSize: 11 }}>
      {label}
    </span>
  );
}

export function MinistryFundsDialog({
  ministry,
  funds,
  canManageFunds,
  canRecordContribution,
  open,
  onClose,
}: {
  ministry: Ministry | null;
  funds: Fund[];
  canManageFunds: boolean;
  canRecordContribution: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("ministerios.funds");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [formState, setFormState] = useState<{
    mode: "new" | "edit";
    fund: Fund | null;
    defaultKind: FundKind;
  } | null>(null);
  const [defaultState, defaultAction, defaultPending] = useActionState(
    setMinistryDefaultFundAction,
    defaultInitial,
  );

  const ministryFunds = useMemo(
    () => (ministry ? fundsForMinistry(funds, ministry.id) : []),
    [ministry, funds],
  );

  const defaultFund = useMemo(
    () => (ministry ? getMinistryDefaultFund(ministry, funds) : null),
    [ministry, funds],
  );

  useActionToast(defaultState, {
    successMessage: t("defaultUpdated"),
    onSuccess: () => router.refresh(),
  });

  if (!open || !ministry) return null;

  const handleClose = () => {
    setFormState(null);
    onClose();
  };

  const setDefault = (fundId: string) => {
    if (defaultPending) return;
    const fd = new FormData();
    fd.set("ministryId", ministry.id);
    fd.set("fundId", fundId);
    startTransition(() => defaultAction(fd));
  };

  return (
    <>
      <div
        className="drawer-backdrop"
        style={{ zIndex: 60 }}
        onClick={handleClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-labelledby="ministry-funds-title"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 61,
          background: "var(--bg-1)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
          width: 560,
          maxWidth: "92vw",
          maxHeight: "min(80vh, 720px)",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          boxShadow: "var(--shadow-3)",
        }}
      >
        <div
          className="row between"
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid var(--line)",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div className="row" style={{ gap: 12, alignItems: "flex-start", minWidth: 0 }}>
            <MinistryIcon
              name={ministry.name}
              color={ministry.color}
              size={42}
              radius={10}
            />
            <div style={{ minWidth: 0 }}>
              <div className="eyebrow">{t("title")}</div>
              <h3
                id="ministry-funds-title"
                style={{
                  margin: "4px 0 0",
                  fontSize: 18,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {ministry.name}
              </h3>
              <div className="muted tiny" style={{ marginTop: 4 }}>
                {t("count", { count: ministryFunds.length })}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn ghost icon-only"
            onClick={handleClose}
            aria-label={tCommon("close")}
          >
            <Icons.x size={18} />
          </button>
        </div>

        {canManageFunds ? (
          <div
            className="row"
            style={{
              padding: "12px 20px 0",
              gap: 8,
              flexWrap: "wrap",
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              className="btn primary sm"
              onClick={() =>
                setFormState({ mode: "new", fund: null, defaultKind: "operating" })
              }
            >
              <Icons.plus size={14} /> {t("createOperating")}
            </button>
            <button
              type="button"
              className="btn outline sm"
              onClick={() =>
                setFormState({ mode: "new", fund: null, defaultKind: "project" })
              }
            >
              <Icons.plus size={14} /> {t("createProject")}
            </button>
          </div>
        ) : null}

        <div
          style={{
            padding: "12px 20px 20px",
            overflowY: "auto",
            flex: 1,
            minHeight: 0,
            WebkitOverflowScrolling: "touch",
          }}
        >
          {ministryFunds.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>
              {t("empty")}
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {ministryFunds.map((fund) => {
                const isDefault = isMinistryDefaultFund(ministry, fund, funds);
                const pct = fundProgressPct(fund);

                return (
                  <li
                    key={fund.fundId}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: "1px solid var(--hairline)",
                      background: isDefault
                        ? "color-mix(in oklab, var(--accent) 6%, var(--surface))"
                        : "var(--surface)",
                    }}
                  >
                    <div
                      className="row between"
                      style={{ gap: 8, alignItems: "flex-start" }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          className="row"
                          style={{
                            gap: 8,
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ fontWeight: 600, fontSize: 15 }}>
                            {fund.name}
                          </span>
                          <FundKindChip kind={fund.fundKind} />
                          {isDefault ? (
                            <span className="chip violet" style={{ fontSize: 11 }}>
                              <Icons.star size={10} /> {t("defaultFund")}
                            </span>
                          ) : null}
                          {!fund.isActive ? (
                            <span className="chip" style={{ fontSize: 11 }}>
                              {tCommon("inactive")}
                            </span>
                          ) : null}
                        </div>
                        <div
                          className="tnum"
                          style={{ marginTop: 6, fontWeight: 600, fontSize: 14 }}
                        >
                          {fmtRD(fund.totalContributions)}
                        </div>
                        {fund.targetAmount > 0 ? (
                          <div style={{ marginTop: 8 }}>
                            <div className="row between" style={{ marginBottom: 4 }}>
                              <span className="tiny muted">
                                {t("goalProgress")}
                              </span>
                              <span
                                className="tiny tnum"
                                style={{
                                  fontWeight: 600,
                                  color:
                                    pct >= 100 ? "var(--success)" : "var(--accent)",
                                }}
                              >
                                {pct.toFixed(0)}% · {fmtRD(fund.targetAmount)}
                              </span>
                            </div>
                            <div
                              style={{
                                height: 6,
                                background: "var(--surface-2)",
                                borderRadius: 999,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${pct}%`,
                                  height: "100%",
                                  background:
                                    pct >= 100 ? "var(--success)" : "var(--accent)",
                                }}
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div
                      className="row"
                      style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}
                    >
                      {canRecordContribution && fund.isActive ? (
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => {
                            handleClose();
                            router.push(
                              `/finances/contributions?fund=${fund.fundId}`,
                            );
                          }}
                        >
                          {t("recordContribution")}
                        </button>
                      ) : null}
                      {canManageFunds ? (
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() =>
                            setFormState({
                              mode: "edit",
                              fund,
                              defaultKind: fund.fundKind,
                            })
                          }
                        >
                          {tCommon("edit")}
                        </button>
                      ) : null}
                      {canManageFunds &&
                      fund.fundKind === "operating" &&
                      fund.isActive &&
                      !isDefault ? (
                        <button
                          type="button"
                          className="btn ghost sm"
                          disabled={defaultPending}
                          onClick={() => setDefault(fund.fundId)}
                        >
                          {t("setAsDefault")}
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {defaultFund && canRecordContribution ? (
            <div
              style={{
                marginTop: 16,
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px dashed var(--line)",
                background: "var(--surface-2)",
              }}
            >
              <div className="tiny muted" style={{ marginBottom: 6 }}>
                {t("defaultFundHint")}
              </div>
              <button
                type="button"
                className="btn outline sm"
                onClick={() => {
                  handleClose();
                  router.push(
                    `/finances/contributions?fund=${defaultFund.fundId}`,
                  );
                }}
              >
                <Icons.plus size={14} /> {t("recordToDefault")}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <FundFormDrawer
        key={`${formState?.mode}-${formState?.fund?.fundId ?? formState?.defaultKind ?? "closed"}`}
        mode={formState?.mode ?? "new"}
        fund={formState?.fund ?? null}
        open={formState != null}
        onClose={() => {
          setFormState(null);
          router.refresh();
        }}
        ministryContext={
          ministry
            ? {
                ministryId: ministry.id,
                ministryName: ministry.name,
                defaultFundKind: formState?.defaultKind ?? "operating",
              }
            : undefined
        }
      />
    </>
  );
}

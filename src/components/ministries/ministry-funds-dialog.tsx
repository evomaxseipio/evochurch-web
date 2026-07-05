"use client";

import { MinistryIcon } from "@/components/ministries/ministry-ui";
import { Icons } from "@/components/icons";
import { fundProgressPct } from "@/lib/funds/parse";
import type { Fund, FundKind } from "@/lib/funds/types";
import { fmtRD } from "@/lib/format-currency";
import {
  fundsForMinistry,
  hasMinistryOperatingFund,
  isMinistryDefaultFund,
} from "@/lib/ministries/funds";
import type { Ministry } from "@/lib/ministries/types";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

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
  onCreateFund,
  onEditFund,
}: {
  ministry: Ministry | null;
  funds: Fund[];
  canManageFunds: boolean;
  canRecordContribution: boolean;
  open: boolean;
  onClose: () => void;
  onCreateFund: (ministry: Ministry, defaultKind: FundKind) => void;
  onEditFund: (ministry: Ministry, fund: Fund) => void;
}) {
  const t = useTranslations("ministerios.funds");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const ministryFunds = useMemo(
    () => (ministry ? fundsForMinistry(funds, ministry.id) : []),
    [ministry, funds],
  );

  const hasOperating = useMemo(
    () => (ministry ? hasMinistryOperatingFund(funds, ministry.id) : false),
    [ministry, funds],
  );

  if (!open || !ministry) return null;

  const handleClose = () => {
    onClose();
  };

  const openCreateFund = (defaultKind: FundKind) => {
    onClose();
    onCreateFund(ministry, defaultKind);
  };

  const openEditFund = (fund: Fund) => {
    onClose();
    onEditFund(ministry, fund);
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
              {hasOperating ? (
                <div
                  className="row"
                  style={{
                    gap: 7,
                    marginTop: 8,
                    alignItems: "flex-start",
                    fontSize: 12.5,
                    lineHeight: 1.45,
                    color: "var(--accent)",
                    maxWidth: 360,
                  }}
                >
                  <Icons.shield
                    size={15}
                    style={{ flexShrink: 0, marginTop: 1, opacity: 0.9 }}
                  />
                  <span>{t("defaultFundHint")}</span>
                </div>
              ) : null}
              <div className="muted tiny" style={{ marginTop: hasOperating ? 6 : 4 }}>
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
            {!hasOperating ? (
              <button
                type="button"
                className="btn primary sm"
                onClick={() => openCreateFund("operating")}
              >
                <Icons.plus size={14} /> {t("createOperating")}
              </button>
            ) : null}
            <button
              type="button"
              className="btn outline sm"
              onClick={() => openCreateFund("project")}
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
                          {fund.fundKind === "operating" ? (
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
                      className="row between"
                      style={{
                        gap: 12,
                        marginTop: 10,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                        {canRecordContribution && fund.isActive ? (
                          <button
                            type="button"
                            className="btn outline sm"
                            onClick={() => {
                              handleClose();
                              router.push(
                                `/finances/contributions?fund=${fund.fundId}`,
                              );
                            }}
                          >
                            <Icons.wallet size={14} /> {t("recordContribution")}
                          </button>
                        ) : null}
                        {canManageFunds ? (
                          <button
                            type="button"
                            className="btn outline sm"
                            onClick={() => openEditFund(fund)}
                          >
                            <Icons.edit size={14} /> {tCommon("edit")}
                          </button>
                        ) : null}
                      </div>
                      <span
                        className="tnum"
                        style={{
                          fontWeight: 700,
                          fontSize: 17,
                          letterSpacing: "-0.02em",
                          color: "var(--fg)",
                          marginLeft: "auto",
                        }}
                      >
                        {fmtRD(fund.totalContributions)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

"use client";

import {
  FundActionMenu,
  FundStatusChip,
  PrimaryBadge,
} from "@/components/funds/fund-ui";
import { Icons } from "@/components/icons";
import { formatFundDate, fundProgressPct } from "@/lib/funds/parse";
import type { Fund } from "@/lib/funds/types";
import { fmtRD } from "@/lib/format-currency";
import { formatDate } from "@/lib/i18n/format";
import { useLocale, useTranslations } from "next-intl";

/** Card de fondo en grid — igual que `fondos.jsx` (FundCard en vista cuadrícula). */
export function FundCard({
  fund,
  onEdit,
  onAddTx,
  onMakePrimary,
  onViewTx,
  onViewContrib,
  onDelete,
  canViewTransactions = true,
  canViewContributions = true,
}: {
  fund: Fund;
  onEdit: () => void;
  onAddTx: () => void;
  onMakePrimary: () => void;
  onViewTx: () => void;
  onViewContrib: () => void;
  onDelete?: () => void;
  canViewTransactions?: boolean;
  canViewContributions?: boolean;
}) {
  const tFunds = useTranslations("funds");
  const locale = useLocale();
  const pct = fundProgressPct(fund);

  return (
    <div
      className="card span-4"
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div
        className="row between"
        style={{ alignItems: "flex-start", gap: 8 }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            className="row"
            style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}
          >
            <span
              className="display"
              style={{ fontSize: 18, letterSpacing: "-0.01em" }}
            >
              {fund.name}
            </span>
            {fund.isPrimary && <PrimaryBadge />}
          </div>
          <div style={{ marginTop: 8 }}>
            <FundStatusChip active={fund.isActive} />
          </div>
        </div>
        <FundActionMenu
          fund={fund}
          onEdit={onEdit}
          onAddTx={onAddTx}
          onMakePrimary={onMakePrimary}
          onViewTx={onViewTx}
          onViewContrib={onViewContrib}
          onDelete={onDelete}
          canViewTransactions={canViewTransactions}
          canViewContributions={canViewContributions}
        />
      </div>
      <div
        className="muted"
        style={{
          fontSize: 12.5,
          lineHeight: 1.5,
          minHeight: 38,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {fund.description}
      </div>
      <div className="row between" style={{ gap: 12 }}>
        <div>
          <div className="tiny muted">{tFunds("totalRaised")}</div>
          <div
            className="tnum"
            style={{ fontWeight: 700, fontSize: 18, marginTop: 2 }}
          >
            {fmtRD(fund.totalContributions, locale as "es" | "en" | "fr")}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="tiny muted">{tFunds("goal")}</div>
          <div
            className="tnum mono muted"
            style={{ fontSize: 13, marginTop: 4 }}
          >
            {fmtRD(fund.targetAmount, locale as "es" | "en" | "fr")}
          </div>
        </div>
      </div>
      <div>
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
              transition: "width 0.4s ease",
              background: pct >= 100 ? "var(--success)" : "var(--accent)",
            }}
          />
        </div>
        <div className="row between" style={{ marginTop: 6 }}>
          <span className="tiny muted row" style={{ gap: 5 }}>
            <Icons.cal size={12} />{" "}
            {fund.startDate
              ? formatDate(fund.startDate, locale as "es" | "en" | "fr", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : formatFundDate(fund.startDate)}
          </span>
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
      </div>
    </div>
  );
}

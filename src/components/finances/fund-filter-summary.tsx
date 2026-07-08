"use client";

import { Icons } from "@/components/icons";
import type { Locale } from "@/i18n/config";
import { fundProgressPct } from "@/lib/funds/parse";
import type { Fund } from "@/lib/funds/types";
import { fmtRD } from "@/lib/format-currency";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function FundFilterSummary({
  fund,
  movementsInPeriod,
  locale,
  contributionsHref,
  transactionsHref,
}: {
  fund: Fund;
  movementsInPeriod: number;
  locale: Locale;
  contributionsHref?: string;
  transactionsHref?: string;
}) {
  const tFunds = useTranslations("funds");
  const tTransactions = useTranslations("transactions");
  const pct = fundProgressPct(fund);

  return (
    <div
      className="card flat"
      style={{
        marginTop: 12,
        marginBottom: 8,
        padding: 16,
        display: "flex",
        flexWrap: "wrap",
        gap: 16,
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div className="row" style={{ gap: 28, flexWrap: "wrap" }}>
        <div>
          <div className="tiny muted">{tFunds("totalRaised")}</div>
          <div
            className="tnum"
            style={{ fontSize: 26, fontWeight: 700, marginTop: 2 }}
          >
            {fmtRD(fund.totalContributions, locale)}
          </div>
        </div>
        <div>
          <div className="tiny muted">{tTransactions("movements")}</div>
          <div
            className="tnum"
            style={{ fontSize: 26, fontWeight: 700, marginTop: 2 }}
          >
            {movementsInPeriod}
          </div>
          <div className="tiny muted">{tTransactions("inSelectedPeriod")}</div>
        </div>
        {fund.targetAmount > 0 ? (
          <div>
            <div className="tiny muted">{tFunds("progress")}</div>
            <div
              className="tnum"
              style={{
                fontSize: 26,
                fontWeight: 700,
                marginTop: 2,
                color: pct >= 100 ? "var(--success)" : "var(--accent)",
              }}
            >
              {pct.toFixed(1)}%
            </div>
          </div>
        ) : null}
      </div>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        {contributionsHref ? (
          <Link href={contributionsHref} className="btn outline sm">
            <Icons.wallet size={14} /> {tFunds("viewContributions")}
          </Link>
        ) : null}
        {transactionsHref ? (
          <Link href={transactionsHref} className="btn outline sm">
            <Icons.list size={14} /> {tFunds("viewTransactions")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { CEAD_CHART_SCALE } from "@/lib/reports/templates/cead/constants";
import type { Locale } from "@/i18n/config";
import { formatCurrency, formatNumber } from "@/lib/i18n/format";
import { useLocale, useTranslations } from "next-intl";

function formatCompactAmount(value: number, locale: Locale): string {
  return formatNumber(value, locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function chartTickLabel(value: number, locale: Locale): string {
  if (value >= 1000) {
    return `${Math.round(value / 1000)}K`;
  }
  return formatNumber(value, locale, { maximumFractionDigits: 0 });
}

export function CeadFinancialMonthlyChart({
  totalIncome,
  totalExpense,
  netBalance,
  variant = "screen",
}: {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  variant?: "screen" | "print";
}) {
  const t = useTranslations("reports");
  const locale = useLocale() as Locale;
  const chartTicks = [800_000, 600_000, 400_000, 200_000, 0];
  const incomeBarHeight = Math.min((totalIncome / CEAD_CHART_SCALE) * 100, 100);
  const expenseBarHeight = Math.min((totalExpense / CEAD_CHART_SCALE) * 100, 100);
  const rootClass =
    variant === "print" ? "cead-form-chart" : "cead-card chart-card";

  return (
    <div className={rootClass}>
      {variant === "screen" ? (
        <div className="cead-card-head">
          <div className="sicon" style={{ background: "var(--cead-blue)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 20V10" />
              <path d="M12 20V4" />
              <path d="M18 20v-6" />
            </svg>
          </div>
          <span style={{ color: "var(--cead-blue)" }}>{t("preview.ceadMonthly.chartTitle")}</span>
        </div>
      ) : (
        <h2>{t("preview.ceadMonthly.chartTitle")}</h2>
      )}
      <div className={variant === "print" ? "cead-form-chart-body" : "chart-card-body"}>
        <div className="chart">
          <div className="grid-lines">
            {chartTicks.map((tick, index) => (
              <div
                key={tick}
                className="grid-line"
                style={{ top: `${(index / (chartTicks.length - 1)) * 100}%` }}
              >
                <span>{chartTickLabel(tick, locale)}</span>
              </div>
            ))}
          </div>
          <div className="bars">
            <div className="bar-col">
              <span className="bar-val mono" style={{ color: "var(--cead-green-icon)" }}>
                {formatCompactAmount(totalIncome, locale)}
              </span>
              <div
                className="bar"
                style={{
                  height: `${Math.max(incomeBarHeight, 4)}%`,
                  background: "var(--cead-green-icon)",
                }}
              />
              <span className="bar-name">{t("preview.ceadMonthly.chartIncome")}</span>
            </div>
            <div className="bar-col">
              <span className="bar-val mono" style={{ color: "var(--cead-red-icon)" }}>
                {formatCompactAmount(totalExpense, locale)}
              </span>
              <div
                className="bar"
                style={{
                  height: `${Math.max(expenseBarHeight, 4)}%`,
                  background: "var(--cead-red-icon)",
                }}
              />
              <span className="bar-name">{t("preview.ceadMonthly.chartExpense")}</span>
            </div>
          </div>
        </div>
        <div className="balance-box">
          <span>{t("preview.ceadMonthly.kpiNetBalance")}</span>
          <b className="mono">{formatCurrency(netBalance, locale)}</b>
        </div>
      </div>
    </div>
  );
}

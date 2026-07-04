"use client";

import "./cead-financial-monthly-preview.css";

import type { Locale } from "@/i18n/config";
import { FUENTE_INAGOTABLE, brandLogoForSurface } from "@/lib/brand";
import { fmtRD } from "@/lib/format-currency";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/i18n/format";
import type { CeadCouncilSendLine } from "@/lib/reports/templates/cead/financial-monthly";
import {
  CEAD_COUNCIL_SEND_I18N_KEYS,
  CEAD_EXPENSE_LINE_I18N_KEYS,
  CEAD_INCOME_LINE_I18N_KEYS,
} from "@/lib/reports/templates/cead/constants";
import type { FinancialMonthlyPayload } from "@/lib/services/reports";
import { useLocale, useTranslations } from "next-intl";
import type { RefObject } from "react";

const COUNCIL_PERCENT: Record<string, string> = {
  "Diezmo de la iglesia (10%)": "10%",
  "IBCR (3%)": "3%",
  "Educación Cristiana (1%)": "1%",
  "FPJ (1%)": "1%",
};

const CHART_SCALE = 800_000;

function formatFormulaAmount(value: number, locale: Locale): string {
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

function translateLineLabel(
  label: string,
  t: ReturnType<typeof useTranslations<"reports">>,
): string {
  const incomeKey =
    CEAD_INCOME_LINE_I18N_KEYS[label as keyof typeof CEAD_INCOME_LINE_I18N_KEYS];
  if (incomeKey) return t(incomeKey);
  const expenseKey =
    CEAD_EXPENSE_LINE_I18N_KEYS[label as keyof typeof CEAD_EXPENSE_LINE_I18N_KEYS];
  if (expenseKey) return t(expenseKey);
  const councilKey =
    CEAD_COUNCIL_SEND_I18N_KEYS[label as keyof typeof CEAD_COUNCIL_SEND_I18N_KEYS];
  if (councilKey) return t(councilKey);
  return label;
}

function councilFormulaDetail(
  line: CeadCouncilSendLine,
  payload: FinancialMonthlyPayload,
  locale: Locale,
  t: ReturnType<typeof useTranslations<"reports">>,
): string {
  const { totalIncome, expenseLines } = payload.cead;
  const pastoral =
    expenseLines.find((row) => row.label === "Asignación Pastoral")?.amount ?? 0;
  const percent = COUNCIL_PERCENT[line.label] ?? "";

  if (line.formula?.includes("10%")) {
    return t("preview.ceadMonthly.formulaDetail.tithe", {
      income: formatFormulaAmount(totalIncome, locale),
      pastoral: formatFormulaAmount(pastoral, locale),
      percent,
    });
  }

  return t("preview.ceadMonthly.formulaDetail.percentOfIncome", {
    income: formatFormulaAmount(totalIncome, locale),
    percent,
  });
}

function IconUser() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-5M12 8h.01" />
    </svg>
  );
}

function IconWarning() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c2660a" strokeWidth="2" aria-hidden>
      <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

export function CeadFinancialMonthlyPreview({
  payload,
  treasurerName,
  printRef,
}: {
  payload: FinancialMonthlyPayload;
  treasurerName?: string | null;
  printRef?: RefObject<HTMLDivElement | null>;
}) {
  const t = useTranslations("reports");
  const locale = useLocale() as Locale;
  const { cead } = payload;

  const councilTotal = cead.councilLines.reduce((sum, line) => sum + line.amount, 0);
  const logoSrc = brandLogoForSurface("document");

  const incomeRows = cead.incomeLines.map((line) => ({
    key: line.label,
    label: translateLineLabel(line.label, t),
    amount: fmtRD(line.amount, locale),
  }));

  const expenseRows = cead.expenseLines.map((line) => ({
    key: line.label,
    label: translateLineLabel(line.label, t),
    amount: fmtRD(line.amount, locale),
  }));

  const churchDisplay = FUENTE_INAGOTABLE.churchDisplayName;
  const pastorDisplay = payload.pastorName?.trim() || "—";
  const treasurerDisplay = treasurerName?.trim() || "—";
  const generatedLabel = formatDateTime(payload.generatedAt, locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const incomeBarHeight = Math.min((cead.totalIncome / CHART_SCALE) * 100, 100);
  const expenseBarHeight = Math.min((cead.totalExpense / CHART_SCALE) * 100, 100);
  const chartTicks = [800_000, 600_000, 400_000, 200_000, 0];

  return (
    <div ref={printRef} className="cead-dash">
      <div className="cead-page">
        <div className="cead-head">
          <div className="cead-head-left">
            <div className="cead-head-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} alt={churchDisplay} />
            </div>
            <div className="cead-head-copy">
              <h1>{t("preview.ceadMonthly.title")}</h1>
              <p className="cead-head-subtitle">{churchDisplay}</p>
              <div className="cead-head-meta">
                <span>
                  <IconUser />
                  {t("preview.ceadMonthly.pastor")}: <b>{pastorDisplay}</b>
                </span>
                <span className="sep">|</span>
                <span>
                  <IconCalendar />
                  <b>{cead.periodLabel}</b>
                </span>
              </div>
            </div>
          </div>
          <div className="cead-head-info">
            <div>
              <IconCalendar />
              {t("preview.ceadMonthly.generatedAt")}: <b>{generatedLabel}</b>
            </div>
            <div>
              <IconUser />
              {t("preview.ceadMonthly.treasurer")}: <b>{treasurerDisplay}</b>
            </div>
          </div>
        </div>

        <div className="cead-kpis">
          <div className="cead-kpi">
            <div className="cead-kpi-icon" style={{ background: "var(--cead-green-icon)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M3 17l6-6 4 4 8-8" />
                <path d="M15 7h6v6" />
              </svg>
            </div>
            <div className="cead-kpi-body">
              <p className="cead-kpi-label" style={{ color: "var(--cead-green)" }}>
                {t("preview.ceadMonthly.kpiTotalIncome")}
              </p>
              <p className="cead-kpi-value mono">{formatCurrency(cead.totalIncome, locale)}</p>
            </div>
          </div>
          <div className="cead-kpi">
            <div className="cead-kpi-icon" style={{ background: "var(--cead-red-icon)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M3 7l6 6 4-4 8 8" />
                <path d="M15 17h6v-6" />
              </svg>
            </div>
            <div className="cead-kpi-body">
              <p className="cead-kpi-label" style={{ color: "var(--cead-red)" }}>
                {t("preview.ceadMonthly.kpiTotalExpense")}
              </p>
              <p className="cead-kpi-value mono">{formatCurrency(cead.totalExpense, locale)}</p>
            </div>
          </div>
          <div className="cead-kpi">
            <div className="cead-kpi-icon" style={{ background: "var(--cead-blue)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <path d="M8 6h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M16 15h0" />
              </svg>
            </div>
            <div className="cead-kpi-body">
              <p className="cead-kpi-label" style={{ color: "var(--cead-blue)" }}>
                {t("preview.ceadMonthly.kpiNetBalance")}
              </p>
              <p className="cead-kpi-value mono">{formatCurrency(cead.netBalance, locale)}</p>
            </div>
          </div>
          <div className="cead-kpi">
            <div className="cead-kpi-icon" style={{ background: "var(--cead-orange-icon)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M22 2 11 13" />
                <path d="M22 2 15 22l-4-9-9-4 20-7z" />
              </svg>
            </div>
            <div className="cead-kpi-body">
              <p className="cead-kpi-label" style={{ color: "var(--cead-orange)" }}>
                {t("preview.ceadMonthly.kpiCouncilSends")}
              </p>
              <p className="cead-kpi-value mono">{formatCurrency(councilTotal, locale)}</p>
            </div>
          </div>
        </div>

        <div className="row3">
          <div className="cead-card ledger-card">
            <div className="cead-card-head">
              <div className="sicon" style={{ background: "var(--cead-green-icon)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <rect x="2" y="6" width="20" height="13" rx="2" />
                  <path d="M2 10h20" />
                </svg>
              </div>
              <span style={{ color: "var(--cead-green)" }}>{t("preview.ceadMonthly.sectionIncome")}</span>
            </div>
            <div className="cead-card-body ledger-card-body">
              <table className="ledger income">
                <thead>
                  <tr>
                    <td>{t("preview.ceadMonthly.concept")}</td>
                    <td>{t("preview.ceadMonthly.amountRd")}</td>
                  </tr>
                </thead>
                <tbody>
                  {incomeRows.map((row) => (
                    <tr key={row.key}>
                      <td>{row.label}</td>
                      <td className="mono">{row.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="ledger-total ledger-total-income">
                <span>{t("preview.ceadMonthly.totalIncome")}</span>
                <span className="mono">{fmtRD(cead.totalIncome, locale)}</span>
              </div>
            </div>
          </div>

          <div className="cead-card ledger-card">
            <div className="cead-card-head">
              <div className="sicon" style={{ background: "var(--cead-red-icon)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                </svg>
              </div>
              <span style={{ color: "var(--cead-red)" }}>{t("preview.ceadMonthly.sectionExpense")}</span>
            </div>
            <div className="cead-card-body ledger-card-body">
              <table className="ledger expense">
                <thead>
                  <tr>
                    <td>{t("preview.ceadMonthly.concept")}</td>
                    <td>{t("preview.ceadMonthly.amountRd")}</td>
                  </tr>
                </thead>
                <tbody>
                  {expenseRows.map((row) => (
                    <tr key={row.key}>
                      <td>{row.label}</td>
                      <td className="mono">{row.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="ledger-total ledger-total-expense">
                <span>{t("preview.ceadMonthly.totalExpense")}</span>
                <span className="mono">{fmtRD(cead.totalExpense, locale)}</span>
              </div>
            </div>
          </div>

          <div className="cead-card chart-card">
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
            <div className="chart-card-body">
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
                      {formatFormulaAmount(cead.totalIncome, locale)}
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
                      {formatFormulaAmount(cead.totalExpense, locale)}
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
                <b className="mono">{formatCurrency(cead.netBalance, locale)}</b>
              </div>
            </div>
          </div>
        </div>

        <div className="row2">
          <div className="cead-card council-card ledger-card">
            <div className="cead-card-head">
              <div className="sicon" style={{ background: "var(--cead-blue)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M22 2 11 13" />
                  <path d="M22 2 15 22l-4-9-9-4 20-7z" />
                </svg>
              </div>
              <span style={{ color: "var(--cead-navy)" }}>{t("preview.ceadMonthly.sectionCouncil")}</span>
            </div>
            <div className="cead-card-body ledger-card-body council-card-body">
              <table className="council-table">
                <thead>
                  <tr>
                    <td>{t("preview.ceadMonthly.destination")}</td>
                    <td className="num">{t("preview.ceadMonthly.percentage")}</td>
                    <td className="num">{t("preview.ceadMonthly.formula")}</td>
                    <td className="num">{t("preview.ceadMonthly.amountRd")}</td>
                  </tr>
                </thead>
                <tbody>
                  {cead.councilLines.map((line) => (
                    <tr key={line.label}>
                      <td>{translateLineLabel(line.label, t)}</td>
                      <td className="num">{COUNCIL_PERCENT[line.label] ?? "—"}</td>
                      <td className="formula">{councilFormulaDetail(line, payload, locale, t)}</td>
                      <td className="amt mono">{fmtRD(line.amount, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="ledger-total ledger-total-council">
                <span>{t("preview.ceadMonthly.totalCouncilSends")}</span>
                <span className="mono">{fmtRD(councilTotal, locale)}</span>
              </div>
              <div className="council-note">
                <IconInfo />
                <span>{t("preview.ceadMonthly.councilFootnote")}</span>
              </div>
            </div>
          </div>

          <div className="cead-card side-notes">
            <div className="cead-card-head">
              <IconWarning />
              <span style={{ color: "var(--cead-orange)" }}>{t("preview.ceadMonthly.importantNotes")}</span>
            </div>
            <div className="notes-body">
              <p>{t("preview.ceadMonthly.notesBodyLine1")}</p>
              <p>{t("preview.ceadMonthly.notesBodyLine2")}</p>
            </div>
          </div>
        </div>

        <div className="cead-card print-notes">
          <div className="cead-card-head">
            <IconWarning />
            <span style={{ color: "var(--cead-orange)" }}>{t("preview.ceadMonthly.importantNotes")}</span>
          </div>
          <div className="notes-body">
            <p>{t("preview.ceadMonthly.notesBodyLine1")}</p>
            <p>{t("preview.ceadMonthly.notesBodyLine2")}</p>
          </div>
        </div>

        <div className="print-footer">
          <span>
            {t("preview.ceadMonthly.generatedAt")}: {generatedLabel}
          </span>
          <span>{t("preview.ceadMonthly.pageOf", { page: 1, total: 1 })}</span>
          <span>
            {t("preview.ceadMonthly.treasurer")}: {treasurerDisplay}
          </span>
        </div>
      </div>
    </div>
  );
}

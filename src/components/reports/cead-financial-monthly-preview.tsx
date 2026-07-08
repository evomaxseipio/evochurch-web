"use client";

import "./cead-financial-monthly-preview.css";
import "./cead-financial-monthly-form-print.css";

import { CeadFinancialMonthlyChart } from "@/components/reports/cead-financial-monthly-chart";
import { CeadFinancialMonthlyFormPrint } from "@/components/reports/cead-financial-monthly-form-print";
import {
  COUNCIL_PERCENT,
  councilFormulaDetail,
  translateCeadLineLabel,
} from "@/components/reports/cead-financial-monthly-helpers";
import type { Locale } from "@/i18n/config";
import { FUENTE_INAGOTABLE, brandLogoForSurface } from "@/lib/brand";
import { fmtRD } from "@/lib/format-currency";
import { formatCurrency, formatDateTime } from "@/lib/i18n/format";
import type { FinancialMonthlyPayload } from "@/lib/services/reports";
import { useLocale, useTranslations } from "next-intl";
import type { RefObject } from "react";

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
    label: translateCeadLineLabel(line.label, t),
    amount: fmtRD(line.amount, locale),
  }));

  const expenseRows = cead.expenseLines.map((line) => ({
    key: line.label,
    label: translateCeadLineLabel(line.label, t),
    amount: fmtRD(line.amount, locale),
  }));

  const churchDisplay = payload.churchName?.trim() || FUENTE_INAGOTABLE.churchDisplayName;
  const pastorDisplay = payload.pastorName?.trim() || "—";
  const treasurerDisplay = treasurerName?.trim() || "—";
  const generatedLabel = formatDateTime(payload.generatedAt, locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div ref={printRef} className="cead-dash">
      <div className="cead-page cead-monthly-screen">
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

          <CeadFinancialMonthlyChart
            totalIncome={cead.totalIncome}
            totalExpense={cead.totalExpense}
            netBalance={cead.netBalance}
            variant="screen"
          />
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
                      <td>{translateCeadLineLabel(line.label, t)}</td>
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
      </div>

      <CeadFinancialMonthlyFormPrint payload={payload} treasurerName={treasurerDisplay} />
    </div>
  );
}

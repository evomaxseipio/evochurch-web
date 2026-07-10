"use client";

import { CeadFinancialMonthlyChart } from "@/components/reports/cead-financial-monthly-chart";
import {
  councilFormulaDetail,
  councilLinePercentDisplay,
  translateCeadLineLabel,
} from "@/components/reports/cead-financial-monthly-helpers";
import type { Locale } from "@/i18n/config";
import { FUENTE_INAGOTABLE, brandLogoForSurface } from "@/lib/brand";
import { fmtRD } from "@/lib/format-currency";
import { formatCurrency, formatDateTime } from "@/lib/i18n/format";
import type { FinancialMonthlyPayload } from "@/lib/services/reports";
import { useLocale, useTranslations } from "next-intl";

export function CeadFinancialMonthlyFormPrint({
  payload,
  treasurerName,
}: {
  payload: FinancialMonthlyPayload;
  treasurerName?: string | null;
}) {
  const t = useTranslations("reports");
  const locale = useLocale() as Locale;
  const { cead } = payload;

  const councilTotal = cead.councilLines.reduce((sum, line) => sum + line.amount, 0);
  const logoSrc = brandLogoForSurface("document");
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
    <div className="cead-financial-monthly-form-print" aria-hidden>
      <header className="cead-form-head">
        <div className="cead-form-head-main">
          <div className="cead-form-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt={churchDisplay} />
          </div>
          <div>
            <h1>{t("preview.ceadMonthly.title")}</h1>
            <p className="cead-form-church">{churchDisplay}</p>
            <p className="cead-form-period">{cead.periodLabel}</p>
            <p className="cead-form-meta">
              {t("preview.ceadMonthly.pastor")}: <strong>{pastorDisplay}</strong>
            </p>
          </div>
        </div>
        <div className="cead-form-head-info">
          <div>
            {t("preview.ceadMonthly.generatedAt")}: <strong>{generatedLabel}</strong>
          </div>
          <div>
            {t("preview.ceadMonthly.treasurer")}: <strong>{treasurerDisplay}</strong>
          </div>
        </div>
      </header>

      <div className="cead-form-kpis">
        <div className="cead-form-kpi income">
          <span className="cead-form-kpi-label">{t("preview.ceadMonthly.kpiTotalIncome")}</span>
          <span className="cead-form-kpi-value mono">{formatCurrency(cead.totalIncome, locale)}</span>
        </div>
        <div className="cead-form-kpi expense">
          <span className="cead-form-kpi-label">{t("preview.ceadMonthly.kpiTotalExpense")}</span>
          <span className="cead-form-kpi-value mono">{formatCurrency(cead.totalExpense, locale)}</span>
        </div>
        <div className="cead-form-kpi balance">
          <span className="cead-form-kpi-label">{t("preview.ceadMonthly.kpiNetBalance")}</span>
          <span className="cead-form-kpi-value mono">{formatCurrency(cead.netBalance, locale)}</span>
        </div>
        <div className="cead-form-kpi council">
          <span className="cead-form-kpi-label">{t("preview.ceadMonthly.kpiCouncilSends")}</span>
          <span className="cead-form-kpi-value mono">{formatCurrency(councilTotal, locale)}</span>
        </div>
      </div>

      <div className="cead-form-row3">
        <section className="cead-form-ledger-col income">
          <h2>{t("preview.ceadMonthly.sectionIncome")}</h2>
          <table>
            <thead>
              <tr>
                <th>{t("preview.ceadMonthly.concept")}</th>
                <th>{t("preview.ceadMonthly.amountRd")}</th>
              </tr>
            </thead>
            <tbody>
              {cead.incomeLines.map((line) => (
                <tr key={line.label}>
                  <td>{translateCeadLineLabel(line.label, t)}</td>
                  <td className="mono">{fmtRD(line.amount, locale)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>{t("preview.ceadMonthly.totalIncome")}</td>
                <td className="mono">{fmtRD(cead.totalIncome, locale)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section className="cead-form-ledger-col expense">
          <h2>{t("preview.ceadMonthly.sectionExpense")}</h2>
          <table>
            <thead>
              <tr>
                <th>{t("preview.ceadMonthly.concept")}</th>
                <th>{t("preview.ceadMonthly.amountRd")}</th>
              </tr>
            </thead>
            <tbody>
              {cead.expenseLines.map((line) => (
                <tr key={line.label}>
                  <td>{translateCeadLineLabel(line.label, t)}</td>
                  <td className="mono">{fmtRD(line.amount, locale)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>{t("preview.ceadMonthly.totalExpense")}</td>
                <td className="mono">{fmtRD(cead.totalExpense, locale)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <CeadFinancialMonthlyChart
          totalIncome={cead.totalIncome}
          totalExpense={cead.totalExpense}
          netBalance={cead.netBalance}
          variant="print"
        />
      </div>

      <section className="cead-form-council">
        <h2>{t("preview.ceadMonthly.sectionCouncil")}</h2>
        <table>
          <thead>
            <tr>
              <th>{t("preview.ceadMonthly.destination")}</th>
              <th>{t("preview.ceadMonthly.percentage")}</th>
              <th>{t("preview.ceadMonthly.formula")}</th>
              <th>{t("preview.ceadMonthly.amountRd")}</th>
            </tr>
          </thead>
          <tbody>
            {cead.councilLines.map((line) => (
              <tr key={line.label}>
                <td>{translateCeadLineLabel(line.label, t)}</td>
                <td className="mono">{councilLinePercentDisplay(line)}</td>
                <td className="cead-form-formula">
                  {councilFormulaDetail(line, payload, locale, t)}
                </td>
                <td className="mono">{fmtRD(line.amount, locale)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>{t("preview.ceadMonthly.totalCouncilSends")}</td>
              <td className="mono">{fmtRD(councilTotal, locale)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="cead-form-council-note">{t("preview.ceadMonthly.councilFootnote")}</p>
      </section>

      <section className="cead-form-notes">
        <h2>{t("preview.ceadMonthly.importantNotes")}</h2>
        <p>{t("preview.ceadMonthly.notesBodyLine1")}</p>
        <p>{t("preview.ceadMonthly.notesBodyLine2")}</p>
      </section>

      <footer className="cead-form-footer">
        <span>
          {t("preview.ceadMonthly.generatedAt")}: {generatedLabel}
        </span>
        <span>{t("preview.ceadMonthly.pageOf", { page: 1, total: 1 })}</span>
        <span>
          {t("preview.ceadMonthly.treasurer")}: {treasurerDisplay}
        </span>
      </footer>
    </div>
  );
}

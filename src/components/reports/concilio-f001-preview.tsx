"use client";

import "./concilio-f001-preview.css";
import "./cead-financial-monthly-preview.css";

import type { Locale } from "@/i18n/config";
import { ConcilioF001FormPrint } from "@/components/reports/concilio-f001-form-print";
import { brandLogoForSurface } from "@/lib/brand";
import { fmtRD } from "@/lib/format-currency";
import { formatCurrency, formatDateTime } from "@/lib/i18n/format";
import { f001LineI18nKey } from "@/lib/reports/templates/concilio/f001-label-keys";
import type { ConcilioF001ReportPayload } from "@/lib/services/reports";
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

function IconWarning() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c2660a" strokeWidth="2" aria-hidden>
      <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}

export function ConcilioF001Preview({
  payload,
  treasurerName,
  printRef,
}: {
  payload: ConcilioF001ReportPayload;
  treasurerName?: string | null;
  printRef?: RefObject<HTMLDivElement | null>;
}) {
  const t = useTranslations("reports");
  const locale = useLocale() as Locale;
  const logoSrc = brandLogoForSurface("document");

  const churchDisplay = payload.churchName?.trim() || payload.meta.churchName;
  const pastorDisplay = payload.pastorName?.trim() || payload.meta.pastorName;
  const treasurerDisplay =
    treasurerName?.trim() || payload.meta.treasurerName || "—";
  const generatedLabel = formatDateTime(payload.generatedAt, locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const lineLabel = (key: string) => t(f001LineI18nKey(key));

  const councilTotal = payload.kpis.totalCouncilSends;

  return (
    <div ref={printRef} className="cead-dash concilio-f001-dash">
      <div className="cead-page concilio-f001-screen">
        <div className="cead-head">
          <div className="cead-head-brand">
            <div className="cead-head-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} alt={churchDisplay} />
            </div>
            <p className="cead-head-church">{churchDisplay}</p>
          </div>
          <div className="cead-head-main">
            <h1>{t("preview.concilioF001.title")}</h1>
            <div className="cead-head-meta">
              <span>
                <IconUser />
                {t("preview.ceadMonthly.pastor")}: <b>{pastorDisplay}</b>
              </span>
              <span className="sep">|</span>
              <span>
                <IconCalendar />
                <b>{payload.periodLabel}</b>
              </span>
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
              <p className="cead-kpi-value mono">{formatCurrency(payload.kpis.totalIncome, locale)}</p>
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
              <p className="cead-kpi-value mono">{formatCurrency(payload.kpis.totalExpense, locale)}</p>
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
              <p className="cead-kpi-value mono">{formatCurrency(payload.kpis.netBalance, locale)}</p>
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

        <div className="concilio-f001-row3">
          <LedgerCard
            title={t("preview.concilioF001.generalIncome")}
            color="var(--cead-green)"
            iconBg="var(--cead-green-icon)"
            rows={payload.sectionB.generalIncome.map((line) => ({
              label: lineLabel(line.key),
              amount: fmtRD(line.amount, locale),
            }))}
            totalLabel={t("preview.concilioF001.totalGeneralIncome")}
            totalAmount={fmtRD(payload.sectionB.totals.generalIncome, locale)}
            totalClass="ledger-total-income"
            conceptLabel={t("preview.ceadMonthly.concept")}
            amountLabel={t("preview.ceadMonthly.amountRd")}
          />
          <LedgerCard
            title={t("preview.concilioF001.ministryIncome")}
            color="var(--cead-blue)"
            iconBg="var(--cead-blue)"
            rows={payload.sectionB.ministryIncome.map((line) => ({
              label: lineLabel(line.key),
              amount: fmtRD(line.amount, locale),
            }))}
            totalLabel={t("preview.concilioF001.totalMinistryIncome")}
            totalAmount={fmtRD(payload.sectionB.totals.ministryIncome, locale)}
            totalClass="ledger-total-council"
            conceptLabel={t("preview.ceadMonthly.concept")}
            amountLabel={t("preview.ceadMonthly.amountRd")}
          />
          <LedgerCard
            title={t("preview.concilioF001.churchExpenses")}
            color="var(--cead-red)"
            iconBg="var(--cead-red-icon)"
            rows={payload.sectionB.churchExpenses.map((line) => ({
              label: lineLabel(line.key),
              amount: fmtRD(line.amount, locale),
            }))}
            totalLabel={t("preview.concilioF001.totalChurchExpenses")}
            totalAmount={fmtRD(payload.sectionB.totals.churchExpenses, locale)}
            totalClass="ledger-total-expense"
            conceptLabel={t("preview.ceadMonthly.concept")}
            amountLabel={t("preview.ceadMonthly.amountRd")}
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
              <span style={{ color: "var(--cead-navy)" }}>
                {t("preview.concilioF001.sectionCouncil")}
              </span>
            </div>
            <div className="cead-card-body ledger-card-body council-card-body">
              <table className="council-table concilio-f001-council-table">
                <thead>
                  <tr>
                    <td>{t("preview.concilioF001.churchToCouncil")}</td>
                    <td className="num">{t("preview.ceadMonthly.amountRd")}</td>
                    <td>{t("preview.concilioF001.ministryNational")}</td>
                    <td className="num">{t("preview.ceadMonthly.amountRd")}</td>
                    <td>{t("preview.concilioF001.specialContributions")}</td>
                    <td className="num">{t("preview.ceadMonthly.amountRd")}</td>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({
                    length: Math.max(
                      payload.sectionC.churchToCouncil.length,
                      payload.sectionC.ministryToNational.length,
                      payload.sectionC.specialContributions.length,
                    ),
                  }).map((_, index) => {
                    const church = payload.sectionC.churchToCouncil[index];
                    const ministry = payload.sectionC.ministryToNational[index];
                    const special = payload.sectionC.specialContributions[index];
                    return (
                      <tr key={index}>
                        <td>{church ? lineLabel(church.key) : ""}</td>
                        <td className="amt mono">
                          {church ? fmtRD(church.amount, locale) : ""}
                        </td>
                        <td>{ministry ? lineLabel(ministry.key) : ""}</td>
                        <td className="amt mono">
                          {ministry ? fmtRD(ministry.amount, locale) : ""}
                        </td>
                        <td>{special ? lineLabel(special.key) : ""}</td>
                        <td className="amt mono">
                          {special ? fmtRD(special.amount, locale) : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="ledger-total ledger-total-council">
                <span>{t("preview.ceadMonthly.totalCouncilSends")}</span>
                <span className="mono">{fmtRD(councilTotal, locale)}</span>
              </div>
            </div>
          </div>

          <div className="cead-card side-notes">
            <div className="cead-card-head">
              <IconWarning />
              <span style={{ color: "var(--cead-orange)" }}>
                {t("preview.concilioF001.sectionCooperative")}
              </span>
            </div>
            <div className="notes-body concilio-f001-cooperative">
              <p>
                <b>{t("preview.concilioF001.churchBlock")}</b>:{" "}
                {formatCurrency(payload.sectionD.church.savings, locale)} /{" "}
                {formatCurrency(payload.sectionD.church.loanPayment, locale)} /{" "}
                {formatCurrency(payload.sectionD.church.funeralPlan, locale)}
              </p>
              <p>
                <b>{t("preview.concilioF001.pastorBlock")}</b>:{" "}
                {formatCurrency(payload.sectionD.pastor.savings, locale)} /{" "}
                {formatCurrency(payload.sectionD.pastor.loanPayment, locale)} /{" "}
                {formatCurrency(payload.sectionD.pastor.funeralPlan, locale)}
              </p>
              <p>
                <b>{t("preview.concilioF001.totalMovements")}</b>:{" "}
                {formatCurrency(payload.sectionD.totalMovements, locale)}
              </p>
            </div>
          </div>
        </div>

        <div className="cead-card print-notes">
          <div className="cead-card-head">
            <IconWarning />
            <span style={{ color: "var(--cead-orange)" }}>
              {t("preview.ceadMonthly.importantNotes")}
            </span>
          </div>
          <div className="notes-body">
            <p>{t("preview.concilioF001.regulationNote")}</p>
          </div>
        </div>
      </div>

      <ConcilioF001FormPrint payload={payload} treasurerName={treasurerDisplay} />
    </div>
  );
}

function LedgerCard({
  title,
  color,
  iconBg,
  rows,
  totalLabel,
  totalAmount,
  totalClass,
  conceptLabel,
  amountLabel,
}: {
  title: string;
  color: string;
  iconBg: string;
  rows: { label: string; amount: string }[];
  totalLabel: string;
  totalAmount: string;
  totalClass: string;
  conceptLabel: string;
  amountLabel: string;
}) {
  return (
    <div className="cead-card ledger-card">
      <div className="cead-card-head">
        <div className="sicon" style={{ background: iconBg }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="2" y="6" width="20" height="13" rx="2" />
            <path d="M2 10h20" />
          </svg>
        </div>
        <span style={{ color }}>{title}</span>
      </div>
      <div className="cead-card-body ledger-card-body">
        <table className="ledger income">
          <thead>
            <tr>
              <td>{conceptLabel}</td>
              <td>{amountLabel}</td>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td className="mono">{row.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className={`ledger-total ${totalClass}`}>
          <span>{totalLabel}</span>
          <span className="mono">{totalAmount}</span>
        </div>
      </div>
    </div>
  );
}

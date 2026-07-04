"use client";

import type { Locale } from "@/i18n/config";
import { fmtRD } from "@/lib/format-currency";
import { f001LineI18nKey } from "@/lib/reports/templates/concilio/f001-label-keys";
import type { ConcilioF001ReportPayload } from "@/lib/services/reports";
import { useLocale, useTranslations } from "next-intl";

export function ConcilioF001FormPrint({
  payload,
  treasurerName,
}: {
  payload: ConcilioF001ReportPayload;
  treasurerName?: string;
}) {
  const t = useTranslations("reports");
  const locale = useLocale() as Locale;
  const lineLabel = (key: string) => t(f001LineI18nKey(key));

  const maxB = Math.max(
    payload.sectionB.generalIncome.length,
    payload.sectionB.ministryIncome.length,
    payload.sectionB.churchExpenses.length,
  );
  const maxC = Math.max(
    payload.sectionC.churchToCouncil.length,
    payload.sectionC.ministryToNational.length,
    payload.sectionC.specialContributions.length,
  );

  return (
    <div className="concilio-f001-form-print" aria-hidden>
      <div className="concilio-form-header">
        <p className="concilio-form-council">{payload.meta.councilHeader}</p>
        <p className="concilio-form-rnc">RNC. 4-01-50833-8 · {payload.meta.formCode}</p>
        <h2>{t("exports.concilioF001.title").toUpperCase()}</h2>
      </div>

      <section className="concilio-form-section">
        <h3>{t("exports.concilioF001.sectionA")}</h3>
        <table className="concilio-form-meta">
          <tbody>
            <tr>
              <th>{t("exports.concilioF001.presbytery")}</th>
              <td colSpan={2}>{payload.meta.presbyterio}</td>
              <th>{t("exports.concilioF001.presbyter")}</th>
              <td colSpan={2}>{payload.meta.presbyterName}</td>
            </tr>
            <tr>
              <th>{t("exports.common.pastor")}</th>
              <td colSpan={2}>{payload.meta.pastorName}</td>
              <th>{t("exports.concilioF001.pastorCredential")}</th>
              <td colSpan={2}>{payload.meta.pastorCredential}</td>
            </tr>
            <tr>
              <th>{t("exports.common.church")}</th>
              <td colSpan={2}>{payload.meta.churchName}</td>
              <th>{t("exports.concilioF001.churchCode")}</th>
              <td colSpan={2}>{payload.meta.churchCode}</td>
            </tr>
            <tr>
              <th>{t("exports.concilioF001.spouse")}</th>
              <td colSpan={2}>{payload.meta.spouseName ?? ""}</td>
              <th>{t("exports.concilioF001.spouseCredential")}</th>
              <td colSpan={2}>{payload.meta.spouseCredential ?? ""}</td>
            </tr>
            <tr>
              <th>{t("exports.concilioF001.month")}</th>
              <td>{payload.meta.month}</td>
              <th>{t("exports.concilioF001.year")}</th>
              <td>{payload.meta.year}</td>
              <td colSpan={2} />
            </tr>
          </tbody>
        </table>
      </section>

      <section className="concilio-form-section">
        <h3>{t("exports.concilioF001.sectionB")}</h3>
        <table className="concilio-form-grid">
          <thead>
            <tr>
              <th colSpan={2}>{t("exports.concilioF001.generalIncomeCol")}</th>
              <th colSpan={2}>{t("exports.concilioF001.ministryIncomeCol")}</th>
              <th colSpan={2}>{t("exports.concilioF001.churchExpensesCol")}</th>
            </tr>
            <tr>
              <th>{t("exports.common.concept")}</th>
              <th>{t("exports.common.amountRd")}</th>
              <th>{t("exports.common.concept")}</th>
              <th>{t("exports.common.amountRd")}</th>
              <th>{t("exports.common.concept")}</th>
              <th>{t("exports.common.amountRd")}</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxB }).map((_, index) => {
              const general = payload.sectionB.generalIncome[index];
              const ministry = payload.sectionB.ministryIncome[index];
              const expense = payload.sectionB.churchExpenses[index];
              return (
                <tr key={index}>
                  <td>{general ? lineLabel(general.key) : ""}</td>
                  <td className="mono">{general ? fmtRD(general.amount, locale) : ""}</td>
                  <td>{ministry ? lineLabel(ministry.key) : ""}</td>
                  <td className="mono">{ministry ? fmtRD(ministry.amount, locale) : ""}</td>
                  <td>{expense ? lineLabel(expense.key) : ""}</td>
                  <td className="mono">{expense ? fmtRD(expense.amount, locale) : ""}</td>
                </tr>
              );
            })}
            <tr className="concilio-form-total">
              <td>{t("exports.concilioF001.totalGeneralIncome")}</td>
              <td className="mono">{fmtRD(payload.sectionB.totals.generalIncome, locale)}</td>
              <td>{t("exports.concilioF001.totalMinistryIncome")}</td>
              <td className="mono">{fmtRD(payload.sectionB.totals.ministryIncome, locale)}</td>
              <td>{t("exports.concilioF001.totalChurchExpenses")}</td>
              <td className="mono">{fmtRD(payload.sectionB.totals.churchExpenses, locale)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="concilio-form-section">
        <h3>{t("exports.concilioF001.sectionC")}</h3>
        <table className="concilio-form-grid">
          <thead>
            <tr>
              <th colSpan={2}>{t("exports.concilioF001.churchToCouncilCol")}</th>
              <th colSpan={2}>{t("exports.concilioF001.ministryNationalCol")}</th>
              <th colSpan={2}>{t("exports.concilioF001.specialContributionsCol")}</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxC }).map((_, index) => {
              const church = payload.sectionC.churchToCouncil[index];
              const ministry = payload.sectionC.ministryToNational[index];
              const special = payload.sectionC.specialContributions[index];
              return (
                <tr key={index}>
                  <td>{church ? lineLabel(church.key) : ""}</td>
                  <td className="mono">{church ? fmtRD(church.amount, locale) : ""}</td>
                  <td>{ministry ? lineLabel(ministry.key) : ""}</td>
                  <td className="mono">{ministry ? fmtRD(ministry.amount, locale) : ""}</td>
                  <td>{special ? lineLabel(special.key) : ""}</td>
                  <td className="mono">{special ? fmtRD(special.amount, locale) : ""}</td>
                </tr>
              );
            })}
            <tr className="concilio-form-total">
              <td>{t("exports.concilioF001.subtotalChurchCouncil")}</td>
              <td className="mono">{fmtRD(payload.sectionC.subtotals.churchToCouncil, locale)}</td>
              <td>{t("exports.concilioF001.subtotalMinistryNational")}</td>
              <td className="mono">{fmtRD(payload.sectionC.subtotals.ministryToNational, locale)}</td>
              <td>{t("exports.concilioF001.subtotalSpecialContributions")}</td>
              <td className="mono">{fmtRD(payload.sectionC.subtotals.specialContributions, locale)}</td>
            </tr>
          </tbody>
        </table>
        <p className="concilio-form-note">{t("exports.concilioF001.regulationNote")}</p>
      </section>

      <section className="concilio-form-section">
        <h3>{t("exports.concilioF001.sectionD")}</h3>
        <table className="concilio-form-grid">
          <thead>
            <tr>
              <th colSpan={2}>{t("exports.concilioF001.churchBlock")}</th>
              <th colSpan={2}>{t("exports.concilioF001.pastorBlock")}</th>
              <th colSpan={2} />
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{t("exports.concilioF001.churchSavings")}</td>
              <td className="mono">{fmtRD(payload.sectionD.church.savings, locale)}</td>
              <td>{t("exports.concilioF001.pastorSavings")}</td>
              <td className="mono">{fmtRD(payload.sectionD.pastor.savings, locale)}</td>
              <td colSpan={2} />
            </tr>
            <tr>
              <td>{t("exports.concilioF001.churchLoan")}</td>
              <td className="mono">{fmtRD(payload.sectionD.church.loanPayment, locale)}</td>
              <td>{t("exports.concilioF001.pastorLoan")}</td>
              <td className="mono">{fmtRD(payload.sectionD.pastor.loanPayment, locale)}</td>
              <td colSpan={2} />
            </tr>
            <tr>
              <td>{t("exports.concilioF001.churchFuneralPlan")}</td>
              <td className="mono">{fmtRD(payload.sectionD.church.funeralPlan, locale)}</td>
              <td>{t("exports.concilioF001.pastorFuneralPlan")}</td>
              <td className="mono">{fmtRD(payload.sectionD.pastor.funeralPlan, locale)}</td>
              <td colSpan={2} />
            </tr>
            <tr className="concilio-form-total">
              <td colSpan={2}>{t("exports.concilioF001.totalMovements")}</td>
              <td className="mono" colSpan={2}>
                {fmtRD(payload.sectionD.totalMovements, locale)}
              </td>
              <td colSpan={2} />
            </tr>
          </tbody>
        </table>
      </section>

      <footer className="concilio-form-footer">
        <span>{t("exports.concilioF001.preparedOn")}: {payload.signatures.preparedOn ?? ""}</span>
        <span>{t("exports.concilioF001.treasurerSignature")}: {treasurerName ?? ""}</span>
        <span>{t("exports.concilioF001.pastorSignature")}: {payload.meta.pastorName}</span>
      </footer>
    </div>
  );
}

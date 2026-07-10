"use client";

import Link from "next/link";
import {
  closeTitheWeekAction,
  exportTitheClosePdfAction,
  seedDefaultTitheTemplateAction,
} from "@/app/(app)/finances/tithe-close/actions";
import { FinancesTabs } from "@/components/finances/finances-tabs";
import { FinPageHeader } from "@/components/finances/fin-page-header";
import { formatWeekLabel, shiftSundayWeek } from "@/lib/discounts/week-period";
import type { DiscountPeriodRun } from "@/lib/discounts/types";
import { downloadBase64File } from "@/lib/reports/download";
import { fmtRD } from "@/lib/format-currency";
import { toast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

export function TitheCloseView({
  run,
  noTemplate,
  periodStart,
  locale,
  canWrite,
  canManageTemplates,
}: {
  run: DiscountPeriodRun | null;
  noTemplate: boolean;
  periodStart: string;
  locale: string;
  canWrite: boolean;
  canManageTemplates: boolean;
}) {
  const t = useTranslations("finances.titheClose");
  const tFinances = useTranslations("finances");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [busy, setBusy] = useState<"close" | "export" | "seed" | null>(null);

  const weekLabel = formatWeekLabel(periodStart, run?.periodEnd ?? periodStart, locale);
  const isClosed = run?.status === "closed";

  function navigateWeek(weeks: number) {
    const next = shiftSundayWeek(periodStart, weeks);
    router.push(`/finances/tithe-close?week=${next.periodStart}`);
  }

  async function handleSeed() {
    setBusy("seed");
    try {
      const result = await seedDefaultTitheTemplateAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("seedSuccess"));
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function handleClose() {
    if (!window.confirm(t("closeConfirm"))) return;
    setBusy("close");
    try {
      const result = await closeTitheWeekAction(periodStart);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("closeSuccess"));
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function handleExport() {
    setBusy("export");
    try {
      const result = await exportTitheClosePdfAction(periodStart, locale);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      downloadBase64File(result.base64, result.filename, result.mimeType);
      toast.success(t("exportSuccess"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <FinPageHeader
        eyebrow={tFinances("stewardship")}
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <FinancesTabs active="tithe-close" />

      <div className="card" style={{ marginTop: 24, padding: 20 }}>
        <div
          className="row"
          style={{
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            <button
              type="button"
              className="btn outline sm"
              onClick={() => navigateWeek(-1)}
              aria-label={t("prevWeek")}
            >
              {tCommon("previous")}
            </button>
            <span className="page-title" style={{ fontSize: 15, margin: 0 }}>
              {weekLabel}
            </span>
            <button
              type="button"
              className="btn outline sm"
              onClick={() => navigateWeek(1)}
              aria-label={t("nextWeek")}
            >
              {tCommon("next")}
            </button>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {run ? (
              <span className={`chip ${isClosed ? "" : "info"}`.trim()}>
                {isClosed ? t("statusClosed") : t("statusOpen")}
              </span>
            ) : null}
            <button
              type="button"
              className="btn outline sm"
              disabled={!run || busy != null}
              onClick={() => void handleExport()}
            >
              {busy === "export" ? tCommon("loading") : t("exportPdf")}
            </button>
            {canWrite && run && !isClosed ? (
              <button
                type="button"
                className="btn primary sm"
                disabled={busy != null}
                onClick={() => void handleClose()}
              >
                {busy === "close" ? tCommon("loading") : t("closeWeek")}
              </button>
            ) : null}
          </div>
        </div>

        {noTemplate || !run ? (
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <p className="muted" style={{ marginBottom: 16 }}>
              {t("noTemplate")}
            </p>
            {canManageTemplates ? (
              <div className="row" style={{ gap: 8, justifyContent: "center" }}>
                <button
                  type="button"
                  className="btn primary sm"
                  disabled={busy === "seed"}
                  onClick={() => void handleSeed()}
                >
                  {t("seedDefault")}
                </button>
                <Link href="/settings/discount-templates" className="btn outline sm">
                  {t("goTemplates")}
                </Link>
              </div>
            ) : (
              <p className="tiny muted">{t("askAdminTemplate")}</p>
            )}
          </div>
        ) : (
          <>
            <div
              className="grid-12"
              style={{ marginTop: 24, gap: 16 }}
            >
              <div className="span-4 card" style={{ padding: 16, margin: 0 }}>
                <p className="tiny muted" style={{ margin: "0 0 4px" }}>
                  {t("totalTithes")}
                </p>
                <p className="page-title" style={{ margin: 0, fontSize: 22 }}>
                  {fmtRD(run.baseAmount)}
                </p>
              </div>
            </div>

            <h4 style={{ marginTop: 28, marginBottom: 12, fontSize: 14 }}>
              {t("allocation")}
            </h4>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t("destiny")}</th>
                    <th style={{ textAlign: "right" }}>%</th>
                    <th style={{ textAlign: "right" }}>{tCommon("amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {run.allocation.map((line) => (
                    <tr key={line.label}>
                      <td>{line.label}</td>
                      <td style={{ textAlign: "right" }}>{line.percent}%</td>
                      <td style={{ textAlign: "right" }}>{fmtRD(line.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h4 style={{ marginTop: 28, marginBottom: 12, fontSize: 14 }}>
              {t("contributions")} ({run.contributions.length})
            </h4>
            {run.contributions.length === 0 ? (
              <p className="muted">{t("noContributions")}</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t("date")}</th>
                      <th>{t("member")}</th>
                      <th>{t("fund")}</th>
                      <th style={{ textAlign: "right" }}>{tCommon("amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.contributions.map((row) => (
                      <tr key={row.incomeId}>
                        <td>{row.paymentDate}</td>
                        <td>{row.memberName || "—"}</td>
                        <td>{row.fundName || "—"}</td>
                        <td style={{ textAlign: "right" }}>{fmtRD(row.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {isClosed && run.closedAt ? (
              <p className="tiny muted" style={{ marginTop: 20 }}>
                {t("closedAt", { date: run.closedAt.slice(0, 10) })}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

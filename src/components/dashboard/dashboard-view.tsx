"use client";

import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { ChartPeriodToolbar } from "@/components/dashboard/chart-period-toolbar";
import { ContributionsLineChart } from "@/components/dashboard/contributions-line-chart";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { IncomeExpenseBarChart } from "@/components/dashboard/income-expense-bar-chart";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LastEventCard } from "@/components/dashboard/last-event-card";
import { PendingTransactionsList } from "@/components/dashboard/pending-transactions-list";
import type { Locale } from "@/i18n/config";
import type { AuditLogEntry } from "@/lib/audit/types";
import { formatPeriodDelta } from "@/lib/dashboard/aggregate";
import { localizeChartPointLabel } from "@/lib/dashboard/chart-labels";
import type {
  DashboardChartData,
  DashboardChartPeriod,
  DashboardHeroData,
  DashboardKpi,
  DashboardLedgerChartData,
  PendingAuthorizationItem,
} from "@/lib/dashboard/types";
import { fmtRD } from "@/lib/format-currency";
import { dashboardMock } from "@/lib/mock/dashboard-data";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

export function DashboardView({
  pastorName,
  churchName,
  hero,
  kpis,
  contributionCharts,
  ledgerCharts,
  contributionPeriodTotals,
  pendingItems,
  recentAudit = [],
  canViewAuditLog = false,
}: {
  pastorName?: string;
  churchName?: string | null;
  hero: DashboardHeroData;
  kpis: DashboardKpi[];
  contributionCharts: DashboardChartData;
  ledgerCharts: DashboardLedgerChartData;
  contributionPeriodTotals: Record<
    DashboardChartPeriod,
    { current: number; previous: number }
  >;
  pendingItems: PendingAuthorizationItem[];
  recentAudit?: AuditLogEntry[];
  canViewAuditLog?: boolean;
}) {
  const t = useTranslations("dashboard");
  const locale = useLocale() as Locale;
  const pastor = pastorName ?? t("pastor");
  const [ledgerPeriod, setLedgerPeriod] =
    useState<DashboardChartPeriod>("month");
  const [contributionsPeriod, setContributionsPeriod] =
    useState<DashboardChartPeriod>("month");

  const ledgerChart = useMemo(
    () => ledgerCharts[ledgerPeriod] ?? [],
    [ledgerCharts, ledgerPeriod],
  );

  const contributionsChart = useMemo(
    () => contributionCharts[contributionsPeriod] ?? [],
    [contributionCharts, contributionsPeriod],
  );

  const contributionsTotal = useMemo(
    () => contributionPeriodTotals[contributionsPeriod]?.current ?? 0,
    [contributionPeriodTotals, contributionsPeriod],
  );

  const contributionsDelta = useMemo(() => {
    const totals = contributionPeriodTotals[contributionsPeriod];
    if (!totals) return {};
    return formatPeriodDelta(totals.current, totals.previous);
  }, [contributionPeriodTotals, contributionsPeriod]);

  const headKpis = kpis.slice(0, 2);
  const restKpis = kpis.slice(2);

  const localizedLedgerChart = useMemo(
    () =>
      ledgerChart.map((point) => ({
        ...point,
        label: localizeChartPointLabel(point, ledgerPeriod, (month) =>
          t(`months.${month}` as "months.0"),
        ),
      })),
    [ledgerChart, ledgerPeriod, t],
  );

  const localizedContributionsChart = useMemo(
    () =>
      contributionsChart.map((point) => ({
        ...point,
        label: localizeChartPointLabel(point, contributionsPeriod, (month) =>
          t(`months.${month}` as "months.0"),
        ),
      })),
    [contributionsChart, contributionsPeriod, t],
  );

  const contributionsTotalFormatted = fmtRD(contributionsTotal, locale);

  return (
    <div>
      <DashboardHero
        pastor={pastor}
        churchName={churchName ?? undefined}
        hero={hero}
      />

      <div className="grid-12" style={{ marginTop: 24 }}>
        {headKpis.map((kpi, index) => (
          <div key={kpi.labelKey ?? kpi.label} className="span-3">
            <KpiCard {...kpi} feature={index === 0} kind="elevated" />
          </div>
        ))}
        {restKpis.map((kpi) => (
          <div key={kpi.labelKey ?? kpi.label} className="span-3">
            <KpiCard {...kpi} />
          </div>
        ))}
      </div>

      <div className="grid-12" style={{ marginTop: 18 }}>
        <div className="card span-7">
          <div
            className="row between"
            style={{ marginBottom: 18, flexWrap: "wrap", gap: 12 }}
          >
            <div>
              <div className="eyebrow">{t("incomeExpense")}</div>
              <div className="display" style={{ fontSize: 26, marginTop: 4 }}>
                {t("operationalBalance")}
              </div>
              <div
                className="row"
                style={{ gap: 12, marginTop: 8, fontSize: 12 }}
              >
                <span className="row" style={{ gap: 6 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: "var(--success)",
                    }}
                  />
                  {t("income")}
                </span>
                <span className="row" style={{ gap: 6 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: "var(--danger)",
                    }}
                  />
                  {t("expense")}
                </span>
              </div>
            </div>
            <ChartPeriodToolbar
              value={ledgerPeriod}
              onChange={setLedgerPeriod}
            />
          </div>
          <IncomeExpenseBarChart data={localizedLedgerChart} />
        </div>

        <div
          className="card span-5"
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div className="row between" style={{ flexWrap: "wrap", gap: 12 }}>
            <div>
              <div className="eyebrow">{t("contributions")}</div>
              <div className="display" style={{ fontSize: 26, marginTop: 4 }}>
                {contributionsTotalFormatted}
              </div>
              {contributionsDelta.delta ? (
                <span className="chip success" style={{ marginTop: 4 }}>
                  <span className="pip" /> {contributionsDelta.delta}{" "}
                  {t("vsPreviousPeriod")}
                </span>
              ) : null}
            </div>
            <ChartPeriodToolbar
              value={contributionsPeriod}
              onChange={setContributionsPeriod}
            />
          </div>
          <ContributionsLineChart data={localizedContributionsChart} height={180} />
        </div>
      </div>

      <div className="grid-12" style={{ marginTop: 18 }}>
        <PendingTransactionsList items={pendingItems} />

        <div className="card span-5">
          <div className="row between" style={{ marginBottom: 14 }}>
            <div>
              <div className="eyebrow">{t("recentActivity")}</div>
              <div className="display" style={{ fontSize: 22, marginTop: 4 }}>
                {t("whatsHappening")}
              </div>
            </div>
            <Link
              href="/reports?report=audit-activity-log&open=1"
              className="tiny"
              style={{
                color: "var(--primary)",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              {t("viewAll")}
            </Link>
          </div>
          {canViewAuditLog ? (
            <ActivityFeed items={recentAudit} />
          ) : (
            <p className="tiny muted" style={{ margin: 0 }}>
              {t("activityRestricted")}
            </p>
          )}
        </div>

        <LastEventCard events={dashboardMock.events} />
      </div>
    </div>
  );
}

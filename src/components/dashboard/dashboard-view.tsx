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
import { formatPeriodDelta } from "@/lib/dashboard/aggregate";
import type {
  DashboardChartData,
  DashboardChartPeriod,
  DashboardHeroData,
  DashboardKpi,
  DashboardLedgerChartData,
  PendingAuthorizationItem,
} from "@/lib/dashboard/types";
import { formatNumber } from "@/lib/i18n/format";
import { dashboardMock } from "@/lib/mock/dashboard-data";
import { toast } from "@/lib/toast";
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

  function kpiLabel(kpi: DashboardKpi): string {
    return kpi.labelKey ? t(kpi.labelKey as "kpiTotalMembers") : kpi.label;
  }
  const contributionsTotalFormatted = `RD$ ${formatNumber(
    contributionsTotal,
    locale,
    { minimumFractionDigits: 0, maximumFractionDigits: 0 },
  )}`;

  return (
    <div>
      <DashboardHero
        pastor={pastor}
        churchName={churchName ?? undefined}
        hero={hero}
      />

      <div className="grid-12" style={{ marginTop: 24 }}>
        {headKpis.map((kpi, index) => (
          <div key={kpi.label} className="span-3">
            <KpiCard {...kpi} feature={index === 0} kind="elevated" />
          </div>
        ))}
        {restKpis.map((kpi) => (
          <div key={kpi.label} className="span-3">
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
          <IncomeExpenseBarChart data={ledgerChart} />
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
          <ContributionsLineChart data={contributionsChart} height={180} />
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
            <button
              type="button"
              className="tiny"
              style={{
                color: "var(--primary)",
                fontWeight: 600,
                background: "none",
                border: 0,
                cursor: "pointer",
              }}
              onClick={() =>
                toast.info(t("recentActivity"), t("activityLogSoon"))
              }
            >
              {t("viewAll")}
            </button>
          </div>
          <ActivityFeed items={dashboardMock.activities} />
        </div>

        <LastEventCard events={dashboardMock.events} />
      </div>
    </div>
  );
}

"use client";

import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { ChartPeriodToolbar } from "@/components/dashboard/chart-period-toolbar";
import { ContributionsLineChart } from "@/components/dashboard/contributions-line-chart";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { IncomeExpenseBarChart } from "@/components/dashboard/income-expense-bar-chart";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LastEventCard } from "@/components/dashboard/last-event-card";
import { PendingTransactionsList } from "@/components/dashboard/pending-transactions-list";
import {
  aggregateContributionsChart,
  aggregateIncomeExpenseChart,
  formatPeriodDelta,
} from "@/lib/dashboard/aggregate";
import { buildPeriodBuckets } from "@/lib/dashboard/period";
import type {
  DashboardChartPeriod,
  DashboardHeroData,
  DashboardKpi,
  PendingAuthorizationItem,
} from "@/lib/dashboard/types";
import type { Contribution } from "@/lib/contributions/types";
import { fmtRD } from "@/lib/format-currency";
import { dashboardMock } from "@/lib/mock/dashboard-data";
import type { LedgerEntry } from "@/lib/ledger/types";
import { toast } from "@/lib/toast";
import { useMemo, useState } from "react";

function sumChartPoints(values: { value: number }[]): number {
  return values.reduce((sum, point) => sum + point.value, 0);
}

function contributionsPeriodTotal(
  contributions: Contribution[],
  period: DashboardChartPeriod,
): number {
  const buckets = buildPeriodBuckets(period);
  let total = 0;
  for (const bucket of buckets) {
    for (const entry of contributions) {
      const date = entry.paymentDate.slice(0, 10);
      if (date >= bucket.from && date <= bucket.to) {
        total += entry.amount;
      }
    }
  }
  return total;
}

export function DashboardView({
  pastorName,
  churchName,
  hero,
  kpis,
  contributions,
  ledgerEntries,
  pendingItems,
}: {
  pastorName?: string;
  churchName?: string | null;
  hero: DashboardHeroData;
  kpis: DashboardKpi[];
  contributions: Contribution[];
  ledgerEntries: LedgerEntry[];
  pendingItems: PendingAuthorizationItem[];
}) {
  const pastor = pastorName ?? "Pastor";
  const [ledgerPeriod, setLedgerPeriod] =
    useState<DashboardChartPeriod>("month");
  const [contributionsPeriod, setContributionsPeriod] =
    useState<DashboardChartPeriod>("month");

  const ledgerChart = useMemo(
    () => aggregateIncomeExpenseChart(ledgerEntries, ledgerPeriod),
    [ledgerEntries, ledgerPeriod],
  );

  const contributionsChart = useMemo(
    () => aggregateContributionsChart(contributions, contributionsPeriod),
    [contributions, contributionsPeriod],
  );

  const contributionsTotal = useMemo(
    () => sumChartPoints(contributionsChart),
    [contributionsChart],
  );

  const contributionsDelta = useMemo(() => {
    const current = contributionsPeriodTotal(contributions, contributionsPeriod);
    const buckets = buildPeriodBuckets(contributionsPeriod);
    const spanMs =
      new Date(`${buckets[buckets.length - 1].to}T00:00:00`).getTime() -
      new Date(`${buckets[0].from}T00:00:00`).getTime();
    const prevEnd = new Date(`${buckets[0].from}T00:00:00`);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd.getTime() - spanMs);
    let previous = 0;
    for (const entry of contributions) {
      const date = entry.paymentDate.slice(0, 10);
      const from = prevStart.toISOString().slice(0, 10);
      const to = prevEnd.toISOString().slice(0, 10);
      if (date >= from && date <= to) {
        previous += entry.amount;
      }
    }
    return formatPeriodDelta(current, previous);
  }, [contributions, contributionsPeriod]);

  const featureKpi = kpis[0];
  const restKpis = kpis.slice(1);

  return (
    <div>
      <DashboardHero
        pastor={pastor}
        churchName={churchName ?? undefined}
        hero={hero}
      />

      <div className="grid-12" style={{ marginTop: 24 }}>
        {featureKpi ? (
          <div className="span-6">
            <KpiCard {...featureKpi} feature kind="elevated" />
          </div>
        ) : null}
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
              <div className="eyebrow">Ingresos y egresos</div>
              <div className="display" style={{ fontSize: 26, marginTop: 4 }}>
                Balance operativo
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
                  Ingresos
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
                  Egresos
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
              <div className="eyebrow">Contribuciones</div>
              <div className="display" style={{ fontSize: 26, marginTop: 4 }}>
                {fmtRD(contributionsTotal)}
              </div>
              {contributionsDelta.delta ? (
                <span className="chip success" style={{ marginTop: 4 }}>
                  <span className="pip" /> {contributionsDelta.delta} vs periodo
                  anterior
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
              <div className="eyebrow">Actividad reciente</div>
              <div className="display" style={{ fontSize: 22, marginTop: 4 }}>
                Lo que está pasando
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
                toast.info("Actividad", "Log de acciones — próximamente")
              }
            >
              Ver todo →
            </button>
          </div>
          <ActivityFeed items={dashboardMock.activities} />
        </div>

        <LastEventCard events={dashboardMock.events} />
      </div>
    </div>
  );
}

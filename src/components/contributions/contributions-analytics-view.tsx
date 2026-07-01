"use client";

import { ContributionsDonutChart } from "@/components/contributions/contributions-donut-chart";
import { FinancesTabs } from "@/components/finances/finances-tabs";
import { FundsKpi } from "@/components/funds/funds-kpi";
import { Icons } from "@/components/icons";
import {
  computeFundDistribution,
  computeTopContributors,
  initialsFromName,
} from "@/lib/contributions/parse";
import type {
  Contribution,
  ContributionsStats,
  FundDistributionSlice,
  TopContributor,
} from "@/lib/contributions/types";
import type { Fund } from "@/lib/funds/types";
import { fmtRD, fmtRDshort } from "@/lib/format-currency";
import { toast } from "@/lib/toast";
import Link from "next/link";

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function currentMonthYearLabel() {
  const now = new Date();
  return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
}

function fmtSliceAmount(amount: number) {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}K`;
  return Math.round(amount).toString();
}

function TopContributorsCard({
  monthYear,
  contributors,
  maxAmount,
}: {
  monthYear: string;
  contributors: TopContributor[];
  maxAmount: number;
}) {
  return (
    <div className="card span-7">
      <div className="eyebrow">Top contribuyentes — {monthYear}</div>
      <div
        className="display"
        style={{ fontSize: 26, marginTop: 4, marginBottom: 18 }}
      >
        Hermanos fieles
      </div>
      {contributors.length === 0 ? (
        <div className="muted" style={{ padding: "24px 0", textAlign: "center" }}>
          No hay contribuciones individuales registradas.
        </div>
      ) : (
        <div className="col" style={{ gap: 10 }}>
          {contributors.map((person, index) => (
            <div
              key={person.key}
              className="row"
              style={{
                gap: 12,
                padding: "10px 12px",
                borderRadius: 10,
                background:
                  index === 0
                    ? "linear-gradient(90deg, var(--accent-100), transparent 60%)"
                    : "transparent",
              }}
            >
              <div
                className="display"
                style={{ fontSize: 20, color: "var(--ink-4)", width: 24 }}
              >
                {(index + 1).toString().padStart(2, "0")}
              </div>
              <span className="avatar md">
                {initialsFromName(person.name)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{person.name}</div>
                <div className="tiny muted">{person.subtitle}</div>
              </div>
              <div style={{ flex: 1, maxWidth: 160 }}>
                <div
                  style={{
                    height: 6,
                    background: "var(--surface-2)",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${maxAmount ? (person.amount / maxAmount) * 100 : 0}%`,
                      height: "100%",
                      background: "var(--primary)",
                    }}
                  />
                </div>
              </div>
              <div
                className="tnum mono"
                style={{
                  fontWeight: 600,
                  minWidth: 110,
                  textAlign: "right",
                }}
              >
                {fmtRD(person.amount)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FundDistributionCard({
  slices,
  total,
}: {
  slices: FundDistributionSlice[];
  total: number;
}) {
  return (
    <div className="card span-5">
      <div className="eyebrow">Distribución por fondo</div>
      <div
        className="display"
        style={{ fontSize: 26, marginTop: 4, marginBottom: 22 }}
      >
        Donde se invierte
      </div>
      {slices.length === 0 ? (
        <div className="muted" style={{ padding: "24px 0", textAlign: "center" }}>
          Sin datos de distribución.
        </div>
      ) : (
        <>
          <ContributionsDonutChart slices={slices} total={total} />
          <div className="col" style={{ gap: 10, marginTop: 18 }}>
            {slices.map((slice) => (
              <div
                key={slice.fundId}
                className="row between"
                style={{ fontSize: 13 }}
              >
                <div className="row" style={{ gap: 8 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: slice.color,
                    }}
                  />
                  <span>{slice.label}</span>
                </div>
                <span className="tnum mono muted">RD$ {fmtSliceAmount(slice.amount)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function ContributionsAnalyticsView({
  entries,
  stats,
  funds,
  fundFilterId,
  fundFilterName,
}: {
  entries: Contribution[];
  stats: ContributionsStats;
  funds: Fund[];
  fundFilterId?: string | null;
  fundFilterName?: string | null;
}) {
  const monthYear = currentMonthYearLabel();
  const exportLabel = `Finanzas_${MONTH_NAMES[new Date().getMonth()]}${new Date().getFullYear()}`;

  const contributors = computeTopContributors(entries);
  const maxContributorAmount = contributors.reduce(
    (max, person) => Math.max(max, person.amount),
    0,
  );
  const { slices, total: distributionTotal } = computeFundDistribution(
    entries,
    funds,
  );

  const balanceTotal = funds.reduce(
    (sum, fund) => sum + fund.totalContributions,
    0,
  );

  return (
    <div>
      <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow">Mayordomía</div>
          <h1
            className="display"
            style={{
              fontSize: 40,
              margin: "4px 0 6px",
              letterSpacing: "-0.025em",
            }}
          >
            Finanzas{" "}
            <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>
              · {monthYear}
            </span>
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            Diezmos, ofrendas y mayordomía de los recursos del Señor.
          </p>
          {fundFilterId ? (
            <Link
              href="/finances/contributions"
              className="tiny"
              style={{
                display: "inline-flex",
                marginTop: 8,
                color: "var(--accent)",
                fontWeight: 600,
              }}
            >
              Ver todas las contribuciones
            </Link>
          ) : null}
        </div>
        <div className="row">
          <button
            type="button"
            className="btn outline"
            onClick={() =>
              toast.success("Reporte generado", `${exportLabel}.pdf descargado`)
            }
          >
            <Icons.download size={16} /> PDF
          </button>
          <button
            type="button"
            className="btn outline"
            onClick={() =>
              toast.success("Reporte generado", `${exportLabel}.xlsx descargado`)
            }
          >
            <Icons.download size={16} /> Excel
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() =>
              toast.info("Próximamente", "Registrar movimiento estará disponible pronto.")
            }
          >
            <Icons.plus size={16} /> Registrar movimiento
          </button>
        </div>
      </div>

      <div className="grid-12" style={{ marginTop: 22 }}>
        <div className="span-6">
          <FundsKpi
            kind="elevated"
            feature
            label="Balance General"
            value={fmtRDshort(balanceTotal)}
            delta="+9.2% este mes"
            deltaDir="up"
            spark={[1.8, 1.9, 2.1, 2.0, 2.2, 2.3, 2.38].map((v) => v * 1_000_000)}
          />
        </div>
        <div className="span-3">
          <FundsKpi
            kind="elevated"
            label="Ingresos (mes)"
            value={fmtRDshort(stats.total)}
            delta="+12.4%"
            deltaDir="up"
            spark={[8, 12, 10, 15, 18, 16, 20]}
            accent="var(--success)"
          />
        </div>
        <div className="span-3">
          <FundsKpi
            kind="elevated"
            label="Egresos (mes)"
            value={fmtRDshort(0)}
            delta="+3.1%"
            deltaDir="down"
            spark={[3, 5, 4, 6, 8, 5, 7]}
            accent="var(--danger)"
          />
        </div>
      </div>

      <FinancesTabs active="contribuciones" />

      {fundFilterName ? (
        <p className="tiny muted" style={{ margin: "0 0 14px" }}>
          Filtrando por fondo: <strong>{fundFilterName}</strong>
        </p>
      ) : null}

      <div className="grid-12">
        <TopContributorsCard
          monthYear={monthYear}
          contributors={contributors}
          maxAmount={maxContributorAmount}
        />
        <FundDistributionCard slices={slices} total={distributionTotal} />
      </div>
    </div>
  );
}

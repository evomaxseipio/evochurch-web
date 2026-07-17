"use client";

import { FundsKpi } from "@/components/funds/funds-kpi";
import { Icons } from "@/components/icons";
import type { LedgerKpiVisuals, LedgerStats } from "@/lib/ledger/types";
import { fmtRD, fmtRDSigned } from "@/lib/format-currency";
import { useLocale, useTranslations } from "next-intl";

const KPI_KIND = "elevated" as const;

/** KPIs como `project/screens-3.jsx` TransaccionesScreen (sparklines, deltas e iconos). */
export function TransactionsKpi({
  stats,
  visuals,
}: {
  stats: LedgerStats;
  visuals: LedgerKpiVisuals;
}) {
  const tTransactions = useTranslations("transactions");
  const locale = useLocale() as "es" | "en" | "fr";
  const balanceGeneral = stats.incomeAmount - stats.expenseAmount;

  return (
    <div className="grid-12 dashboard-kpis" style={{ marginTop: 22, marginBottom: 28 }}>
      <div className="dashboard-kpi-cell span-4">
        <FundsKpi
          kind={KPI_KIND}
          feature
          label={tTransactions("generalBalance")}
          value={fmtRDSigned(balanceGeneral, locale)}
          icon={<Icons.wallet size={16} />}
          accent={balanceGeneral >= 0 ? "var(--success)" : "var(--danger)"}
        />
      </div>
      <div className="dashboard-kpi-cell span-2">
        <FundsKpi
          kind={KPI_KIND}
          label={tTransactions("incomePeriod")}
          value={fmtRD(stats.incomeAmount, locale)}
          icon={<Icons.arrowUp width={16} height={16} />}
          delta={visuals.incomeDelta}
          deltaDir={visuals.incomeDeltaDir}
          spark={visuals.incomeSpark}
          accent="var(--success)"
        />
      </div>
      <div className="dashboard-kpi-cell span-2">
        <FundsKpi
          kind={KPI_KIND}
          label={tTransactions("expensePeriod")}
          value={fmtRD(stats.expenseAmount, locale)}
          icon={<Icons.arrowDn width={16} height={16} />}
          delta={visuals.expenseDelta}
          deltaDir={visuals.expenseDeltaDir}
          spark={visuals.expenseSpark}
          accent="var(--danger)"
        />
      </div>
      <div className="dashboard-kpi-cell span-2">
        <FundsKpi
          kind={KPI_KIND}
          label={tTransactions("movements")}
          value={String(stats.movements)}
          icon={<Icons.list size={16} />}
          accent="var(--accent)"
        />
      </div>
      <div className="dashboard-kpi-cell span-2">
        <FundsKpi
          kind={KPI_KIND}
          label={tTransactions("pendingToAuthorize")}
          value={String(stats.pendingAuthorization)}
          icon={<Icons.pendingActions size={16} />}
          accent="var(--warm)"
        />
      </div>
    </div>
  );
}

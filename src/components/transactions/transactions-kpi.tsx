"use client";

import { FundsKpi } from "@/components/funds/funds-kpi";
import { Icons } from "@/components/icons";
import { TransactionKpiIcons } from "@/components/transactions/transaction-kpi-icons";
import type { LedgerKpiVisuals, LedgerStats } from "@/lib/ledger/types";
import { fmtRDshort } from "@/lib/format-currency";

const KPI_KIND = "elevated" as const;

/** KPIs como `project/screens-3.jsx` TransaccionesScreen (sparklines, deltas e iconos). */
export function TransactionsKpi({
  stats,
  visuals,
}: {
  stats: LedgerStats;
  visuals: LedgerKpiVisuals;
}) {
  return (
    <div className="grid-12" style={{ marginTop: 22, marginBottom: 28 }}>
      <div className="span-3">
        <FundsKpi
          kind={KPI_KIND}
          label="Movimientos"
          value={String(stats.movements)}
          icon={<Icons.list size={16} />}
          accent="var(--accent)"
        />
      </div>
      <div className="span-3">
        <FundsKpi
          kind={KPI_KIND}
          label="Ingresos (periodo)"
          value={fmtRDshort(stats.incomeAmount)}
          icon={<Icons.arrowUp width={16} height={16} />}
          delta={visuals.incomeDelta}
          deltaDir={visuals.incomeDeltaDir}
          spark={visuals.incomeSpark}
          accent="var(--success)"
        />
      </div>
      <div className="span-3">
        <FundsKpi
          kind={KPI_KIND}
          label="Egresos (periodo)"
          value={fmtRDshort(stats.expenseAmount)}
          icon={<Icons.arrowDn width={16} height={16} />}
          delta={visuals.expenseDelta}
          deltaDir={visuals.expenseDeltaDir}
          spark={visuals.expenseSpark}
          accent="var(--danger)"
        />
      </div>
      <div className="span-3">
        <FundsKpi
          kind={KPI_KIND}
          label="Pendientes de autorizar"
          value={String(stats.pendingAuthorization)}
          icon={TransactionKpiIcons.pendingCount(16)}
          accent="var(--warm)"
        />
      </div>
    </div>
  );
}

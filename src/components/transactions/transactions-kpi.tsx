"use client";

import { FundsKpi } from "@/components/funds/funds-kpi";
import { Icons } from "@/components/icons";
import type { LedgerKpiVisuals, LedgerStats } from "@/lib/ledger/types";
import { fmtRDshort } from "@/lib/format-currency";
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
  return (
    <div className="grid-12" style={{ marginTop: 22, marginBottom: 28 }}>
      <div className="span-3">
        <FundsKpi
          kind={KPI_KIND}
          label={tTransactions("movements")}
          value={String(stats.movements)}
          icon={<Icons.list size={16} />}
          accent="var(--accent)"
        />
      </div>
      <div className="span-3">
        <FundsKpi
          kind={KPI_KIND}
          label={tTransactions("incomePeriod")}
          value={fmtRDshort(stats.incomeAmount, locale)}
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
          label={tTransactions("expensePeriod")}
          value={fmtRDshort(stats.expenseAmount, locale)}
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
          label={tTransactions("pendingToAuthorize")}
          value={String(stats.pendingAuthorization)}
          icon={<Icons.pendingActions size={16} />}
          accent="var(--warm)"
        />
      </div>
    </div>
  );
}

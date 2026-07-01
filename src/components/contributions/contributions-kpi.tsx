import { FundsKpi } from "@/components/funds/funds-kpi";
import { Icons } from "@/components/icons";
import type { ContributionsStats } from "@/lib/contributions/types";
import { fmtRDshort } from "@/lib/format-currency";

const KPI_KIND = "elevated" as const;

/** KPIs — mismo patrón que `funds-list-view.tsx` */
export function ContributionsKpi({ stats }: { stats: ContributionsStats }) {
  return (
    <div className="grid-12" style={{ marginTop: 22, marginBottom: 28 }}>
      <div className="span-3">
        <FundsKpi
          kind={KPI_KIND}
          label="Total ingresos"
          value={fmtRDshort(stats.total)}
          icon={<Icons.trendUp size={16} />}
          tone="d-system"
          totalSummary
          delta="+12.4%"
          deltaDir="up"
        />
      </div>
      <div className="span-3">
        <FundsKpi
          kind={KPI_KIND}
          label="Diezmos"
          value={fmtRDshort(stats.tithes)}
          icon={<Icons.wallet size={16} />}
          tone="d-funds"
        />
      </div>
      <div className="span-3">
        <FundsKpi
          kind={KPI_KIND}
          label="Ofrendas"
          value={fmtRDshort(stats.offerings)}
          icon={<Icons.check size={16} />}
          tone="d-income"
        />
      </div>
      <div className="span-3">
        <FundsKpi
          kind={KPI_KIND}
          label="Donaciones"
          value={fmtRDshort(stats.donations)}
          icon={<Icons.star size={16} />}
          tone="d-donation"
        />
      </div>
    </div>
  );
}

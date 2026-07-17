import { FundsKpi } from "@/components/funds/funds-kpi";
import { Icons } from "@/components/icons";
import type { ContributionsStats } from "@/lib/contributions/types";
import { fmtRD } from "@/lib/format-currency";
import { useLocale, useTranslations } from "next-intl";

const KPI_KIND = "elevated" as const;

/** KPIs — mismo patrón que `funds-list-view.tsx` */
export function ContributionsKpi({ stats }: { stats: ContributionsStats }) {
  const tContributions = useTranslations("contributions");
  const locale = useLocale() as "es" | "en" | "fr";
  return (
    <div className="grid-12" style={{ marginTop: 22, marginBottom: 28 }}>
      <div className="span-3">
        <FundsKpi
          kind={KPI_KIND}
          label={tContributions("totalIncome")}
          value={fmtRD(stats.total, locale)}
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
          label={tContributions("tithes")}
          value={fmtRD(stats.tithes, locale)}
          icon={<Icons.wallet size={16} />}
          tone="d-funds"
        />
      </div>
      <div className="span-3">
        <FundsKpi
          kind={KPI_KIND}
          label={tContributions("offerings")}
          value={fmtRD(stats.offerings, locale)}
          icon={<Icons.check size={16} />}
          tone="d-income"
        />
      </div>
      <div className="span-3">
        <FundsKpi
          kind={KPI_KIND}
          label={tContributions("donations")}
          value={fmtRD(stats.donations, locale)}
          icon={<Icons.star size={16} />}
          tone="d-donation"
        />
      </div>
    </div>
  );
}

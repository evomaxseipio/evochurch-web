import type { Locale } from "@/i18n/config";
import { formatNumber } from "@/lib/i18n/format";
import type { DashboardKpi } from "@/lib/dashboard/types";

type DashboardTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

export function resolveDashboardKpiLabels(
  kpis: DashboardKpi[],
  t: DashboardTranslator,
  locale: Locale,
): DashboardKpi[] {
  return kpis.map((kpi) => {
    const label = kpi.labelKey ? t(kpi.labelKey) : kpi.label;
    const deltaValues = kpi.deltaValues
      ? {
          ...kpi.deltaValues,
          ...(typeof kpi.deltaValues.count === "number"
            ? { count: formatNumber(kpi.deltaValues.count, locale) }
            : {}),
        }
      : undefined;
    const delta = kpi.deltaKey
      ? t(kpi.deltaKey, deltaValues)
      : kpi.delta;
    return { ...kpi, label, delta };
  });
}

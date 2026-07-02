import { FundsKpi } from "@/components/funds/funds-kpi";
import { Icons, type IconName } from "@/components/icons";

export function KpiCard({
  label,
  value,
  delta,
  deltaDir = "up",
  spark,
  feature = false,
  kind = "elevated",
  icon,
  accent = "var(--accent)",
}: {
  label: string;
  value: string;
  delta?: string;
  deltaDir?: "up" | "down";
  spark?: number[];
  feature?: boolean;
  kind?: "flat" | "elevated" | "gradient";
  icon?: IconName;
  accent?: string;
}) {
  const Icon = icon ? Icons[icon] : null;

  return (
    <FundsKpi
      label={label}
      value={value}
      delta={delta}
      deltaDir={deltaDir}
      spark={spark}
      feature={feature}
      kind={kind}
      accent={accent}
      icon={Icon ? <Icon size={15} /> : undefined}
    />
  );
}

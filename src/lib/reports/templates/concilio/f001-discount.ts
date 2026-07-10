import type { DiscountAllocation } from "@/lib/discounts/types";
import type { ConcilioF001Payload } from "@/lib/reports/templates/concilio/f001-types";

/** Reemplaza envíos iglesia→concilio (sección C) cuando hay plantilla vinculada. */
export function applyDiscountAllocationToConcilioF001(
  payload: ConcilioF001Payload,
  discountAllocation: DiscountAllocation | null,
): ConcilioF001Payload {
  if (!discountAllocation || discountAllocation.lines.length === 0) {
    return payload;
  }

  const churchToCouncil = discountAllocation.lines.map((line) => ({
    key: line.label,
    amount: line.amount,
    percent: line.percent,
  }));

  const churchToCouncilSubtotal = churchToCouncil.reduce(
    (sum, line) => sum + line.amount,
    0,
  );
  const totalCouncilSends =
    churchToCouncilSubtotal +
    payload.sectionC.subtotals.ministryToNational +
    payload.sectionC.subtotals.specialContributions;

  return {
    ...payload,
    sectionC: {
      ...payload.sectionC,
      churchToCouncil,
      subtotals: {
        ...payload.sectionC.subtotals,
        churchToCouncil: churchToCouncilSubtotal,
      },
    },
    kpis: {
      ...payload.kpis,
      totalCouncilSends,
    },
  };
}

import type { CeadCouncilSendLabel } from "@/lib/reports/templates/cead/constants";

export type ParsedOrgReportRules = {
  organizationId: number | null;
  organizationName: string | null;
  ceadPercents: Partial<Record<CeadCouncilSendLabel, number>>;
  f001CouncilHeader: string | null;
};

function readPercent(value: unknown): number | undefined {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) return undefined;
  return n;
}

/** Parse `organization.report_rules` JSON from BD. */
export function parseOrgReportRules(
  organizationId: number | null,
  organizationName: string | null,
  raw: unknown,
): ParsedOrgReportRules {
  const rules =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const cead =
    rules.cead && typeof rules.cead === "object"
      ? (rules.cead as Record<string, unknown>)
      : {};
  const f001 =
    rules.f001 && typeof rules.f001 === "object"
      ? (rules.f001 as Record<string, unknown>)
      : {};

  const ceadPercents: Partial<Record<CeadCouncilSendLabel, number>> = {};
  const churchTithe = readPercent(
    cead.church_tithe_percent ?? cead.churchTithePercent,
  );
  const ibcr = readPercent(cead.ibcr_percent ?? cead.ibcrPercent);
  const christianEducation = readPercent(
    cead.christian_education_percent ?? cead.christianEducationPercent,
  );
  const fpj = readPercent(cead.fpj_percent ?? cead.fpjPercent);

  if (churchTithe != null) {
    ceadPercents["Diezmo de la iglesia (10%)"] = churchTithe;
  }
  if (ibcr != null) ceadPercents["IBCR (3%)"] = ibcr;
  if (christianEducation != null) {
    ceadPercents["Educación Cristiana (1%)"] = christianEducation;
  }
  if (fpj != null) ceadPercents["FPJ (1%)"] = fpj;

  const councilHeader =
    typeof f001.council_header === "string"
      ? f001.council_header
      : typeof rules.council_header === "string"
        ? rules.council_header
        : null;

  return {
    organizationId,
    organizationName,
    ceadPercents,
    f001CouncilHeader: councilHeader?.trim() || null,
  };
}

export function councilPercentLabel(
  label: CeadCouncilSendLabel,
  percent: number,
): string {
  const rounded = Number.isInteger(percent) ? String(percent) : String(percent);
  return `${rounded}%`;
}

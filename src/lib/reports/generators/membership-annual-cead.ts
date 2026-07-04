import { buildPdfKeyValueForm } from "@/lib/reports/export/pdf";
import type { Locale } from "@/i18n/config";
import { CEAD_AGE_BUCKET_LABELS } from "@/lib/reports/templates/cead/constants";
import type { MembershipAnnualStatsPayload } from "@/lib/services/reports";
import { getTranslations } from "next-intl/server";

export async function generateMembershipAnnualCeadPdf(
  payload: MembershipAnnualStatsPayload,
  locale: Locale,
): Promise<Uint8Array> {
  const tReports = await getTranslations({ locale, namespace: "reports" });
  const fields = payload.fields;
  const ageRows = CEAD_AGE_BUCKET_LABELS.map((label) => ({
    label: tReports("exports.membershipAnnualCead.ageLabel", { range: label }),
    value: String(fields.ageBuckets[label] ?? 0),
  }));
  if ((fields.ageBuckets["Sin dato"] ?? 0) > 0) {
    ageRows.push({
      label: tReports("exports.membershipAnnualCead.noBirthDate"),
      value: String(fields.ageBuckets["Sin dato"]),
    });
  }

  return buildPdfKeyValueForm(
    tReports("exports.membershipAnnualCead.title"),
    [
      payload.churchName,
      tReports("exports.membershipAnnualCead.yearLabel", { year: fields.year }),
    ]
      .filter(Boolean)
      .join(" · "),
    [
      {
        heading: tReports("exports.membershipAnnualCead.sections.identification"),
        rows: [
          { label: tReports("exports.common.presbytery"), value: payload.presbyterio ?? "N/D" },
          { label: tReports("exports.membershipAnnualCead.churchCode"), value: "N/D" },
          { label: tReports("exports.common.pastor"), value: payload.pastorName ?? "N/D" },
        ],
      },
      {
        heading: tReports("exports.membershipAnnualCead.sections.membership"),
        rows: [
          {
            label: tReports("exports.membershipAnnualCead.fields.baptizedMembers"),
            value: String(fields.baptizedMembersTotal),
          },
          { label: tReports("exports.membershipAnnualCead.fields.catechumens"), value: String(fields.catechumens) },
          {
            label: tReports("exports.membershipAnnualCead.fields.adherentsVisits"),
            value: String(fields.adherentsVisits),
          },
          {
            label: tReports("exports.membershipAnnualCead.fields.totalCongregation"),
            value: String(fields.totalCongregation),
          },
          {
            label: tReports("exports.membershipAnnualCead.fields.baptizedInSpirit"),
            value: String(fields.baptizedInSpirit),
          },
          {
            label: tReports("exports.membershipAnnualCead.fields.waterBaptisms"),
            value: String(fields.baptismsInWaterThisYear),
          },
        ],
      },
      {
        heading: tReports("exports.membershipAnnualCead.sections.ages"),
        rows: ageRows,
      },
      {
        heading: tReports("exports.membershipAnnualCead.sections.gender"),
        rows: [
          { label: tReports("exports.membershipAnnualCead.gender.male"), value: String(fields.genderMale) },
          { label: tReports("exports.membershipAnnualCead.gender.female"), value: String(fields.genderFemale) },
          { label: tReports("exports.membershipAnnualCead.gender.other"), value: String(fields.genderOther) },
        ],
      },
      {
        heading: tReports("exports.membershipAnnualCead.sections.ministries"),
        rows: [{ label: tReports("exports.membershipAnnualCead.fields.list"), value: fields.activeMinistries }],
      },
    ],
    tReports("exports.membershipAnnualCead.footerNote"),
  );
}

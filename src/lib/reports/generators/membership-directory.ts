import { memberFullName } from "@/lib/members/parse";
import type { Locale } from "@/i18n/config";
import { buildPdfTablePaginated } from "@/lib/reports/export/pdf";
import {
  createWorkbook,
  workbookToBuffer,
} from "@/lib/reports/export/xlsx";
import type { MembershipDirectoryPayload } from "@/lib/services/reports";
import { getTranslations } from "next-intl/server";

const DIRECTORY_COLUMN_KEYS = [
  "fullName",
  "nickname",
  "role",
  "phone",
  "email",
  "city",
  "member",
  "active",
] as const;

const PDF_ROWS_PER_PAGE = 32;

function memberPhone(member: MembershipDirectoryPayload["members"][number]): string {
  return member.contact.mobilePhone || member.contact.phone || "";
}

function memberExportRow(
  member: MembershipDirectoryPayload["members"][number],
): string[] {
  return [
    memberFullName(member),
    member.nickName || "",
    member.membershipRole || "",
    memberPhone(member),
    member.contact.email || "",
    member.address.cityState || "",
    member.isMember ? "Sí" : "No",
    member.isActive ? "Sí" : "No",
  ];
}

export async function generateMembershipDirectoryXlsx(
  payload: MembershipDirectoryPayload,
  locale: Locale,
): Promise<Uint8Array> {
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const tReports = await getTranslations({ locale, namespace: "reports" });
  const workbook = await createWorkbook();
  const memberFilterLabel = tReports(`memberFilters.${payload.filter}`);
  const meta = workbook.addWorksheet(tReports("xlsx.metaSheet"));
  meta.addRow([tReports("xlsx.filter"), memberFilterLabel]);
  meta.addRow([tCommon("total"), payload.stats.total]);
  meta.addRow([tReports("memberFilters.members"), payload.stats.members]);
  meta.addRow([tReports("memberFilters.visits"), payload.stats.visits]);
  meta.addRow([tCommon("active"), payload.stats.active]);
  meta.addRow([tCommon("inactive"), payload.stats.inactive]);
  meta.addRow([tReports("xlsx.generatedAt"), payload.generatedAt]);

  const sheet = workbook.addWorksheet(tReports("xlsx.directorySheet"));
  sheet.addRow(
    DIRECTORY_COLUMN_KEYS.map((key) =>
      tReports(`exports.membershipDirectory.columns.${key}`),
    ),
  );
  sheet.getRow(1).font = { bold: true };
  for (const member of payload.members) {
    sheet.addRow(memberExportRow(member));
  }

  return workbookToBuffer(workbook);
}

export async function generateMembershipDirectoryPdf(
  payload: MembershipDirectoryPayload,
  locale: Locale,
): Promise<Uint8Array> {
  const tReports = await getTranslations({ locale, namespace: "reports" });
  const memberFilterLabel = tReports(`memberFilters.${payload.filter}`);
  const subtitle = [
    payload.churchName,
    `${tReports("xlsx.filter")}: ${memberFilterLabel}`,
    tReports("exports.membershipDirectory.records", {
      count: payload.members.length.toLocaleString(locale),
    }),
  ]
    .filter(Boolean)
    .join(" · ");

  const rows = payload.members.map(memberExportRow);
  return buildPdfTablePaginated(
    tReports("catalog.membership-directory.title"),
    DIRECTORY_COLUMN_KEYS.map((key) => ({
      header: tReports(`exports.membershipDirectory.columns.${key}`),
      width: 62,
    })),
    rows,
    subtitle,
    PDF_ROWS_PER_PAGE,
  );
}

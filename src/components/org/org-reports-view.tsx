"use client";

import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import type { OrgSubmittedReportRow } from "@/lib/services/org-portal";
import { useTranslations } from "next-intl";

export function OrgReportsView({
  organizationName,
  reports,
}: {
  organizationName: string;
  reports: OrgSubmittedReportRow[];
}) {
  const t = useTranslations("org");

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("reports.title")}
        titleAccent={organizationName}
        subtitle={t("reports.subtitle")}
      />

      <DataTable
        columns={[
          {
            key: "church",
            label: t("reports.table.church"),
            render: (row) => row.churchName,
          },
          {
            key: "code",
            label: t("reports.table.code"),
            render: (row) => row.externalCode ?? "—",
          },
          {
            key: "period",
            label: t("reports.table.period"),
            render: (row) => `${row.periodMonth}/${row.periodYear}`,
          },
          {
            key: "kind",
            label: t("reports.table.kind"),
            render: (row) => row.reportKind,
          },
          {
            key: "submitted",
            label: t("reports.table.submitted"),
            render: (row) =>
              row.submittedAt
                ? new Date(row.submittedAt).toLocaleString()
                : "—",
          },
        ]}
        rows={reports}
        rowKey={(row) => row.id}
        empty={
          <div className="py-8 text-center text-sm text-[var(--muted)]">
            {t("reports.empty")}
          </div>
        }
      />
    </div>
  );
}

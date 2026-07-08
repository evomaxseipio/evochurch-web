"use client";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import type { OrgDashboardPayload } from "@/lib/services/org-portal";
import { useTranslations } from "next-intl";

export function OrgDashboardView({
  organizationName,
  dashboard,
}: {
  organizationName: string;
  dashboard: OrgDashboardPayload;
}) {
  const t = useTranslations("org");

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("dashboard.title")}
        titleAccent={organizationName}
        subtitle={t("dashboard.subtitle")}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <KpiCard
          label={t("dashboard.churchCount")}
          value={String(dashboard.totals.churchCount)}
          icon="users"
        />
        <KpiCard
          label={t("dashboard.reportCount")}
          value={String(dashboard.totals.reportCount)}
          icon="download"
        />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          {t("dashboard.recentReports")}
        </h2>
        <DataTable
          columns={[
            {
              key: "church",
              label: t("reports.table.church"),
              render: (row) => row.churchName,
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
          rows={dashboard.recentReports}
          rowKey={(row) => row.id}
          empty={
            <div className="py-8 text-center text-sm text-[var(--muted)]">
              {t("dashboard.noReports")}
            </div>
          }
        />
      </section>
    </div>
  );
}

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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        <KpiCard
          label={t("dashboard.overdueCount")}
          value={String(dashboard.totals.overdueCount)}
          icon="bell"
        />
      </div>

      {dashboard.overdueChurches.length > 0 ? (
        <section
          className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-5 md:p-6"
          style={{
            borderColor:
              dashboard.totals.overdueCount > 0
                ? "color-mix(in srgb, var(--warning) 35%, var(--hairline))"
                : undefined,
          }}
        >
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--warning)]">
            {t("dashboard.overdueTitle")}
          </h2>
          <p className="mb-4 text-sm text-[var(--muted)]">
            {t("dashboard.overdueSubtitle", {
              month: dashboard.overduePeriod.month,
              year: dashboard.overduePeriod.year,
              dueDay: dashboard.overduePeriod.dueDay,
            })}
          </p>
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
                key: "billing",
                label: t("churches.table.billing"),
                render: (row) =>
                  t(`churches.billing.statuses.${row.billingStatus}`, {
                    defaultValue: row.billingStatus,
                  }),
              },
            ]}
            rows={dashboard.overdueChurches}
            rowKey={(row) => String(row.churchId)}
            empty={null}
          />
        </section>
      ) : (
        <section className="rounded-xl border border-[var(--hairline)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">
          {t("dashboard.noOverdue")}
        </section>
      )}

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

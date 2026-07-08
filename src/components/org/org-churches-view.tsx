"use client";

import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import type { OrgChurchRow } from "@/lib/services/org-portal";
import { useTranslations } from "next-intl";

export function OrgChurchesView({
  organizationName,
  churches,
}: {
  organizationName: string;
  churches: OrgChurchRow[];
}) {
  const t = useTranslations("org");

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("churches.title")}
        titleAccent={organizationName}
        subtitle={t("churches.subtitle")}
      />

      <DataTable
        columns={[
          {
            key: "name",
            label: t("churches.table.name"),
            render: (row) => (
              <div>
                <div className="font-medium">{row.name}</div>
                {row.shortName ? (
                  <div className="text-xs text-[var(--muted)]">{row.shortName}</div>
                ) : null}
              </div>
            ),
          },
          {
            key: "city",
            label: t("churches.table.city"),
            render: (row) => row.city ?? "—",
          },
          {
            key: "unit",
            label: t("churches.table.unit"),
            render: (row) => row.orgUnitName ?? "—",
          },
          {
            key: "code",
            label: t("churches.table.code"),
            render: (row) => row.externalCode ?? "—",
          },
          {
            key: "kind",
            label: t("churches.table.kind"),
            render: (row) => row.churchKind,
          },
        ]}
        rows={churches}
        rowKey={(row) => String(row.id)}
        empty={
          <div className="py-8 text-center text-sm text-[var(--muted)]">
            {t("churches.empty")}
          </div>
        }
      />
    </div>
  );
}

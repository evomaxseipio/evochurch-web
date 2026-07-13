"use client";

import { loadCampusSummaryAction } from "@/app/apps/church/(console)/network/actions";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Icons } from "@/components/icons";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import type { Locale } from "@/i18n/config";
import { fmtRD } from "@/lib/format-currency";
import type {
  NetworkCampusRow,
  NetworkCampusSummary,
  NetworkDashboardPayload,
} from "@/lib/services/church-network";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState, useTransition } from "react";

function profileField(
  profile: Record<string, unknown> | null,
  key: string,
): string | null {
  if (!profile) return null;
  const value = profile[key];
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

function formatAddress(profile: Record<string, unknown> | null): string | null {
  if (!profile) return null;
  const parts = [
    profileField(profile, "address_line1"),
    profileField(profile, "address_line2"),
    profileField(profile, "city"),
    profileField(profile, "state_province"),
  ].filter((part): part is string => part != null);
  return parts.length > 0 ? parts.join(", ") : null;
}

function CampusDetailPanel({
  campus,
  summary,
  loading,
  error,
  onClose,
}: {
  campus: NetworkCampusRow;
  summary: NetworkCampusSummary | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const t = useTranslations("network");
  const locale = useLocale() as Locale;
  const profile = summary?.profile ?? null;
  const kpis = summary?.kpis ?? campus.kpis;
  const address = formatAddress(profile);

  return (
    <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-5 md:p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t("detail.title")}
          </div>
          <h2 className="mt-1 text-xl font-semibold text-[var(--fg)]">
            {campus.name}
          </h2>
          {campus.city ? (
            <p className="mt-1 text-sm text-[var(--muted)]">{campus.city}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="btn ghost sm"
          onClick={onClose}
          aria-label={t("detail.close")}
        >
          <Icons.x size={16} />
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--muted)]">{t("detail.loading")}</p>
      ) : null}

      {error ? (
        <p
          className="rounded-lg px-3 py-2 text-sm"
          style={{ background: "var(--danger-bg)", color: "var(--danger)" }}
        >
          {error}
        </p>
      ) : null}

      {!loading && !error ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard
              label={t("table.members")}
              value={String(kpis.memberCount)}
              icon="users"
              kind="flat"
            />
            <KpiCard
              label={t("table.balance")}
              value={fmtRD(kpis.fundBalance, locale)}
              icon="wallet"
              kind="flat"
            />
            <KpiCard
              label={t("table.monthIncome")}
              value={fmtRD(kpis.monthIncome, locale)}
              icon="trendUp"
              kind="flat"
            />
          </div>

          <div className="space-y-3 text-sm">
            <div className="font-medium text-[var(--fg)]">
              {t("detail.contact")}
            </div>
            {profileField(profile, "phone") ? (
              <div>
                <span className="text-[var(--muted)]">{t("detail.phone")}: </span>
                {profileField(profile, "phone")}
              </div>
            ) : null}
            {profileField(profile, "email") ? (
              <div>
                <span className="text-[var(--muted)]">{t("detail.email")}: </span>
                {profileField(profile, "email")}
              </div>
            ) : null}
            {address ? (
              <div>
                <span className="text-[var(--muted)]">{t("detail.address")}: </span>
                {address}
              </div>
            ) : null}
            {profileField(profile, "external_code") ? (
              <div>
                <span className="text-[var(--muted)]">{t("detail.code")}: </span>
                {profileField(profile, "external_code")}
              </div>
            ) : null}
            {profileField(profile, "presbytery_name") ? (
              <div>
                <span className="text-[var(--muted)]">
                  {profileField(profile, "presbytery_name")}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function NetworkView({
  churchName,
  dashboard,
}: {
  churchName: string | null;
  dashboard: NetworkDashboardPayload;
}) {
  const t = useTranslations("network");
  const locale = useLocale() as Locale;
  const [selectedCampus, setSelectedCampus] = useState<NetworkCampusRow | null>(
    null,
  );
  const [campusSummary, setCampusSummary] = useState<NetworkCampusSummary | null>(
    null,
  );
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const openCampusDetail = useCallback((campus: NetworkCampusRow) => {
    setSelectedCampus(campus);
    setCampusSummary(null);
    setDetailError(null);

    startTransition(async () => {
      const result = await loadCampusSummaryAction(campus.id);
      if (result.ok) {
        setCampusSummary(result.summary);
      } else {
        setDetailError(result.error);
      }
    });
  }, []);

  const closeCampusDetail = useCallback(() => {
    setSelectedCampus(null);
    setCampusSummary(null);
    setDetailError(null);
  }, []);

  const networkKpis = [
    {
      key: "campuses",
      label: t("kpis.campuses"),
      value: String(dashboard.totals.campusCount),
      icon: "grid" as const,
      accent: "var(--accent)",
    },
    {
      key: "members",
      label: t("kpis.totalMembers"),
      value: String(dashboard.totals.totalMembers),
      icon: "users" as const,
      accent: "var(--lila)",
    },
    {
      key: "balance",
      label: t("kpis.totalBalance"),
      value: fmtRD(dashboard.totals.totalFundBalance, locale),
      icon: "wallet" as const,
      accent: "var(--success)",
    },
    {
      key: "income",
      label: t("kpis.totalIncome"),
      value: fmtRD(dashboard.totals.totalMonthIncome, locale),
      icon: "trendUp" as const,
      accent: "#0891B2",
    },
  ];

  const hqKpis = [
    {
      key: "hq-members",
      label: t("kpis.hqMembers"),
      value: String(dashboard.headquartersKpis.memberCount),
      icon: "users" as const,
    },
    {
      key: "hq-balance",
      label: t("kpis.hqBalance"),
      value: fmtRD(dashboard.headquartersKpis.fundBalance, locale),
      icon: "wallet" as const,
    },
    {
      key: "hq-income",
      label: t("kpis.hqIncome"),
      value: fmtRD(dashboard.headquartersKpis.monthIncome, locale),
      icon: "trendUp" as const,
    },
  ];

  return (
    <div className="network-view" style={{ display: "grid", gap: 24 }}>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        titleAccent={churchName ?? undefined}
        subtitle={t("subtitle")}
        actions={
          <span
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: "var(--surface-2)",
              color: "var(--muted)",
              border: "1px solid var(--hairline)",
            }}
          >
            {t("readOnlyBadge")}
          </span>
        }
      />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          {t("sections.totals")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {networkKpis.map((kpi) => (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={kpi.value}
              icon={kpi.icon}
              accent={kpi.accent}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          {t("sections.headquarters")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {hqKpis.map((kpi) => (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={kpi.value}
              icon={kpi.icon}
              kind="flat"
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          {t("sections.campuses")}
        </h2>

        {selectedCampus ? (
          <div className="mb-4">
            <CampusDetailPanel
              campus={selectedCampus}
              summary={campusSummary}
              loading={isPending}
              error={detailError}
              onClose={closeCampusDetail}
            />
          </div>
        ) : null}

        <DataTable
          columns={[
            {
              key: "name",
              label: t("table.name"),
              render: (row) => (
                <div>
                  <div className="font-medium">{row.name}</div>
                  {row.shortName ? (
                    <div className="text-xs text-[var(--muted)]">
                      {row.shortName}
                    </div>
                  ) : null}
                </div>
              ),
            },
            {
              key: "city",
              label: t("table.city"),
              render: (row) => row.city ?? "—",
            },
            {
              key: "members",
              label: t("table.members"),
              align: "right",
              render: (row) => row.kpis.memberCount,
            },
            {
              key: "balance",
              label: t("table.balance"),
              align: "right",
              render: (row) => fmtRD(row.kpis.fundBalance, locale),
            },
            {
              key: "income",
              label: t("table.monthIncome"),
              align: "right",
              render: (row) => fmtRD(row.kpis.monthIncome, locale),
            },
          ]}
          rows={dashboard.campuses}
          rowKey={(row) => String(row.id)}
          onRowClick={openCampusDetail}
          actions={(row) => (
            <button
              type="button"
              className="btn ghost sm"
              onClick={(event) => {
                event.stopPropagation();
                openCampusDetail(row);
              }}
            >
              {t("viewDetail")}
            </button>
          )}
          actionsLabel={t("table.actions")}
          actionsPosition="end"
          empty={
            <div className="py-10 text-center text-sm text-[var(--muted)]">
              {t("empty")}
            </div>
          }
        />
      </section>
    </div>
  );
}

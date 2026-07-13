"use client";

import { fetchFamilyHouseholdsAction } from "@/app/apps/church/(console)/reports/family-actions";
import { FundsKpi } from "@/components/funds/funds-kpi";
import { Icons } from "@/components/icons";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { churchPath } from "@/lib/apps/church-routes";
import {
  FAMILY_HOUSEHOLD_FILTERS,
  type FamilyHouseholdFilter,
  type FamilyHouseholdListItem,
  type FamilyHouseholdListPage,
  type FamilyHouseholdStatus,
} from "@/lib/reports/family-household";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import "./family-report.css";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

function StatusChip({
  status,
  hasMinistryChildren,
  hasSpouse,
  childrenCount,
  t,
}: {
  status: FamilyHouseholdStatus;
  hasMinistryChildren: boolean;
  hasSpouse: boolean;
  childrenCount: number;
  t: ReturnType<typeof useTranslations<"reports.families">>;
}) {
  if (hasMinistryChildren) {
    return <span className="chip violet">{t("status.ministry")}</span>;
  }
  if (hasSpouse && childrenCount === 0) {
    return <span className="chip muted">{t("status.adultsOnly")}</span>;
  }
  if (status === "incomplete") {
    return (
      <span className="chip amber">
        <span className="alert-dot" />
        {t("status.incomplete")}
      </span>
    );
  }
  if (status === "complete") {
    return <span className="chip green">{t("status.complete")}</span>;
  }
  return <span className="chip amber">{t("status.alerts")}</span>;
}

function downloadCsv(items: FamilyHouseholdListItem[], filename: string) {
  const header = [
    "family",
    "adults",
    "members",
    "children",
    "hasSpouse",
    "status",
    "phone",
  ];
  const rows = items.map((item) =>
    [
      item.familyLabel,
      item.adultsLabel,
      item.memberCount,
      item.childrenCount,
      item.hasSpouse ? "yes" : "no",
      item.status,
      item.phone ?? "",
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...rows].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function FamilyHouseholdsListView({
  initialPage,
  churchName,
  initialSearch = "",
  initialFilter = "all",
  initialPageSize = 25,
}: {
  initialPage: FamilyHouseholdListPage;
  churchName?: string | null;
  initialSearch?: string;
  initialFilter?: FamilyHouseholdFilter;
  initialPageSize?: number;
}) {
  const t = useTranslations("reports.families");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const [search, setSearch] = useState(initialSearch);
  const [filter, setFilter] = useState<FamilyHouseholdFilter>(initialFilter);
  const [page, setPage] = useState(initialPage.page);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [items, setItems] = useState(initialPage.items);
  const [total, setTotal] = useState(initialPage.total);
  const [summary, setSummary] = useState(initialPage.summary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const skipFirstFetch = useRef(true);

  async function fetchPage(
    nextPage: number,
    nextFilter = filter,
    nextSearch = search,
    nextPageSize = pageSize,
  ) {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    const result = await fetchFamilyHouseholdsAction({
      search: nextSearch.trim() || null,
      filter: nextFilter,
      page: nextPage,
      pageSize: nextPageSize,
    });
    if (requestId !== requestIdRef.current) return;
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      setItems([]);
      setTotal(0);
      return;
    }
    setPage(result.page.page);
    setPageSize(result.page.pageSize);
    setItems(result.page.items);
    setTotal(result.page.total);
    setSummary(result.page.summary);
  }

  useEffect(() => {
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filter]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = total === 0 ? 0 : (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + items.length, total);
  const isEmptyChurch = summary.households === 0 && !search.trim() && filter === "all";

  const columns = useMemo<DataTableColumn<FamilyHouseholdListItem>[]>(
    () => [
      {
        key: "family",
        label: t("columns.family"),
        render: (row) => (
          <div>
            <div className="family-name">{row.familyLabel}</div>
            <div className="tiny muted">{row.adultsLabel || "—"}</div>
          </div>
        ),
      },
      {
        key: "members",
        label: t("columns.members"),
        render: (row) => row.memberCount,
      },
      {
        key: "children",
        label: t("columns.children"),
        className: "hide-sm",
        render: (row) => row.childrenCount,
      },
      {
        key: "spouse",
        label: t("columns.spouse"),
        className: "hide-sm",
        render: (row) =>
          row.hasSpouse ? (
            <span className="chip green">{t("yes")}</span>
          ) : (
            <span className="chip muted">{t("no")}</span>
          ),
      },
      {
        key: "status",
        label: t("columns.status"),
        render: (row) => (
          <StatusChip
            status={row.status}
            hasMinistryChildren={row.hasMinistryChildren}
            hasSpouse={row.hasSpouse}
            childrenCount={row.childrenCount}
            t={t}
          />
        ),
      },
      {
        key: "actions",
        label: "",
        render: () => <span className="linkish">{t("view")} →</span>,
      },
    ],
    [t],
  );

  return (
    <div className="family-report-dash">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={
          churchName
            ? t("subtitleWithChurch", { churchName })
            : t("subtitle")
        }
        actions={
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              className="btn outline sm no-print"
              disabled={items.length === 0}
              onClick={() =>
                downloadCsv(items, `familias-${new Date().toISOString().slice(0, 10)}.csv`)
              }
            >
              {t("exportCsv")}
            </button>
            <button
              type="button"
              className="btn outline sm no-print"
              onClick={() => window.print()}
            >
              {t("printList")}
            </button>
          </div>
        }
      />

      {isEmptyChurch ? (
          <div className="card empty-state" style={{ marginTop: 28 }}>
          <div className="icon-wrap">
            <Icons.users size={28} />
          </div>
          <h2>{t("empty.title")}</h2>
          <p>{t("empty.hint")}</p>
          <a className="btn primary" href={churchPath("/members")}>
            {t("empty.cta")}
          </a>
        </div>
      ) : (
        <>
          <div className="grid-12" style={{ marginTop: 22, marginBottom: 20 }}>
            <div className="span-3">
              <FundsKpi
                kind="elevated"
                label={t("kpi.households")}
                value={String(summary.households)}
                icon={<Icons.users size={16} />}
                tone="d-system"
              />
            </div>
            <div className="span-3">
              <FundsKpi
                kind="elevated"
                label={t("kpi.complete")}
                value={String(summary.complete)}
                icon={<Icons.check size={16} />}
                tone="d-income"
              />
            </div>
            <div className="span-3">
              <FundsKpi
                kind="elevated"
                label={t("kpi.incomplete")}
                value={String(summary.incomplete)}
                icon={<Icons.bell size={16} />}
                tone="d-donation"
              />
            </div>
            <div className="span-3">
              <FundsKpi
                kind="elevated"
                label={t("kpi.ministry")}
                value={String(summary.withMinistryChildren)}
                icon={<Icons.users size={16} />}
                tone="d-funds"
              />
            </div>
          </div>

          <FilterToolbar
            query={search}
            onQueryChange={setSearch}
            queryPlaceholder={t("searchPlaceholder")}
            maxSearchWidth={340}
            compactSearch
            middle={
              <div className="filter-chips no-print">
                {FAMILY_HOUSEHOLD_FILTERS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`filter-chip${filter === key ? " active" : ""}`}
                    onClick={() => setFilter(key)}
                  >
                    {t(`filters.${key}`)}
                  </button>
                ))}
              </div>
            }
          />

          {error ? (
            <p className="tiny" style={{ color: "var(--danger)", marginTop: 12 }}>
              {error}
            </p>
          ) : null}

          <div className="card flat" style={{ marginTop: 14, overflow: "hidden" }}>
            {loading ? (
              <p className="muted" style={{ padding: 20 }}>
                {tCommon("loading")}
              </p>
            ) : items.length === 0 ? (
              <p className="muted" style={{ padding: 20 }}>
                {t("empty.filtered")}
              </p>
            ) : (
              <DataTable
                columns={columns}
                rows={items}
                rowKey={(row) => row.anchorProfileId}
                onRowClick={(row) =>
                  router.push(
                    churchPath(`/reports/families/${row.anchorProfileId}`),
                  )
                }
              />
            )}
          </div>

          <PaginationBar
            page={safePage}
            totalPages={totalPages}
            total={total}
            pageStart={pageStart}
            pageEnd={pageEnd}
            pageSize={pageSize}
            sizeOptions={PAGE_SIZE_OPTIONS}
            onPage={(next) => void fetchPage(next)}
            onPageSize={(next) => void fetchPage(1, filter, search, next)}
            noun={t("householdNoun")}
          />
        </>
      )}
    </div>
  );
}

"use client";

import {
  deleteContributionAction,
  type ContributionActionResult,
} from "@/app/(app)/finances/contributions/actions";
import { ContributionActionMenu } from "@/components/contributions/contribution-action-menu";
import { ContributionCard } from "@/components/contributions/contribution-card";
import { ContributionFormDrawer } from "@/components/contributions/contribution-form-drawer";
import { ContributorCell } from "@/components/contributions/contribution-ui";
import { ContributionsKpi } from "@/components/contributions/contributions-kpi";
import {
  DateRangeFilter,
  dateRangeExportSlug,
} from "@/components/finance/date-range-filter";
import { FinPageHeader } from "@/components/finances/fin-page-header";
import { Icons } from "@/components/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { useActionToast } from "@/hooks/use-action-toast";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import type { DateRange } from "@/lib/finance/date-range";
import {
  categoryChipClass,
  formatContributionDateShort,
  paymentMethodLabel,
} from "@/lib/contributions/parse";
import type {
  Contribution,
  ContributionCategoryFilter,
  ContributionsStats,
  IncomeType,
} from "@/lib/contributions/types";
import type { Fund } from "@/lib/funds/types";
import {
  FINANCE_PAGE_SIZE_OPTIONS,
  type FinancePageSize,
} from "@/lib/finance/pagination";
import { fmtRD } from "@/lib/format-currency";
import { toast } from "@/lib/toast";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useActionState,
  useMemo,
  useState,
  startTransition,
} from "react";

const deleteInitial: ContributionActionResult | null = null;

function buildContributionsQuery(
  base: URLSearchParams,
  updates: {
    page?: number;
    pageSize?: number;
    dateRange?: DateRange;
    category?: ContributionCategoryFilter;
  },
): string {
  const params = new URLSearchParams(base.toString());

  if (updates.page !== undefined) {
    if (updates.page <= 1) params.delete("page");
    else params.set("page", String(updates.page));
  }

  if (updates.pageSize !== undefined) {
    if (updates.pageSize === 25) params.delete("size");
    else params.set("size", String(updates.pageSize));
  }

  if (updates.dateRange) {
    params.set("from", updates.dateRange.from);
    params.set("to", updates.dateRange.to);
    params.delete("month");
  }

  if (updates.category !== undefined) {
    if (updates.category === "all") params.delete("category");
    else params.set("category", updates.category);
  }

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function ContributionsListView({
  entries,
  totalCount,
  periodStats,
  funds,
  incomeTypes,
  fundFilterId,
  fundFilterName,
  page,
  pageSize,
  dateFrom,
  dateTo,
  category,
}: {
  entries: Contribution[];
  totalCount: number;
  periodStats: ContributionsStats;
  funds: Fund[];
  incomeTypes: IncomeType[];
  fundFilterId?: string | null;
  fundFilterName?: string | null;
  page: number;
  pageSize: FinancePageSize;
  dateFrom: string;
  dateTo: string;
  category: ContributionCategoryFilter;
}) {
  const tCommon = useTranslations("common");
  const tFinances = useTranslations("finances");
  const tContributions = useTranslations("contributions");
  const locale = useLocale() as "es" | "en" | "fr";
  const router = useRouter();
  const CATEGORY_FILTERS: { key: ContributionCategoryFilter; label: string }[] = [
    { key: "all", label: tCommon("all") },
    { key: "tithe", label: tContributions("tithes") },
    { key: "offering", label: tContributions("offerings") },
    { key: "donation", label: tContributions("donations") },
  ];

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDesktop = useIsDesktop();
  const dateRange = useMemo(
    () => ({ from: dateFrom, to: dateTo }),
    [dateFrom, dateTo],
  );
  const [query, setQuery] = useState("");
  const [formState, setFormState] = useState<{
    mode: "new" | "edit";
    entry: Contribution | null;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contribution | null>(null);

  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteContributionAction,
    deleteInitial,
  );

  useActionToast(deleteState, {
    successMessage: tContributions("messages.deleted"),
    onSuccess: () => {
      setDeleteTarget(null);
      router.refresh();
    },
  });

  function navigate(updates: Parameters<typeof buildContributionsQuery>[1]) {
    const href = `${pathname}${buildContributionsQuery(searchParams, updates)}`;
    router.push(href);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) =>
      [e.contributorLabel, e.fundName, e.typeName, e.paymentMethod]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [entries, query]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + entries.length, totalCount);
  const pageRows = filtered;

  const exportBase = `contributions_${dateRangeExportSlug(dateRange)}_${locale}`;

  function openNew() {
    setFormState({ mode: "new", entry: null });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const fd = new FormData();
    fd.set("incomeId", deleteTarget.incomeId);
    startTransition(() => deleteAction(fd));
  }

  const columns = useMemo(
    () => [
      {
        key: "type",
                label: tCommon("type"),
        render: (c: Contribution) => (
          <span className={`chip ${categoryChipClass(c.category)}`}>
            <span className="pip" /> {c.typeName}
          </span>
        ),
      },
      {
        key: "fund",
                label: tCommon("fund"),
        render: (c: Contribution) => <span className="chip">{c.fundName}</span>,
      },
      {
        key: "contributor",
                label: tContributions("contributor"),
        render: (c: Contribution) => <ContributorCell entry={c} />,
      },
      {
        key: "amount",
                label: tCommon("amount"),
        align: "right" as const,
        className: "tnum mono",
        render: (c: Contribution) => (
          <span style={{ fontWeight: 600, color: "var(--success)" }}>
            +{fmtRD(c.amount, locale)}
          </span>
        ),
      },
      {
        key: "date",
                label: tCommon("date"),
        className: "muted",
        render: (c: Contribution) => formatContributionDateShort(c.paymentDate),
      },
      {
        key: "method",
                label: tContributions("paymentMethod"),
        className: "muted",
        render: (c: Contribution) => paymentMethodLabel(c.paymentMethod),
      },
      {
        key: "mode",
                label: tContributions("mode"),
        render: (c: Contribution) => (
          <span className="tiny muted" style={{ fontWeight: 600 }}>
            {c.collectionMode === "collective"
              ? tFinances("contributionTypes.collective")
              : tFinances("contributionTypes.individual")}
          </span>
        ),
      },
    ],
    [locale, tCommon, tContributions, tFinances],
  );

  const emptyMessage =
    totalCount === 0
      ? tContributions("empty")
      : tContributions("emptyFiltered");

  return (
    <div>
      <FinPageHeader
        eyebrow={tFinances("stewardship")}
        title={
          fundFilterName
            ? `${tContributions("title")} — ${fundFilterName}`
            : tContributions("title")
        }
        subtitle={tContributions("subtitle")}
        onExportPdf={() =>
          toast.success(
            tFinances("reportGenerated"),
            tFinances("fileDownloaded", { file: `${exportBase}.pdf` }),
          )
        }
        onExportExcel={() =>
          toast.success(
            tFinances("reportGenerated"),
            tFinances("fileDownloaded", { file: `${exportBase}.xlsx` }),
          )
        }
      />

      {fundFilterId ? (
        <Link
          href="/finances/contributions"
          className="tiny"
          style={{
            display: "inline-flex",
            marginTop: 8,
            color: "var(--accent)",
            fontWeight: 600,
          }}
        >
          {tContributions("viewAll")}
        </Link>
      ) : null}

      <ContributionsKpi stats={periodStats} />

      <FilterToolbar
        style={{ marginTop: 0 }}
        query={query}
        onQueryChange={setQuery}
        queryPlaceholder={tContributions("searchPlaceholder")}
        maxSearchWidth={340}
        compactSearch
        filters={CATEGORY_FILTERS}
        activeFilter={category}
        onFilterChange={(next) =>
          navigate({ category: next, page: 1 })
        }
        middle={
          <DateRangeFilter
            value={dateRange}
            onChange={(next) => navigate({ dateRange: next, page: 1 })}
          />
        }
        trailing={
          isDesktop ? (
            <button type="button" className="btn primary" onClick={openNew}>
              <Icons.plus size={14} /> {tContributions("addIncome")}
            </button>
          ) : null
        }
      />

      {isDesktop ? (
        <DataTable
          style={{ marginTop: 0 }}
          columns={columns}
          rows={pageRows}
          rowKey={(c) => c.incomeId}
          actionsPosition="start"
          actionsLabel={tCommon("actions")}
          actions={(c) => (
            <ContributionActionMenu
              onEdit={() => setFormState({ mode: "edit", entry: c })}
              onDelete={() => setDeleteTarget(c)}
            />
          )}
          empty={<div className="muted">{emptyMessage}</div>}
        />
      ) : (
        <div className="col" style={{ gap: 10 }}>
          {pageRows.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              <div className="muted">{emptyMessage}</div>
              {totalCount === 0 ? (
                <button
                  type="button"
                  className="btn primary"
                  style={{ marginTop: 16 }}
                  onClick={openNew}
                >
                  <Icons.plus size={14} /> {tContributions("addIncome")}
                </button>
              ) : null}
            </div>
          ) : (
            pageRows.map((c) => (
              <ContributionCard
                key={c.incomeId}
                entry={c}
                onEdit={() => setFormState({ mode: "edit", entry: c })}
                onDelete={() => setDeleteTarget(c)}
              />
            ))
          )}
        </div>
      )}

      {totalCount > 0 ? (
        <PaginationBar
          page={safePage}
          totalPages={totalPages}
          total={totalCount}
          pageStart={pageStart}
          pageEnd={pageEnd}
          pageSize={pageSize}
          onPage={(p) => navigate({ page: p })}
          onPageSize={(s) =>
            navigate({ pageSize: s as FinancePageSize, page: 1 })
          }
            noun={tContributions("recordsNoun")}
          sizeOptions={FINANCE_PAGE_SIZE_OPTIONS}
        />
      ) : null}

      {!isDesktop ? (
        <button
          type="button"
          className="btn primary"
          onClick={openNew}
          style={{
            position: "fixed",
            right: 20,
            bottom: 80,
            zIndex: 40,
            borderRadius: 999,
            padding: "14px 18px",
            boxShadow: "var(--shadow-3)",
          }}
          aria-label={tContributions("addIncome")}
        >
          <Icons.plus size={18} />
        </button>
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          title={tFinances("deleteIncome")}
          message={tCommon("cannotUndo")}
          itemName={`${deleteTarget.typeName} · ${deleteTarget.contributorLabel}`}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
          pending={deletePending}
        />
      ) : null}

      <ContributionFormDrawer
        key={`${formState?.mode ?? "new"}-${formState?.entry?.incomeId ?? "new"}-${formState !== null ? "open" : "closed"}`}
        mode={formState?.mode ?? "new"}
        entry={formState?.entry ?? null}
        open={formState !== null}
        onClose={() => setFormState(null)}
        funds={funds}
        incomeTypes={incomeTypes}
        presetFundId={fundFilterId}
      />
    </div>
  );
}

"use client";

import { generateReportAction, previewConcilioF001Action, previewFinancialMonthlyCeadAction, previewReportAction, submitConcilioReportAction } from "@/app/(app)/reports/actions";
import { ReportActionMenu } from "@/components/reports/report-action-menu";
import { ReportCard } from "@/components/reports/report-card";
import { ReportPeriodFilter } from "@/components/reports/report-period-filter";
import { ReportPreviewDialog } from "@/components/reports/report-preview-dialog";
import { DataTable } from "@/components/ui/data-table";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { PageHeader } from "@/components/ui/page-header";
import { ViewModeToggle, type ViewMode } from "@/components/ui/view-mode-toggle";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import {
  filterCatalogByCategory,
  formatLabelForEntry,
  periodForCatalogEntry,
  REPORT_CATEGORY_FILTERS,
  type ReportCatalogEntry,
  type ReportCategoryFilter,
} from "@/lib/reports/catalog";
import {
  base64ToBlobUrl,
  downloadBase64File,
  exportKey,
  revokeBlobUrl,
} from "@/lib/reports/download";
import type { MemberFilterKey } from "@/lib/members/types";
import {
  defaultReportPeriod,
  previousCalendarMonth,
} from "@/lib/reports/period";
import type { MonthPeriod, YearPeriod } from "@/lib/reports/period";
import type { ReportFormat, ReportId } from "@/lib/reports/types";
import type { ConcilioF001ReportPayload, FinancialMonthlyPayload } from "@/lib/services/reports";
import { toast } from "@/lib/toast";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type PreviewContext = {
  entry: ReportCatalogEntry;
  filename: string;
  mimeType: string;
  blobUrl: string;
  base64: string;
  financialMonthlyPayload?: FinancialMonthlyPayload;
  concilioF001Payload?: ConcilioF001ReportPayload;
  treasurerName?: string | null;
  auditLogInteractive?: boolean;
};

function filterCatalogByQuery(
  entries: ReportCatalogEntry[],
  query: string,
  categoryLabelFor: (category: ReportCatalogEntry["category"]) => string,
): ReportCatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter(
    (entry) =>
      entry.title.toLowerCase().includes(q) ||
      entry.description.toLowerCase().includes(q) ||
      categoryLabelFor(entry.category).toLowerCase().includes(q),
  );
}

export function ReportsHubView({
  catalog,
  exportableReportIds,
  churchName,
  locale,
  initialReportId,
  autoOpenReport = false,
  councilAffiliated = false,
}: {
  catalog: ReportCatalogEntry[];
  exportableReportIds: ReportId[];
  churchName?: string | null;
  locale: string;
  initialReportId?: ReportId | null;
  autoOpenReport?: boolean;
  councilAffiliated?: boolean;
}) {
  const tCommon = useTranslations("common");
  const tReports = useTranslations("reports");
  const isDesktop = useIsDesktop();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<ReportCategoryFilter>("all");
  const [view, setView] = useState<ViewMode>("grid");
  const [monthPeriod, setMonthPeriod] = useState<MonthPeriod>(() =>
    previousCalendarMonth(),
  );
  const [yearPeriod, setYearPeriod] = useState<YearPeriod>(() => {
    const period = defaultReportPeriod("year");
    return { kind: "year", year: period.year };
  });
  const [memberFilter, setMemberFilter] = useState<MemberFilterKey>("all");
  const [exportingKey, setExportingKey] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<ReportId | null>(null);
  const [previewContext, setPreviewContext] = useState<PreviewContext | null>(
    null,
  );
  const [submittingToCouncil, setSubmittingToCouncil] = useState(false);
  const autoOpenedRef = useRef(false);
  const handlePreviewRef = useRef<(entry: ReportCatalogEntry) => Promise<void>>(
    async () => {},
  );

  useEffect(() => {
    return () => revokeBlobUrl(previewContext?.blobUrl);
  }, [previewContext?.blobUrl]);

  const exportableSet = useMemo(
    () => new Set(exportableReportIds),
    [exportableReportIds],
  );

  const availableFilters = useMemo(
    () =>
      REPORT_CATEGORY_FILTERS.filter(
        (filter) =>
          filter.key === "all" ||
          catalog.some((entry) => entry.category === filter.key),
      ).map((filter) => ({
        ...filter,
        label:
          filter.key === "all"
            ? tCommon("all")
            : tReports(`categories.${filter.key}`),
      })),
    [catalog, tCommon, tReports],
  );

  const filteredEntries = useMemo(() => {
    const byCategory = filterCatalogByCategory(catalog, categoryFilter);
    return filterCatalogByQuery(byCategory, query, (category) =>
      tReports(`categories.${category}`),
    );
  }, [catalog, categoryFilter, query, tReports]);

  const listView = isDesktop ? view : "grid";

  function closePreview() {
    revokeBlobUrl(previewContext?.blobUrl);
    setPreviewContext(null);
  }

  async function handleExport(
    reportId: ReportCatalogEntry["id"],
    format: ReportFormat,
  ) {
    const entry = catalog.find((item) => item.id === reportId);
    if (!entry) return;

    const key = exportKey(reportId, format);
    setExportingKey(key);

    try {
      const period = periodForCatalogEntry(entry, monthPeriod, yearPeriod);
      const filterArg =
        reportId === "membership-directory" ? memberFilter : undefined;
      const result = await generateReportAction(
        reportId,
        format,
        period,
        filterArg,
        locale,
      );

      if (!result.ok) {
        toast.error(tReports("errors.generateFailed"), result.error);
        return;
      }

      downloadBase64File(result.base64, result.filename, result.mimeType);
      toast.success(tReports("downloadReady"), result.filename);
    } catch (e) {
      toast.error(
        tCommon("error"),
        e instanceof Error ? e.message : tReports("errors.retry"),
      );
    } finally {
      setExportingKey(null);
    }
  }

  async function handlePreview(entry: ReportCatalogEntry) {
    setPreviewingId(entry.id);

    try {
      const period = periodForCatalogEntry(entry, monthPeriod, yearPeriod);
      const filterArg =
        entry.id === "membership-directory" ? memberFilter : undefined;

      if (entry.id === "financial-monthly-cead") {
        const result = await previewFinancialMonthlyCeadAction(period, locale);

        if (!result.ok) {
          toast.error(tReports("errors.previewFailed"), result.error);
          return;
        }

        revokeBlobUrl(previewContext?.blobUrl);
        setPreviewContext({
          entry,
          filename: "",
          mimeType: "application/pdf",
          blobUrl: "",
          base64: "",
          financialMonthlyPayload: result.payload,
          treasurerName: result.treasurerName,
        });
        return;
      }

      if (entry.id === "financial-monthly-concilio-f001") {
        const result = await previewConcilioF001Action(period, locale);

        if (!result.ok) {
          toast.error(tReports("errors.previewFailed"), result.error);
          return;
        }

        revokeBlobUrl(previewContext?.blobUrl);
        setPreviewContext({
          entry,
          filename: "",
          mimeType: "application/pdf",
          blobUrl: "",
          base64: "",
          concilioF001Payload: result.payload,
          treasurerName: result.treasurerName,
        });
        return;
      }

      if (entry.id === "audit-activity-log") {
        revokeBlobUrl(previewContext?.blobUrl);
        setPreviewContext({
          entry,
          filename: "",
          mimeType: "text/html",
          blobUrl: "",
          base64: "",
          auditLogInteractive: true,
        });
        return;
      }

      const result = await previewReportAction(entry.id, period, filterArg, locale);

      if (!result.ok) {
        toast.error(tReports("errors.previewFailed"), result.error);
        return;
      }

      revokeBlobUrl(previewContext?.blobUrl);
      setPreviewContext({
        entry,
        filename: result.filename,
        mimeType: result.mimeType,
        blobUrl: base64ToBlobUrl(result.base64, result.mimeType),
        base64: result.base64,
      });
    } catch (e) {
      toast.error(
        tCommon("error"),
        e instanceof Error ? e.message : tReports("errors.retry"),
      );
    } finally {
      setPreviewingId(null);
    }
  }

  useEffect(() => {
    handlePreviewRef.current = handlePreview;
  });

  useEffect(() => {
    if (!autoOpenReport || !initialReportId || autoOpenedRef.current) return;
    const entry = catalog.find((item) => item.id === initialReportId);
    if (!entry) return;
    autoOpenedRef.current = true;
    void handlePreviewRef.current(entry);
  }, [autoOpenReport, catalog, initialReportId]);

  function rowActions(entry: ReportCatalogEntry) {
    return (
      <ReportActionMenu
        reportId={entry.id}
        formats={entry.formats}
        canExport={exportableSet.has(entry.id)}
        previewLoading={previewingId === entry.id}
        exportingKey={exportingKey}
        onPreview={() => handlePreview(entry)}
        onExport={(format) => handleExport(entry.id, format)}
      />
    );
  }

  const emptyMessage =
    catalog.length === 0
      ? tReports("noReportsForRole")
      : tReports("noReportsMatch");

  async function handleSubmitToCouncil() {
    if (!previewContext?.concilioF001Payload) return;
    const period = periodForCatalogEntry(
      previewContext.entry,
      monthPeriod,
      yearPeriod,
    );
    if (!period || period.kind !== "month") return;

    setSubmittingToCouncil(true);
    try {
      const result = await submitConcilioReportAction(
        period,
        previewContext.concilioF001Payload,
        locale,
      );
      if (!result.ok) {
        toast.error(tReports("errors.submitCouncilFailed"), result.error);
        return;
      }
      toast.success(tReports("submitCouncilSuccess"));
    } finally {
      setSubmittingToCouncil(false);
    }
  }

  const previewPeriodLabel = previewContext
    ? formatLabelForEntry(
        previewContext.entry,
        monthPeriod,
        yearPeriod,
      )
    : null;

  return (
    <div data-testid="reports-hub">
      <PageHeader
        eyebrow={tReports("eyebrow")}
        title={tReports("title")}
        titleAccent={tReports("titleAccent")}
        subtitle={
          churchName
            ? tReports("subtitleWithChurch", { churchName })
            : tReports("subtitle")
        }
      />

      <FilterToolbar
        style={{ marginTop: 22 }}
        query={query}
        onQueryChange={setQuery}
        queryPlaceholder={tReports("searchReport")}
        maxSearchWidth={340}
        compactSearch
        filters={availableFilters.length > 1 ? availableFilters : undefined}
        activeFilter={categoryFilter}
        onFilterChange={setCategoryFilter}
        middle={
          <ReportPeriodFilter
            monthPeriod={monthPeriod}
            onMonthChange={setMonthPeriod}
            yearPeriod={yearPeriod}
            onYearChange={setYearPeriod}
          />
        }
        trailing={isDesktop ? <ViewModeToggle view={view} onViewChange={setView} /> : null}
      />

      {filteredEntries.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <p className="muted" style={{ margin: 0 }}>
            {emptyMessage}
          </p>
        </div>
      ) : listView === "grid" ? (
        <div className="grid-12">
          {filteredEntries.map((entry) => (
              <div key={entry.id} className="span-4">
                <ReportCard
                  entry={entry}
                  monthPeriod={monthPeriod}
                  yearPeriod={yearPeriod}
                  canExport={exportableSet.has(entry.id)}
                  previewLoading={previewingId === entry.id}
                  exportingKey={exportingKey}
                  memberFilter={memberFilter}
                  onMemberFilterChange={setMemberFilter}
                  onPreview={() => handlePreview(entry)}
                  onExport={handleExport}
                />
              </div>
            ))}
        </div>
      ) : (
        <DataTable
          style={{ marginTop: 0 }}
          columns={[
            {
              key: "title",
              label: tReports("columns.report"),
              render: (entry) => (
                <div>
                  <div style={{ fontWeight: 500 }}>{entry.title}</div>
                  <div className="tiny muted" style={{ marginTop: 4 }}>
                    {entry.description}
                  </div>
                </div>
              ),
            },
            {
              key: "category",
              label: tCommon("category"),
              render: (entry) => (
                <span className="chip">{tReports(`categories.${entry.category}`)}</span>
              ),
            },
            {
              key: "period",
              label: tReports("period"),
              render: (entry) => {
                const label = formatLabelForEntry(entry, monthPeriod, yearPeriod);
                return label ? (
                  <span className="chip info">{label}</span>
                ) : (
                  <span className="muted">{tReports("noPeriod")}</span>
                );
              },
            },
          ]}
          rows={filteredEntries}
          rowKey={(entry) => entry.id}
          actions={rowActions}
          actionsLabel={tCommon("actions")}
          actionsPosition="start"
          empty={<div className="muted">{emptyMessage}</div>}
        />
      )}

      <ReportPreviewDialog
        open={previewContext != null}
        title={previewContext?.entry.title ?? ""}
        subtitle={previewPeriodLabel ?? undefined}
        filename={previewContext?.filename ?? ""}
        blobUrl={previewContext?.blobUrl ?? ""}
        base64={previewContext?.base64 ?? ""}
        mimeType={previewContext?.mimeType ?? "application/pdf"}
        financialMonthlyPayload={previewContext?.financialMonthlyPayload}
        concilioF001Payload={previewContext?.concilioF001Payload}
        treasurerName={previewContext?.treasurerName}
        auditLogInteractive={previewContext?.auditLogInteractive}
        churchName={churchName}
        canExport={
          previewContext ? exportableSet.has(previewContext.entry.id) : false
        }
        hasExcel={previewContext?.entry.formats.includes("xlsx") ?? false}
        downloadingExcel={
          previewContext != null &&
          exportingKey === exportKey(previewContext.entry.id, "xlsx")
        }
        onClose={closePreview}
        onDownloadPdf={
          previewContext?.financialMonthlyPayload ||
          previewContext?.concilioF001Payload
            ? () => {
                if (!previewContext) return;
                void handleExport(previewContext.entry.id, "pdf");
              }
            : undefined
        }
        onDownloadExcel={() => {
          if (!previewContext) return;
          void handleExport(previewContext.entry.id, "xlsx");
        }}
        canSubmitToCouncil={
          councilAffiliated &&
          previewContext?.entry.id === "financial-monthly-concilio-f001"
        }
        submittingToCouncil={submittingToCouncil}
        onSubmitToCouncil={handleSubmitToCouncil}
      />
    </div>
  );
}

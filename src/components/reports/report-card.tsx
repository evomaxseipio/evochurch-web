"use client";

import { Icons } from "@/components/icons";
import { CrudSwitch } from "@/components/ui/crud-switch";
import {
  formatLabelForEntry,
  type ReportCatalogEntry,
} from "@/lib/reports/catalog";
import { MEMBER_FILTER_OPTIONS } from "@/lib/reports/member-filters";
import type { MemberFilterKey } from "@/lib/members/types";
import type { MonthPeriod, YearPeriod } from "@/lib/reports/period";
import type { ReportFormat } from "@/lib/reports/types";
import { useTranslations } from "next-intl";

const FORMAT_LABELS: Record<ReportFormat, string> = {
  pdf: "PDF",
  xlsx: "Excel",
};

const MEMBER_FILTERS = MEMBER_FILTER_OPTIONS;

export function ReportCard({
  entry,
  monthPeriod,
  yearPeriod,
  canExport,
  previewLoading,
  exportingKey,
  memberFilter,
  onMemberFilterChange,
  onPreview,
  onExport,
  showTemplateToggle = false,
  templateEnabled = false,
  templateToggleLoading = false,
  onTemplateToggle,
}: {
  entry: ReportCatalogEntry;
  monthPeriod: MonthPeriod;
  yearPeriod: YearPeriod;
  canExport: boolean;
  previewLoading?: boolean;
  exportingKey: string | null;
  memberFilter?: MemberFilterKey;
  onMemberFilterChange?: (filter: MemberFilterKey) => void;
  onPreview: () => void;
  onExport: (
    reportId: ReportCatalogEntry["id"],
    format: ReportFormat,
  ) => void;
  showTemplateToggle?: boolean;
  templateEnabled?: boolean;
  templateToggleLoading?: boolean;
  onTemplateToggle?: (enabled: boolean) => void;
}) {
  const tCommon = useTranslations("common");
  const tReports = useTranslations("reports");
  const periodLabel = formatLabelForEntry(entry, monthPeriod, yearPeriod);
  const showMemberFilter =
    entry.id === "membership-directory" && memberFilter && onMemberFilterChange;
  const busy = previewLoading || exportingKey != null;

  return (
    <article
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        height: "100%",
      }}
    >
      <div>
        <h4
          className="page-title"
          style={{ fontSize: 15, margin: 0, lineHeight: 1.35 }}
        >
          {entry.title}
        </h4>
        <p
          className="page-subtitle"
          style={{ marginTop: 6, marginBottom: 0, fontSize: 13 }}
        >
          {entry.description}
        </p>
      </div>

      <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {periodLabel ? (
          <span className="chip info">{periodLabel}</span>
        ) : (
          <span className="chip">{tReports("noPeriod")}</span>
        )}
        {entry.rolesHint ? (
          <span className="tiny muted">{entry.rolesHint}</span>
        ) : null}
      </div>

      {showTemplateToggle ? (
        <div
          className="row"
          style={{
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
            opacity: templateToggleLoading ? 0.65 : 1,
            pointerEvents: templateToggleLoading ? "none" : "auto",
          }}
        >
          <CrudSwitch
            on={templateEnabled}
            onChange={(enabled) => onTemplateToggle?.(enabled)}
          />
          <span className="tiny" style={{ lineHeight: 1.4 }}>
            {templateToggleLoading
              ? tReports("templateToggleSaving")
              : tReports("templateToggleLabel")}
          </span>
        </div>
      ) : null}

      {showMemberFilter ? (
        <select
          className="select"
          style={{ maxWidth: 220, width: "100%" }}
          value={memberFilter}
          onChange={(e) =>
            onMemberFilterChange(e.target.value as MemberFilterKey)
          }
          aria-label={tReports("memberFilter")}
        >
          {MEMBER_FILTERS.map((key) => (
            <option key={key} value={key}>
              {tReports(`memberFilters.${key}`)}
            </option>
          ))}
        </select>
      ) : null}

      <div
        className="row"
        style={{ gap: 8, marginTop: "auto", flexWrap: "wrap" }}
      >
        <button
          type="button"
          className="btn primary sm"
          disabled={busy && !previewLoading}
          onClick={onPreview}
          aria-busy={previewLoading}
        >
          {previewLoading ? (
            tReports("generating")
          ) : (
            <>
              <Icons.eye size={14} />
              {tCommon("preview")}
            </>
          )}
        </button>
        {entry.formats.map((format) => {
          const key = `${entry.id}:${format}`;
          const loading = exportingKey === key;
          return (
            <button
              key={format}
              type="button"
              className="btn outline sm"
              disabled={!canExport || (exportingKey != null && !loading)}
              onClick={() => onExport(entry.id, format)}
              aria-busy={loading}
            >
              {loading ? (
                tReports("generating")
              ) : (
                <>
                  <Icons.download size={14} />
                  {FORMAT_LABELS[format]}
                </>
              )}
            </button>
          );
        })}
      </div>

      {!canExport ? (
        <p className="tiny muted" style={{ margin: 0 }}>
          {tReports("previewOnly")}
        </p>
      ) : null}
    </article>
  );
}

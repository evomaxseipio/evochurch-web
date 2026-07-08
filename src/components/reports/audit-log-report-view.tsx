"use client";

import { fetchAuditLogPageAction } from "@/app/(app)/reports/audit-log-actions";
import { DateRangeFilter } from "@/components/finance/date-range-filter";
import { FundsKpi } from "@/components/funds/funds-kpi";
import { Icons } from "@/components/icons";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { PaginationBar } from "@/components/ui/pagination-bar";
import type { AuditLogEntry } from "@/lib/audit/types";
import {
  auditActionLabel,
  auditModuleLabel,
  resolveAuditSummary,
} from "@/lib/audit/labels";
import {
  defaultLastSevenDaysRange,
  type DateRange,
} from "@/lib/finance/date-range";
import { FINANCE_PAGE_SIZE_OPTIONS } from "@/lib/finance/pagination";
import type { Locale } from "@/i18n/config";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import "./audit-log-preview.css";

const MODULE_OPTIONS = [
  "members",
  "finances",
  "eventos",
  "settings",
  "admin_users",
  "roles",
] as const;

const ACTION_OPTIONS = [
  "create",
  "update",
  "delete",
  "authorize",
  "reject",
] as const;

const DEFAULT_DATE_RANGE = defaultLastSevenDaysRange();
const KPI_KIND = "elevated" as const;

function formatDateTime(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(locale, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function toApiFrom(date: string): string {
  return `${date}T00:00:00.000Z`;
}

function toApiTo(date: string): string {
  return `${date}T23:59:59.999Z`;
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfWeekIso(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function AuditFilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="row" style={{ gap: 6, alignItems: "center" }}>
      <span className="tiny muted" style={{ fontWeight: 600 }}>
        {label}
      </span>
      <select
        className="select"
        style={{ width: 148, minWidth: 148, padding: "6px 10px", fontSize: 13 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

export function AuditLogReportView({
  churchName,
}: {
  churchName?: string | null;
}) {
  const tAudit = useTranslations("audit");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;

  const [dateRange, setDateRange] = useState<DateRange>(DEFAULT_DATE_RANGE);
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  async function fetchPage(nextPage: number, nextPageSize = pageSize) {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    const result = await fetchAuditLogPageAction({
      from: toApiFrom(dateRange.from),
      to: toApiTo(dateRange.to),
      module: moduleFilter || null,
      action: actionFilter || null,
      search: search.trim() || null,
      limit: nextPageSize,
      offset: (nextPage - 1) * nextPageSize,
    });
    if (requestId !== requestIdRef.current) return;
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      setItems([]);
      setTotal(0);
      return;
    }
    setPage(nextPage);
    setPageSize(nextPageSize);
    setItems(result.items);
    setTotal(result.total);
  }

  useEffect(() => {
    void fetchPage(1);
    // Carga inicial con el rango por defecto de 7 días.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpis = useMemo(() => {
    const todayStart = startOfTodayIso();
    const weekStart = startOfWeekIso();
    const todayCount = items.filter((e) => e.createdAt >= todayStart).length;
    const weekCount = items.filter((e) => e.createdAt >= weekStart).length;
    const moduleCounts = items.reduce<Record<string, number>>((acc, e) => {
      acc[e.module] = (acc[e.module] ?? 0) + 1;
      return acc;
    }, {});
    const topModule = Object.entries(moduleCounts).sort(
      (a, b) => b[1] - a[1],
    )[0];
    return {
      todayCount,
      weekCount,
      topModule: topModule?.[0] ?? null,
    };
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = total === 0 ? 0 : (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + items.length, total);

  const columns = useMemo<DataTableColumn<AuditLogEntry>[]>(
    () => [
      {
        key: "date",
        label: tAudit("columns.date"),
        className: "tiny",
        render: (entry) => formatDateTime(entry.createdAt, locale),
      },
      {
        key: "actor",
        label: tAudit("columns.actor"),
        render: (entry) => entry.actorDisplayName || tAudit("unknownActor"),
      },
      {
        key: "module",
        label: tAudit("columns.module"),
        render: (entry) =>
          auditModuleLabel(entry.module, (key, values) =>
            tAudit(key as "modules.members", values),
          ),
      },
      {
        key: "action",
        label: tAudit("columns.action"),
        render: (entry) =>
          auditActionLabel(entry.action, (key, values) =>
            tAudit(key as "actions.create", values),
          ),
      },
      {
        key: "summary",
        label: tAudit("columns.summary"),
        render: (entry) =>
          resolveAuditSummary(entry, (key, values) =>
            tAudit(key as "actions.create", values),
          ),
      },
    ],
    [locale, tAudit],
  );

  return (
    <div className="audit-log-dash">
      <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow">{tAudit("title")}</div>
          <h2
            className="display"
            style={{ fontSize: 28, margin: "4px 0 6px", letterSpacing: "-0.02em" }}
          >
            {churchName ?? tAudit("subtitle")}
          </h2>
        </div>
      </div>

      <div className="grid-12" style={{ marginTop: 22, marginBottom: 28 }}>
        <div className="span-4">
          <FundsKpi
            kind={KPI_KIND}
            label={tAudit("kpi.today")}
            value={String(kpis.todayCount)}
            icon={<Icons.bell size={16} />}
            tone="d-system"
          />
        </div>
        <div className="span-4">
          <FundsKpi
            kind={KPI_KIND}
            label={tAudit("kpi.thisWeek")}
            value={String(kpis.weekCount)}
            icon={<Icons.cal size={16} />}
            tone="d-funds"
          />
        </div>
        <div className="span-4">
          <FundsKpi
            kind={KPI_KIND}
            label={tAudit("kpi.topModule")}
            value={
              kpis.topModule
                ? auditModuleLabel(kpis.topModule, (key, values) =>
                    tAudit(key as "modules.members", values),
                  )
                : "—"
            }
            icon={<Icons.settings size={16} />}
            tone="d-income"
          />
        </div>
      </div>

      <FilterToolbar
        query={search}
        onQueryChange={setSearch}
        queryPlaceholder={tAudit("filters.searchPlaceholder")}
        maxSearchWidth={340}
        compactSearch
        middle={
          <div
            className="row"
            style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}
          >
            <DateRangeFilter
              value={dateRange}
              onChange={setDateRange}
              defaultRange={DEFAULT_DATE_RANGE}
            />
            <AuditFilterSelect
              label={tAudit("filters.module")}
              value={moduleFilter}
              onChange={setModuleFilter}
            >
              <option value="">{tAudit("filters.all")}</option>
              {MODULE_OPTIONS.map((mod) => (
                <option key={mod} value={mod}>
                  {auditModuleLabel(mod, (key, values) =>
                    tAudit(key as "modules.members", values),
                  )}
                </option>
              ))}
            </AuditFilterSelect>
            <AuditFilterSelect
              label={tAudit("filters.action")}
              value={actionFilter}
              onChange={setActionFilter}
            >
              <option value="">{tAudit("filters.all")}</option>
              {ACTION_OPTIONS.map((act) => (
                <option key={act} value={act}>
                  {auditActionLabel(act, (key, values) =>
                    tAudit(key as "actions.create", values),
                  )}
                </option>
              ))}
            </AuditFilterSelect>
          </div>
        }
        trailing={
          <button
            type="button"
            className="btn primary"
            onClick={() => void fetchPage(1)}
            disabled={loading}
          >
            <Icons.refresh size={14} />
            {tAudit("filters.apply")}
          </button>
        }
      />

      {error ? (
        <p className="tiny" style={{ color: "var(--danger)", margin: "0 0 14px" }}>
          {error}
        </p>
      ) : null}

      <DataTable
        style={{ marginTop: 0, opacity: loading && items.length > 0 ? 0.6 : 1 }}
        columns={columns}
        rows={loading && items.length === 0 ? [] : items}
        rowKey={(entry) => entry.id}
        empty={
          <div className="muted">
            {loading ? tCommon("loading") : tAudit("empty")}
          </div>
        }
      />

      {total > 0 ? (
        <PaginationBar
          page={safePage}
          totalPages={totalPages}
          total={total}
          pageStart={pageStart}
          pageEnd={pageEnd}
          pageSize={pageSize}
          onPage={(next) => void fetchPage(next)}
          onPageSize={(next) => void fetchPage(1, next)}
          sizeOptions={FINANCE_PAGE_SIZE_OPTIONS}
        />
      ) : null}
    </div>
  );
}

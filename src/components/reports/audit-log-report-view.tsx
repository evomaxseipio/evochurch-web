"use client";

import { fetchAuditLogPageAction } from "@/app/(app)/reports/audit-log-actions";
import { Icons } from "@/components/icons";
import type { AuditLogEntry } from "@/lib/audit/types";
import {
  auditActionLabel,
  auditModuleLabel,
  resolveAuditSummary,
} from "@/lib/audit/labels";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/config";
import { useMemo, useState } from "react";

const PAGE_SIZE = 50;

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

function formatDateTime(iso: string, locale: Locale): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(locale, {
    dateStyle: "short",
    timeStyle: "short",
  });
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

export function AuditLogReportView({
  churchName,
}: {
  churchName?: string | null;
}) {
  const tAudit = useTranslations("audit");
  const locale = useLocale() as Locale;

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);

  async function fetchPage(nextPage: number) {
    setLoading(true);
    setError(null);
    const result = await fetchAuditLogPageAction({
      from: from || null,
      to: to || null,
      module: moduleFilter || null,
      action: actionFilter || null,
      search: search.trim() || null,
      limit: PAGE_SIZE,
      offset: nextPage * PAGE_SIZE,
    });
    setLoading(false);
    setLoadedOnce(true);
    if (!result.ok) {
      setError(result.error);
      setItems([]);
      setTotal(0);
      return;
    }
    setPage(nextPage);
    setItems(result.items);
    setTotal(result.total);
  }

  const kpis = useMemo(() => {
    const todayStart = startOfTodayIso();
    const weekStart = startOfWeekIso();
    const todayCount = items.filter((e) => e.createdAt >= todayStart).length;
    const weekCount = items.filter((e) => e.createdAt >= weekStart).length;
    const moduleCounts = items.reduce<Record<string, number>>((acc, e) => {
      acc[e.module] = (acc[e.module] ?? 0) + 1;
      return acc;
    }, {});
    const topModule = Object.entries(moduleCounts).sort((a, b) => b[1] - a[1])[0];
    return {
      todayCount,
      weekCount,
      topModule: topModule?.[0] ?? null,
    };
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="col" style={{ gap: 16 }}>
      <div>
        <div className="eyebrow">{tAudit("title")}</div>
        <div className="display" style={{ fontSize: 22, marginTop: 4 }}>
          {churchName ?? tAudit("subtitle")}
        </div>
      </div>

      <div className="grid-12">
        <div className="card span-4" style={{ padding: 14 }}>
          <div className="tiny muted">{tAudit("kpi.today")}</div>
          <div className="display" style={{ fontSize: 24 }}>{kpis.todayCount}</div>
        </div>
        <div className="card span-4" style={{ padding: 14 }}>
          <div className="tiny muted">{tAudit("kpi.thisWeek")}</div>
          <div className="display" style={{ fontSize: 24 }}>{kpis.weekCount}</div>
        </div>
        <div className="card span-4" style={{ padding: 14 }}>
          <div className="tiny muted">{tAudit("kpi.topModule")}</div>
          <div className="display" style={{ fontSize: 24 }}>
            {kpis.topModule
              ? auditModuleLabel(kpis.topModule, (key, values) =>
                  tAudit(key as "modules.members", values),
                )
              : "—"}
          </div>
        </div>
      </div>

      <div
        className="card row"
        style={{ gap: 10, flexWrap: "wrap", padding: 14, alignItems: "flex-end" }}
      >
        <label className="col" style={{ gap: 4, minWidth: 140 }}>
          <span className="tiny muted">{tAudit("filters.from")}</span>
          <input
            type="date"
            className="input"
            value={from ? from.slice(0, 10) : ""}
            onChange={(e) => {
              setPage(0);
              setFrom(e.target.value ? `${e.target.value}T00:00:00.000Z` : "");
            }}
          />
        </label>
        <label className="col" style={{ gap: 4, minWidth: 140 }}>
          <span className="tiny muted">{tAudit("filters.to")}</span>
          <input
            type="date"
            className="input"
            value={to ? to.slice(0, 10) : ""}
            onChange={(e) => {
              setPage(0);
              setTo(e.target.value ? `${e.target.value}T23:59:59.999Z` : "");
            }}
          />
        </label>
        <label className="col" style={{ gap: 4, minWidth: 140 }}>
          <span className="tiny muted">{tAudit("filters.module")}</span>
          <select
            className="input"
            value={moduleFilter}
            onChange={(e) => {
              setPage(0);
              setModuleFilter(e.target.value);
            }}
          >
            <option value="">{tAudit("filters.all")}</option>
            {MODULE_OPTIONS.map((mod) => (
              <option key={mod} value={mod}>
                {auditModuleLabel(mod, (key, values) =>
                  tAudit(key as "modules.members", values),
                )}
              </option>
            ))}
          </select>
        </label>
        <label className="col" style={{ gap: 4, minWidth: 140 }}>
          <span className="tiny muted">{tAudit("filters.action")}</span>
          <select
            className="input"
            value={actionFilter}
            onChange={(e) => {
              setPage(0);
              setActionFilter(e.target.value);
            }}
          >
            <option value="">{tAudit("filters.all")}</option>
            {ACTION_OPTIONS.map((act) => (
              <option key={act} value={act}>
                {auditActionLabel(act, (key, values) =>
                  tAudit(key as "actions.create", values),
                )}
              </option>
            ))}
          </select>
        </label>
        <label className="col" style={{ gap: 4, flex: 1, minWidth: 180 }}>
          <span className="tiny muted">{tAudit("filters.search")}</span>
          <input
            type="search"
            className="input"
            value={search}
            placeholder={tAudit("filters.searchPlaceholder")}
            onChange={(e) => {
              setPage(0);
              setSearch(e.target.value);
            }}
          />
        </label>
        <button
          type="button"
          className="btn outline sm"
          onClick={() => void fetchPage(0)}
          disabled={loading}
        >
          <Icons.refresh size={14} />
          {tAudit("filters.apply")}
        </button>
      </div>

      {!loadedOnce ? (
        <div className="card" style={{ padding: 24, textAlign: "center" }}>
          <p className="muted" style={{ margin: "0 0 12px" }}>
            {tAudit("filters.applyHint")}
          </p>
          <button
            type="button"
            className="btn primary sm"
            onClick={() => void fetchPage(0)}
            disabled={loading}
          >
            {tAudit("filters.load")}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="tiny" style={{ color: "var(--danger)", margin: 0 }}>
          {error}
        </p>
      ) : null}

      {loadedOnce ? (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>{tAudit("columns.date")}</th>
                  <th>{tAudit("columns.actor")}</th>
                  <th>{tAudit("columns.module")}</th>
                  <th>{tAudit("columns.action")}</th>
                  <th>{tAudit("columns.summary")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="muted" style={{ padding: 24 }}>
                      …
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted" style={{ padding: 24 }}>
                      {tAudit("empty")}
                    </td>
                  </tr>
                ) : (
                  items.map((entry) => (
                    <tr key={entry.id}>
                      <td className="tiny">
                        {formatDateTime(entry.createdAt, locale)}
                      </td>
                      <td>{entry.actorDisplayName || tAudit("unknownActor")}</td>
                      <td>
                        {auditModuleLabel(entry.module, (key, values) =>
                          tAudit(key as "modules.members", values),
                        )}
                      </td>
                      <td>
                        {auditActionLabel(entry.action, (key, values) =>
                          tAudit(key as "actions.create", values),
                        )}
                      </td>
                      <td>
                        {resolveAuditSummary(entry, (key, values) =>
                          tAudit(key as "actions.create", values),
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {loadedOnce ? (
        <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
          <span className="tiny muted">
            {tAudit("pagination.showing", {
              from: total === 0 ? 0 : page * PAGE_SIZE + 1,
              to: Math.min((page + 1) * PAGE_SIZE, total),
              total,
            })}
          </span>
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn outline sm"
              disabled={page <= 0 || loading}
              onClick={() => void fetchPage(page - 1)}
            >
              {tAudit("pagination.prev")}
            </button>
            <span className="tiny muted">
              {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              className="btn outline sm"
              disabled={page >= totalPages - 1 || loading}
              onClick={() => void fetchPage(page + 1)}
            >
              {tAudit("pagination.next")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import "./cead-financial-monthly-preview.css";
import "./tithe-close-preview.css";

import { churchPath } from "@/lib/apps/church-routes";
import Link from "next/link";
import {
  closeTitheWeekAction,
  exportTitheClosePdfAction,
  previewTitheCloseAction,
  seedDefaultTitheTemplateAction,
} from "@/app/apps/church/(console)/reports/tithe-close-actions";
import {
  currentSundayWeek,
  formatWeekLabel,
  shiftSundayWeek,
} from "@/lib/discounts/week-period";
import type { DiscountPeriodRun } from "@/lib/discounts/types";
import { brandLogoForSurface } from "@/lib/brand";
import { downloadBase64File } from "@/lib/reports/download";
import { fmtRD } from "@/lib/format-currency";
import { formatCurrency, formatDateTime } from "@/lib/i18n/format";
import type { Locale } from "@/i18n/config";
import { isLocale } from "@/i18n/config";
import { toast } from "@/lib/toast";
import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

function IconChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-5M12 8h.01" />
    </svg>
  );
}

function IconPdf() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M10 13h4M10 17h4M10 9h1" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

const ALLOC_SWATCH = [
  "tithe-alloc-swatch-0",
  "tithe-alloc-swatch-1",
  "tithe-alloc-swatch-2",
  "tithe-alloc-swatch-3",
] as const;

export function TitheClosePreview({
  locale: localeProp,
  churchName: churchNameProp,
}: {
  locale?: string;
  churchName?: string | null;
}) {
  const t = useTranslations("finances.titheClose");
  const tPreview = useTranslations("reports.preview.titheClose");
  const tCommon = useTranslations("common");
  const localeFromHook = useLocale() as Locale;
  const locale = (isLocale(localeProp) ? localeProp : localeFromHook) as Locale;

  const [periodStart, setPeriodStart] = useState(
    () => currentSundayWeek().periodStart,
  );
  const [run, setRun] = useState<DiscountPeriodRun | null>(null);
  const [noTemplate, setNoTemplate] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [canManageTemplates, setCanManageTemplates] = useState(false);
  const [churchName, setChurchName] = useState(churchNameProp ?? null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"close" | "export" | "seed" | null>(null);

  const loadWeek = useCallback(async (weekStart: string) => {
    setLoading(true);
    try {
      const result = await previewTitheCloseAction(weekStart);
      if (!result.ok) {
        toast.error(result.error);
        setRun(null);
        setNoTemplate(true);
        return;
      }
      setRun(result.run);
      setNoTemplate(result.noTemplate);
      setCanWrite(result.canWrite);
      setCanManageTemplates(result.canManageTemplates);
      setChurchName(result.churchName ?? churchNameProp ?? null);
    } finally {
      setLoading(false);
    }
  }, [churchNameProp]);

  useEffect(() => {
    void loadWeek(periodStart);
  }, [periodStart, loadWeek]);

  const weekLabel = formatWeekLabel(
    periodStart,
    run?.periodEnd ?? periodStart,
    locale,
  );
  const isClosed = run?.status === "closed";
  const logoSrc = brandLogoForSurface("document");
  const churchDisplay = churchName?.trim() || "—";
  const generatedLabel = formatDateTime(new Date().toISOString(), locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  function navigateWeek(weeks: number) {
    const next = shiftSundayWeek(periodStart, weeks);
    setPeriodStart(next.periodStart);
  }

  async function handleSeed() {
    setBusy("seed");
    try {
      const result = await seedDefaultTitheTemplateAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("seedSuccess"));
      await loadWeek(periodStart);
    } finally {
      setBusy(null);
    }
  }

  async function handleClose() {
    if (!window.confirm(t("closeConfirm"))) return;
    setBusy("close");
    try {
      const result = await closeTitheWeekAction(periodStart);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("closeSuccess"));
      await loadWeek(periodStart);
    } finally {
      setBusy(null);
    }
  }

  async function handleExport() {
    setBusy("export");
    try {
      const result = await exportTitheClosePdfAction(periodStart, locale);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      downloadBase64File(result.base64, result.filename, result.mimeType);
      toast.success(t("exportSuccess"));
    } finally {
      setBusy(null);
    }
  }

  const controlsDisabled = loading || busy != null;

  return (
    <div className="cead-dash tithe-close-dash">
      <div className="tithe-toolbar report-preview-chrome">
        <div className="tithe-week-nav">
          <button
            type="button"
            onClick={() => navigateWeek(-1)}
            aria-label={t("prevWeek")}
            disabled={controlsDisabled}
          >
            <IconChevronLeft />
          </button>
          <p className="tithe-week-label">{weekLabel}</p>
          <button
            type="button"
            onClick={() => navigateWeek(1)}
            aria-label={t("nextWeek")}
            disabled={controlsDisabled}
          >
            <IconChevronRight />
          </button>
        </div>

        <div className="tithe-toolbar-actions">
          {run ? (
            <span className={`tithe-status ${isClosed ? "is-closed" : "is-open"}`}>
              {isClosed ? t("statusClosed") : t("statusOpen")}
            </span>
          ) : null}
          <button
            type="button"
            className="tithe-btn tithe-btn-ghost"
            disabled={!run || controlsDisabled}
            onClick={() => void handleExport()}
          >
            <IconPdf />
            {busy === "export" ? tCommon("loading") : t("exportPdf")}
          </button>
          {canWrite && run && !isClosed ? (
            <button
              type="button"
              className="tithe-btn tithe-btn-primary"
              disabled={controlsDisabled}
              onClick={() => void handleClose()}
            >
              <IconLock />
              {busy === "close" ? tCommon("loading") : t("closeWeek")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="cead-page">
        <div className="cead-head">
          <div className="cead-head-left">
            <div className="cead-head-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} alt={churchDisplay} />
            </div>
            <div className="cead-head-copy">
              <h1>{tPreview("title")}</h1>
              <p className="cead-head-subtitle">{churchDisplay}</p>
              <div className="cead-head-meta">
                <span>
                  <IconCalendar />
                  <b>{weekLabel}</b>
                </span>
                <span className="sep">|</span>
                <span>{tPreview("periodHint")}</span>
              </div>
            </div>
          </div>
          <div className="cead-head-info">
            <div>
              <IconCalendar />
              {tPreview("generatedAt")}: <b>{generatedLabel}</b>
            </div>
            <div>
              <IconInfo />
              {tPreview("status")}:{" "}
              <b>
                {run
                  ? isClosed
                    ? t("statusClosed")
                    : t("statusOpen")
                  : "—"}
              </b>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="cead-card tithe-loading">{tCommon("loading")}</div>
        ) : noTemplate || !run ? (
          <div className="cead-card tithe-empty">
            <h3>{tPreview("noTemplateTitle")}</h3>
            <p>{t("noTemplate")}</p>
            {canManageTemplates ? (
              <div className="tithe-empty-actions">
                <button
                  type="button"
                  className="tithe-btn tithe-btn-primary"
                  disabled={busy === "seed"}
                  onClick={() => void handleSeed()}
                >
                  {t("seedDefault")}
                </button>
                <Link
                  href={churchPath("/settings/discount-templates")}
                  className="tithe-btn tithe-btn-ghost"
                >
                  {t("goTemplates")}
                </Link>
              </div>
            ) : (
              <p className="tiny muted" style={{ margin: 0 }}>
                {t("askAdminTemplate")}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="cead-kpis tithe-kpis">
              <div className="cead-kpi">
                <div
                  className="cead-kpi-icon"
                  style={{ background: "var(--cead-green-icon)" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <div className="cead-kpi-body">
                  <p className="cead-kpi-label" style={{ color: "var(--cead-green)" }}>
                    {t("totalTithes")}
                  </p>
                  <p className="cead-kpi-value mono">
                    {formatCurrency(run.baseAmount, locale)}
                  </p>
                </div>
              </div>

              <div className="cead-kpi">
                <div
                  className="cead-kpi-icon"
                  style={{ background: "var(--cead-blue)" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className="cead-kpi-body">
                  <p className="cead-kpi-label" style={{ color: "var(--cead-blue)" }}>
                    {tPreview("kpiContributions")}
                  </p>
                  <p className="cead-kpi-value mono">{run.contributions.length}</p>
                  <p className="cead-kpi-sub">{tPreview("kpiContributionsHint")}</p>
                </div>
              </div>

              <div className="cead-kpi">
                <div
                  className="cead-kpi-icon"
                  style={{
                    background: isClosed
                      ? "var(--cead-green-icon)"
                      : "var(--cead-orange-icon)",
                  }}
                >
                  <IconLock />
                </div>
                <div className="cead-kpi-body">
                  <p
                    className="cead-kpi-label"
                    style={{
                      color: isClosed
                        ? "var(--cead-green)"
                        : "var(--cead-orange)",
                    }}
                  >
                    {tPreview("kpiWeekStatus")}
                  </p>
                  <p className="cead-kpi-value">
                    {isClosed ? t("statusClosed") : t("statusOpen")}
                  </p>
                  <p className="cead-kpi-sub">
                    {isClosed
                      ? tPreview("kpiClosedHint")
                      : tPreview("kpiOpenHint")}
                  </p>
                </div>
              </div>
            </div>

            <div className="tithe-alloc-grid">
              <div className="cead-card">
                <div className="cead-card-head">
                  <div
                    className="sicon"
                    style={{ background: "var(--cead-navy)" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <span style={{ color: "var(--cead-navy)" }}>
                    {tPreview("sectionAllocation")}
                  </span>
                </div>
                <div className="cead-card-body">
                  <div className="tithe-alloc-stack">
                    {run.allocation.map((line, index) => (
                      <div key={line.label} className="tithe-alloc-row">
                        <div className="tithe-alloc-meta">
                          <p className="tithe-alloc-name">{line.label}</p>
                          <p className="tithe-alloc-pct">{line.percent}%</p>
                        </div>
                        <div className="tithe-alloc-bar">
                          <span
                            className={ALLOC_SWATCH[index % ALLOC_SWATCH.length]}
                            style={{
                              width: `${Math.max(0, Math.min(100, line.percent))}%`,
                            }}
                          />
                        </div>
                        <p className="tithe-alloc-amount mono">
                          {fmtRD(line.amount, locale)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="cead-card">
                <div className="cead-card-head">
                  <div
                    className="sicon"
                    style={{ background: "var(--cead-blue)" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                      <path d="M21 12a9 9 0 1 1-6.2-8.6" />
                      <path d="M22 4v6h-6" />
                    </svg>
                  </div>
                  <span style={{ color: "var(--cead-blue)" }}>
                    {tPreview("sectionComposition")}
                  </span>
                </div>
                <div className="tithe-compose">
                  <p className="tithe-compose-title">
                    {tPreview("compositionHint")}
                  </p>
                  <div className="tithe-compose-track" aria-hidden>
                    {run.allocation.map((line, index) => (
                      <div
                        key={line.label}
                        className={`tithe-compose-seg ${ALLOC_SWATCH[index % ALLOC_SWATCH.length]}`}
                        style={{ flex: Math.max(line.percent, 0.01) }}
                        title={`${line.label} ${line.percent}%`}
                      />
                    ))}
                  </div>
                  <ul className="tithe-compose-legend">
                    {run.allocation.map((line, index) => (
                      <li key={line.label}>
                        <i
                          className={ALLOC_SWATCH[index % ALLOC_SWATCH.length]}
                        />
                        {line.label} · {line.percent}%
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="cead-card ledger-card">
              <div className="cead-card-head">
                <div
                  className="sicon"
                  style={{ background: "var(--cead-green-icon)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                  </svg>
                </div>
                <span style={{ color: "var(--cead-green)" }}>
                  {tPreview("sectionContributions")} ({run.contributions.length})
                </span>
              </div>
              <div className="cead-card-body ledger-card-body">
                {run.contributions.length === 0 ? (
                  <p
                    className="muted"
                    style={{ margin: 0, padding: "8px 4px" }}
                  >
                    {t("noContributions")}
                  </p>
                ) : (
                  <>
                    <table className="ledger income">
                      <thead>
                        <tr>
                          <td>{t("date")}</td>
                          <td>{t("member")}</td>
                          <td>{t("fund")}</td>
                          <td>{tPreview("amountRd")}</td>
                        </tr>
                      </thead>
                      <tbody>
                        {run.contributions.map((row) => (
                          <tr key={row.incomeId}>
                            <td>{row.paymentDate}</td>
                            <td>{row.memberName || "—"}</td>
                            <td>{row.fundName || "—"}</td>
                            <td className="mono">{fmtRD(row.amount, locale)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="ledger-total ledger-total-income">
                      <span>{tPreview("totalBase")}</span>
                      <span className="mono">{fmtRD(run.baseAmount, locale)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div
              className={`tithe-note ${isClosed ? "is-closed" : ""}`.trim()}
            >
              <IconInfo />
              <p>
                {isClosed && run.closedAt
                  ? t("closedAt", { date: run.closedAt.slice(0, 10) })
                  : tPreview("openFootnote")}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

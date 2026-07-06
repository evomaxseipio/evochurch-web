"use client";

import { CeadFinancialMonthlyPreview } from "@/components/reports/cead-financial-monthly-preview";
import { ConcilioF001Preview } from "@/components/reports/concilio-f001-preview";
import { AuditLogReportView } from "@/components/reports/audit-log-report-view";
import "./cead-financial-monthly-preview.css";
import "./concilio-f001-preview.css";
import { Icons } from "@/components/icons";
import { downloadBase64File } from "@/lib/reports/download";
import type {
  ConcilioF001ReportPayload,
  FinancialMonthlyPayload,
} from "@/lib/services/reports";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

export function ReportPreviewDialog({
  open,
  title,
  subtitle,
  filename,
  blobUrl,
  base64,
  mimeType,
  canExport,
  hasExcel,
  downloadingExcel,
  financialMonthlyPayload,
  concilioF001Payload,
  treasurerName,
  auditLogInteractive,
  churchName,
  onClose,
  onDownloadPdf,
  onDownloadExcel,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  filename: string;
  blobUrl: string;
  base64: string;
  mimeType: string;
  canExport: boolean;
  hasExcel: boolean;
  downloadingExcel: boolean;
  financialMonthlyPayload?: FinancialMonthlyPayload | null;
  concilioF001Payload?: ConcilioF001ReportPayload | null;
  treasurerName?: string | null;
  auditLogInteractive?: boolean;
  churchName?: string | null;
  onClose: () => void;
  onDownloadPdf?: () => void;
  onDownloadExcel: () => void;
}) {
  const tCommon = useTranslations("common");
  const tReports = useTranslations("reports");
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const isHtmlPreview =
    financialMonthlyPayload != null ||
    concilioF001Payload != null ||
    auditLogInteractive === true;

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function handlePrint() {
    if (isHtmlPreview) {
      window.print();
      return;
    }
    iframeRef.current?.contentWindow?.print();
  }

  function handleDownloadPdf() {
    if (onDownloadPdf) {
      onDownloadPdf();
      return;
    }
    downloadBase64File(base64, filename, mimeType);
  }

  return (
    <>
      <div
        className="drawer-backdrop report-preview-chrome"
        style={{ zIndex: 60 }}
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-labelledby="report-preview-title"
        className="report-preview-shell"
        style={{
          position: "fixed",
          inset: "4vh 3vw",
          zIndex: 61,
          background: "var(--bg-1)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-3)",
        }}
      >
        <div
          className="row between report-preview-chrome"
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--line)",
            gap: 12,
            flexShrink: 0,
            background: "var(--bg-1)",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow">{tCommon("preview")}</div>
            <h3
              id="report-preview-title"
              style={{ margin: "4px 0 0", fontSize: 18 }}
            >
              {title}
            </h3>
            {subtitle ? (
              <p className="tiny muted" style={{ margin: "4px 0 0" }}>
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="btn ghost icon-only"
            onClick={onClose}
            aria-label={tReports("closePreview")}
          >
            <Icons.x size={18} />
          </button>
        </div>

        <div
          className="report-preview-body"
          style={{
            flex: 1,
            minHeight: 0,
            padding: isHtmlPreview ? "24px 16px" : 16,
            background: isHtmlPreview ? "#f3f5f8" : "var(--surface-2)",
            overflow: isHtmlPreview ? "auto" : undefined,
          }}
        >
          {isHtmlPreview ? (
            <div className="cead-dash-wrap">
              {auditLogInteractive ? (
                <AuditLogReportView churchName={churchName} />
              ) : concilioF001Payload ? (
                <ConcilioF001Preview
                  payload={concilioF001Payload}
                  treasurerName={treasurerName}
                  printRef={printRef}
                />
              ) : financialMonthlyPayload ? (
                <CeadFinancialMonthlyPreview
                  payload={financialMonthlyPayload}
                  treasurerName={treasurerName}
                  printRef={printRef}
                />
              ) : null}
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              title={`${tCommon("preview")}: ${title}`}
              src={blobUrl}
              style={{
                width: "100%",
                height: "100%",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-md)",
                background: "#fff",
              }}
            />
          )}
        </div>

        <div
          className="report-preview-chrome"
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--line)",
            flexShrink: 0,
            background: "var(--bg-1)",
          }}
        >
          <div
            className="row"
            style={{
              gap: 8,
              flexWrap: "wrap",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            {!canExport ? (
              <span
                className="tiny muted"
                style={{ marginRight: "auto", alignSelf: "center" }}
              >
                {tReports("previewOnlyShort")}
              </span>
            ) : null}
            <button type="button" className="btn outline" onClick={handlePrint}>
              <Icons.print size={14} />
              {tCommon("print")}
            </button>
            {canExport ? (
              <>
                <button type="button" className="btn outline" onClick={handleDownloadPdf}>
                  <Icons.filePdf size={14} />
                  {tReports("preview.ceadMonthly.downloadPdf")}
                </button>
                {hasExcel ? (
                  <button
                    type="button"
                    className="btn outline"
                    disabled={downloadingExcel}
                    onClick={onDownloadExcel}
                  >
                    {downloadingExcel ? (
                      tReports("generating")
                    ) : (
                      <>
                        <Icons.fileSpreadsheet size={14} />
                        {tReports("preview.ceadMonthly.downloadExcel")}
                      </>
                    )}
                  </button>
                ) : null}
              </>
            ) : null}
            <button type="button" className="btn outline" onClick={onClose}>
              <Icons.x size={14} />
              {tCommon("close")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import { resolveDashboardKpiLabels } from "@/lib/dashboard/resolve-kpi";
import {
  loginDashboardPreview,
  loginDashboardPreviewEvents,
} from "@/lib/mock/login-dashboard-preview";
import esMessages from "@/i18n/messages/es.json";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { useLayoutEffect, useRef, useState } from "react";

const PREVIEW_DESIGN_WIDTH = 1024;

function computePreviewLayout(
  shellWidth: number,
  shellHeight: number,
  naturalHeight: number,
): PreviewLayout {
  if (shellWidth <= 0 || shellHeight <= 0 || naturalHeight <= 0) {
    return { scale: 0.5, width: 0, height: 0 };
  }

  const inset = 8;
  const maxW = shellWidth - inset;
  const maxH = shellHeight - inset;

  const scale = Math.min(maxW / PREVIEW_DESIGN_WIDTH, maxH / naturalHeight, 1);
  const width = Math.min(Math.ceil(PREVIEW_DESIGN_WIDTH * scale), maxW);
  const height = Math.min(Math.ceil(naturalHeight * scale), maxH);

  return {
    scale: Number(scale.toFixed(4)),
    width,
    height,
  };
}

function LoginDashboardPreviewContent() {
  const t = useTranslations("dashboard");
  const kpis = resolveDashboardKpiLabels(
    loginDashboardPreview.kpis,
    (key, values) => t(key as "kpiTotalMembers", values),
    "es",
  );

  return (
    <DashboardView
      pastorName={loginDashboardPreview.pastorName}
      churchName={loginDashboardPreview.churchName}
      hero={loginDashboardPreview.hero}
      kpis={kpis}
      contributionCharts={loginDashboardPreview.contributionCharts}
      ledgerCharts={loginDashboardPreview.ledgerCharts}
      contributionPeriodTotals={loginDashboardPreview.contributionPeriodTotals}
      pendingItems={loginDashboardPreview.pendingItems}
      recentAudit={loginDashboardPreview.recentAudit}
      canViewAuditLog
      events={loginDashboardPreviewEvents}
    />
  );
}

type PreviewLayout = {
  scale: number;
  width: number;
  height: number;
};

export function LoginPreview() {
  const shellRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<PreviewLayout>({
    scale: 0.5,
    width: 0,
    height: 0,
  });
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    const content = contentRef.current;
    if (!shell || !content) return;

    const updateLayout = () => {
      const shellWidth = shell.clientWidth;
      const shellHeight = shell.clientHeight;
      if (shellWidth <= 0 || shellHeight <= 0) return;

      const naturalHeight = content.scrollHeight;
      const next = computePreviewLayout(shellWidth, shellHeight, naturalHeight);
      if (next.width <= 0 || next.height <= 0) return;

      setLayout((prev) =>
        prev.scale === next.scale &&
        prev.width === next.width &&
        prev.height === next.height
          ? prev
          : next,
      );
      setReady(true);
    };

    updateLayout();

    const shellObserver = new ResizeObserver(updateLayout);
    const contentObserver = new ResizeObserver(updateLayout);
    shellObserver.observe(shell);
    contentObserver.observe(content);
    window.addEventListener("resize", updateLayout);

    return () => {
      shellObserver.disconnect();
      contentObserver.disconnect();
      window.removeEventListener("resize", updateLayout);
    };
  }, []);

  return (
    <div className="login-preview" aria-hidden>
      <div className="login-preview-shell" ref={shellRef}>
        <div
          className="login-preview-viewport"
          style={{
            width: layout.width || undefined,
            height: layout.height || undefined,
            opacity: ready ? 1 : 0,
          }}
        >
          <div
            ref={contentRef}
            className="login-preview-scale"
            style={{
              width: PREVIEW_DESIGN_WIDTH,
              transform: `scale(${layout.scale})`,
            }}
          >
            <NextIntlClientProvider locale="es" messages={esMessages}>
              <LoginDashboardPreviewContent />
            </NextIntlClientProvider>
          </div>
        </div>
      </div>
    </div>
  );
}

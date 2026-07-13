"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { backofficePath } from "@/lib/apps/backoffice-routes";
import { MockDataHint } from "@/features/organizations/components/organization-commercial-ui";
import {
  SALES_HUB_DASHBOARD_STATS,
  SALES_HUB_PIPELINE_SUMMARY,
  SALES_HUB_RECENT_ORGS,
  SALES_HUB_UPCOMING_ACTIVITIES,
} from "../mocks/sales-hub.mock";

const STAT_TONE_CLASS: Record<string, string> = {
  sales: "bo-stat-value sales",
  warn: "bo-stat-value warn",
  info: "bo-stat-value info",
  ok: "bo-stat-value ok",
};

const ACTIVITY_TONE_STYLE: Record<string, { bg: string; color: string }> = {
  info: { bg: "color-mix(in oklab, var(--info) 20%, transparent)", color: "var(--info)" },
  warn: { bg: "color-mix(in oklab, var(--warn) 20%, transparent)", color: "var(--warn)" },
  ok: { bg: "color-mix(in oklab, var(--ok) 20%, transparent)", color: "var(--ok)" },
};

function formatDashboardDate() {
  return new Date().toLocaleDateString("es-DO", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function SalesDashboardView() {
  const dateLabel = formatDashboardDate();

  return (
    <>
      <div className="bo-page-header">
        <div>
          <div className="row gap-sm" style={{ alignItems: "center", flexWrap: "wrap" }}>
            <h1 className="page-title">Dashboard</h1>
            <MockDataHint />
          </div>
          <p className="page-subtitle" style={{ textTransform: "capitalize" }}>
            Resumen comercial · {dateLabel}
          </p>
        </div>
        <Link href={backofficePath("organizations")} className="btn primary">
          <Plus size={16} />
          Nueva organización
        </Link>
      </div>

      <div className="bo-stats-grid">
        {SALES_HUB_DASHBOARD_STATS.map((stat) => (
          <div key={stat.label} className="bo-stat-card">
            <div className="label">{stat.label}</div>
            <div className={STAT_TONE_CLASS[stat.tone]}>{stat.value}</div>
            <div className="hint">{stat.hint}</div>
          </div>
        ))}
      </div>

      <div className="bo-grid-2">
        <div className="card">
          <div className="bo-card-title">Pipeline resumido</div>
          {SALES_HUB_PIPELINE_SUMMARY.map((bar) => (
            <div key={bar.stage} className="bo-pipeline-bar">
              <div className="row" style={{ justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: "var(--fg-dim)" }}>{bar.label}</span>
                <span style={{ color: "var(--muted)", fontWeight: 600 }}>{bar.count}</span>
              </div>
              <div className="bo-bar-track">
                <div
                  className="bo-bar-fill"
                  style={{ width: `${bar.widthPct}%`, background: bar.color }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <div className="bo-card-title" style={{ marginBottom: 0 }}>
              Próximas actividades
            </div>
            <Link
              href={backofficePath("agenda")}
              style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}
            >
              Ver agenda
            </Link>
          </div>
          {SALES_HUB_UPCOMING_ACTIVITIES.map((item) => {
            const tone = ACTIVITY_TONE_STYLE[item.tone];
            return (
              <div key={item.id} className="bo-activity-item">
                <div className="activity-time">{item.time}</div>
                <div
                  className="bo-activity-icon"
                  style={{ background: tone.bg, color: tone.color }}
                >
                  {item.emoji}
                </div>
                <div className="activity-body">
                  <div className="title">{item.title}</div>
                  <div className="sub">{item.owner}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="bo-card-title">Organizaciones recientes</div>
        <div className="table-wrap" style={{ border: "none" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Organización</th>
                <th>Etapa</th>
                <th>Próxima acción</th>
                <th>Responsable</th>
              </tr>
            </thead>
            <tbody>
              {SALES_HUB_RECENT_ORGS.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="bo-cell-main">{row.name}</div>
                    <div className="bo-cell-sub">{row.subtitle}</div>
                  </td>
                  <td>
                    <span className={`chip ${row.pipelineChip}`}>
                      <span className="pip" />
                      {row.pipelineLabel}
                    </span>
                  </td>
                  <td>
                    <div className="bo-cell-main">{row.nextAction}</div>
                    <div
                      className={`bo-cell-sub${row.nextActionOverdue ? " bo-overdue" : ""}`}
                    >
                      {row.nextActionSub}
                    </div>
                  </td>
                  <td>{row.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import { MockDataHint } from "@/features/organizations/components/organization-commercial-ui";
import { SALES_HUB_AGENDA } from "../mocks/sales-hub.mock";

type AgendaFilter = "today" | "week" | "all";

const TONE_STYLE: Record<string, { bg: string; color: string }> = {
  info: { bg: "color-mix(in oklab, var(--info) 20%, transparent)", color: "var(--info)" },
  warn: { bg: "color-mix(in oklab, var(--warn) 20%, transparent)", color: "var(--warn)" },
  ok: { bg: "color-mix(in oklab, var(--ok) 20%, transparent)", color: "var(--ok)" },
};

export function SalesAgendaView() {
  const [filter, setFilter] = useState<AgendaFilter>("today");

  const groups =
    filter === "today"
      ? SALES_HUB_AGENDA.slice(0, 1)
      : filter === "week"
        ? SALES_HUB_AGENDA.slice(0, 2)
        : SALES_HUB_AGENDA;

  return (
    <>
      <div className="bo-page-header">
        <div>
          <div className="row gap-sm" style={{ alignItems: "center", flexWrap: "wrap" }}>
            <h1 className="page-title">Agenda</h1>
            <MockDataHint />
          </div>
          <p className="page-subtitle">Actividades programadas</p>
        </div>
        <div className="row gap-sm">
          {(
            [
              { id: "today" as const, label: "Hoy" },
              { id: "week" as const, label: "Semana" },
              { id: "all" as const, label: "Todas" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              className={`btn outline sm${filter === item.id ? " active-filter" : ""}`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.id} className="bo-agenda-group">
          <div className="bo-agenda-group-head">{group.label}</div>
          {group.items.map((item) => {
            const tone = TONE_STYLE[item.tone];
            return (
              <div
                key={item.id}
                className={`bo-agenda-row${item.overdue ? " overdue" : ""}`}
              >
                <div className="agenda-time">{item.time}</div>
                <div
                  className="bo-activity-icon sm"
                  style={{ background: tone.bg, color: tone.color }}
                >
                  {item.emoji}
                </div>
                <div>
                  <div className="agenda-org">{item.org}</div>
                  <div className="agenda-type">{item.type}</div>
                </div>
                <div className="agenda-owner">
                  <span className="mini-avatar">{item.ownerInitials}</span>
                  {item.owner}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}

"use client";

import { Search } from "lucide-react";
import { MockDataHint } from "@/features/organizations/components/organization-commercial-ui";
import { SALES_HUB_KANBAN } from "../mocks/sales-hub.mock";

export function SalesPipelineView() {
  return (
    <>
      <div className="bo-page-header">
        <div>
          <div className="row gap-sm" style={{ alignItems: "center", flexWrap: "wrap" }}>
            <h1 className="page-title">Pipeline</h1>
            <MockDataHint />
          </div>
          <p className="page-subtitle">Arrastra tarjetas para cambiar etapa</p>
        </div>
        <div className="row gap-sm">
          <select className="bo-filter-select" defaultValue="all" aria-label="Responsable">
            <option value="all">Responsable: Todos</option>
            <option>María López</option>
            <option>Carlos R.</option>
          </select>
          <div className="bo-search-input" style={{ maxWidth: 200, flex: "none" }}>
            <Search size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />
            <input placeholder="Buscar..." aria-label="Buscar en pipeline" />
          </div>
        </div>
      </div>

      <div className="bo-kanban">
        {SALES_HUB_KANBAN.map((col) => (
          <div
            key={col.stage}
            className={`bo-kanban-col${col.lost ? " lost" : ""}`}
          >
            <div className="bo-kanban-col-head">
              {col.label}
              <span className="count">{col.count}</span>
            </div>
            <div className="bo-kanban-cards">
              {col.cards.map((card) => (
                <div key={card.id} className="bo-kanban-card">
                  <div className="org">{card.org}</div>
                  <div className="contact">{card.contact}</div>
                  <div className="action">{card.action}</div>
                  <div className="foot">
                    <span className={`chip ${card.priorityChip}`}>
                      {card.priorityLabel !== "—" ? (
                        <span className="pip" />
                      ) : null}
                      {card.priorityLabel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

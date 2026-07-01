"use client";

import {
  deleteFundAction,
  setPrimaryFundAction,
  type FundActionResult,
} from "@/app/(app)/finances/funds/actions";
import { FundCard } from "@/components/funds/fund-card";
import { FundFormDrawer } from "@/components/funds/fund-form-drawer";
import { FundsKpi } from "@/components/funds/funds-kpi";
import { FundsSummary } from "@/components/funds/funds-summary";
import {
  FundActionMenu,
  FundStatusChip,
  PrimaryBadge,
} from "@/components/funds/fund-ui";
import { Icons } from "@/components/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { useActionToast } from "@/hooks/use-action-toast";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { formatFundDate, fundProgressPct, sortFunds } from "@/lib/funds/parse";
import type {
  Fund,
  FundStatusFilter,
  FundViewMode,
  FundsListStats,
} from "@/lib/funds/types";
import { fmtRD, fmtRDshort } from "@/lib/format-currency";
import { toast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  startTransition,
} from "react";

const PAGE_SIZE_OPTIONS = [10, 15, 25, 50] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

const STATUS_FILTERS: { key: FundStatusFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "active", label: "Activos" },
  { key: "inactive", label: "Inactivos" },
];

const KPI_KIND = "elevated" as const;

const RECAUDADO_SPARK = [1.8, 1.9, 2.1, 2.0, 2.2, 2.3, 2.38].map(
  (v) => v * 1_000_000,
);

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function currentMonthYearLabel() {
  const now = new Date();
  return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
}

function currentExportPeriodLabel() {
  const now = new Date();
  return `Fondos_${MONTH_NAMES[now.getMonth()]}${now.getFullYear()}`;
}

const deleteInitial: FundActionResult | null = null;
const primaryInitial: FundActionResult | null = null;

export function FundsListView({
  funds,
  stats,
}: {
  funds: Fund[];
  stats: FundsListStats;
}) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FundStatusFilter>("all");
  const [view, setView] = useState<FundViewMode>("grid");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [formState, setFormState] = useState<{
    mode: "new" | "edit";
    fund: Fund | null;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Fund | null>(null);

  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteFundAction,
    deleteInitial,
  );
  const [primaryState, primaryAction, primaryPending] = useActionState(
    setPrimaryFundAction,
    primaryInitial,
  );

  useActionToast(deleteState, {
    successMessage: "Fondo eliminado.",
    onSuccess: () => setDeleteTarget(null),
  });

  useActionToast(primaryState, {
    successMessage: "Fondo primario actualizado.",
    onSuccess: () => router.refresh(),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = funds.filter((f) => {
      if (statusFilter === "active" && !f.isActive) return false;
      if (statusFilter === "inactive" && f.isActive) return false;
      if (q && !f.name.toLowerCase().includes(q)) return false;
      return true;
    });
    return sortFunds(rows);
  }, [funds, query, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, pageSize, view]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, total);
  const pageRows = filtered.slice(pageStart, pageEnd);

  const listView = isDesktop ? view : "grid";

  function fundUrl(path: string, fundId: string) {
    return `${path}?fund=${encodeURIComponent(fundId)}`;
  }

  function menuProps(f: Fund) {
    return {
      fund: f,
      onEdit: () => setFormState({ mode: "edit", fund: f }),
      onAddTx: () => {
        router.push(fundUrl("/finances/transactions", f.fundId));
        toast.info("Nueva transacción", f.name);
      },
      onMakePrimary: () => {
        const fd = new FormData();
        fd.set("fundId", f.fundId);
        startTransition(() => primaryAction(fd));
      },
      onViewTx: () => router.push(fundUrl("/finances/transactions", f.fundId)),
      onViewContrib: () =>
        router.push(fundUrl("/finances/contributions", f.fundId)),
      onDelete: () => setDeleteTarget(f),
    };
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const fd = new FormData();
    fd.set("fundId", deleteTarget.fundId);
    startTransition(() => deleteAction(fd));
  }

  const exportLabel = currentExportPeriodLabel();
  const monthYearLabel = currentMonthYearLabel();

  return (
    <div>
      <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow">Mayordomía · Finanzas</div>
          <h1
            className="display"
            style={{
              fontSize: 40,
              margin: "4px 0 6px",
              letterSpacing: "-0.025em",
            }}
          >
            Fondos{" "}
            <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>
              · {monthYearLabel}
            </span>
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            Cuentas y metas de recaudación de la congregación.
          </p>
        </div>
        <div className="row">
          <button
            type="button"
            className="btn outline"
            onClick={() =>
              toast.success("Reporte generado", `${exportLabel}.pdf descargado`)
            }
          >
            <Icons.download size={16} /> PDF
          </button>
          <button
            type="button"
            className="btn outline"
            onClick={() =>
              toast.success("Reporte generado", `${exportLabel}.xlsx descargado`)
            }
          >
            <Icons.download size={16} /> Excel
          </button>
        </div>
      </div>

      <div className="grid-12" style={{ marginTop: 22 }}>
        <div className="span-3">
          <FundsKpi
            kind={KPI_KIND}
            label="Total de fondos"
            value={String(stats.total)}
            icon={<Icons.wallet size={16} />}
            accent="var(--d-funds)"
          />
        </div>
        <div className="span-3">
          <FundsKpi
            kind={KPI_KIND}
            label="Fondos activos"
            value={`${stats.active} de ${stats.total}`}
            icon={<Icons.check size={16} />}
            accent="var(--success)"
            delta={`${stats.active}/${stats.total}`}
            deltaDir="up"
          />
        </div>
        <div className="span-3">
          <FundsKpi
            kind={KPI_KIND}
            feature={false}
            label="Total recaudado"
            value={fmtRDshort(stats.totalRaised)}
            icon={<Icons.trendUp size={16} />}
            accent="var(--accent)"
            delta="+12.4%"
            deltaDir="up"
            spark={RECAUDADO_SPARK}
          />
        </div>
        <div className="span-3">
          <FundsKpi
            kind={KPI_KIND}
            label="Avance global"
            value={`${stats.goalProgress.toFixed(1)}%`}
            icon={<Icons.target size={16} />}
            accent="var(--accent)"
            delta="+5.2%"
            deltaDir="up"
          />
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <FundsSummary funds={funds} />

        <FilterToolbar
          query={query}
          onQueryChange={setQuery}
          queryPlaceholder="Buscar fondo…"
          maxSearchWidth={9999}
          filters={STATUS_FILTERS}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
          trailing={
            <>
              {isDesktop ? (
                <div
                  className="row"
                  style={{
                    gap: 4,
                    padding: 4,
                    background: "var(--surface-2)",
                    borderRadius: 10,
                  }}
                >
                  {(["grid", "list"] as FundViewMode[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setView(v)}
                      className="btn sm icon-only"
                      title={v === "grid" ? "Cuadrícula" : "Lista"}
                      style={{
                        background:
                          view === v ? "var(--surface)" : "transparent",
                        color: view === v ? "var(--accent)" : "var(--ink-3)",
                        boxShadow: view === v ? "var(--shadow-1)" : "none",
                        padding: 7,
                      }}
                    >
                      {v === "grid" ? (
                        <Icons.grid size={16} />
                      ) : (
                        <Icons.list size={16} />
                      )}
                    </button>
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                className="btn primary"
                onClick={() => setFormState({ mode: "new", fund: null })}
              >
                <Icons.plus size={14} /> Nuevo fondo
              </button>
            </>
          }
        />

        {listView === "grid" ? (
          <div className="grid-12">
            {pageRows.map((f) => (
              <FundCard key={f.fundId} {...menuProps(f)} />
            ))}
            {total === 0 && (
              <div
                className="card span-12"
                style={{ padding: 40, textAlign: "center" }}
              >
                <div className="muted">
                  No hay fondos que coincidan con los filtros.
                </div>
              </div>
            )}
          </div>
        ) : (
          <DataTable
            style={{ marginTop: 18, position: "relative" }}
            columns={[
              {
                key: "name",
                label: "Nombre",
                render: (f) => (
                  <div
                    className="row"
                    style={{ gap: 8, alignItems: "center" }}
                  >
                    <span style={{ fontWeight: 500 }}>{f.name}</span>
                    {f.isPrimary ? <PrimaryBadge /> : null}
                  </div>
                ),
              },
              {
                key: "status",
                label: "Estado",
                render: (f) => <FundStatusChip active={f.isActive} />,
              },
              {
                key: "raised",
                label: "Recaudado",
                align: "right",
                className: "tnum mono",
                render: (f) => (
                  <span style={{ fontWeight: 600 }}>
                    {fmtRD(f.totalContributions)}
                  </span>
                ),
              },
              {
                key: "goal",
                label: "Meta",
                align: "right",
                className: "tnum mono muted",
                render: (f) => fmtRD(f.targetAmount),
              },
              {
                key: "progress",
                label: "% avance",
                align: "right",
                render: (f) => {
                  const pct = fundProgressPct(f);
                  return (
                    <div
                      className="row"
                      style={{
                        gap: 8,
                        justifyContent: "flex-end",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 64,
                          height: 6,
                          background: "var(--surface-2)",
                          borderRadius: 999,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            borderRadius: 999,
                            background:
                              pct >= 100 ? "var(--success)" : "var(--accent)",
                          }}
                        />
                      </div>
                      <span
                        className="tnum mono"
                        style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          minWidth: 44,
                          color:
                            pct >= 100 ? "var(--success)" : "var(--accent)",
                        }}
                      >
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  );
                },
              },
              {
                key: "start",
                label: "Activo desde",
                className: "muted tnum",
                render: (f) => formatFundDate(f.startDate),
              },
            ]}
            rows={pageRows}
            rowKey={(f) => f.fundId}
            actions={(f) => <FundActionMenu {...menuProps(f)} />}
            empty={
              <div className="muted">
                No hay fondos que coincidan con los filtros.
              </div>
            }
          />
        )}

        {total > 0 && (
          <PaginationBar
            page={safePage}
            totalPages={totalPages}
            total={total}
            pageStart={pageStart}
            pageEnd={pageEnd}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={(s) => setPageSize(s as PageSize)}
            noun="fondos"
            sizeOptions={PAGE_SIZE_OPTIONS}
          />
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="¿Eliminar fondo?"
          message="Se quitará de la lista. Esta acción no se puede deshacer."
          itemName={deleteTarget.name}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
          pending={deletePending || primaryPending}
        />
      )}

      <FundFormDrawer
        mode={formState?.mode ?? "new"}
        fund={formState?.fund ?? null}
        open={formState !== null}
        onClose={() => setFormState(null)}
      />
    </div>
  );
}

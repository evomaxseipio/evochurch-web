"use client";

import {
  deleteContributionAction,
  type ContributionActionResult,
} from "@/app/(app)/finances/contributions/actions";
import { ContributionActionMenu } from "@/components/contributions/contribution-action-menu";
import { ContributionCard } from "@/components/contributions/contribution-card";
import { ContributionFormDrawer } from "@/components/contributions/contribution-form-drawer";
import { ContributorCell } from "@/components/contributions/contribution-ui";
import { ContributionsKpi } from "@/components/contributions/contributions-kpi";
import {
  MonthPeriodFilter,
  monthPeriodExportLabel,
} from "@/components/finance/month-period-filter";
import { FinPageHeader } from "@/components/finances/fin-page-header";
import { Icons } from "@/components/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { useActionToast } from "@/hooks/use-action-toast";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import {
  categoryChipClass,
  computeContributionsStats,
  formatContributionDateShort,
  paymentMethodLabel,
} from "@/lib/contributions/parse";
import type {
  Contribution,
  ContributionCategoryFilter,
  IncomeType,
} from "@/lib/contributions/types";
import type { Fund } from "@/lib/funds/types";
import { fmtRD } from "@/lib/format-currency";
import { isDateInMonth, type YearMonth } from "@/lib/finance/month-period";
import { toast } from "@/lib/toast";
import Link from "next/link";
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

const CATEGORY_FILTERS: { key: ContributionCategoryFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "tithe", label: "Diezmos" },
  { key: "offering", label: "Ofrendas" },
  { key: "donation", label: "Donaciones" },
];

const deleteInitial: ContributionActionResult | null = null;

export function ContributionsListView({
  entries,
  funds,
  incomeTypes,
  fundFilterId,
  fundFilterName,
}: {
  entries: Contribution[];
  funds: Fund[];
  incomeTypes: IncomeType[];
  fundFilterId?: string | null;
  fundFilterName?: string | null;
}) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [period, setPeriod] = useState<YearMonth | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<ContributionCategoryFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [formState, setFormState] = useState<{
    mode: "new" | "edit";
    entry: Contribution | null;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contribution | null>(null);

  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteContributionAction,
    deleteInitial,
  );

  useActionToast(deleteState, {
    successMessage: "Ingreso eliminado.",
    onSuccess: () => {
      setDeleteTarget(null);
      router.refresh();
    },
  });

  const scopedEntries = useMemo(() => {
    if (!period) return entries;
    return entries.filter((e) => isDateInMonth(e.paymentDate, period));
  }, [entries, period]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scopedEntries.filter((e) => {
      if (categoryFilter !== "all" && e.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return [e.contributorLabel, e.fundName, e.typeName, e.paymentMethod]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [scopedEntries, query, categoryFilter]);

  const periodStats = useMemo(
    () => computeContributionsStats(scopedEntries),
    [scopedEntries],
  );

  useEffect(() => {
    setPage(1);
  }, [query, categoryFilter, period, pageSize]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, total);
  const pageRows = filtered.slice(pageStart, pageEnd);

  const exportBase = `Contribuciones_${monthPeriodExportLabel(period)}`;

  function openNew() {
    setFormState({ mode: "new", entry: null });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const fd = new FormData();
    fd.set("incomeId", deleteTarget.incomeId);
    startTransition(() => deleteAction(fd));
  }

  const columns = useMemo(
    () => [
      {
        key: "type",
        label: "Tipo",
        render: (c: Contribution) => (
          <span className={`chip ${categoryChipClass(c.category)}`}>
            <span className="pip" /> {c.typeName}
          </span>
        ),
      },
      {
        key: "fund",
        label: "Fondo",
        render: (c: Contribution) => <span className="chip">{c.fundName}</span>,
      },
      {
        key: "contributor",
        label: "Contribuyente",
        render: (c: Contribution) => <ContributorCell entry={c} />,
      },
      {
        key: "amount",
        label: "Monto",
        align: "right" as const,
        className: "tnum mono",
        render: (c: Contribution) => (
          <span style={{ fontWeight: 600, color: "var(--success)" }}>
            +{fmtRD(c.amount)}
          </span>
        ),
      },
      {
        key: "date",
        label: "Fecha",
        className: "muted",
        render: (c: Contribution) => formatContributionDateShort(c.paymentDate),
      },
      {
        key: "method",
        label: "Método de pago",
        className: "muted",
        render: (c: Contribution) => paymentMethodLabel(c.paymentMethod),
      },
      {
        key: "mode",
        label: "Modo",
        render: (c: Contribution) => (
          <span className="tiny muted" style={{ fontWeight: 600 }}>
            {c.collectionMode === "collective" ? "Colectivo" : "Individual"}
          </span>
        ),
      },
    ],
    [],
  );

  const emptyMessage =
    entries.length === 0
      ? "No hay ingresos registrados."
      : "No hay ingresos que coincidan con los filtros.";

  return (
    <div>
      <FinPageHeader
        eyebrow="Mayordomía · Finanzas"
        title={
          fundFilterName ? `Contribuciones — ${fundFilterName}` : "Contribuciones"
        }
        subtitle="Diezmos, ofrendas y donaciones registradas en la congregación."
        onExportPdf={() =>
          toast.success("Reporte generado", `${exportBase}.pdf descargado`)
        }
        onExportExcel={() =>
          toast.success("Reporte generado", `${exportBase}.xlsx descargado`)
        }
      />

      {fundFilterId ? (
        <Link
          href="/finances/contributions"
          className="tiny"
          style={{
            display: "inline-flex",
            marginTop: 8,
            color: "var(--accent)",
            fontWeight: 600,
          }}
        >
          Ver todas las contribuciones
        </Link>
      ) : null}

      <ContributionsKpi stats={periodStats} />

      <FilterToolbar
        style={{ marginTop: 0 }}
        query={query}
        onQueryChange={setQuery}
        queryPlaceholder="Buscar por contribuyente, fondo, método…"
        maxSearchWidth={9999}
        filters={CATEGORY_FILTERS}
        activeFilter={categoryFilter}
        onFilterChange={setCategoryFilter}
        middle={
          <MonthPeriodFilter value={period} onChange={setPeriod} />
        }
        trailing={
          isDesktop ? (
            <button type="button" className="btn primary" onClick={openNew}>
              <Icons.plus size={14} /> Agregar ingreso
            </button>
          ) : null
        }
      />

      {isDesktop ? (
        <DataTable
          style={{ marginTop: 0 }}
          columns={columns}
          rows={pageRows}
          rowKey={(c) => c.incomeId}
          actionsPosition="start"
          actionsLabel="Acciones"
          actions={(c) => (
            <ContributionActionMenu
              onEdit={() => setFormState({ mode: "edit", entry: c })}
              onDelete={() => setDeleteTarget(c)}
            />
          )}
          empty={<div className="muted">{emptyMessage}</div>}
        />
      ) : (
        <div className="col" style={{ gap: 10 }}>
          {pageRows.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              <div className="muted">{emptyMessage}</div>
              {entries.length === 0 ? (
                <button
                  type="button"
                  className="btn primary"
                  style={{ marginTop: 16 }}
                  onClick={openNew}
                >
                  <Icons.plus size={14} /> Agregar ingreso
                </button>
              ) : null}
            </div>
          ) : (
            pageRows.map((c) => (
              <ContributionCard
                key={c.incomeId}
                entry={c}
                onEdit={() => setFormState({ mode: "edit", entry: c })}
                onDelete={() => setDeleteTarget(c)}
              />
            ))
          )}
        </div>
      )}

      {total > 0 ? (
        <PaginationBar
          page={safePage}
          totalPages={totalPages}
          total={total}
          pageStart={pageStart}
          pageEnd={pageEnd}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={(s) => setPageSize(s as PageSize)}
          noun="ingresos"
          sizeOptions={PAGE_SIZE_OPTIONS}
        />
      ) : null}

      {!isDesktop ? (
        <button
          type="button"
          className="btn primary"
          onClick={openNew}
          style={{
            position: "fixed",
            right: 20,
            bottom: 80,
            zIndex: 40,
            borderRadius: 999,
            padding: "14px 18px",
            boxShadow: "var(--shadow-3)",
          }}
          aria-label="Agregar ingreso"
        >
          <Icons.plus size={18} />
        </button>
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          title="¿Eliminar ingreso?"
          message="Esta acción no se puede deshacer."
          itemName={`${deleteTarget.typeName} · ${deleteTarget.contributorLabel}`}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
          pending={deletePending}
        />
      ) : null}

      <ContributionFormDrawer
        mode={formState?.mode ?? "new"}
        entry={formState?.entry ?? null}
        open={formState !== null}
        onClose={() => setFormState(null)}
        funds={funds}
        incomeTypes={incomeTypes}
        presetFundId={fundFilterId}
      />
    </div>
  );
}

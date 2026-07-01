"use client";

import {
  deleteLedgerEntryAction,
  type TransactionActionResult,
} from "@/app/(app)/finances/transactions/actions";
import { AuthorizeTransactionDialog } from "@/components/transactions/authorize-transaction-dialog";
import { TransactionActionMenu } from "@/components/transactions/transaction-action-menu";
import { TransactionCard } from "@/components/transactions/transaction-card";
import { TransactionFormDrawer } from "@/components/transactions/transaction-form-drawer";
import {
  AuthorizeButton,
  LedgerAmount,
  LedgerMovementTypeCell,
  LedgerStatusChip,
} from "@/components/transactions/transaction-ui";
import { TransactionsKpi } from "@/components/transactions/transactions-kpi";
import {
  DateRangeFilter,
  dateRangeExportSlug,
} from "@/components/finance/date-range-filter";
import { FinPageHeader } from "@/components/finances/fin-page-header";
import { Icons } from "@/components/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { TruncatedTooltip } from "@/components/ui/truncated-tooltip";
import { useActionToast } from "@/hooks/use-action-toast";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import {
  defaultYearToDateRange,
  type DateRange,
} from "@/lib/finance/date-range";
import type { Fund } from "@/lib/funds/types";
import {
  computeLedgerKpiVisuals,
  computeLedgerStats,
  filterLedgerEntries,
  isPendingFundTransferExpense,
} from "@/lib/ledger/parse";
import type {
  ExpenseType,
  LedgerEntry,
  LedgerStatusFilter,
  OperationalIncomeType,
} from "@/lib/ledger/types";
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

const STATUS_FILTERS: { key: LedgerStatusFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendientes" },
  { key: "approved", label: "Aprobadas" },
];

const deleteInitial: TransactionActionResult | null = null;

function canEditEntry(entry: LedgerEntry): boolean {
  if (isPendingFundTransferExpense(entry)) return true;
  if (entry.isFundTransfer) return false;
  if (entry.entryKind === "operational_income") return true;
  return entry.status === "PENDING";
}

function canDeleteEntry(entry: LedgerEntry): boolean {
  if (isPendingFundTransferExpense(entry)) return true;
  if (entry.isFundTransfer) return false;
  if (entry.entryKind === "operational_income") return true;
  return entry.status === "PENDING";
}

export function TransactionsListView({
  entries,
  funds,
  expenseTypes,
  incomeTypes,
  fundFilterId,
  fundFilterName,
  canAuthorizeFinances = false,
}: {
  entries: LedgerEntry[];
  funds: Fund[];
  expenseTypes: ExpenseType[];
  incomeTypes: OperationalIncomeType[];
  fundFilterId?: string | null;
  fundFilterName?: string | null;
  canAuthorizeFinances?: boolean;
}) {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [dateRange, setDateRange] = useState<DateRange>(defaultYearToDateRange);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LedgerStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [formState, setFormState] = useState<{
    mode: "new" | "edit";
    entry: LedgerEntry | null;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LedgerEntry | null>(null);
  const [authorizeTarget, setAuthorizeTarget] = useState<LedgerEntry | null>(
    null,
  );

  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteLedgerEntryAction,
    deleteInitial,
  );

  useActionToast(deleteState, {
    successMessage: "Movimiento eliminado.",
    onSuccess: () => {
      setDeleteTarget(null);
      router.refresh();
    },
  });

  const filtered = useMemo(
    () =>
      filterLedgerEntries(entries, {
        dateRange,
        statusFilter,
        query,
        fundFilterId,
      }),
    [entries, dateRange, query, statusFilter, fundFilterId],
  );

  const stats = useMemo(() => computeLedgerStats(filtered), [filtered]);

  const kpiVisuals = useMemo(
    () =>
      computeLedgerKpiVisuals(filtered, entries, {
        dateRange,
        statusFilter,
        query,
        fundFilterId,
      }),
    [filtered, entries, dateRange, statusFilter, query, fundFilterId],
  );

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, fundFilterId, dateRange, pageSize]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, total);
  const pageRows = filtered.slice(pageStart, pageEnd);

  const exportBase = `Transacciones_${dateRangeExportSlug(dateRange)}`;

  function openNew() {
    setFormState({ mode: "new", entry: null });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const fd = new FormData();
    if (isPendingFundTransferExpense(deleteTarget) && deleteTarget.fundTransferId) {
      fd.set("fundTransferId", deleteTarget.fundTransferId);
    } else {
      fd.set("entryKind", deleteTarget.entryKind);
      fd.set("entryId", deleteTarget.entryId);
    }
    startTransition(() => deleteAction(fd));
  }

  const columns = useMemo(
    () => [
      {
        key: "type",
        label: "Tipo",
        className: "col-type",
        render: (entry: LedgerEntry) => (
          <LedgerMovementTypeCell entry={entry} />
        ),
      },
      {
        key: "fund",
        label: "Fondo",
        render: (entry: LedgerEntry) => (
          <span className="chip">{entry.fundName}</span>
        ),
      },
      {
        key: "description",
        label: "Descripción",
        className: "col-desc",
        render: (entry: LedgerEntry) => (
          <TruncatedTooltip
            text={entry.description}
            style={{ fontWeight: 500 }}
          />
        ),
      },
      {
        key: "amount",
        label: "Monto",
        align: "right" as const,
        className: "tnum mono",
        render: (entry: LedgerEntry) => <LedgerAmount entry={entry} />,
      },
      {
        key: "status",
        label: "Estado",
        render: (entry: LedgerEntry) => (
          <div className="row" style={{ gap: 8, alignItems: "center" }}>
            <LedgerStatusChip entry={entry} />
            {entry.direction === "expense" &&
            entry.status === "PENDING" &&
            canAuthorizeFinances ? (
              <AuthorizeButton onClick={() => setAuthorizeTarget(entry)} />
            ) : null}
          </div>
        ),
      },
      {
        key: "createdBy",
        label: "Creado por",
        className: "muted",
        render: (entry: LedgerEntry) => entry.createdBy,
      },
      {
        key: "authorizedBy",
        label: "Autorizado por",
        className: "muted",
        render: (entry: LedgerEntry) =>
          entry.direction === "expense" && entry.status === "PENDING"
            ? "—"
            : entry.authorizedBy,
      },
    ],
    [canAuthorizeFinances],
  );

  const emptyMessage =
    entries.length === 0
      ? "No hay movimientos registrados."
      : "No hay movimientos que coincidan con los filtros.";

  return (
    <div>
      <FinPageHeader
        eyebrow="Mayordomía · Finanzas"
        title={
          fundFilterName ? `Transacciones — ${fundFilterName}` : "Transacciones"
        }
        subtitle="Ingresos operacionales y egresos de todos los fondos de la congregación."
        onExportPdf={() =>
          toast.success("Reporte generado", `${exportBase}.pdf descargado`)
        }
        onExportExcel={() =>
          toast.success("Reporte generado", `${exportBase}.xlsx descargado`)
        }
      />

      {fundFilterId ? (
        <Link
          href="/finances/transactions"
          className="tiny"
          style={{
            display: "inline-flex",
            marginTop: 8,
            color: "var(--accent)",
            fontWeight: 600,
          }}
        >
          Ver todas las transacciones
        </Link>
      ) : null}

      <TransactionsKpi stats={stats} visuals={kpiVisuals} />

      <FilterToolbar
        style={{ marginTop: 0 }}
        query={query}
        onQueryChange={setQuery}
        queryPlaceholder="Buscar por descripción, fondo, categoría…"
        maxSearchWidth={340}
        compactSearch
        filters={STATUS_FILTERS}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
        middle={<DateRangeFilter value={dateRange} onChange={setDateRange} />}
        trailing={
          isDesktop ? (
            <button type="button" className="btn primary" onClick={openNew}>
              <Icons.plus size={14} /> Registrar movimiento
            </button>
          ) : null
        }
      />

      {isDesktop ? (
        <DataTable
          style={{ marginTop: 0 }}
          columns={columns}
          rows={pageRows}
          rowKey={(entry) => `${entry.entryKind}-${entry.entryId}`}
          rowStyle={(entry) =>
            entry.isFundTransfer
              ? {
                  background:
                    "color-mix(in oklab, var(--accent) 4%, var(--bg-1))",
                }
              : undefined
          }
          actionsPosition="start"
          actionsLabel="Acciones"
          actions={(entry) => (
            <TransactionActionMenu
              canEdit={canEditEntry(entry)}
              canDelete={canDeleteEntry(entry)}
              onEdit={() => setFormState({ mode: "edit", entry })}
              onDelete={() => setDeleteTarget(entry)}
            />
          )}
          empty={
            <div style={{ padding: 48, textAlign: "center" }}>
              <span
                style={{
                  display: "inline-grid",
                  opacity: 0.35,
                  marginBottom: 12,
                  color: "var(--ink-4)",
                }}
              >
                <Icons.wallet size={40} />
              </span>
              <div className="muted">{emptyMessage}</div>
              {entries.length === 0 ? (
                <button
                  type="button"
                  className="btn primary"
                  style={{ marginTop: 16 }}
                  onClick={openNew}
                >
                  <Icons.plus size={14} /> Registrar movimiento
                </button>
              ) : null}
            </div>
          }
        />
      ) : (
        <div className="col" style={{ gap: 10 }}>
          {pageRows.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              <span
                style={{
                  display: "inline-grid",
                  opacity: 0.35,
                  marginBottom: 12,
                  color: "var(--ink-4)",
                }}
              >
                <Icons.wallet size={40} />
              </span>
              <div className="muted">{emptyMessage}</div>
              {entries.length === 0 ? (
                <button
                  type="button"
                  className="btn primary"
                  style={{ marginTop: 16 }}
                  onClick={openNew}
                >
                  <Icons.plus size={14} /> Registrar movimiento
                </button>
              ) : null}
            </div>
          ) : (
            pageRows.map((entry) => (
              <TransactionCard
                key={`${entry.entryKind}-${entry.entryId}`}
                entry={entry}
                onEdit={() => setFormState({ mode: "edit", entry })}
                onDelete={() => setDeleteTarget(entry)}
                onAuthorize={() => setAuthorizeTarget(entry)}
                canAuthorize={canAuthorizeFinances}
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
          noun="movimientos"
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
          aria-label="Registrar movimiento"
        >
          <Icons.plus size={18} />
        </button>
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          title="¿Eliminar movimiento?"
          message="Esta acción no se puede deshacer."
          itemName={`${deleteTarget.description} · ${deleteTarget.fundName}`}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
          pending={deletePending}
        />
      ) : null}

      {authorizeTarget ? (
        <AuthorizeTransactionDialog
          entry={authorizeTarget}
          onClose={() => {
            setAuthorizeTarget(null);
            router.refresh();
          }}
        />
      ) : null}

      <TransactionFormDrawer
        mode={formState?.mode ?? "new"}
        entry={formState?.entry ?? null}
        open={formState !== null}
        onClose={() => {
          setFormState(null);
          router.refresh();
        }}
        funds={funds}
        expenseTypes={expenseTypes}
        incomeTypes={incomeTypes}
        presetFundId={fundFilterId}
      />
    </div>
  );
}

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
import type { DateRange } from "@/lib/finance/date-range";
import {
  FINANCE_PAGE_SIZE_OPTIONS,
  type FinancePageSize,
} from "@/lib/finance/pagination";
import type { Fund } from "@/lib/funds/types";
import {
  computeLedgerKpiVisuals,
  isPendingFundTransferExpense,
} from "@/lib/ledger/parse";
import type {
  ExpenseType,
  LedgerEntry,
  LedgerStats,
  LedgerStatusFilter,
  OperationalIncomeType,
} from "@/lib/ledger/types";
import { toast } from "@/lib/toast";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useActionState,
  useMemo,
  useState,
  startTransition,
} from "react";

const STATUS_FILTERS: { key: LedgerStatusFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendientes" },
  { key: "approved", label: "Aprobadas" },
];

const deleteInitial: TransactionActionResult | null = null;

function buildTransactionsQuery(
  base: URLSearchParams,
  updates: {
    page?: number;
    pageSize?: number;
    dateRange?: DateRange;
    status?: LedgerStatusFilter;
  },
): string {
  const params = new URLSearchParams(base.toString());

  if (updates.page !== undefined) {
    if (updates.page <= 1) params.delete("page");
    else params.set("page", String(updates.page));
  }

  if (updates.pageSize !== undefined) {
    if (updates.pageSize === 25) params.delete("size");
    else params.set("size", String(updates.pageSize));
  }

  if (updates.dateRange) {
    params.set("from", updates.dateRange.from);
    params.set("to", updates.dateRange.to);
  }

  if (updates.status !== undefined) {
    if (updates.status === "all") params.delete("status");
    else params.set("status", updates.status);
  }

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

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
  totalCount,
  periodStats,
  funds,
  expenseTypes,
  incomeTypes,
  fundFilterId,
  fundFilterName,
  canAuthorizeFinances = false,
  page,
  pageSize,
  dateFrom,
  dateTo,
  statusFilter,
}: {
  entries: LedgerEntry[];
  totalCount: number;
  periodStats: LedgerStats;
  funds: Fund[];
  expenseTypes: ExpenseType[];
  incomeTypes: OperationalIncomeType[];
  fundFilterId?: string | null;
  fundFilterName?: string | null;
  canAuthorizeFinances?: boolean;
  page: number;
  pageSize: FinancePageSize;
  dateFrom: string;
  dateTo: string;
  statusFilter: LedgerStatusFilter;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDesktop = useIsDesktop();
  const dateRange = useMemo(
    () => ({ from: dateFrom, to: dateTo }),
    [dateFrom, dateTo],
  );
  const [query, setQuery] = useState("");
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

  function navigate(updates: Parameters<typeof buildTransactionsQuery>[1]) {
    const href = `${pathname}${buildTransactionsQuery(searchParams, updates)}`;
    router.push(href);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((entry) =>
      [
        entry.description,
        entry.fundName,
        entry.typeName,
        entry.createdBy,
        entry.authorizedBy,
        entry.paymentMethod,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [entries, query]);

  const kpiVisuals = useMemo(
    () =>
      computeLedgerKpiVisuals(filtered, filtered, {
        dateRange,
        statusFilter,
        query: "",
        fundFilterId,
      }),
    [filtered, dateRange, statusFilter, fundFilterId],
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + entries.length, totalCount);
  const pageRows = filtered;

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
    totalCount === 0
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

      <TransactionsKpi stats={periodStats} visuals={kpiVisuals} />

      <FilterToolbar
        style={{ marginTop: 0 }}
        query={query}
        onQueryChange={setQuery}
        queryPlaceholder="Buscar por descripción, fondo, categoría…"
        maxSearchWidth={340}
        compactSearch
        filters={STATUS_FILTERS}
        activeFilter={statusFilter}
        onFilterChange={(next) => navigate({ status: next, page: 1 })}
        middle={
          <DateRangeFilter
            value={dateRange}
            onChange={(next) => navigate({ dateRange: next, page: 1 })}
          />
        }
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
              {totalCount === 0 ? (
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
              {totalCount === 0 ? (
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

      {totalCount > 0 ? (
        <PaginationBar
          page={safePage}
          totalPages={totalPages}
          total={totalCount}
          pageStart={pageStart}
          pageEnd={pageEnd}
          pageSize={pageSize}
          onPage={(p) => navigate({ page: p })}
          onPageSize={(s) =>
            navigate({ pageSize: s as FinancePageSize, page: 1 })
          }
          noun="movimientos"
          sizeOptions={FINANCE_PAGE_SIZE_OPTIONS}
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

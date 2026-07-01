import type {
  ExpenseType,
  LedgerEntry,
  LedgerFilterParams,
  LedgerKpiVisuals,
  LedgerStats,
  LedgerStatus,
  LedgerStatusFilter,
  OperationalIncomeType,
} from "@/lib/ledger/types";
import {
  getPreviousDateRange,
  isDateInRange,
  type DateRange,
} from "@/lib/finance/date-range";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function asNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : v != null ? String(v) : "";
}

function parseStatus(v: unknown): LedgerStatus {
  const s = asString(v).toUpperCase();
  if (
    s === "CONFIRMED" ||
    s === "APPROVED" ||
    s === "REJECTED" ||
    s === "PENDING"
  ) {
    return s;
  }
  return "PENDING";
}

function parseLedgerRow(row: Record<string, unknown>): LedgerEntry | null {
  const entryId = asString(row.entry_id ?? row.entryId);
  if (!entryId) return null;

  const entryKindRaw = asString(row.entry_kind ?? row.entryKind);
  const entryKind =
    entryKindRaw === "operational_income" ? "operational_income" : "expense";

  const directionRaw = asString(row.direction);
  const direction = directionRaw === "income" ? "income" : "expense";

  return {
    entryKind,
    entryId,
    churchId: asNumber(row.church_id ?? row.churchId),
    fundId: asString(row.fund_id ?? row.fundId),
    fundName: asString(row.fund_name ?? row.fundName),
    typeId: asNumber(row.income_type_id ?? row.typeId),
    typeName: asString(row.type_name ?? row.typeName),
    description: asString(row.description),
    amount: asNumber(row.amount),
    direction,
    status: parseStatus(row.status),
    movementDate: asString(row.movement_date ?? row.movementDate),
    paymentMethod: asString(row.payment_method ?? row.paymentMethod),
    createdByProfileId:
      asString(row.created_by_profile_id ?? row.createdByProfileId) || null,
    createdBy: asString(row.created_by ?? row.createdBy) || "—",
    authorizedByProfileId:
      asString(row.authorized_by_profile_id ?? row.authorizedByProfileId) ||
      null,
    authorizedBy: asString(row.authorized_by ?? row.authorizedBy) || "—",
    authorizationDate:
      asString(row.authorization_date ?? row.authorizationDate) || null,
    authorizationComments:
      asString(row.authorization_comments ?? row.authorizationComments) || null,
    contributorName:
      asString(row.contributor_name ?? row.contributorName) || null,
    isFundTransfer: row.is_fund_transfer === true || row.isFundTransfer === true,
    fundTransferId:
      asString(row.fund_transfer_id ?? row.fundTransferId) || null,
    transferSourceFundId:
      asString(row.transfer_source_fund_id ?? row.transferSourceFundId) || null,
    transferDestinationFundId:
      asString(row.transfer_destination_fund_id ?? row.transferDestinationFundId) ||
      null,
    transferSourceFundName:
      asString(row.transfer_source_fund_name ?? row.transferSourceFundName) ||
      null,
    transferDestinationFundName:
      asString(
        row.transfer_destination_fund_name ?? row.transferDestinationFundName,
      ) || null,
    transferUserComment:
      asString(row.transfer_user_comment ?? row.transferUserComment) || null,
  };
}

export function parseLedgerResponse(data: unknown): {
  entries: LedgerEntry[];
  pendingAuthorization: number;
} {
  const root = asRecord(data);
  if (!root) return { entries: [], pendingAuthorization: 0 };

  if (root.success === false) {
    throw new Error(
      asString(root.message) || "No se pudo cargar el libro de transacciones.",
    );
  }

  const list = root.ledger_list;
  const entries = Array.isArray(list)
    ? list
        .map((item) => asRecord(item))
        .filter((item): item is Record<string, unknown> => item !== null)
        .map(parseLedgerRow)
        .filter((e): e is LedgerEntry => e !== null)
    : [];

  return {
    entries,
    pendingAuthorization: asNumber(root.pending_authorization_count),
  };
}

export function parseExpenseTypesResponse(data: unknown): ExpenseType[] {
  const root = asRecord(data);
  if (!root) return [];

  if (root.success === false) {
    throw new Error(
      asString(root.message) || "No se pudieron cargar los tipos de gasto.",
    );
  }

  const list = root.expense_types;
  if (!Array.isArray(list)) return [];

  return list
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((row) => {
      const id = asNumber(row.expenses_type_id ?? row.id);
      if (!id) return null;
      return {
        id,
        name: asString(row.expenses_name ?? row.name),
        category: asString(row.expenses_category ?? row.category),
        description: asString(row.expenses_description ?? row.description),
        isActive: row.is_active !== false,
      };
    })
    .filter((t): t is ExpenseType => t !== null && t.isActive);
}

export function parseOperationalIncomeTypes(
  rows: unknown,
): OperationalIncomeType[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((row) => {
      const id = asNumber(row.id);
      if (!id) return null;
      return {
        id,
        typeName: asString(row.type_name),
        description: asString(row.description),
        isActive: row.is_active !== false,
      };
    })
    .filter((t): t is OperationalIncomeType => t !== null && t.isActive);
}

/** KPIs sobre el conjunto filtrado (fechas, fondo, estado, búsqueda). */
export function computeLedgerStats(entries: LedgerEntry[]): LedgerStats {
  let movements = 0;
  let incomeAmount = 0;
  let expenseAmount = 0;
  let pendingAuthorization = 0;

  for (const e of entries) {
    if (e.status === "REJECTED") continue;

    movements += 1;

    if (e.direction === "income") {
      incomeAmount += e.amount;
    } else if (e.status === "APPROVED") {
      expenseAmount += e.amount;
    }

    if (e.direction === "expense" && e.status === "PENDING") {
      pendingAuthorization += 1;
    }
  }

  return {
    movements,
    incomeAmount,
    expenseAmount,
    pendingAuthorization,
  };
}

export function matchesLedgerStatusFilter(
  entry: LedgerEntry,
  filter: LedgerStatusFilter,
): boolean {
  if (filter === "all") return entry.status !== "REJECTED";
  if (filter === "pending") {
    return entry.direction === "expense" && entry.status === "PENDING";
  }
  if (entry.direction === "income") return true;
  return entry.status === "APPROVED";
}

export function filterLedgerEntries(
  entries: LedgerEntry[],
  params: LedgerFilterParams,
): LedgerEntry[] {
  const q = params.query.trim().toLowerCase();
  return entries.filter((entry) => {
    if (!isDateInRange(entry.movementDate, params.dateRange)) return false;
    if (!matchesLedgerStatusFilter(entry, params.statusFilter)) return false;
    if (params.fundFilterId && entry.fundId !== params.fundFilterId) {
      return false;
    }
    if (!q) return true;
    return [
      entry.description,
      entry.fundName,
      entry.typeName,
      entry.createdBy,
      entry.authorizedBy,
      paymentMethodLabel(entry.paymentMethod),
    ]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
}

const SPARKLINE_BUCKETS = 7;

function computeLedgerSparklines(
  entries: LedgerEntry[],
  dateRange: DateRange,
  bucketCount = SPARKLINE_BUCKETS,
): { incomeSpark: number[]; expenseSpark: number[] } {
  const from = new Date(`${dateRange.from}T00:00:00`);
  const to = new Date(`${dateRange.to}T00:00:00`);
  const totalDays = Math.max(
    1,
    Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1,
  );

  const incomeSpark = Array.from({ length: bucketCount }, () => 0);
  const expenseSpark = Array.from({ length: bucketCount }, () => 0);

  for (const e of entries) {
    if (e.status === "REJECTED") continue;
    const dayStr = e.movementDate.slice(0, 10);
    if (!isDateInRange(dayStr, dateRange)) continue;

    const dayDate = new Date(`${dayStr}T00:00:00`);
    const dayIndex = Math.floor(
      (dayDate.getTime() - from.getTime()) / 86_400_000,
    );
    const bucketIndex = Math.min(
      bucketCount - 1,
      Math.floor((dayIndex / totalDays) * bucketCount),
    );

    if (e.direction === "income") {
      incomeSpark[bucketIndex] += e.amount;
    } else if (e.status === "APPROVED") {
      expenseSpark[bucketIndex] += e.amount;
    }
  }

  return { incomeSpark, expenseSpark };
}

function formatPeriodDelta(
  current: number,
  previous: number,
  invertDir = false,
): { delta?: string; deltaDir?: "up" | "down" } {
  if (previous <= 0) return {};
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? "+" : "";
  const rawDir: "up" | "down" = pct >= 0 ? "up" : "down";
  const deltaDir = invertDir
    ? rawDir === "up"
      ? "down"
      : "up"
    : rawDir;
  return {
    delta: `${sign}${pct.toFixed(1)}%`,
    deltaDir,
  };
}

/** Sparklines y deltas vs periodo anterior (misma duración y filtros). */
export function computeLedgerKpiVisuals(
  currentEntries: LedgerEntry[],
  allEntries: LedgerEntry[],
  params: LedgerFilterParams,
): LedgerKpiVisuals {
  const { incomeSpark, expenseSpark } = computeLedgerSparklines(
    currentEntries,
    params.dateRange,
  );

  const currentStats = computeLedgerStats(currentEntries);
  const prevRange = getPreviousDateRange(params.dateRange);
  const prevEntries = filterLedgerEntries(allEntries, {
    ...params,
    dateRange: prevRange,
  });
  const prevStats = computeLedgerStats(prevEntries);

  const incomeDelta = formatPeriodDelta(
    currentStats.incomeAmount,
    prevStats.incomeAmount,
  );
  const expenseDelta = formatPeriodDelta(
    currentStats.expenseAmount,
    prevStats.expenseAmount,
    true,
  );

  return {
    incomeSpark,
    expenseSpark,
    incomeDelta: incomeDelta.delta,
    incomeDeltaDir: incomeDelta.deltaDir,
    expenseDelta: expenseDelta.delta,
    expenseDeltaDir: expenseDelta.deltaDir,
  };
}

export function ledgerEntryToExpenseTransactionId(entry: LedgerEntry): number {
  return Number.parseInt(entry.entryId, 10);
}

export function isPendingFundTransferExpense(entry: LedgerEntry): boolean {
  return Boolean(
    entry.isFundTransfer &&
      entry.direction === "expense" &&
      entry.status === "PENDING",
  );
}

export function statusChipClass(status: LedgerStatus): string {
  switch (status) {
    case "CONFIRMED":
    case "APPROVED":
      return "success";
    case "PENDING":
      return "warn";
    case "REJECTED":
      return "danger";
    default:
      return "";
  }
}

export function statusLabel(status: LedgerStatus): string {
  switch (status) {
    case "CONFIRMED":
      return "Confirmado";
    case "APPROVED":
      return "Aprobada";
    case "PENDING":
      return "Pendiente";
    case "REJECTED":
      return "Rechazada";
    default:
      return status;
  }
}

export function paymentMethodLabel(method: string): string {
  switch (method) {
    case "Cash":
      return "Efectivo";
    case "Transfer":
      return "Transferencia";
    case "Cheque":
    case "Check":
      return "Cheque";
    case "Card":
      return "Tarjeta";
    case "Deposit":
      return "Depósito";
    default:
      return method || "—";
  }
}

const MONTH_SHORT = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export function formatMovementDate(value: string | null | undefined): string {
  if (!value) return "—";
  const datePart = value.slice(0, 10);
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return value;
  return `${String(d).padStart(2, "0")} ${MONTH_SHORT[m - 1] ?? m} ${y}`;
}

export function formatMovementDateShort(
  value: string | null | undefined,
): string {
  if (!value) return "—";
  const datePart = value.slice(0, 10);
  const [, m, d] = datePart.split("-").map(Number);
  if (!m || !d) return value;
  return `${String(d).padStart(2, "0")} ${MONTH_SHORT[m - 1] ?? m}`;
}

export function directionLabel(entry: LedgerEntry): string {
  return entry.direction === "income" ? "Ingreso" : "Egreso";
}

import type {
  ExpenseType,
  Transaction,
  TransactionHeaderStats,
  TransactionStats,
  TransactionStatus,
} from "@/lib/transactions/types";

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

function parseStatus(v: unknown): TransactionStatus {
  const s = asString(v).toUpperCase();
  if (s === "APPROVED" || s === "REJECTED") return s;
  return "PENDING";
}

function parseTransactionRow(row: Record<string, unknown>): Transaction | null {
  const transactionId = asNumber(row.transactionId ?? row.transaction_id);
  if (!transactionId) return null;

  return {
    transactionId,
    churchId: asNumber(row.churchId ?? row.church_id),
    fundId: asString(row.fundId ?? row.fund_id),
    fundName: asString(row.fundName ?? row.fund_name),
    expensesTypeId: asNumber(row.expensesTypeId ?? row.expenses_type_id),
    description: asString(
      row.transactionDescription ?? row.transaction_description,
    ),
    amount: asNumber(row.transactionAmount ?? row.transaction_amount),
    status: parseStatus(row.transactionStatus ?? row.authorization_status),
    transactionDate: asString(row.transactionDate ?? row.transaction_date),
    paymentMethod: asString(row.paymentMethod ?? row.payment_method),
    createdByProfileId: asString(row.profileId ?? row.created_by_profile_id),
    createdBy: asString(row.createdBy ?? row.created_by),
    authorizedByProfileId:
      asString(row.authorizedProfileId ?? row.authorized_by_profile_id) ||
      null,
    authorizedBy: asString(row.authorizedBy ?? row.authorized_by),
    authorizationDate:
      asString(row.authorizationDate ?? row.authorization_date) || null,
    authorizationComments:
      asString(row.authorizedComments ?? row.authorization_comments) || null,
  };
}

function parseExpenseTypeRow(row: Record<string, unknown>): ExpenseType | null {
  const id = asNumber(row.expenses_type_id ?? row.id);
  if (!id) return null;

  return {
    id,
    name: asString(row.expenses_name ?? row.name),
    category: asString(row.expenses_category ?? row.category),
    description: asString(row.expenses_description ?? row.description),
    isActive: row.is_active !== false,
  };
}

export function parseTransactionsResponse(data: unknown): {
  header: TransactionHeaderStats | null;
  transactions: Transaction[];
} {
  const root = asRecord(data);
  if (!root) return { header: null, transactions: [] };

  if (root.success === false) {
    throw new Error(
      asString(root.message) || "No se pudieron cargar las transacciones.",
    );
  }

  const headerRow = asRecord(root.header_details);
  const header: TransactionHeaderStats | null = headerRow
    ? {
        totalTransactions: asNumber(headerRow.total_transactions),
        totalContributions: asNumber(headerRow.total_contributions),
        pendingAmount: asNumber(headerRow.pending_transactions),
        approvedAmount: asNumber(headerRow.approved_transactions),
        availableBalance: asNumber(
          headerRow.total_minus_pending_transactions,
        ),
      }
    : null;

  const list = root.transaction_list;
  const transactions = Array.isArray(list)
    ? list
        .map((item) => asRecord(item))
        .filter((item): item is Record<string, unknown> => item !== null)
        .map(parseTransactionRow)
        .filter((t): t is Transaction => t !== null)
    : [];

  return { header, transactions };
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
    .map(parseExpenseTypeRow)
    .filter((t): t is ExpenseType => t !== null && t.isActive);
}

export function computeTransactionStats(
  transactions: Transaction[],
): TransactionStats {
  let pending = 0;
  let approved = 0;
  let pendingAmount = 0;
  let approvedAmount = 0;
  let totalAmount = 0;

  for (const tx of transactions) {
    if (tx.status === "PENDING") {
      pending += 1;
      pendingAmount += tx.amount;
      totalAmount += tx.amount;
    } else if (tx.status === "APPROVED") {
      approved += 1;
      approvedAmount += tx.amount;
      totalAmount += tx.amount;
    }
    // REJECTED: fuera de KPIs operativos (solo visibles en listado / filtro futuro)
  }

  return {
    total: pending + approved,
    totalAmount,
    pending,
    approved,
    pendingAmount,
    approvedAmount,
  };
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

export function formatTransactionDate(value: string | null | undefined): string {
  if (!value) return "—";
  const datePart = value.slice(0, 10);
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return value;
  return `${String(d).padStart(2, "0")} ${MONTH_SHORT[m - 1] ?? m} ${y}`;
}

export function formatTransactionDateShort(
  value: string | null | undefined,
): string {
  if (!value) return "—";
  const datePart = value.slice(0, 10);
  const [, m, d] = datePart.split("-").map(Number);
  if (!m || !d) return value;
  return `${String(d).padStart(2, "0")} ${MONTH_SHORT[m - 1] ?? m}`;
}

export function paymentMethodLabel(method: string): string {
  switch (method) {
    case "Cash":
      return "Efectivo";
    case "Transfer":
      return "Transferencia";
    case "Cheque":
      return "Cheque";
    case "Card":
      return "Tarjeta";
    default:
      return method || "—";
  }
}

export function statusChipClass(status: TransactionStatus): string {
  switch (status) {
    case "APPROVED":
      return "success";
    case "PENDING":
      return "warn";
    case "REJECTED":
      return "";
    default:
      return "";
  }
}

export function statusLabel(status: TransactionStatus): string {
  switch (status) {
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

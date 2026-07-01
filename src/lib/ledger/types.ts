export type LedgerEntryKind = "operational_income" | "expense";

export type LedgerDirection = "income" | "expense";

export type LedgerStatus =
  | "CONFIRMED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED";

export type LedgerStatusFilter = "all" | "pending" | "approved";

export type LedgerEntry = {
  entryKind: LedgerEntryKind;
  entryId: string;
  churchId: number;
  fundId: string;
  fundName: string;
  typeId: number;
  typeName: string;
  description: string;
  amount: number;
  direction: LedgerDirection;
  status: LedgerStatus;
  movementDate: string;
  paymentMethod: string;
  createdByProfileId: string | null;
  createdBy: string;
  authorizedByProfileId: string | null;
  authorizedBy: string;
  authorizationDate: string | null;
  authorizationComments: string | null;
  /** Solo ingresos operacionales con contribuyente vinculado. */
  contributorName?: string | null;
  isFundTransfer?: boolean;
  fundTransferId?: string | null;
  transferSourceFundId?: string | null;
  transferDestinationFundId?: string | null;
  transferSourceFundName?: string | null;
  transferDestinationFundName?: string | null;
  transferUserComment?: string | null;
};

export type LedgerStats = {
  /** Filas visibles en el periodo (ingresos operacionales + egresos, sin rechazados). */
  movements: number;
  /** Todos los ingresos operacionales registrados en el periodo. */
  incomeAmount: number;
  /** Solo egresos aprobados en el periodo. */
  expenseAmount: number;
  /** Cola global de egresos pendientes (sin filtro de mes). */
  pendingAuthorization: number;
};

export type LedgerFilterParams = {
  dateRange: { from: string; to: string };
  statusFilter: LedgerStatusFilter;
  query: string;
  fundFilterId?: string | null;
};

export type LedgerKpiVisuals = {
  incomeSpark: number[];
  expenseSpark: number[];
  incomeDelta?: string;
  incomeDeltaDir?: "up" | "down";
  expenseDelta?: string;
  expenseDeltaDir?: "up" | "down";
};

export type OperationalIncomeType = {
  id: number;
  typeName: string;
  description: string;
  isActive: boolean;
};

export type OperationalIncomeInput = {
  incomeId?: string | null;
  fundId: string;
  incomeTypeId: number;
  amount: number;
  description: string;
  paymentMethod: string;
  paymentDate: string;
  /** Nombre libre del contribuyente (opcional, solo ingresos). */
  contributorName?: string | null;
};

export type ExpenseInput = {
  transactionId?: number | null;
  fundId: string;
  expensesTypeId: number;
  amount: number;
  description: string;
  paymentMethod: string;
  transactionDate?: string;
};

export type LedgerMovementType = "income" | "expense" | "transfer";

export type FundTransferInput = {
  transferId?: string | null;
  sourceFundId: string;
  destinationFundId: string;
  amount: number;
  userComment?: string | null;
  paymentMethod: string;
  movementDate: string;
};

export type LedgerFormInput = {
  movementType: LedgerMovementType;
  operational?: OperationalIncomeInput;
  expense?: ExpenseInput;
};

/** @deprecated Use LedgerEntry — kept for authorize/delete expense flows */
export type Transaction = LedgerEntry & {
  transactionId: number;
  expensesTypeId: number;
  transactionDate: string;
};

export type ExpenseType = {
  id: number;
  name: string;
  category: string;
  description: string;
  isActive: boolean;
};

export type TransactionStatus = "PENDING" | "APPROVED" | "REJECTED";

export type TransactionStatusFilter = "all" | "pending" | "approved";

export type Transaction = {
  transactionId: number;
  churchId: number;
  fundId: string;
  fundName: string;
  expensesTypeId: number;
  description: string;
  amount: number;
  status: TransactionStatus;
  transactionDate: string;
  paymentMethod: string;
  createdByProfileId: string;
  createdBy: string;
  authorizedByProfileId: string | null;
  authorizedBy: string;
  authorizationDate: string | null;
  authorizationComments: string | null;
};

export type TransactionHeaderStats = {
  totalTransactions: number;
  totalContributions: number;
  pendingAmount: number;
  approvedAmount: number;
  availableBalance: number;
};

export type TransactionStats = {
  /** Cantidad activa (pendientes + aprobadas; sin rechazadas). */
  total: number;
  /** Monto activo (pendingAmount + approvedAmount). */
  totalAmount: number;
  pending: number;
  approved: number;
  pendingAmount: number;
  approvedAmount: number;
};

export type ExpenseType = {
  id: number;
  name: string;
  category: string;
  description: string;
  isActive: boolean;
};

export type TransactionInput = {
  transactionId?: number | null;
  fundId: string;
  expensesTypeId: number;
  amount: number;
  description: string;
  paymentMethod: string;
  transactionDate?: string;
};

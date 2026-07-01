export type CatalogStats = {
  total: number;
  active: number;
  inactive: number;
};

export type ExpenseTypeRow = {
  id: number;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  /** Tipos del sistema (p. ej. transferencias internas) no se pueden eliminar. */
  isLocked: boolean;
};

export type IncomeTypeCatalogRow = {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  /** Tipos requeridos por el sistema (p. ej. Transferencia). */
  isLocked: boolean;
};

export type CatalogItemInput = {
  id?: number | null;
  name: string;
  description: string;
  isActive: boolean;
};
